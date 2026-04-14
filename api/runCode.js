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

    // Primary Piston execute endpoint (public instance)
    const pistonUrl = 'https://emkc.org/api/v2/piston/execute';

    const body = {
      language: 'cpp',
      version: 'g++-10.2.0',
      files: [ { name: 'main.cpp', content: code } ],
      stdin: '',
      compile_timeout: 10000,
      run_timeout: 5000
    };

    let result;
    try {
      const resp = await fetch(pistonUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'IntelliCPP/1.0'
        },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const t = await resp.text();
        console.warn('[RunCode][Piston] non-ok response:', resp.status, t.slice(0,200));
        throw new Error(`Piston API error (${resp.status})`);
      }

      result = await resp.json();
    } catch (pistonErr) {
      console.warn('[RunCode] Piston call failed, falling back to Coliru:', pistonErr.message);

      // Fallback: Coliru
      try {
        const cmd = 'g++ -std=c++17 -O2 main.cpp -o main 2>&1 && timeout 5 ./main';
        const params = new URLSearchParams();
        params.append('cmd', cmd);
        params.append('src', code);
        const coliruUrl = 'https://coliru.stacked-crooked.com/compile';
        const creq = await fetch(coliruUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/plain, */*',
            'User-Agent': 'IntelliCPP/1.0'
          },
          body: params.toString()
        });

        const text = await creq.text();
        const lowered = text.toLowerCase();
        const isCompileError = lowered.includes('error:') || lowered.includes('undefined reference') || lowered.includes('ld:') || lowered.includes('collect2:');
        const isTimeout = lowered.includes('killed') || lowered.includes('timed out') || lowered.includes('timeout');

        if (isCompileError) {
          return res.status(200).json({ success: false, output: '', error: text });
        }
        if (isTimeout) {
          return res.status(200).json({ success: false, output: text || '', error: 'Execution timed out (5s)' });
        }

        return res.status(200).json({ success: true, output: text || '', error: '' });
      } catch (coliruErr) {
        console.error('[RunCode] Coliru fallback failed:', coliruErr);
        return res.status(200).json({ success: false, output: '', error: 'Both Piston and Coliru backends failed: ' + coliruErr.message });
      }
    }

    // If we get here, Piston returned a result
    const run = result.run || {};
    const stdout = run.stdout ?? result.output ?? '';
    const stderr = run.stderr ?? '';
    const codeExit = run.code ?? run.exit_code ?? null;
    const timedOut = run.timed_out || false;

    if (timedOut) {
      return res.status(200).json({ success: false, output: stdout, error: 'Execution timed out (5s)' });
    }

    if (codeExit !== null && codeExit !== 0) {
      return res.status(200).json({ success: false, output: stdout, error: stderr || stdout || `Exited with code ${codeExit}` });
    }

    return res.status(200).json({ success: true, output: stdout, error: stderr });

  } catch (err) {
    console.error('[RunCode][Piston] Error:', err);
    return res.status(500).json({ success: false, output: '', error: 'Internal server error: ' + err.message });
  }
}
