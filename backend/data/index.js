/**
 * IntelliCPP Data Loader
 * Dynamically loads and indexes all STL containers from backend/data/stl/*.json
 * and constants from backend/data/constants.json
 */

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
// TRIE — O(L) prefix search per container
// ─────────────────────────────────────────────
class TrieNode {
  constructor() {
    this.children = new Map();
    this.methods = [];
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(method) {
    let node = this.root;
    for (const ch of method.name.toLowerCase()) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
      }
      node = node.children.get(ch);
    }
    node.methods.push(method);
  }

  search(prefix, limit = 50) {
    let node = this.root;
    for (const ch of prefix.toLowerCase()) {
      if (!node.children.has(ch)) return [];
      node = node.children.get(ch);
    }
    const results = [];
    const dfs = (n) => {
      if (results.length >= limit) return;
      for (const m of n.methods) {
        results.push(m);
        if (results.length >= limit) return;
      }
      for (const child of n.children.values()) {
        dfs(child);
        if (results.length >= limit) return;
      }
    };
    dfs(node);
    return results;
  }
}

function loadSTLDatabase() {
  const stlDir = path.join(__dirname, 'stl');
  const stlDb = {};
  const tries = {};
  const methodMaps = {};

  if (fs.existsSync(stlDir)) {
    const files = fs.readdirSync(stlDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const containerKey = path.basename(file, '.json');
      try {
        const fullPath = path.join(stlDir, file);
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        stlDb[containerKey] = data;

        const trie = new Trie();
        const methodMap = new Map();
        if (Array.isArray(data.methods)) {
          for (const method of data.methods) {
            trie.insert(method);
            methodMap.set(method.name, method);
          }
        }
        tries[containerKey] = trie;
        methodMaps[containerKey] = methodMap;
      } catch (err) {
        console.error(`[DataLoader] Failed to load STL definition: ${file}`, err.message);
      }
    }
  }

  return { stlDb, tries, methodMaps };
}

/**
 * Load C++ constants and header mappings
 */
function loadConstants() {
  const constantsPath = path.join(__dirname, 'constants.json');
  if (fs.existsSync(constantsPath)) {
    try {
      return JSON.parse(fs.readFileSync(constantsPath, 'utf8'));
    } catch (err) {
      console.error('[DataLoader] Failed to load constants.json', err.message);
    }
  }
  return {
    ALL_HEADERS: [],
    ALL_STL_TYPES: [],
    TEMPLATE_ARGS: [],
    HEADER_TO_CONTAINERS: {},
    TYPE_TO_KEY: {}
  };
}

const { stlDb: STL_DB, tries: containerTries, methodMaps: STL_METHOD_MAPS } = loadSTLDatabase();
const {
  ALL_HEADERS,
  ALL_STL_TYPES,
  TEMPLATE_ARGS,
  HEADER_TO_CONTAINERS,
  TYPE_TO_KEY
} = loadConstants();

module.exports = {
  STL_DB,
  containerTries,
  STL_METHOD_MAPS,
  ALL_HEADERS,
  ALL_STL_TYPES,
  TEMPLATE_ARGS,
  HEADER_TO_CONTAINERS,
  TYPE_TO_KEY,
  Trie,
  loadSTLDatabase,
  loadConstants
};
