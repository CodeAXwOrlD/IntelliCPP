// API route for health check
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({ 
    status: 'ok', 
    backend: 'online', 
    cloudCompatible: true,
    message: 'Vercel API routes working correctly'
  });
}