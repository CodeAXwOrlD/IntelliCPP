/**
 * Test endpoint for debugging
 */

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
    const { prefix, contextType, code, cursorPosition } = req.body;
    
    console.log('[Test API] 🚀 REQUEST RECEIVED!');
    console.log('[Test API] 📝 Request data:', { prefix, contextType, codeLength: code ? code.length : 0 });
    
    // Simple test: if context is stack, return stack methods
    if (contextType === 'stack') {
      console.log('[Test API] 🎯 RETURNING STACK METHODS!');
      const stackMethods = [
        { text: "stack", type: "class", score: 1.0 },
        { text: "push", type: "method", score: 0.8 },
        { text: "pop", type: "method", score: 0.8 },
        { text: "top", type: "method", score: 0.8 },
        { text: "empty", type: "method", score: 0.8 },
        { text: "size", type: "method", score: 0.8 }
      ];
      res.status(200).json(stackMethods);
      return;
    }
    
    // Default response
    res.status(200).json([{ text: "test", type: "test", score: 1.0 }]);

  } catch (error) {
    console.error('[Test API] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
