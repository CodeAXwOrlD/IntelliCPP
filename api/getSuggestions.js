/**
 * Vercel Serverless Function for Suggestions
 * Pure JavaScript version - no native C++ dependency
 */

const path = require('path');
const fs = require('fs');

// Embedded STL functions data to avoid file system issues
const stlFunctions = {
  "vector": [
    "push_back", "pop_back", "size", "empty", "clear", "at", "front", "back",
    "begin", "end", "rbegin", "rend", "cbegin", "cend", "crbegin", "crend",
    "emplace_back", "insert", "erase", "resize", "reserve", "capacity",
    "max_size", "shrink_to_fit", "data", "swap", "assign"
  ],
  "stack": [
    "push", "pop", "emplace", "top", "empty", "size", "swap"
  ],
  "queue": [
    "push", "pop", "emplace", "front", "back", "empty", "size", "swap"
  ],
  "deque": [
    "push_back", "pop_back", "push_front", "pop_front", "emplace_back",
    "emplace_front", "insert", "erase", "clear", "begin", "end",
    "rbegin", "rend", "cbegin", "cend", "crbegin", "crend",
    "size", "max_size", "resize", "shrink_to_fit", "empty", "at",
    "front", "back", "data", "swap", "assign"
  ],
  "map": [
    "insert", "erase", "find", "count", "empty", "size", "clear",
    "begin", "end", "rbegin", "rend", "cbegin", "cend", "crbegin", "crend",
    "at", "operator[]", "swap"
  ],
  "unordered_map": [
    "insert", "erase", "find", "count", "empty", "size", "clear",
    "begin", "end", "cbegin", "cend", "at", "operator[]", "swap"
  ],
  "set": [
    "insert", "erase", "find", "count", "empty", "size", "clear",
    "begin", "end", "rbegin", "rend", "cbegin", "cend", "crbegin", "crend", "swap"
  ],
  "unordered_set": [
    "insert", "erase", "find", "count", "empty", "size", "clear",
    "begin", "end", "cbegin", "cend", "swap"
  ],
  "string": [
    "length", "size", "capacity", "max_size", "resize", "reserve", "shrink_to_fit",
    "clear", "empty", "at", "operator[]", "front", "back", "data", "c_str",
    "substr", "find", "rfind", "find_first_of", "find_last_of", "find_first_not_of",
    "find_last_not_of", "append", "push_back", "pop_back", "assign", "insert",
    "erase", "replace", "copy", "swap"
  ],
  "list": [
    "push_back", "pop_back", "push_front", "pop_front", "emplace_back",
    "emplace_front", "insert", "erase", "clear", "begin", "end",
    "rbegin", "rend", "cbegin", "cend", "crbegin", "crend",
    "size", "max_size", "resize", "empty", "front", "back", "swap", "assign"
  ],
  "forward_list": [
    "push_front", "pop_front", "emplace_front", "insert_after", "erase_after",
    "clear", "begin", "end", "cbefore_begin", "cbegin", "cend",
    "size", "max_size", "resize", "empty", "front", "swap", "assign"
  ],
  "priority_queue": [
    "push", "pop", "emplace", "top", "empty", "size", "swap"
  ],
  "bitset": [
    "set", "reset", "flip", "test", "any", "none", "all", "count", "size",
    "to_string", "to_ulong", "to_ullong"
  ],
  "array": [
    "fill", "swap", "begin", "end", "rbegin", "rend", "cbegin", "cend",
    "crbegin", "crend", "size", "max_size", "empty", "at", "operator[]", "front", "back"
  ],
  "iostream": [
    "cout", "cin", "cerr", "clog", "wcout", "wcin", "wcerr", "wclog"
  ],
  "fstream": [
    "ifstream", "ofstream", "fstream", "open", "close", "is_open", "good", "bad", "fail"
  ],
  "sstream": [
    "stringstream", "istringstream", "ostringstream", "str", "clear"
  ],
  "iomanip": [
    "setw", "setprecision", "setfill", "setiosflags", "resetiosflags", "fixed", "scientific"
  ],
  "algorithm": [
    "sort", "reverse", "find", "find_if", "for_each", "count", "count_if",
    "copy", "copy_backward", "fill", "fill_n", "generate", "generate_n",
    "remove", "remove_if", "remove_copy", "remove_copy_if", "replace",
    "replace_if", "replace_copy", "replace_copy_if", "swap", "swap_ranges",
    "unique", "unique_copy", "rotate", "rotate_copy", "random_shuffle",
    "partition", "stable_partition", "sort", "stable_sort", "partial_sort",
    "nth_element", "lower_bound", "upper_bound", "equal_range", "binary_search",
    "merge", "inplace_merge", "includes", "set_union", "set_intersection",
    "set_difference", "set_symmetric_difference", "min", "max", "minmax",
    "min_element", "max_element", "minmax_element", "lexicographical_compare",
    "next_permutation", "prev_permutation", "accumulate", "inner_product",
    "adjacent_difference", "partial_sum"
  ],
  "memory": [
    "unique_ptr", "shared_ptr", "weak_ptr", "make_unique", "make_shared",
    "allocate", "deallocate", "construct", "destroy", "allocator"
  ],
  "utility": [
    "pair", "make_pair", "swap", "move", "forward", "exchange", "rel_ops"
  ],
  "functional": [
    "function", "bind", "mem_fn", "reference_wrapper", "ref", "cref",
    "hash", "plus", "minus", "multiplies", "divides", "modulus", "negate",
    "equal_to", "not_equal_to", "greater", "less", "greater_equal", "less_equal",
    "logical_and", "logical_or", "logical_not", "bit_and", "bit_or", "bit_xor"
  ],
  "iterator": [
    "begin", "end", "rbegin", "rend", "cbegin", "cend", "crbegin", "crend",
    "advance", "distance", "next", "prev", "istream_iterator", "ostream_iterator",
    "istreambuf_iterator", "ostreambuf_iterator", "back_insert_iterator",
    "front_insert_iterator", "insert_iterator", "reverse_iterator", "move_iterator"
  ],
  "numeric": [
    "accumulate", "inner_product", "partial_sum", "adjacent_difference",
    "iota", "gcd", "lcm"
  ],
  "random": [
    "rand", "srand", "random_device", "mt19937", "mt19937_64",
    "uniform_int_distribution", "uniform_real_distribution", "normal_distribution"
  ],
  "chrono": [
    "duration", "time_point", "system_clock", "steady_clock", "high_resolution_clock",
    "duration_cast", "time_point_cast", "hours", "minutes", "seconds", "milliseconds",
    "microseconds", "nanoseconds"
  ],
  "thread": [
    "thread", "join", "detach", "get_id", "hardware_concurrency", "this_thread"
  ],
  "mutex": [
    "mutex", "lock_guard", "unique_lock", "scoped_lock", "try_lock", "recursive_mutex"
  ],
  "future": [
    "promise", "future", "shared_future", "async", "launch", "packaged_task"
  ]
};

