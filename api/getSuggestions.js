/**
 * Vercel Serverless Function for Suggestions
 * Pure JavaScript version - no native C++ dependency
 */

const path = require('path');
const fs = require('fs');

// Embedded STL functions data to avoid file system issues
const stlFunctions = {
  "vector": [
    "push_back", "pop_back", "emplace_back", "insert", "erase", "clear",
    "begin", "end", "rbegin", "rend", "cbegin", "cend", "crbegin", "crend",
    "size", "capacity", "max_size", "resize", "reserve", "shrink_to_fit",
    "data", "at", "front", "back", "empty", "swap", "assign"
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

    if (contextType === 'global') {
      // Return keywords that match prefix
      suggestions = keywords
        .filter(keyword => keyword.startsWith(prefix))
        .slice(0, 10)
        .map(keyword => ({ text: keyword, type: 'keyword', score: 0.9 }));
    } else if (includedLibraries.includes(contextType) && stlFunctions[contextType]) {
      // Return methods for included library
      const methods = stlFunctions[contextType];
      suggestions = methods
        .filter(method => method.startsWith(prefix))
        .slice(0, 10)
        .map(method => ({ text: method, type: 'method', score: 0.8 }));
      
      // Also include the class name if prefix is empty
      if (!prefix) {
        suggestions.unshift({ text: contextType, type: 'class', score: 1.0 });
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
