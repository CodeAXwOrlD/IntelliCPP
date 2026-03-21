/**
 * Vercel Serverless Function for Suggestions
 * Pure JavaScript version - no native C++ dependency
 */

const path = require('path');
const fs = require('fs');

// Load C++ keywords and STL functions
let keywords = [];
let stlFunctions = {};

try {
  // Load keywords
  const keywordsPath = path.join(__dirname, '..', 'data', 'cpp_keywords.txt');
  if (fs.existsSync(keywordsPath)) {
    keywords = fs.readFileSync(keywordsPath, 'utf8').split('\n').filter(k => k.trim());
    console.log(`[Suggestions API] Loaded ${keywords.length} C++ keywords`);
  }

  // Load STL functions
  const stlPath = path.join(__dirname, '..', 'data', 'stl_functions.json');
  if (fs.existsSync(stlPath)) {
    stlFunctions = JSON.parse(fs.readFileSync(stlPath, 'utf8'));
    console.log(`[Suggestions API] Loaded ${Object.keys(stlFunctions).length} STL function categories`);
  }
} catch (err) {
  console.error('[Suggestions API] Failed to load data:', err.message);
}

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
    const { prefix = '', contextType = 'global', code = '', cursorPosition = 0 } = req.body;

    console.log('[Suggestions API] Request:', { prefix, contextType, codeLength: code ? code.length : 0 });

    // Special handling for header context - when user types #include <header>
    if (contextType && ['vector', 'stack', 'queue', 'deque', 'map', 'set', 'string', 'list', 'algorithm', 'iostream'].includes(contextType)) {
      console.log('[Suggestions API] 🎯 Header context detected for:', contextType);
      
      const suggestions = [];
      
      // Add the class name itself
      suggestions.push({ text: contextType, type: 'class', score: 1.0 });
      
      // Add methods if they exist in STL data
      if (stlFunctions[contextType]) {
        const methods = stlFunctions[contextType];
        const filteredMethods = prefix ? 
          methods.filter(method => method.startsWith(prefix)) : 
          methods.slice(0, 9); // Limit to top 9 methods
          
        filteredMethods.forEach(method => {
          suggestions.push({ text: method, type: 'method', score: 0.8 });
        });
      }
      
      console.log('[Suggestions API] Header suggestions:', suggestions.length, suggestions);
      return res.status(200).json(suggestions);
    }

    // Parse includes from code
    const includedLibraries = [];
    if (code) {
      const includeRegex = /#include\s*[<"]\s*([a-z_]+)\s*[>"]/g;
      let match;
      while ((match = includeRegex.exec(code)) !== null) {
        includedLibraries.push(match[1]);
      }
    }

    console.log('[Suggestions API] Included libraries:', includedLibraries);

    // Generate suggestions based on context
    let suggestions = [];

    if (contextType === 'global') {
      // Return keywords that match prefix
      suggestions = keywords
        .filter(keyword => keyword.startsWith(prefix))
        .slice(0, 10)
        .map(keyword => ({ text: keyword, type: 'keyword', score: 0.9 }));
    } else if (includedLibraries.includes(contextType) && stlFunctions[contextType]) {
      // Return methods for included library
      const methods = stlFunctions[contextType];
      suggestions = methods
        .filter(method => method.startsWith(prefix))
        .slice(0, 10)
        .map(method => ({ text: method, type: 'method', score: 0.8 }));
      
      // Also include the class name if prefix is empty
      if (!prefix) {
        suggestions.unshift({ text: contextType, type: 'class', score: 1.0 });
      }
    }

    console.log('[Suggestions API] Returning suggestions:', suggestions.length);
    res.status(200).json(suggestions);

  } catch (error) {
    console.error('[Suggestions API] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      suggestions: []
    });
  }
}
