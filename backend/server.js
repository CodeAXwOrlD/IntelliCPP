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

// Simple type inference function
function inferVariableType(variableName, code) {
  if (!code || !variableName) return null;

  // Split code into lines and look for variable declarations
  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

    // Look for patterns like: vector<int> v; or std::vector<int> v;
    // More flexible pattern to capture type before variable name
    const patterns = [
      // Standard declaration: Type var;
      new RegExp(`\\b([a-zA-Z_][a-zA-Z0-9_<>\s]*?)\\s+${variableName}\\s*[;=]`),
      // With std:: prefix: std::Type var;
      new RegExp(`\\bstd::([a-zA-Z_][a-zA-Z0-9_<>\s]*?)\\s+${variableName}\\s*[;=]`),
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(trimmed);
      if (match) {
        let typeDeclaration = match[1] || match[2];
        if (typeDeclaration) {
          // Clean up the type declaration
          typeDeclaration = typeDeclaration.trim();
          // Extract base type (remove template parameters and qualifiers)
          const baseType = typeDeclaration.split(/[<\s]/)[0];
          console.log(`[HTTP Server] Inferred type for ${variableName}: ${baseType} from "${typeDeclaration}"`);
          return baseType;
        }
      }
    }
  }

  console.log(`[HTTP Server] Could not infer type for ${variableName}`);
  return null;
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
    
    let actualContextType = contextType;
    
    // If contextType is not 'global' and not a recognized STL type, try to infer the variable type
    if (contextType !== 'global' && !['vector', 'stack', 'queue', 'deque', 'map', 'set', 'string', 'list', 'algorithm', 'iostream'].includes(contextType)) {
      const inferredType = inferVariableType(contextType, code);
      if (inferredType) {
        console.log(`[HTTP Server] Using inferred type: ${inferredType} for variable ${contextType}`);
        actualContextType = inferredType;
      } else {
        console.log(`[HTTP Server] Could not infer type for ${contextType}, falling back to global`);
        actualContextType = 'global';
      }
    }
    
    // Load STL functions data
    const stlPath = path.join(__dirname, '..', 'data', 'stl_functions.json');
    let stlFunctions = {};
    if (fs.existsSync(stlPath)) {
      stlFunctions = JSON.parse(fs.readFileSync(stlPath, 'utf8'));
    }
    
    // Handle STL types
    if (actualContextType !== 'global' && stlFunctions[actualContextType]) {
      console.log(`[HTTP Server] RETURNING ${actualContextType.toUpperCase()} METHODS!`);
      const suggestions = [];
      
      // Add the class name itself
      suggestions.push({ text: actualContextType, type: 'class', score: 1.0 });
      
      // Add methods
      const methods = stlFunctions[actualContextType];
      const filteredMethods = prefix ? 
        methods.filter(method => method.startsWith(prefix)) : 
        methods.slice(0, 9); // Limit to top 9 methods
        
      filteredMethods.forEach(method => {
        suggestions.push({ text: method, type: 'method', score: 0.8 });
      });
      
      res.json(suggestions);
      return;
    }
    
    // For global context or unknown types, return keywords
    if (actualContextType === 'global') {
      const keywordsPath = path.join(__dirname, '..', 'data', 'cpp_keywords.txt');
      let keywords = [];
      if (fs.existsSync(keywordsPath)) {
        keywords = fs.readFileSync(keywordsPath, 'utf8').split('\n').filter(k => k.trim());
      }
      
      const suggestions = keywords
        .filter(keyword => keyword.startsWith(prefix))
        .slice(0, 10)
        .map(keyword => ({ text: keyword, type: 'keyword', score: 0.9 }));
      
      res.json(suggestions);
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
