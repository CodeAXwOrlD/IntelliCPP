/**
 * HTTP API Server Bridge
 * Provides REST endpoints to access the native C++ suggestion engine
 * Enables browser-based access without Electron IPC
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));

// Set proper encoding headers
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Encoding', 'identity');
  next();
});

// Load Native Addon
let suggestionEngine;
try {
  // Try common locations for the compiled native module
  const candidates = [
    path.join(__dirname, '..', 'dist', 'codeflow_native.node'),
    path.join(__dirname, 'dist', 'codeflow_native.node'),
    path.join(__dirname, 'build', 'Release', 'codeflow_native.node'),
    path.join(__dirname, 'build', 'codeflow_native.node'),
    path.join(__dirname, 'codeflow_native.node'),
  ];

  let nativePath = candidates.find(p => fs.existsSync(p));
  if (!nativePath) {
    console.error('[HTTP Server] Native module not found. Searched:', candidates);
    process.exit(1);
  }

  const native = require(nativePath);
  suggestionEngine = new native.SuggestionEngine();

  // Load C++ keywords and STL functions if present
  const keywordsPath = path.join(__dirname, '..', 'data', 'cpp_keywords.txt');
  const stlPath = path.join(__dirname, '..', 'data', 'stl_functions.json');
  if (fs.existsSync(keywordsPath)) suggestionEngine.loadKeywords(keywordsPath);
  if (fs.existsSync(stlPath)) suggestionEngine.loadSTLData(stlPath);

  console.log('[HTTP Server] Native module loaded from', nativePath);
} catch (e) {
  console.error('[HTTP Server] Failed to load native module:', e && e.message ? e.message : e);
  process.exit(1);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', backend: 'online' });
});

// Get suggestions endpoint
app.post('/api/getSuggestions', (req, res) => {
  try {
    const { prefix = '', contextType = 'global', code = '', cursorPosition = 0 } = req.body;
    console.log('[HTTP Server] POST /api/getSuggestions', { prefix, contextType, cursorPosition, codeLen: code.length });
    
    if (!suggestionEngine) {
      console.log('[HTTP Server] Error: suggestionEngine not initialized');
      return res.json([]);
    }
    
    // Update symbol table with current code
    suggestionEngine.updateSymbols(code);
    
    // Get suggestions
    const suggestions = suggestionEngine.getSuggestions(
      prefix,
      contextType,
      code,
      cursorPosition,
      10  // Max 10 suggestions
    );
    console.log('[HTTP Server] Returning', suggestions.length, 'suggestions');
    
    res.json(suggestions || []);
  } catch (err) {
    console.error('[HTTP Server] Error getting suggestions:', err.message);
    res.json([]);
  }
});

// Get stats endpoint
app.post('/api/getStats', (req, res) => {
  try {
    const { code = '' } = req.body;
    
    if (!suggestionEngine) {
      return res.json({
        symbolCount: 0,
        includedLibraries: [],
        symbolTable: {}
      });
    }
    
    suggestionEngine.updateSymbols(code);
    const count = suggestionEngine.getSymbolCount();
    const libs = suggestionEngine.getIncludedLibraries();
    const symbols = suggestionEngine.getSymbolTable();
    
    res.json({
      symbolCount: count,
      includedLibraries: libs || [],
      symbolTable: symbols || {}
    });
  } catch (err) {
    console.error('[HTTP Server] Error getting stats:', err.message);
    res.json({
      symbolCount: 0,
      includedLibraries: [],
      symbolTable: {}
    });
  }
});

// Run C++ code endpoint (Feature 1)
app.post('/api/runCode', (req, res) => {
  try {
    const { code = '' } = req.body;
    
    if (!suggestionEngine) {
      return res.json({
        success: false,
        output: '',
        error: 'Backend not initialized'
      });
    }
    
    // Call the C++ runCode function if available
    if (suggestionEngine.runCode) {
      const result = suggestionEngine.runCode(code);
      // The C++ function returns a JSON string, so we parse it and send as JSON
      try {
        const parsed = JSON.parse(result);
        res.json(parsed);
      } catch (e) {
        // If parsing fails, send as-is
        res.json({ success: false, output: '', error: 'Failed to parse C++ result' });
      }
    } else {
      res.json({
        success: false,
        output: '',
        error: 'Code execution not available in this build'
      });
    }
  } catch (err) {
    console.error('[HTTP Server] Error running code:', err.message);
    res.json({
      success: false,
      output: '',
      error: err.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[HTTP Server] CodeFlow API Server running on http://localhost:${PORT}`);
  console.log(`[HTTP Server] Endpoints:`);
  console.log(`  - GET  /health`);
  console.log(`  - POST /api/getSuggestions`);
  console.log(`  - POST /api/getStats`);
  console.log(`  - POST /api/runCode`);
});

// Serve prebuilt frontend if available so you can open in Chrome without Electron
const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  // All other GETs serve index.html for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
  console.log('[HTTP Server] Serving frontend from', frontendBuild);
} else {
  console.warn('[HTTP Server] Frontend build not found at', frontendBuild, '— build it with `npm run build:frontend`');
}
