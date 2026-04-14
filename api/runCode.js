/**
 * Vercel Serverless Function for Code Execution
 * Compiles and runs C++ code with g++ inside /tmp
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

const TMP_DIR = '/tmp/intellicpp_run';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code = '' } = req.body;
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(200).json({ success: false, output: '', error: 'No code provided' });
    }

    const srcFile = path.join(TMP_DIR, 'main.cpp');
    const binFile = path.join(TMP_DIR, 'program');

    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }

    fs.writeFileSync(srcFile, code, 'utf8');

    try {
      execSync(`g++ -std=c++20 -o "${binFile}" "${srcFile}" 2>&1`, { timeout: 15000 });
    } catch (compileErr) {
      const message = compileErr.stdout ? compileErr.stdout.toString() : compileErr.message;
      return res.status(200).json({ success: false, output: '', error: message });
    }

    exec(`timeout 5 "${binFile}"`, { timeout: 6000 }, (runErr, stdout, stderr) => {
      if (runErr && runErr.killed) {
        return res.status(200).json({ success: false, output: '', error: 'Execution timed out (5s limit)' });
      }
      if (runErr && runErr.code !== 0 && !stdout) {
        return res.status(200).json({ success: false, output: '', error: stderr || runErr.message });
      }
      return res.status(200).json({ success: true, output: stdout || '', error: stderr || '' });
    });
  } catch (error) {
    console.error('[RunCode API] Error:', error);
    res.status(500).json({ success: false, output: '', error: 'Internal server error' });
  }
}