// Embedded C++ keywords
const keywords = [
  "alignas", "alignof", "and", "and_eq", "asm", "auto", "bitand", "bitor",
  "bool", "break", "case", "catch", "char", "char8_t", "char16_t", "char32_t",
  "class", "compl", "concept", "const", "consteval", "constexpr", "const_cast",
  "continue", "co_await", "co_return", "co_yield", "decltype", "default",
  "delete", "do", "double", "dynamic_cast", "else", "enum", "explicit",
  "export", "extern", "false", "float", "for", "friend", "goto", "if",
  "inline", "int", "long", "mutable", "namespace", "new", "noexcept",
  "not", "not_eq", "nullptr", "operator", "or", "or_eq", "private",
  "protected", "public", "register", "reinterpret_cast", "requires", "return",
  "short", "signed", "sizeof", "static", "static_assert", "static_cast",
  "struct", "switch", "template", "this", "thread_local", "throw", "true",
  "try", "typedef", "typeid", "typename", "union", "unsigned", "using",
  "virtual", "void", "volatile", "wchar_t", "while", "xor", "xor_eq"
];

// Simple type inference function
function inferVariableType(variableName, code) {
  if (!code || !variableName) return null;

  const qualifierPattern = '(?:const\\s+|volatile\\s+|static\\s+|constexpr\\s+|unsigned\\s+|signed\\s+|long\\s+|short\\s+|mutable\\s+|inline\\s+|register\\s+|thread_local\\s+|typename\\s+)*';
  const typePattern = `${qualifierPattern}(?:std::\\s*::\\s*)?([a-zA-Z_][a-zA-Z0-9_:<>]*)`;

  // Split code into lines and look for variable declarations
  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('#')) continue;

    const patterns = [
      new RegExp(`\\b${typePattern}\\s+${variableName}\\s*(?:[;=,()\\[\\s]|$)`),
      new RegExp(`\\bauto\\s+${variableName}\\s*=\\s*(?:std::\\s*::\\s*)?([a-zA-Z_][a-zA-Z0-9_:<>]*)`),
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(trimmed);
      if (match) {
        const typeDeclaration = match[1];
        if (typeDeclaration) {
          // Clean up the type declaration
          const baseType = typeDeclaration.trim().split(/[<:\s]/)[0];
          console.log(`[Suggestions API] Inferred type for ${variableName}: ${baseType} from "${typeDeclaration}"`);
          return baseType;
        }
      }
    }
  }

  console.log(`[Suggestions API] Could not infer type for ${variableName}`);
  return null;
}

function extractDeclaredVariables(code) {
  const variables = new Set();
  if (!code) return [];

  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('#')) continue;

    let match;
    const autoPattern = /\bauto\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:[=;,]|$)/g;
    while ((match = autoPattern.exec(trimmed)) !== null) {
      variables.add(match[1]);
    }

    const declPattern = /\b([a-zA-Z_][a-zA-Z0-9_:<>]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=[=;,\)\[\s]|$)/g;
    while ((match = declPattern.exec(trimmed)) !== null) {
      variables.add(match[2]);
    }
  }

  return Array.from(variables);
}

