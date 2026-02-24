/**
 * HTTP API Server Bridge
 * Provides REST endpoints to access the native C++ suggestion engine
 * Enables browser-based access without Electron IPC
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));

// Load Native Addon
let suggestionEngine;
try {
  const native = require('./build/Release/codeflow_native.node');
  suggestionEngine = new native.SuggestionEngine();
  
  // Load C++ keywords
  suggestionEngine.loadKeywords(path.join(__dirname, '..', 'data', 'cpp_keywords.txt'));
  
  // Load STL functions database
  suggestionEngine.loadSTLData(path.join(__dirname, '..', 'data', 'stl_functions.json'));
  
  console.log('[HTTP Server] Native module loaded successfully');
  console.log('[HTTP Server] STL data loaded');
} catch (e) {
  console.error('[HTTP Server] Failed to load native module:', e.message);
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
    
    if (!suggestionEngine) {
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
      res.json(result);
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
