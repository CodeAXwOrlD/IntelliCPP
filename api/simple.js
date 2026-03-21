/**
 * Simple test API to bypass complex logic
 */

const path = require('path');
const fs = require('fs');

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
    
    console.log('[Test API] Request:', { prefix, contextType, codeLength: code ? code.length : 0 });
    
    // Simple test: if context is vector, return vector methods
    if (contextType === 'vector') {
      const vectorMethods = [
        "push_back", "pop_back", "emplace_back", "insert", "erase", "clear",
        "begin", "end", "rbegin", "rend", "cbegin", "cend", "crbegin", "crend",
        "size", "capacity", "max_size", "resize", "reserve", "shrink_to_fit",
        "data", "at", "front", "back", "empty", "swap", "assign"
      ];
      
      const suggestions = [
        { text: "vector", type: "class", score: 1.0 },
        ...vectorMethods.slice(0, 9).map(method => ({ text: method, type: "method", score: 0.8 }))
      ];
      
      console.log('[Test API] Vector suggestions:', suggestions.length);
      res.status(200).json(suggestions);
      return;
    }
    
    // Default empty response
    res.status(200).json([]);

  } catch (error) {
    console.error('[Test API] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