function getVariableSuggestions(prefix, code) {
  return extractDeclaredVariables(code)
    .filter(name => name.startsWith(prefix))
    .map(name => ({ text: name, type: 'variable', score: 1.0 }));
}

function getHeaderTypeSuggestions(prefix, includedLibraries) {
  const suggestions = [];
  const knownHeaders = [...new Set(includedLibraries.filter(lib => stlFunctions[lib]))];

  for (const header of knownHeaders) {
    if (header.startsWith(prefix)) {
      suggestions.push({ text: header, type: 'class', score: 0.95 });
    }
  }

  if (suggestions.length === 0 && prefix.length >= 2) {
    suggestions.push(...Object.keys(stlFunctions)
      .filter(header => header.startsWith(prefix))
      .slice(0, 10)
      .map(header => ({ text: header, type: 'class', score: 0.85 })));
  }

  return suggestions;
}

function getHeaderFunctionSuggestions(prefix, includedLibraries) {
  const freeFunctionHeaders = new Set([
    'algorithm', 'utility', 'functional', 'numeric', 'random', 'chrono',
    'iterator', 'memory', 'sstream', 'iomanip', 'fstream', 'iostream'
  ]);
  const suggestions = [];
  const knownHeaders = [...new Set(includedLibraries.filter(lib => stlFunctions[lib]))];

  for (const header of knownHeaders) {
    if (!freeFunctionHeaders.has(header)) continue;
    const functions = stlFunctions[header] || [];
    functions
      .filter(fn => fn.startsWith(prefix))
      .slice(0, 10)
      .forEach(fn => suggestions.push({ text: fn, type: 'function', score: 0.9 }));
  }

  return suggestions.slice(0, 10);
}

console.log(`[Suggestions API] Loaded ${keywords.length} C++ keywords`);
console.log(`[Suggestions API] Loaded ${Object.keys(stlFunctions).length} STL function categories`);

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

    console.log('[Suggestions API] 🚀 REQUEST RECEIVED!');
    console.log('[Suggestions API] Request data:', { prefix, contextType, codeLength: code ? code.length : 0 });

    // Special handling for include header completion
    if (contextType === 'include_header') {
      console.log('[Suggestions API] 🎯 Include header completion detected');
      const headers = Object.keys(stlFunctions)
        .filter(header => header.startsWith(prefix))
        .sort()
        .slice(0, 10)
        .map(header => ({ text: header, type: 'header', score: 0.9 }));
      console.log('[Suggestions API] Header file suggestions:', headers.length, headers);
      return res.status(200).json(headers);
    }

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
    let actualContextType = contextType;

    // If contextType is not 'global' and not a recognized STL type, try to infer the variable type
    if (contextType !== 'global' && !['vector', 'stack', 'queue', 'deque', 'map', 'set', 'string', 'list', 'algorithm', 'iostream'].includes(contextType)) {
      const inferredType = inferVariableType(contextType, code);
      if (inferredType && stlFunctions[inferredType]) {
        console.log(`[Suggestions API] Using inferred type: ${inferredType} for variable ${contextType}`);
        actualContextType = inferredType;
      } else {
        console.log(`[Suggestions API] Could not infer type for ${contextType}, falling back to global`);
        actualContextType = 'global';
      }
    }

    if (actualContextType === 'global') {
      const variableSuggestions = getVariableSuggestions(prefix, code);
      const headerTypeSuggestions = getHeaderTypeSuggestions(prefix, includedLibraries);
      const headerFunctionSuggestions = getHeaderFunctionSuggestions(prefix, includedLibraries);
      const keywordSuggestions = keywords
        .filter(keyword => keyword.startsWith(prefix))
        .slice(0, 10)
        .map(keyword => ({ text: keyword, type: 'keyword', score: 0.9 }));

      if (variableSuggestions.length > 0 && variableSuggestions.some(v => v.text === prefix)) {
        suggestions = variableSuggestions;
      } else if (headerFunctionSuggestions.length > 0 && headerFunctionSuggestions.some(f => f.text === prefix)) {
        suggestions = headerFunctionSuggestions;
      } else {
        suggestions = [...variableSuggestions, ...headerFunctionSuggestions, ...headerTypeSuggestions, ...keywordSuggestions].slice(0, 10);
      }
    } else if (stlFunctions[actualContextType]) {
      // Return methods for the inferred or specified type
      const methods = stlFunctions[actualContextType];
      suggestions = methods
        .filter(method => method.startsWith(prefix))
        .slice(0, 10)
        .map(method => ({ text: method, type: 'method', score: 0.8 }));
      
      // Also include the class name if prefix is empty
      if (!prefix) {
        suggestions.unshift({ text: actualContextType, type: 'class', score: 1.0 });
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