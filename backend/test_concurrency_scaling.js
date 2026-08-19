/**
 * IntelliCPP Concurrency & Scaling Test Suite
 * Tests /ready, /live, /health, LRU cache, JobQueue sync/async modes, and compression.
 */

const http = require('http');
const app = require('./server');

const PORT = 3096;
let server;

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ port: PORT, host: '127.0.0.1', ...options }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
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

function assert(testName, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('🧪 Starting Concurrency & Scaling Verification Suite...\n');

  server = app.listen(PORT, async () => {
    try {
      // 1. Liveness Probe
      const liveRes = await request({ path: '/live', method: 'GET' });
      assert('GET /live returns 200 with status alive', liveRes.status === 200 && liveRes.json?.status === 'alive');

      // 2. Readiness Probe
      const readyRes = await request({ path: '/ready', method: 'GET' });
      assert('GET /ready returns 200 with status ready', readyRes.status === 200 && readyRes.json?.status === 'ready');
      assert('Readiness reports STL database loaded', readyRes.json?.checks?.stl_database?.loaded === true);
      assert('Readiness reports C++ compiler available', readyRes.json?.checks?.cxx_compiler?.available === true);

      // 3. Health & Telemetry Endpoint
      const healthRes = await request({ path: '/health', method: 'GET' });
      assert('GET /health includes cache and queue stats', healthRes.status === 200 && healthRes.json?.cache && healthRes.json?.queue);

      // 4. LRU Cache on /api/getSuggestions (MISS then HIT)
      const sugPayload = { prefix: 'push', contextType: 'vector', code: '#include <vector>\nstd::vector<int> v;\nv.push' };
      const sug1 = await request(
        { path: '/api/getSuggestions', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        sugPayload
      );
      assert('First suggestion request returns X-Cache: MISS', sug1.headers['x-cache'] === 'MISS');
      assert('Suggestion results contain push_back', sug1.json?.[0]?.text === 'push_back');

      const sug2 = await request(
        { path: '/api/getSuggestions', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        sugPayload
      );
      assert('Second identical suggestion request returns X-Cache: HIT', sug2.headers['x-cache'] === 'HIT');

      // 5. LRU Cache on /api/getStats (MISS then HIT)
      const statsPayload = { code: '#include <vector>\n#include <string>\nint main(){ return 0; }' };
      const stats1 = await request(
        { path: '/api/getStats', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        statsPayload
      );
      assert('First getStats request returns X-Cache: MISS', stats1.headers['x-cache'] === 'MISS');

      const stats2 = await request(
        { path: '/api/getStats', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        statsPayload
      );
      assert('Second identical getStats request returns X-Cache: HIT', stats2.headers['x-cache'] === 'HIT');

      // 6. Synchronous Code Execution via JobQueue
      const syncRun = await request(
        { path: '/api/runCode', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { code: '#include <iostream>\nint main(){ std::cout << "QUEUE_SYNC_OK"; return 0; }', language: 'cpp' }
      );
      assert('Sync runCode succeeds via JobQueue', syncRun.status === 200 && syncRun.json?.success === true && syncRun.json?.output?.trim() === 'QUEUE_SYNC_OK');
      assert('Sync runCode response includes jobId', Boolean(syncRun.json?.jobId));

      // 7. Asynchronous Code Execution via JobQueue (?async=true)
      const asyncRun = await request(
        { path: '/api/runCode?async=true', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { code: 'print("ASYNC_PYTHON_OK")', language: 'python' }
      );
      assert('Async runCode returns 202 Accepted', asyncRun.status === 202 && asyncRun.json?.status === 'queued');
      const asyncJobId = asyncRun.json?.jobId;
      assert('Async response includes jobId', Boolean(asyncJobId));

      // Poll until async job finishes
      let polledJob = null;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 200));
        const pollRes = await request({ path: `/api/jobs/${asyncJobId}`, method: 'GET' });
        if (pollRes.json?.status === 'completed' || pollRes.json?.status === 'failed') {
          polledJob = pollRes.json;
          break;
        }
      }
      assert('Polled async job completed successfully', polledJob?.status === 'completed' && polledJob?.result?.output?.trim() === 'ASYNC_PYTHON_OK');

      // 8. JobQueue Metrics
      const queueMetrics = await request({ path: '/api/jobs', method: 'GET' });
      assert('GET /api/jobs returns active workers & processed count', queueMetrics.status === 200 && queueMetrics.json?.totalProcessed >= 2);

      console.log('\n================================================');
      console.log(`📊 Concurrency & Scaling Test Suite Complete!`);
      console.log('================================================\n');

    } catch (err) {
      console.error('Test execution error:', err);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
}

runTests();
