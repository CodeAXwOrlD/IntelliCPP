/**
 * Vercel Serverless Function for Suggestions
 * Provides autocomplete suggestions for C++ code
 */

const path = require('path');
const fs = require('fs');

// Load Native Addon
let suggestionEngine;
try {
  // Try common locations for the compiled native module
  const candidates = [
    path.join(__dirname, '..', 'backend', 'dist', 'codeflow_native.node'),
    path.join(__dirname, '..', 'backend', 'build', 'Release', 'codeflow_native.node'),
    path.join(__dirname, '..', 'backend', 'build', 'codeflow_native.node'),
  ];

  let nativePath = candidates.find(p => fs.existsSync(p));
  if (!nativePath) {
    console.error('[Suggestions API] Native module not found. Searched:', candidates);
    throw new Error('Native module not found');
  }

  const native = require(nativePath);
  suggestionEngine = new native.SuggestionEngine();

  // Load C++ keywords and STL functions if present
  const keywordsPath = path.join(__dirname, '..', 'data', 'cpp_keywords.txt');
  const stlPath = path.join(__dirname, '..', 'data', 'stl_functions.json');

  if (fs.existsSync(keywordsPath)) {
    const keywords = fs.readFileSync(keywordsPath, 'utf8').split('\n').filter(k => k.trim());
    suggestionEngine.loadKeywords(keywords);
    console.log(`[Suggestions API] Loaded ${keywords.length} C++ keywords`);
  }

  if (fs.existsSync(stlPath)) {
    const stlFunctions = JSON.parse(fs.readFileSync(stlPath, 'utf8'));
    suggestionEngine.loadSTLFunctions(stlFunctions);
    console.log(`[Suggestions API] Loaded ${Object.keys(stlFunctions).length} STL function categories`);
  }

  console.log('[Suggestions API] Native module loaded from:', nativePath);
} catch (err) {
  console.error('[Suggestions API] Failed to load native module:', err.message);
  suggestionEngine = null;
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
    const { prefix, context = 'global', code, column } = req.body;

    if (!suggestionEngine) {
      return res.status(500).json({
        error: 'Suggestion engine not available',
        suggestions: []
      });
    }

    if (!prefix || typeof prefix !== 'string') {
      return res.status(400).json({
        error: 'Prefix is required and must be a string',
        suggestions: []
      });
    }

    // Get suggestions from native engine
    const suggestions = suggestionEngine.getSuggestions(prefix, context, code || '', column || 0);

    // Format suggestions for frontend
    const formattedSuggestions = suggestions.map(suggestion => ({
      text: suggestion.text || suggestion,
      type: suggestion.type || 'keyword',
      description: suggestion.description || '',
      insertText: suggestion.insertText || suggestion.text || suggestion
    }));

    res.status(200).json({
      success: true,
      suggestions: formattedSuggestions
    });

  } catch (error) {
    console.error('[Suggestions API] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      suggestions: []
    });
  }
}
