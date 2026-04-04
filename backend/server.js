/**
 * IntelliCPP HTTP API Server - Merged Backend
 * 
 * Combines:
 * - C++ N-API bridge from original server.js (native module integration)
 * - Enhanced STL symbol database from v2
 * - Rate limiting and structured endpoints from v2
 * - Relevance ranking and analytics
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://intelli-cpp.vercel.app",
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-Session-Id"],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));

// Set proper encoding headers
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Encoding', 'identity');
  next();
});

// Rate limiting (simple in-memory)
const rateLimitMap = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const window = 60_000; // 1 minute
  const maxReqs = 200;
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > window) { entry.count = 0; entry.start = now; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  res.setHeader("X-RateLimit-Limit", maxReqs);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, maxReqs - entry.count));
  if (entry.count > maxReqs) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again in a minute." });
  }
  next();
}
app.use(rateLimit);

// Request timing
app.use((req, res, next) => {
  req._startTime = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - req._startTime) / 1e6;
    res.setHeader("X-Response-Time", `${ms.toFixed(2)}ms`);
  });
  next();
});

// ─────────────────────────────────────────────
// STRUCTURED STL SYMBOL DATABASE (from v2)
// ─────────────────────────────────────────────
const STL_DB = {
  vector: {
    header: "<vector>",
    category: "container",
    complexity: "dynamic array",
    since: "C++98",
    symbols: [
      { name: "push_back", returnType: "void", params: "const T& val", complexity: "O(1) amortized", doc: "Appends element to end, reallocating if necessary.", since: "C++98" },
      { name: "pop_back", returnType: "void", params: "", complexity: "O(1)", doc: "Removes last element. UB if empty.", since: "C++98" },
      { name: "emplace_back", returnType: "T&", params: "Args&&... args", complexity: "O(1) amortized", doc: "In-place construction at end. More efficient than push_back for complex types.", since: "C++11" },
      { name: "size", returnType: "size_type", params: "", complexity: "O(1)", doc: "Returns number of elements.", since: "C++98" },
      { name: "empty", returnType: "bool", params: "", complexity: "O(1)", doc: "Returns true if size() == 0.", since: "C++98" },
      { name: "clear", returnType: "void", params: "", complexity: "O(n)", doc: "Destroys all elements. Capacity unchanged.", since: "C++98" },
      { name: "begin", returnType: "iterator", params: "", complexity: "O(1)", doc: "Iterator to first element.", since: "C++98" },
      { name: "end", returnType: "iterator", params: "", complexity: "O(1)", doc: "Iterator past last element.", since: "C++98" },
      { name: "at", returnType: "T&", params: "size_type n", complexity: "O(1)", doc: "Bounds-checked access. Throws std::out_of_range.", since: "C++98" },
      { name: "front", returnType: "T&", params: "", complexity: "O(1)", doc: "Access first element. UB if empty.", since: "C++98" },
      { name: "back", returnType: "T&", params: "", complexity: "O(1)", doc: "Access last element. UB if empty.", since: "C++98" },
      { name: "resize", returnType: "void", params: "size_type n", complexity: "O(n)", doc: "Resizes to n elements. New elements are value-initialized.", since: "C++98" },
      { name: "reserve", returnType: "void", params: "size_type n", complexity: "O(n)", doc: "Reserves capacity for n elements. No effect if n <= capacity().", since: "C++98" },
      { name: "capacity", returnType: "size_type", params: "", complexity: "O(1)", doc: "Returns number of elements that can be held in current allocation.", since: "C++98" },
      { name: "insert", returnType: "iterator", params: "iterator pos, const T& val", complexity: "O(n)", doc: "Insert before pos. Invalidates iterators if reallocation occurs.", since: "C++98" },
      { name: "erase", returnType: "iterator", params: "iterator pos", complexity: "O(n)", doc: "Erase at pos. Returns iterator to next element.", since: "C++98" },
    ],
  },
  string: {
    header: "<string>",
    category: "container",
    complexity: "dynamic char array",
    since: "C++98",
    symbols: [
      { name: "length", returnType: "size_type", params: "", complexity: "O(1)", doc: "Returns string length.", since: "C++98" },
      { name: "size", returnType: "size_type", params: "", complexity: "O(1)", doc: "Same as length().", since: "C++98" },
      { name: "empty", returnType: "bool", params: "", complexity: "O(1)", doc: "Returns true if length is 0.", since: "C++98" },
      { name: "clear", returnType: "void", params: "", complexity: "O(1)", doc: "Clears all characters.", since: "C++98" },
      { name: "substr", returnType: "string", params: "size_t pos=0, size_t len=npos", complexity: "O(n)", doc: "Returns substring. Throws if pos > size.", since: "C++98" },
      { name: "find", returnType: "size_t", params: "const string& s, size_t pos=0", complexity: "O(n*m)", doc: "First occurrence at or after pos. Returns npos if not found.", since: "C++98" },
      { name: "append", returnType: "string&", params: "const string& s", complexity: "O(n)", doc: "Appends s to end.", since: "C++98" },
      { name: "insert", returnType: "string&", params: "size_t pos, const string& s", complexity: "O(n)", doc: "Inserts s at position pos.", since: "C++98" },
      { name: "erase", returnType: "string&", params: "size_t pos=0, size_t len=npos", complexity: "O(n)", doc: "Erases len characters starting at pos.", since: "C++98" },
      { name: "c_str", returnType: "const char*", params: "", complexity: "O(1)", doc: "Null-terminated C string. Valid until next modification.", since: "C++98" },
    ],
  },
  map: {
    header: "<map>",
    category: "associative",
    complexity: "balanced BST (red-black tree)",
    since: "C++98",
    symbols: [
      { name: "insert", returnType: "pair<iterator,bool>", params: "{key, val}", complexity: "O(log n)", doc: "Inserts if key absent. Returns {iterator, inserted}.", since: "C++98" },
      { name: "find", returnType: "iterator", params: "const Key& k", complexity: "O(log n)", doc: "Returns iterator to k, or end() if not found.", since: "C++98" },
      { name: "erase", returnType: "size_type", params: "const Key& k", complexity: "O(log n)", doc: "Removes element by key. Returns number removed.", since: "C++98" },
      { name: "count", returnType: "size_type", params: "const Key& k", complexity: "O(log n)", doc: "Returns 1 if key exists, 0 otherwise.", since: "C++98" },
      { name: "size", returnType: "size_type", params: "", complexity: "O(1)", doc: "Number of elements.", since: "C++98" },
      { name: "empty", returnType: "bool", params: "", complexity: "O(1)", doc: "Returns true if no elements.", since: "C++98" },
      { name: "clear", returnType: "void", params: "", complexity: "O(n)", doc: "Destroys all elements.", since: "C++98" },
      { name: "begin", returnType: "iterator", params: "", complexity: "O(1)", doc: "Iterator to smallest element.", since: "C++98" },
      { name: "end", returnType: "iterator", params: "", complexity: "O(1)", doc: "Iterator past largest element.", since: "C++98" },
      { name: "operator[]", returnType: "V&", params: "const Key& k", complexity: "O(log n)", doc: "Insert default if absent; access if present.", since: "C++98" },
      { name: "at", returnType: "V&", params: "const Key& k", complexity: "O(log n)", doc: "Bounds-checked access. Throws std::out_of_range if absent.", since: "C++98" },
    ],
  },
  unordered_map: {
    header: "<unordered_map>",
    category: "associative",
    complexity: "hash table",
    since: "C++11",
    symbols: [
      { name: "insert", returnType: "pair<iterator,bool>", params: "{key, val}", complexity: "O(1) avg", doc: "Inserts if key absent.", since: "C++11" },
      { name: "find", returnType: "iterator", params: "const Key& k", complexity: "O(1) avg", doc: "O(1) avg lookup vs map's O(log n).", since: "C++11" },
      { name: "operator[]", returnType: "V&", params: "const Key& k", complexity: "O(1) avg", doc: "Access or insert default.", since: "C++11" },
      { name: "at", returnType: "V&", params: "const Key& k", complexity: "O(1) avg", doc: "Throws if not found.", since: "C++11" },
      { name: "size", returnType: "size_type", params: "", complexity: "O(1)", doc: "Number of elements.", since: "C++11" },
    ],
  },
  set: {
    header: "<set>",
    category: "associative",
    complexity: "balanced BST",
    since: "C++98",
    symbols: [
      { name: "insert", returnType: "pair<iterator,bool>", params: "const T& val", complexity: "O(log n)", doc: "Inserts value. Returns {iter, inserted}.", since: "C++98" },
      { name: "find", returnType: "iterator", params: "const T& val", complexity: "O(log n)", doc: "Iterator to val, or end().", since: "C++98" },
      { name: "erase", returnType: "size_type", params: "const T& val", complexity: "O(log n)", doc: "Remove val.", since: "C++98" },
      { name: "count", returnType: "size_type", params: "const T& val", complexity: "O(log n)", doc: "1 if present, 0 otherwise.", since: "C++98" },
      { name: "size", returnType: "size_type", params: "", complexity: "O(1)", doc: "Number of unique elements.", since: "C++98" },
      { name: "empty", returnType: "bool", params: "", complexity: "O(1)", doc: "True if no elements.", since: "C++98" },
    ],
  },
  stack: {
    header: "<stack>",
    category: "adaptor",
    complexity: "deque-backed LIFO",
    since: "C++98",
    symbols: [
      { name: "push", returnType: "void", params: "const T& val", complexity: "O(1) amortized", doc: "Push to top.", since: "C++98" },
      { name: "pop", returnType: "void", params: "", complexity: "O(1)", doc: "Remove top. UB if empty.", since: "C++98" },
      { name: "top", returnType: "T&", params: "", complexity: "O(1)", doc: "Access top element. UB if empty.", since: "C++98" },
      { name: "empty", returnType: "bool", params: "", complexity: "O(1)", doc: "True if no elements.", since: "C++98" },
      { name: "size", returnType: "size_type", params: "", complexity: "O(1)", doc: "Number of elements.", since: "C++98" },
    ],
  },
  queue: {
    header: "<queue>",
    category: "adaptor",
    complexity: "deque-backed FIFO",
    since: "C++98",
    symbols: [
      { name: "push", returnType: "void", params: "const T& val", complexity: "O(1)", doc: "Add to back.", since: "C++98" },
      { name: "pop", returnType: "void", params: "", complexity: "O(1)", doc: "Remove from front.", since: "C++98" },
      { name: "front", returnType: "T&", params: "", complexity: "O(1)", doc: "Access front element.", since: "C++98" },
      { name: "back", returnType: "T&", params: "", complexity: "O(1)", doc: "Access back element.", since: "C++98" },
      { name: "empty", returnType: "bool", params: "", complexity: "O(1)", doc: "True if empty.", since: "C++98" },
      { name: "size", returnType: "size_type", params: "", complexity: "O(1)", doc: "Number of elements.", since: "C++98" },
    ],
  },
  algorithm: {
    header: "<algorithm>",
    category: "utility",
    complexity: "various",
    since: "C++98",
    symbols: [
      { name: "sort", returnType: "void", params: "It first, It last", complexity: "O(n log n)", doc: "Introsort (quicksort + heapsort hybrid). Requires RandomAccessIterator.", since: "C++98" },
      { name: "find", returnType: "It", params: "It first, It last, const T& val", complexity: "O(n)", doc: "First occurrence of val. Returns last if not found.", since: "C++98" },
      { name: "binary_search", returnType: "bool", params: "It first, It last, const T& val", complexity: "O(log n)", doc: "Requires sorted range.", since: "C++98" },
      { name: "lower_bound", returnType: "It", params: "It first, It last, const T& val", complexity: "O(log n)", doc: "First element >= val. Requires sorted.", since: "C++98" },
      { name: "upper_bound", returnType: "It", params: "It first, It last, const T& val", complexity: "O(log n)", doc: "First element > val. Requires sorted.", since: "C++98" },
      { name: "reverse", returnType: "void", params: "It first, It last", complexity: "O(n)", doc: "Reverses in-place. Requires BidirectionalIterator.", since: "C++98" },
      { name: "max_element", returnType: "It", params: "It first, It last", complexity: "O(n)", doc: "Iterator to maximum element.", since: "C++98" },
      { name: "min_element", returnType: "It", params: "It first, It last", complexity: "O(n)", doc: "Iterator to minimum element.", since: "C++98" },
      { name: "count", returnType: "ptrdiff_t", params: "It first, It last, const T& val", complexity: "O(n)", doc: "Count occurrences of val.", since: "C++98" },
      { name: "copy", returnType: "It2", params: "It first, It last, It2 out", complexity: "O(n)", doc: "Copy range to output.", since: "C++98" },
    ],
  },
};

const TOTAL_SYMBOLS = Object.values(STL_DB).reduce((s, c) => s + c.symbols.length, 0);

// Build Trie for O(L) prefix search
class TrieNode {
  constructor() {
    this.children = new Map();
    this.symbols = [];
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }
  insert(symbol, containerKey) {
    let node = this.root;
    const key = symbol.name.toLowerCase();
    for (const ch of key) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
    }
    node.symbols.push({ ...symbol, container: containerKey });
  }
  prefixSearch(prefix) {
    let node = this.root;
    for (const ch of prefix.toLowerCase()) {
      if (!node.children.has(ch)) return [];
      node = node.children.get(ch);
    }
    const results = [];
    const dfs = (n) => {
      results.push(...n.symbols);
      for (const child of n.children.values()) dfs(child);
    };
    dfs(node);
    return results;
  }
}

// Index all symbols
const globalTrie = new Trie();
const containerTries = {};

for (const [key, container] of Object.entries(STL_DB)) {
  containerTries[key] = new Trie();
  for (const sym of container.symbols) {
    containerTries[key].insert(sym, key);
    globalTrie.insert(sym, key);
  }
}

// ─────────────────────────────────────────────
// RANKING: score completions by relevance
// ─────────────────────────────────────────────
const COMMON_METHODS = new Set(["size", "empty", "begin", "end", "insert", "erase", "find", "clear", "push_back", "pop_back", "at", "sort", "count"]);

function rankResults(results, query) {
  return results
    .map((r) => {
      let score = 0;
      const name = r.name.toLowerCase();
      const q = query.toLowerCase();
      if (name === q) score += 100;
      else if (name.startsWith(q)) score += 50;
      if (COMMON_METHODS.has(r.name)) score += 10;
      if (r.since === "C++20" || r.since === "C++23") score -= 5;
      return { ...r, score };
    })
    .sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────
const analytics = {
  totalRequests: 0,
  queries: [],
  topContainers: new Map(),
  topQueries: new Map(),
};

function trackQuery(container, query) {
  analytics.totalRequests++;
  if (container) {
    analytics.topContainers.set(container, (analytics.topContainers.get(container) || 0) + 1);
  }
  if (query) {
    analytics.topQueries.set(query, (analytics.topQueries.get(query) || 0) + 1);
  }
}

// ─────────────────────────────────────────────
// LOAD NATIVE C++ ADDON (from server.js)
// ─────────────────────────────────────────────
let suggestionEngine;
try {
  const candidates = [
    path.join(__dirname, '..', 'dist', 'codeflow_native.node'),
    path.join(__dirname, 'dist', 'codeflow_native.node'),
    path.join(__dirname, 'build', 'Release', 'codeflow_native.node'),
    path.join(__dirname, 'build', 'codeflow_native.node'),
    path.join(__dirname, 'codeflow_native.node'),
  ];

  let nativePath = candidates.find(p => fs.existsSync(p));
  if (!nativePath) {
    console.warn('[Server] Native module not found. Using JavaScript fallback for suggestions.');
    suggestionEngine = null;
  } else {
    const native = require(nativePath);
    suggestionEngine = new native.SuggestionEngine();

    const keywordsPath = path.join(__dirname, '..', 'data', 'cpp_keywords.txt');
    const stlPath = path.join(__dirname, '..', 'data', 'stl_functions.json');
    
    if (fs.existsSync(keywordsPath)) {
      const keywords = fs.readFileSync(keywordsPath, 'utf8').split('\n').filter(k => k.trim());
      suggestionEngine.loadKeywords(keywordsPath);
      console.log(`[Server] Loaded ${keywords.length} C++ keywords`);
    }

    if (fs.existsSync(stlPath)) {
      const stlFunctions = JSON.parse(fs.readFileSync(stlPath, 'utf8'));
      suggestionEngine.loadSTLData(stlPath);
      console.log(`[Server] Loaded ${Object.keys(stlFunctions).length} STL function categories`);
    }

    console.log('[Server] Native C++ module loaded from', nativePath);
  }
} catch (e) {
  console.warn('[Server] Failed to load native module:', e?.message || e);
  suggestionEngine = null;
}

// Simple type inference
function inferVariableType(variableName, code) {
  if (!code || !variableName) return null;
  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    const patterns = [
      new RegExp(`\\b([a-zA-Z_][a-zA-Z0-9_<>\s]*?)\\s+${variableName}\\s*[;=]`),
      new RegExp(`\\bstd::([a-zA-Z_][a-zA-Z0-9_<>\s]*?)\\s+${variableName}\\s*[;=]`),
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(trimmed);
      if (match) {
        return (match[1] || match[2]).trim().split(/[<\s]/)[0];
      }
    }
  }
  return null;
}

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || path.join(__dirname, '..');

function safePath(targetPath) {
  const absolute = path.resolve(WORKSPACE_ROOT, targetPath || '');
  if (!absolute.startsWith(path.resolve(WORKSPACE_ROOT))) {
    throw new Error('Path outside workspace not allowed');
  }
  return absolute;
}

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    symbolsIndexed: TOTAL_SYMBOLS,
    containersIndexed: Object.keys(STL_DB).length,
    nativeModuleLoaded: !!suggestionEngine,
    timestamp: new Date().toISOString(),
    version: "2.0.0",
  });
});

// List all containers
app.get("/api/containers", (req, res) => {
  const containers = Object.entries(STL_DB).map(([key, val]) => ({
    name: key,
    header: val.header,
    category: val.category,
    complexity: val.complexity,
    since: val.since,
    symbolCount: val.symbols.length,
  }));
  res.json({ containers, total: containers.length });
});

// Get symbols for a container
app.get("/api/container/:name", (req, res) => {
  const { name } = req.params;
  const container = STL_DB[name];
  if (!container) {
    return res.status(404).json({ error: `Container '${name}' not found.`, available: Object.keys(STL_DB) });
  }
  res.json({
    name,
    ...container,
    symbolCount: container.symbols.length,
  });
});

// Autocomplete endpoint (with native module + ranking fallback)
app.post("/api/getSuggestions", (req, res) => {
  try {
    const { prefix = '', contextType = 'global', code = '', cursorPosition = 0 } = req.body;
    console.log('[Server] REQUEST RECEIVED!');
    console.log('[Server] Request data:', { prefix, contextType, codeLength: code ? code.length : 0 });
    
    let actualContextType = contextType;
    
    // Try native module first
    if (suggestionEngine && actualContextType !== 'global') {
      if (!['vector', 'stack', 'queue', 'deque', 'map', 'set', 'string', 'list', 'algorithm', 'iostream'].includes(actualContextType)) {
        const inferredType = inferVariableType(actualContextType, code);
        if (inferredType) {
          console.log(`[Server] Using inferred type: ${inferredType}`);
          actualContextType = inferredType;
        } else {
          actualContextType = 'global';
        }
      }
    }

    // Load STL data if available
    const stlPath = path.join(__dirname, '..', 'data', 'stl_functions.json');
    let stlFunctions = {};
    if (fs.existsSync(stlPath)) {
      stlFunctions = JSON.parse(fs.readFileSync(stlPath, 'utf8'));
    }

    // Handle STL types with loaded data
    if (actualContextType !== 'global' && stlFunctions[actualContextType]) {
      console.log(`[Server] RETURNING ${actualContextType.toUpperCase()} METHODS!`);
      const suggestions = [];
      suggestions.push({ text: actualContextType, type: 'class', score: 1.0 });
      const methods = stlFunctions[actualContextType];
      const filteredMethods = prefix ? 
        methods.filter(method => method.startsWith(prefix)) : 
        methods.slice(0, 9);
      filteredMethods.forEach(method => {
        suggestions.push({ text: method, type: 'method', score: 0.8 });
      });
      res.json(suggestions);
      return;
    }

    // Global context - return keywords
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

    // Fall back to native module if available
    if (suggestionEngine) {
      suggestionEngine.updateSymbols(code);
      const suggestions = suggestionEngine.getSuggestions(
        prefix,
        contextType,
        code,
        cursorPosition,
        10
      );
      res.json(suggestions || []);
      return;
    }

    res.json([]);
  } catch (err) {
    console.error('[Server] Error getting suggestions:', err.message);
    res.json([]);
  }
});

// Full-text search across all symbols
app.get("/api/search", (req, res) => {
  const { q = "", limit = "30" } = req.query;
  if (!q.trim()) return res.status(400).json({ error: "Search query required." });

  const results = [];
  const ql = q.toLowerCase();

  for (const [containerKey, container] of Object.entries(STL_DB)) {
    for (const sym of container.symbols) {
      const nameLower = sym.name.toLowerCase();
      const docLower = sym.doc.toLowerCase();
      if (nameLower.includes(ql) || docLower.includes(ql) || sym.params.toLowerCase().includes(ql)) {
        let score = 0;
        if (nameLower.startsWith(ql)) score += 50;
        else if (nameLower.includes(ql)) score += 20;
        if (docLower.includes(ql)) score += 5;
        results.push({ ...sym, container: containerKey, score });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  const limited = results.slice(0, parseInt(limit, 10));

  res.json({
    query: q,
    results: limited,
    total: results.length,
    shown: limited.length,
  });
});

// Context-aware suggestions
app.post("/api/context-complete", (req, res) => {
  const { headers = [], prefix = "", limit = 25 } = req.body;

  const headerToContainer = {
    "<vector>": "vector", "<string>": "string", "<map>": "map",
    "<unordered_map>": "unordered_map", "<set>": "set",
    "<stack>": "stack", "<queue>": "queue", "<algorithm>": "algorithm",
  };

  const containers = headers
    .map((h) => headerToContainer[h])
    .filter(Boolean);

  let results = [];
  for (const c of containers) {
    if (!STL_DB[c]) continue;
    const symbols = prefix
      ? containerTries[c].prefixSearch(prefix)
      : STL_DB[c].symbols.map((s) => ({ ...s, container: c }));
    results.push(...symbols);
  }

  const ranked = rankResults(results, prefix).slice(0, limit);
  res.json({ prefix, headers, results: ranked, total: ranked.length });
});

// Analytics endpoint
app.get("/api/stats", (req, res) => {
  const topContainers = [...analytics.topContainers.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topQueries = [...analytics.topQueries.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 10);

  res.json({
    totalRequests: analytics.totalRequests,
    totalSymbols: TOTAL_SYMBOLS,
    totalContainers: Object.keys(STL_DB).length,
    topContainers: Object.fromEntries(topContainers),
    topQueries: Object.fromEntries(topQueries),
    uptime: Math.round(process.uptime()),
  });
});

// Get stats endpoint (for code analysis)
app.post("/api/getStats", (req, res) => {
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
    console.error('[Server] Error getting stats:', err.message);
    res.json({
      symbolCount: 0,
      includedLibraries: [],
      symbolTable: {}
    });
  }
});

// Run C++ code endpoint
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
    
    if (suggestionEngine.runCode) {
      const result = suggestionEngine.runCode(code);
      try {
        const parsed = JSON.parse(result);
        res.json(parsed);
      } catch (e) {
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
    console.error('[Server] Error running code:', err.message);
    res.json({
      success: false,
      output: '',
      error: err.message
    });
  }
});

// Workspace file management (legacy endpoints)
app.post('/api/listWorkspace', (req, res) => {
  const { subpath = '' } = req.body;
  try {
    const dirPath = safePath(subpath);
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const tree = entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(subpath, entry.name)
    })).sort((a, b) => {
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
      return a.isDirectory ? -1 : 1;
    });
    res.json({ path: subpath, entries: tree });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/readFile', (req, res) => {
  const { filePath } = req.body;
  try {
    const target = safePath(filePath);
    if (!fs.existsSync(target)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const stat = fs.statSync(target);
    if (!stat.isFile()) {
      return res.status(400).json({ error: 'Not a file' });
    }
    const content = fs.readFileSync(target, 'utf8');
    res.json({ filePath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/writeFile', (req, res) => {
  const { filePath, content } = req.body;
  try {
    const target = safePath(filePath);
    if (!fs.existsSync(path.dirname(target))) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
    }
    fs.writeFileSync(target, content, 'utf8');
    res.json({ success: true, filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: `Route ${req.path} not found.`, 
    routes: ["/health", "/api/containers", "/api/container/:name", "/api/search", "/api/context-complete", "/api/stats", "/api/getSuggestions", "/api/getStats", "/api/runCode"] 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error." });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n⚡ IntelliCPP Backend Server v2.0`);
  console.log(`   Port:    ${PORT}`);
  console.log(`   Symbols: ${TOTAL_SYMBOLS}`);
  console.log(`   Containers: ${Object.keys(STL_DB).length}`);
  console.log(`   Native Module: ${suggestionEngine ? 'Loaded' : 'Fallback'}`);
  console.log(`   Endpoints: /health /api/getSuggestions /api/getStats /api/runCode /api/search /api/context-complete\n`);
});

// Serve prebuilt frontend if available
const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
  console.log('[Server] Serving frontend from', frontendBuild);
} else {
  console.warn('[Server] Frontend build not found — build it with `npm run build:frontend`');
}

module.exports = app;
