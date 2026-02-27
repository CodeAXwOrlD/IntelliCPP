/**
 * Cloud-Compatible API Server
 * Provides REST endpoints for the C++ autocompletion features
 * without native modules for deployment on Vercel/Netlify
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

// Mock C++ keywords and STL functions (in a real implementation, you'd load these from files)
const cppKeywords = [
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
  'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof',
  'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void',
  'volatile', 'while', 'bool', 'class', 'explicit', 'friend', 'inline',
  'mutable', 'namespace', 'operator', 'private', 'protected', 'public',
  'template', 'virtual', 'wchar_t', 'asm', 'dynamic_cast', 'reinterpret_cast',
  'try', 'catch', 'throw', 'using', 'const_cast', 'typeid', 'typename',
  'template', 'alignas', 'alignof', 'constexpr', 'decltype', 'final',
  'noexcept', 'override', 'static_assert', 'thread_local', 'nullptr',
  'override', 'final', 'export', 'static_assert', 'thread_local'
];

const stlFunctions = [
  'cout', 'cin', 'endl', 'vector', 'string', 'array', 'map', 'unordered_map',
  'set', 'unordered_set', 'queue', 'stack', 'deque', 'list', 'forward_list',
  'priority_queue', 'pair', 'tuple', 'function', 'bind', 'mem_fn',
  'shared_ptr', 'unique_ptr', 'weak_ptr', 'allocator', 'addressof',
  'make_shared', 'make_unique', 'move', 'swap', 'forward', 'to_string',
  'stoi', 'stol', 'stoll', 'stoul', 'stoull', 'stof', 'stod', 'stold',
  'size', 'empty', 'clear', 'begin', 'end', 'rbegin', 'rend', 'push',
  'pop', 'top', 'front', 'back', 'insert', 'erase', 'emplace', 'emplace_back',
  'reserve', 'resize', 'capacity', 'max_size', 'shrink_to_fit', 'assign',
  'at', 'operator[]', 'data', 'c_str', 'substr', 'compare', 'find', 'rfind',
  'find_first_of', 'find_last_of', 'find_first_not_of', 'find_last_not_of',
  'count', 'lower_bound', 'upper_bound', 'equal_range', 'binary_search',
  'sort', 'reverse', 'next_permutation', 'prev_permutation', 'rotate',
  'random_shuffle', 'partition', 'stable_partition', 'merge', 'inplace_merge',
  'includes', 'set_union', 'set_intersection', 'set_difference',
  'set_symmetric_difference', 'push_heap', 'pop_heap', 'make_heap',
  'is_heap', 'sort_heap', 'min', 'max', 'minmax', 'min_element', 'max_element',
  'minmax_element', 'accumulate', 'inner_product', 'adjacent_difference',
  'partial_sum', 'iota', 'gcd', 'lcm', 'reduce', 'transform_reduce',
  'transform_inclusive_scan', 'transform_exclusive_scan', 'inclusive_scan',
  'exclusive_scan', 'is_sorted', 'is_sorted_until', 'is_partitioned',
  'is_heap_until', 'all_of', 'any_of', 'none_of', 'for_each', 'for_each_n',
  'copy', 'copy_n', 'copy_if', 'copy_backward', 'move', 'move_backward',
  'fill', 'fill_n', 'generate', 'generate_n', 'remove', 'remove_if',
  'remove_copy', 'remove_copy_if', 'replace', 'replace_if', 'replace_copy',
  'replace_copy_if', 'swap_ranges', 'iter_swap', 'reverse_copy',
  'rotate_copy', 'shuffle', 'sample', 'unique', 'unique_copy', 'is_permutation',
  'search', 'search_n', 'find_end', 'find_first_of', 'adjacent_find',
  'mismatch', 'equal', 'lexicographical_compare', 'is_disjoint', 'is_subset',
  'is_proper_subset', 'is_superset', 'is_proper_superset', 'set_symmetric_difference',
  'shift_left', 'shift_right'
];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', backend: 'online', cloudCompatible: true });
});

// Get suggestions endpoint - mock implementation
app.post('/api/getSuggestions', (req, res) => {
  try {
    const { prefix = '', contextType = 'global', code = '', cursorPosition = 0 } = req.body;
    console.log('[Cloud Server] POST /api/getSuggestions', { prefix, contextType, cursorPosition });

    // Filter keywords and STL functions based on the prefix
    let suggestions = [];
    
    if (prefix) {
      suggestions = [
        ...cppKeywords.filter(kw => kw.startsWith(prefix.toLowerCase()) || kw.includes(prefix)),
        ...stlFunctions.filter(func => func.startsWith(prefix.toLowerCase()) || func.includes(prefix))
      ];
    } else {
      suggestions = [...cppKeywords.slice(0, 5), ...stlFunctions.slice(0, 5)];
    }

    // Limit to 10 suggestions and format them
    const formattedSuggestions = suggestions.slice(0, 10).map(item => ({
      label: item,
      kind: 'Keyword', // or 'Function', 'Variable', etc.
      detail: `C++ ${item}`,
      insertText: item
    }));

    console.log('[Cloud Server] Returning', formattedSuggestions.length, 'suggestions');
    
    res.json(formattedSuggestions);
  } catch (err) {
    console.error('[Cloud Server] Error getting suggestions:', err.message);
    res.json([]);
  }
});

// Get stats endpoint - mock implementation
app.post('/api/getStats', (req, res) => {
  try {
    const { code = '' } = req.body;
    
    // Count some basic stats from the code
    const lines = code.split('\n').length;
    const charCount = code.length;
    const wordCount = code.trim() ? code.trim().split(/\s+/).length : 0;
    
    // Mock included libraries detection
    const includedLibraries = code.match(/#include\s+<([^>]+)>/g) || [];
    const extractedLibs = includedLibraries.map(lib => lib.replace('#include <', '').replace('>', ''));
    
    res.json({
      symbolCount: Math.min(wordCount, 100), // Mock symbol count
      includedLibraries: extractedLibs,
      symbolTable: {},
      linesOfCode: lines,
      characterCount: charCount,
      wordCount: wordCount
    });
  } catch (err) {
    console.error('[Cloud Server] Error getting stats:', err.message);
    res.json({
      symbolCount: 0,
      includedLibraries: [],
      symbolTable: {},
      linesOfCode: 0,
      characterCount: 0,
      wordCount: 0
    });
  }
});

// Run C++ code endpoint - mock implementation (for security reasons, actual code execution won't work in cloud)
app.post('/api/runCode', (req, res) => {
  try {
    const { code = '' } = req.body;
    
    // In a real cloud implementation, you'd need a secure sandbox for code execution
    // This is just a mock response
    const hasErrors = code.includes('error') || code.includes('// ERROR') || !code.includes('#include') || !code.includes('int main');
    
    if (hasErrors) {
      res.json({
        success: false,
        output: '',
        error: 'Compilation error: Please check your syntax',
        executionTime: 0
      });
    } else {
      res.json({
        success: true,
        output: 'Program executed successfully\nHello, World!',
        error: '',
        executionTime: 123
      });
    }
  } catch (err) {
    console.error('[Cloud Server] Error running code:', err.message);
    res.json({
      success: false,
      output: '',
      error: 'Internal server error',
      executionTime: 0
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[Cloud Server] CodeFlow API Server running on http://localhost:${PORT}`);
  console.log(`[Cloud Server] Endpoints:`);
  console.log(`  - GET  /health`);
  console.log(`  - POST /api/getSuggestions`);
  console.log(`  - POST /api/getStats`);
  console.log(`  - POST /api/runCode`);
});

module.exports = app;