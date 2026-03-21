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
  
  if (fs.existsSync(keywordsPath)) {
    const keywords = fs.readFileSync(keywordsPath, 'utf8').split('\n').filter(k => k.trim());
    suggestionEngine.loadKeywords(keywordsPath);
    console.log(`[HTTP Server] Loaded ${keywords.length} C++ keywords`);
  }

  if (fs.existsSync(stlPath)) {
    const stlFunctions = JSON.parse(fs.readFileSync(stlPath, 'utf8'));
    suggestionEngine.loadSTLData(stlPath);
    console.log(`[HTTP Server] Loaded ${Object.keys(stlFunctions).length} STL function categories`);
    console.log('[HTTP Server] STL categories:', Object.keys(stlFunctions));
  }

  // Test include parsing
  const testCode = '#include <vector>\nusing namespace std;\nvector<int> v;';
  console.log('[HTTP Server] Testing include parsing with code:', testCode);
  const includes = testCode.match(/#include\s*<\s*([a-z_]+)\s*>/);
  console.log('[HTTP Server] Parsed includes:', includes);
  console.log('[HTTP Server] Extracted library:', includes ? includes[1] : 'none');

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
  console.log('[HTTP Server] REQUEST RECEIVED!');
  try {
    const { prefix = '', contextType = 'global', code = '', cursorPosition = 0 } = req.body;
    console.log('[HTTP Server] Request data:', { prefix, contextType, codeLength: code ? code.length : 0 });
    
    // Simple test: if context is stack, return stack methods directly
    if (contextType === 'stack') {
      console.log('[HTTP Server] RETURNING STACK METHODS!');
      const stackMethods = [
        { text: "stack", type: "class", score: 1.0 },
        { text: "push", type: "method", score: 0.8 },
        { text: "pop", type: "method", score: 0.8 },
        { text: "top", type: "method", score: 0.8 },
        { text: "empty", type: "method", score: 0.8 },
        { text: "size", type: "method", score: 0.8 },
        { text: "emplace", type: "method", score: 0.8 },
        { text: "swap", type: "method", score: 0.8 }
      ];
      res.json(stackMethods);
      return;
    }
    
    // Simple test: if context is vector, return vector methods directly
    if (contextType === 'vector') {
      console.log('[HTTP Server] RETURNING VECTOR METHODS!');
      const vectorMethods = [
        { text: "vector", type: "class", score: 1.0 },
        { text: "push_back", type: "method", score: 0.8 },
        { text: "pop_back", type: "method", score: 0.8 },
        { text: "size", type: "method", score: 0.8 },
        { text: "empty", type: "method", score: 0.8 },
        { text: "begin", type: "method", score: 0.8 },
        { text: "end", type: "method", score: 0.8 },
        { text: "at", type: "method", score: 0.8 },
        { text: "front", type: "method", score: 0.8 },
        { text: "back", type: "method", score: 0.8 }
      ];
      res.json(vectorMethods);
      return;
    }
    
    // Simple test: if context is queue, return queue methods directly
    if (contextType === 'queue') {
      console.log('[HTTP Server] RETURNING QUEUE METHODS!');
      const queueMethods = [
        { text: "queue", type: "class", score: 1.0 },
        { text: "push", type: "method", score: 0.8 },
        { text: "pop", type: "method", score: 0.8 },
        { text: "front", type: "method", score: 0.8 },
        { text: "back", type: "method", score: 0.8 },
        { text: "empty", type: "method", score: 0.8 },
        { text: "size", type: "method", score: 0.8 },
        { text: "emplace", type: "method", score: 0.8 },
        { text: "swap", type: "method", score: 0.8 }
      ];
      res.json(queueMethods);
      return;
    }
    
    // Simple test: if context is map, return map methods directly
    if (contextType === 'map') {
      console.log('[HTTP Server] RETURNING MAP METHODS!');
      const mapMethods = [
        { text: "map", type: "class", score: 1.0 },
        { text: "insert", type: "method", score: 0.8 },
        { text: "erase", type: "method", score: 0.8 },
        { text: "find", type: "method", score: 0.8 },
        { text: "count", type: "method", score: 0.8 },
        { text: "empty", type: "method", score: 0.8 },
        { text: "size", type: "method", score: 0.8 },
        { text: "clear", type: "method", score: 0.8 },
        { text: "begin", type: "method", score: 0.8 },
        { text: "end", type: "method", score: 0.8 }
      ];
      res.json(mapMethods);
      return;
    }
    
    // Simple test: if context is set, return set methods directly
    if (contextType === 'set') {
      console.log('[HTTP Server] RETURNING SET METHODS!');
      const setMethods = [
        { text: "set", type: "class", score: 1.0 },
        { text: "insert", type: "method", score: 0.8 },
        { text: "erase", type: "method", score: 0.8 },
        { text: "find", type: "method", score: 0.8 },
        { text: "count", type: "method", score: 0.8 },
        { text: "empty", type: "method", score: 0.8 },
        { text: "size", type: "method", score: 0.8 },
        { text: "clear", type: "method", score: 0.8 },
        { text: "begin", type: "method", score: 0.8 },
        { text: "end", type: "method", score: 0.8 }
      ];
      res.json(setMethods);
      return;
    }
    
    // Simple test: if context is string, return string methods directly
    if (contextType === 'string') {
      console.log('[HTTP Server] RETURNING STRING METHODS!');
      const stringMethods = [
        { text: "string", type: "class", score: 1.0 },
        { text: "length", type: "method", score: 0.8 },
        { text: "size", type: "method", score: 0.8 },
        { text: "substr", type: "method", score: 0.8 },
        { text: "find", type: "method", score: 0.8 },
        { text: "replace", type: "method", score: 0.8 },
        { text: "append", type: "method", score: 0.8 },
        { text: "push_back", type: "method", score: 0.8 },
        { text: "pop_back", type: "method", score: 0.8 },
        { text: "clear", type: "method", score: 0.8 }
      ];
      res.json(stringMethods);
      return;
    }
    
    if (!suggestionEngine) {
      return res.json([]);
    }
    
    // Update symbol table with current code
    suggestionEngine.updateSymbols(code);
    
    // Special handling for header context - when user types #include <header>
    console.log('[HTTP Server] Debug: contextType =', contextType);
    console.log('[HTTP Server] Debug: includes check =', ['vector', 'stack', 'queue', 'deque', 'map', 'set', 'string', 'list', 'algorithm', 'iostream'].includes(contextType));
    
    if (contextType && ['vector', 'stack', 'queue', 'deque', 'map', 'set', 'string', 'list', 'algorithm', 'iostream'].includes(contextType)) {
      console.log('[HTTP Server] ENTERING header context for:', contextType);
      try {
        // Load STL functions data directly
        const stlPath = path.join(__dirname, '..', 'data', 'stl_functions.json');
        const stlFunctions = JSON.parse(fs.readFileSync(stlPath, 'utf8'));
        
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
        
        res.json(suggestions);
        return;
      } catch (err) {
        console.error('[HTTP Server] Error in header context:', err.message);
        // Fall through to normal processing
      }
    }
    
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
