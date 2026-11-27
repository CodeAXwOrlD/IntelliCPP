// Remote execution serverless fallback proxy for multi-language execution
// Supports C++20, Python 3, and Rust with stdin piping and timeout guards.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { code = '', language = 'cpp', stdin = '' } = req.body;
    if (!code || !code.trim()) {
      return res.status(200).json({ success: false, output: '', error: 'No code provided' });
    }

    const wandboxUrl = 'https://wandbox.org/api/compile.json';
    
    // Multi-language Wandbox compiler mapping
    let compiler = 'gcc-head';
    let options = '-std=c++20 -O2';

    if (language === 'python') {
      compiler = 'cpython-head';
      options = '';
    } else if (language === 'rust') {
      compiler = 'rust-head';
      options = '-O';
    }

    const payload = {
      code,
      compiler,
      options,
      stdin: typeof stdin === 'string' ? stdin : '',
      save: false
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch(wandboxUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'IntelliCPP/2.0'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(200).json({ success: false, output: '', error: `Compiler API error (${resp.status}): ${text}` });
    }

    const result = await resp.json();
    const stdout = result.program_output || '';
    const stderr = result.program_error || '';
    const compilerError = result.compiler_error || '';
    const compilerOutput = result.compiler_output || '';
    const status = Number(result.status);

    if (status !== 0) {
      const errorText = compilerError || compilerOutput || stderr || `Execution failed (status ${result.status})`;
      return res.status(200).json({ success: false, output: stdout, error: errorText, exitCode: status });
    }

    return res.status(200).json({ success: true, output: stdout, error: stderr, exitCode: 0 });
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    const message = isTimeout ? 'Execution timed out after 10 seconds' : err.message;
    return res.status(200).json({ success: false, output: '', error: `Execution error: ${message}`, exitCode: 124 });
  }
}
