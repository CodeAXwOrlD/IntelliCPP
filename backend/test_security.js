/**
 * Security & Sandboxing Automated Verification Suite for IntelliCPP
 */

const http = require('http');
const app = require('./server');

const TEST_PORT = 3099;
let server;

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ port: TEST_PORT, host: '127.0.0.1', ...options }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, body, json });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting IntelliCPP Security Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(name, condition, detail = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Security Headers Test
    const healthRes = await request({ path: '/health', method: 'GET' });
    assert('Helmet X-Content-Type-Options header present', healthRes.headers['x-content-type-options'] === 'nosniff');
    assert('Helmet Content-Security-Policy header present', !!healthRes.headers['content-security-policy']);
    assert('Helmet X-Frame-Options header present', healthRes.headers['x-frame-options'] === 'SAMEORIGIN');

    // 2. Normal C++ Code Execution
    const cppRes = await request(
      { path: '/api/runCode', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { code: '#include <iostream>\nint main(){ std::cout << "SEC_OK"; return 0; }', language: 'cpp' }
    );
    assert('Normal C++ execution succeeds', cppRes.json?.success === true && cppRes.json?.output?.trim() === 'SEC_OK');

    // 3. Normal Python Execution
    const pyRes = await request(
      { path: '/api/runCode', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { code: 'print("PY_OK")', language: 'python' }
    );
    assert('Normal Python execution succeeds', pyRes.json?.success === true && pyRes.json?.output?.trim() === 'PY_OK');

    // 4. Normal Rust Execution
    const rustRes = await request(
      { path: '/api/runCode', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { code: 'fn main(){ println!("RUST_OK"); }', language: 'rust' }
    );
    assert('Normal Rust execution succeeds', rustRes.json?.success === true && rustRes.json?.output?.trim() === 'RUST_OK');

    // 4. Timeout Protection on Infinite Loop (C++)
    const infiniteLoopRes = await request(
      { path: '/api/runCode', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { code: 'int main(){ while(true){} return 0; }', language: 'cpp' }
    );
    assert('Infinite loop strictly terminates on 5s timeout', infiniteLoopRes.json?.success === false && infiniteLoopRes.json?.error?.includes('timed out'));

    // 5. Input Validation: Payload Size Cap (>50KB)
    const largeCode = 'int main(){ // ' + 'A'.repeat(55 * 1024) + '\nreturn 0; }';
    const largeRes = await request(
      { path: '/api/runCode', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { code: largeCode, language: 'cpp' }
    );
    assert('Rejects code payload > 50KB with 400', largeRes.status === 400 && largeRes.json?.error?.includes('50KB'));

    // 6. Input Validation: Binary / Null Byte Rejection
    const nullByteRes = await request(
      { path: '/api/runCode', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { code: 'int main(){ char c = \'\0\'; return 0; }', language: 'cpp' }
    );
    assert('Rejects null bytes with 400', nullByteRes.status === 400 && nullByteRes.json?.error?.includes('null'));

    // 7. Input Validation: Language Allowlist
    const invalidLangRes = await request(
      { path: '/api/runCode', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { code: 'puts "hello"', language: 'ruby' }
    );
    assert('Rejects unsupported language with 400', invalidLangRes.status === 400 && invalidLangRes.json?.error?.includes('Unsupported language'));

    // 8. Path Traversal Protection: /api/readFile
    const traversalRes = await request(
      { path: '/api/readFile', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { filePath: '../../../../../../etc/passwd' }
    );
    assert('Blocks directory traversal on /api/readFile with 403', traversalRes.status === 403);

    // 9. Path Traversal Protection: Sibling directory prefix
    const siblingRes = await request(
      { path: '/api/readFile', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { filePath: '../IntelliCPP-evil/secret.txt' }
    );
    assert('Blocks sibling path traversal with 403', siblingRes.status === 403);

    // 10. Path Traversal Protection: /api/listWorkspace
    const listTraversalRes = await request(
      { path: '/api/listWorkspace', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { subpath: '../../etc' }
    );
    assert('Blocks directory traversal on /api/listWorkspace with 403', listTraversalRes.status === 403);

    // 11. Rate Limiting: Burst Token Bucket Exhaustion
    let hitRateLimit = false;
    for (let i = 0; i < 8; i++) {
      const res = await request(
        { path: '/api/runCode', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { code: 'int main(){ return 0; }', language: 'cpp' }
      );
      if (res.status === 429) {
        hitRateLimit = true;
        assert('Rate limiter returns 429 and Retry-After header', !!res.headers['retry-after']);
        break;
      }
    }
    assert('Token bucket rate limiter throttles burst spam with 429', hitRateLimit);

    console.log(`\n================================================`);
    console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`================================================\n`);

  } catch (err) {
    console.error('Test suite runtime error:', err);
    failed++;
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

server = app.listen(TEST_PORT, () => {
  runTests();
});
