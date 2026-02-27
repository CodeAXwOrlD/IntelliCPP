// API route for health check
export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({ 
    status: 'ok', 
    backend: 'online', 
    cloudCompatible: true,
    timestamp: new Date().toISOString(),
    message: 'Vercel API routes working correctly'
  });
}