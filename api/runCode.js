// Coliru-backed execution for C++ using the public Coliru service
// No API key required. Note: Coliru is a public service; use with caution and expect rate limits.

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

    // Build the Coliru command: compile and run with a 5s timeout
    const cmd = 'g++ -std=c++17 -O2 main.cpp -o main 2>&1 && timeout 5 ./main';

    const params = new URLSearchParams();
    params.append('cmd', cmd);
    params.append('src', code);

    const coliruUrl = 'https://coliru.stacked-crooked.com/compile';

    const resp = await fetch(coliruUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/plain, */*',
        'User-Agent': 'IntelliCPP/1.0 (+https://github.com/your-repo)'
      },
      body: params.toString()
    });

    const text = await resp.text();

    // Heuristic: if output contains common compiler error markers, treat as compilation error
    const lowered = text.toLowerCase();
    const isCompileError = lowered.includes('error:') || lowered.includes('undefined reference') || lowered.includes('ld:') || lowered.includes('collect2:');
    const isTimeout = lowered.includes('killed') || lowered.includes('timed out') || lowered.includes('timeout');

    if (isCompileError) {
      return res.status(200).json({ success: false, output: '', error: text });
    }

    if (isTimeout) {
      return res.status(200).json({ success: false, output: text || '', error: 'Execution timed out (5s)' });
    }

    // Otherwise assume success (Coliru returns combined stdout/stderr)
    return res.status(200).json({ success: true, output: text || '', error: '' });

  } catch (err) {
    console.error('[RunCode][Coliru] Error:', err);
    return res.status(500).json({ success: false, output: '', error: 'Internal server error: ' + err.message });
  }
}
