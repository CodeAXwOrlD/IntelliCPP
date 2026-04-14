// Wandbox-backed execution for C++ using the public Wandbox API.
// No API key required; this should work on Vercel and other serverless hosts.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { code = '' } = req.body;
    if (!code || !code.trim()) {
      return res.status(200).json({ success: false, output: '', error: 'No code provided' });
    }

    const wandboxUrl = 'https://wandbox.org/api/compile.json';
    const payload = {
      code,
      compiler: 'gcc-head',
      options: '-std=c++17 -O2',
      stdin: '',
      save: false
    };

    const resp = await fetch(wandboxUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'IntelliCPP/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(200).json({ success: false, output: '', error: `Wandbox API error (${resp.status}): ${text}` });
    }

    const result = await resp.json();
    const stdout = result.program_output || '';
    const stderr = result.program_error || '';
    const compilerError = result.compiler_error || '';
    const compilerOutput = result.compiler_output || '';
    const status = Number(result.status);

    if (status !== 0) {
      const errorText = compilerError || compilerOutput || stderr || `Wandbox execution failed (status ${result.status})`;
      return res.status(200).json({ success: false, output: stdout, error: errorText });
    }

    return res.status(200).json({ success: true, output: stdout, error: stderr });
  } catch (err) {
    console.error('[RunCode][Wandbox] Error:', err);
    return res.status(500).json({ success: false, output: '', error: 'Internal server error: ' + err.message });
  }
}
