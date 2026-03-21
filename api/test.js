/**
 * Simple test API to debug suggestion issues
 */

const path = require('path');
const fs = require('fs');

// Load Native Addon
let suggestionEngine;
try {
  const nativePath = path.join(__dirname, '..', 'backend', 'build', 'Release', 'codeflow_native.node');
  const native = require(nativePath);
  suggestionEngine = new native.SuggestionEngine();
  console.log('[Test API] Native module loaded from:', nativePath);
} catch (err) {
  console.error('[Test API] Failed to load native module:', err.message);
  process.exit(1);
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
    const { prefix, contextType, code, cursorPosition } = req.body;
    
    console.log('[Test API] Request:', { prefix, contextType, codeLength: code ? code.length : 0 });
    
    // Test basic functionality
    const testCode = '#include <vector>\nusing namespace std;\nvector<int> v; v.';
    
    // Update symbols
    suggestionEngine.updateSymbols(testCode);
    
    // Get suggestions for vector context
    const suggestions = suggestionEngine.getSuggestions('', 'vector', testCode, testCode.length - 1, 10);
    
    console.log('[Test API] Raw suggestions:', suggestions);
    console.log('[Test API] Suggestions count:', suggestions.length);
    
    // Also test what happens with global context
    const globalSuggestions = suggestionEngine.getSuggestions('', 'global', testCode, testCode.length - 1, 10);
    console.log('[Test API] Global suggestions count:', globalSuggestions.length);
    
    res.status(200).json({
      success: true,
      testSuggestions: suggestions,
      globalSuggestions: globalSuggestions,
      contextType: contextType,
      prefix: prefix
    });

  } catch (error) {
    console.error('[Test API] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
