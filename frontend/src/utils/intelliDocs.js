export const CPP_DOCS = {
  // ── Containers ───────────────────────────────────────────────────────
  vector: {
    name: 'std::vector<T>',
    header: '<vector>',
    type: 'Sequence Container',
    standard: 'C++98 / C++11 / C++20',
    summary: 'Dynamic contiguous array with fast O(1) random access and append.',
    signature: 'template<class T>\nclass vector;',
    complexity: 'Random: O(1) | Append: O(1) amortized | Insert: O(N)',
    example: `#include <vector>\n\nstd::vector<int> nums = {1, 2, 3};\nnums.push_back(4);`
  },
  string: {
    name: 'std::string',
    header: '<string>',
    type: 'Character Sequence',
    standard: 'C++98 / C++20',
    summary: 'Dynamic char sequence for string manipulation and text operations.',
    signature: 'typedef std::basic_string<char> string;',
    complexity: 'Access: O(1) | Append: O(1) amortized | Substr: O(N)',
    example: `#include <string>\n\nstd::string s = "Hello World";\nstd::string sub = s.substr(0, 5);`
  },
  map: {
    name: 'std::map<Key, Value>',
    header: '<map>',
    type: 'Ordered Associative Container',
    standard: 'C++98 / C++20',
    summary: 'Sorted key-value associative container using Red-Black Tree.',
    signature: 'template<class Key, class T>\nclass map;',
    complexity: 'Search / Insert / Erase: O(log N)',
    example: `#include <map>\n\nstd::map<std::string, int> ages;\nages["Alice"] = 25;`
  },
  unordered_map: {
    name: 'std::unordered_map<Key, Value>',
    header: '<unordered_map>',
    type: 'Unordered Associative Container',
    standard: 'C++11 / C++20',
    summary: 'Hash-table key-value container with average constant-time lookup.',
    signature: 'template<class Key, class T>\nclass unordered_map;',
    complexity: 'Search / Insert: O(1) avg, O(N) worst',
    example: `#include <unordered_map>\n\nstd::unordered_map<int, int> count;\ncount[42]++;`
  },
  set: {
    name: 'std::set<T>',
    header: '<set>',
    type: 'Ordered Associative Container',
    standard: 'C++98 / C++20',
    summary: 'Sorted collection of unique keys ordered by comparison.',
    signature: 'template<class Key>\nclass set;',
    complexity: 'Search / Insert / Erase: O(log N)',
    example: `#include <set>\n\nstd::set<int> unique_nums = {5, 2, 8, 2};`
  },
  unordered_set: {
    name: 'std::unordered_set<T>',
    header: '<unordered_set>',
    type: 'Unordered Associative Container',
    standard: 'C++11 / C++20',
    summary: 'Hash-table collection of unique keys with average O(1) lookup.',
    signature: 'template<class Key>\nclass unordered_set;',
    complexity: 'Search / Insert: O(1) avg, O(N) worst',
    example: `#include <unordered_set>\n\nstd::unordered_set<int> seen;\nseen.insert(10);`
  },
  stack: {
    name: 'std::stack<T>',
    header: '<stack>',
    type: 'Container Adapter (LIFO)',
    standard: 'C++98 / C++20',
    summary: 'Last-In, First-Out (LIFO) adapter providing top element access.',
    signature: 'template<class T>\nclass stack;',
    complexity: 'Push / Pop / Top: O(1)',
    example: `#include <stack>\n\nstd::stack<int> s;\ns.push(10);\ns.pop();`
  },
  queue: {
    name: 'std::queue<T>',
    header: '<queue>',
    type: 'Container Adapter (FIFO)',
    standard: 'C++98 / C++20',
    summary: 'First-In, First-Out (FIFO) adapter for front/back access.',
    signature: 'template<class T>\nclass queue;',
    complexity: 'Push / Pop / Front: O(1)',
    example: `#include <queue>\n\nstd::queue<int> q;\nq.push(1);\nq.pop();`
  },
  priority_queue: {
    name: 'std::priority_queue<T>',
    header: '<queue>',
    type: 'Container Adapter (Heap)',
    standard: 'C++98 / C++20',
    summary: 'Max-heap container adapter providing O(1) lookup of largest item.',
    signature: 'template<class T>\nclass priority_queue;',
    complexity: 'Top: O(1) | Push / Pop: O(log N)',
    example: `#include <queue>\n\nstd::priority_queue<int> maxHeap;\nmaxHeap.push(30);`
  },
  deque: {
    name: 'std::deque<T>',
    header: '<deque>',
    type: 'Double-Ended Queue',
    standard: 'C++98 / C++20',
    summary: 'Double-ended indexed queue with fast insertion at both ends.',
    signature: 'template<class T>\nclass deque;',
    complexity: 'Push/Pop Front/Back: O(1) | Access: O(1)',
    example: `#include <deque>\n\nstd::deque<int> dq;\ndq.push_front(1);\ndq.push_back(2);`
  },
  unique_ptr: {
    name: 'std::unique_ptr<T>',
    header: '<memory>',
    type: 'Smart Pointer (Exclusive)',
    standard: 'C++11 / C++20',
    summary: 'Zero-overhead smart pointer with exclusive ownership semantics.',
    signature: 'template<class T>\nclass unique_ptr;',
    complexity: 'Deref / Move: O(1) | Zero runtime overhead',
    example: `#include <memory>\n\nauto ptr = std::make_unique<int>(42);`
  },
  shared_ptr: {
    name: 'std::shared_ptr<T>',
    header: '<memory>',
    type: 'Smart Pointer (Shared)',
    standard: 'C++11 / C++20',
    summary: 'Smart pointer retaining shared ownership via reference counting.',
    signature: 'template<class T>\nclass shared_ptr;',
    complexity: 'Deref: O(1) | Copy: Atomic ref-count O(1)',
    example: `#include <memory>\n\nauto p1 = std::make_shared<std::string>("data");`
  },

  // ── Methods ──────────────────────────────────────────────────────────
  push_back: {
    name: 'push_back(const T& val)',
    header: '<vector> / <string> / <deque> / <list>',
    type: 'Member Function',
    signature: 'void push_back(const T& value);',
    summary: 'Appends the given element to the end of the container.',
    complexity: '⚡ O(1) amortized time',
    example: `std::vector<int> v;\nv.push_back(100);`
  },
  emplace_back: {
    name: 'emplace_back(Args&&... args)',
    header: '<vector> / <deque> / <list>',
    type: 'Member Function',
    signature: 'template<class... Args>\nreference emplace_back(Args&&... args);',
    summary: 'Constructs an element in-place directly at the container end.',
    complexity: '⚡ O(1) amortized time',
    example: `pts.emplace_back(10, 20);`
  },
  pop_back: {
    name: 'pop_back()',
    header: '<vector> / <string> / <deque>',
    type: 'Member Function',
    signature: 'void pop_back();',
    summary: 'Removes the last element from the container.',
    complexity: '⚡ O(1) constant time',
    example: `if (!v.empty()) v.pop_back();`
  },
  size: {
    name: 'size() const noexcept',
    header: 'Standard STL Containers',
    type: 'Member Function',
    signature: 'size_type size() const noexcept;',
    summary: 'Returns the number of elements in the container.',
    complexity: '⚡ O(1) constant time',
    example: `std::cout << v.size();`
  },
  capacity: {
    name: 'capacity() const noexcept',
    header: '<vector> / <string>',
    type: 'Member Function',
    signature: 'size_type capacity() const noexcept;',
    summary: 'Returns total allocated storage capacity in elements.',
    complexity: '⚡ O(1) constant time',
    example: `std::cout << v.capacity();`
  },
  reserve: {
    name: 'reserve(size_type new_cap)',
    header: '<vector> / <string> / <unordered_map>',
    type: 'Member Function',
    signature: 'void reserve(size_type new_cap);',
    summary: 'Pre-allocates memory for at least new_cap elements.',
    complexity: '⚡ O(N) reallocation once',
    example: `v.reserve(1000000);`
  },
  resize: {
    name: 'resize(size_type count)',
    header: '<vector> / <string> / <deque> / <list>',
    type: 'Member Function',
    signature: 'void resize(size_type count);',
    summary: 'Resizes container to contain count elements.',
    complexity: '⚡ O(N) linear time',
    example: `v.resize(10, 0);`
  },
  clear: {
    name: 'clear() noexcept',
    header: 'Standard STL Containers',
    type: 'Member Function',
    signature: 'void clear() noexcept;',
    summary: 'Erases all elements while preserving capacity.',
    complexity: '⚡ O(N) linear time',
    example: `v.clear();`
  },
  empty: {
    name: 'empty() const noexcept',
    header: 'Standard STL Containers',
    type: 'Member Function',
    signature: 'bool empty() const noexcept;',
    summary: 'Checks whether the container has no elements.',
    complexity: '⚡ O(1) constant time',
    example: `if (v.empty()) { /* ... */ }`
  },
  begin: {
    name: 'begin() / cbegin()',
    header: 'Standard STL Containers',
    type: 'Member Function',
    signature: 'iterator begin() noexcept;',
    summary: 'Returns an iterator to the first element.',
    complexity: '⚡ O(1) constant time',
    example: `auto it = v.begin();`
  },
  end: {
    name: 'end() / cend()',
    header: 'Standard STL Containers',
    type: 'Member Function',
    signature: 'iterator end() noexcept;',
    summary: 'Returns an iterator past the last element.',
    complexity: '⚡ O(1) constant time',
    example: `auto it = v.end();`
  },
  substr: {
    name: 'substr(size_t pos = 0, size_t count = npos)',
    header: '<string>',
    type: 'Member Function',
    signature: 'string substr(size_type pos = 0, size_type count = npos) const;',
    summary: 'Returns a copy of a substring from position pos.',
    complexity: '⚡ O(count) linear time',
    example: `std::string prefix = s.substr(0, 7);`
  },
  find: {
    name: 'find(const Key& key)',
    header: '<string> / <map> / <set> / <unordered_map>',
    type: 'Member Function',
    signature: 'iterator find(const Key& key);',
    summary: 'Finds an element with key equivalent to key.',
    complexity: 'Map/Set: O(log N) | Unordered: O(1) avg',
    example: `if (myMap.find("key") != myMap.end()) { /* found */ }`
  },

  // ── Algorithms ───────────────────────────────────────────────────────
  sort: {
    name: 'std::sort(first, last)',
    header: '<algorithm>',
    type: 'Standard Algorithm',
    signature: 'template<class RandomIt>\nvoid sort(RandomIt first, RandomIt last);',
    summary: 'Sorts elements in range [first, last) in ascending order.',
    complexity: '⚡ O(N log N) comparisons',
    example: `#include <algorithm>\n\nstd::sort(v.begin(), v.end());`
  },
  accumulate: {
    name: 'std::accumulate(first, last, init)',
    header: '<numeric>',
    type: 'Numeric Algorithm',
    signature: 'template<class InputIt, class T>\nT accumulate(InputIt first, InputIt last, T init);',
    summary: 'Computes sum of elements in range starting from init value.',
    complexity: '⚡ O(N) linear time',
    example: `#include <numeric>\n\nint sum = std::accumulate(v.begin(), v.end(), 0);`
  },
  binary_search: {
    name: 'std::binary_search(first, last, val)',
    header: '<algorithm>',
    type: 'Search Algorithm',
    signature: 'template<class ForwardIt, class T>\nbool binary_search(ForwardIt first, ForwardIt last, const T& value);',
    summary: 'Checks if target value exists in a partitioned range.',
    complexity: '⚡ O(log N) comparisons',
    example: `bool exists = std::binary_search(v.begin(), v.end(), 42);`
  },
  lower_bound: {
    name: 'std::lower_bound(first, last, val)',
    header: '<algorithm>',
    type: 'Binary Search',
    signature: 'template<class ForwardIt, class T>\nForwardIt lower_bound(ForwardIt first, ForwardIt last, const T& value);',
    summary: 'Returns iterator to first element >= target value.',
    complexity: '⚡ O(log N) comparisons',
    example: `auto it = std::lower_bound(v.begin(), v.end(), 10);`
  },
  upper_bound: {
    name: 'std::upper_bound(first, last, val)',
    header: '<algorithm>',
    type: 'Binary Search',
    signature: 'template<class ForwardIt, class T>\nForwardIt upper_bound(ForwardIt first, ForwardIt last, const T& value);',
    summary: 'Returns iterator to first element > target value.',
    complexity: '⚡ O(log N) comparisons',
    example: `auto it = std::upper_bound(v.begin(), v.end(), 10);`
  },

  // ── Keywords ─────────────────────────────────────────────────────────
  constexpr: {
    name: 'constexpr specifier',
    header: 'C++ Core Language',
    type: 'Compile-Time Specifier',
    signature: 'constexpr int square(int x) { return x * x; }',
    summary: 'Specifies compile-time evaluation for functions or variables.',
    complexity: '⚡ Zero Runtime Cost',
    example: `constexpr int val = square(5);`
  },
  auto: {
    name: 'auto type deduction',
    header: 'C++ Core Language',
    type: 'Type Specifier',
    signature: 'auto variable = expression;',
    summary: 'Deduces variable type automatically from initializer expression.',
    complexity: '⚡ Zero Runtime Cost',
    example: `auto v = std::vector<int>{1, 2, 3};`
  },
  template: {
    name: 'template <typename T>',
    header: 'C++ Core Language',
    type: 'Generic Metaprogramming',
    signature: 'template <typename T>\nclass Container { /* ... */ };',
    summary: 'Enables generic type programming with zero abstraction cost.',
    complexity: '⚡ Compile-time monomorphization',
    example: `template<typename T>\nT max(T a, T b) { return a > b ? a : b; }`
  },
  const: {
    name: 'const type qualifier',
    header: 'C++ Core Language',
    type: 'Immutability Qualifier',
    signature: 'const T& read_only_ref = obj;',
    summary: 'Prevents modification of variables or object state.',
    complexity: 'Compile-time safety guarantee',
    example: `const int MaxLimit = 100;`
  },
  concept: {
    name: 'concept (C++20)',
    header: '<concepts> / C++20 Core',
    type: 'Template Constraint',
    signature: 'template<typename T>\nconcept Integral = std::is_integral_v<T>;',
    summary: 'Constrains template arguments evaluated at compile time (C++20).',
    complexity: '⚡ Compile-time verification',
    example: `template<std::integral T>\nT add(T a, T b) { return a + b; }`
  }
};

/**
 * Deduce container/type and syntax context from AST snippet before cursor
 */
export function deduceContextType(code, lineNumber, columnNumber) {
  if (!code) return { objectName: '', type: 'global', prefix: '' };

  const lines = code.split('\n');
  const currentLine = lines[lineNumber - 1] || '';
  const textBeforeCursor = currentLine.slice(0, columnNumber - 1);

  // 1. Check for Preprocessor Directives: e.g. "#", "#in", "#inc", "#def"
  const directiveMatch = textBeforeCursor.match(/^\s*#([a-zA-Z0-9_]*)$/);
  if (directiveMatch) {
    return { objectName: '#', type: 'directive', prefix: directiveMatch[1] || '', isDirective: true };
  }

  // 2. Check for #include header access: e.g. "#include <", "#include<", "#include <stack", "#include<stack"
  const includeMatch = textBeforeCursor.match(/#include\s*<([a-zA-Z0-9_]*)$/) || 
                       textBeforeCursor.match(/#include<([a-zA-Z0-9_]*)$/) ||
                       textBeforeCursor.match(/#include\s*"([a-zA-Z0-9_]*)$/);
  if (includeMatch) {
    return { objectName: 'include', type: 'include_header', prefix: includeMatch[1] || '', isInclude: true };
  }

  // 3. Check for member dot/arrow access: e.g. "nums.p", "v.", "my_map->in"
  const dotMatch = textBeforeCursor.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\.|->)([a-zA-Z0-9_]*)$/);
  if (dotMatch) {
    const objectName = dotMatch[1];
    const prefix = dotMatch[2] || '';

    // Search for variable declaration across entire code translation unit
    const typeRegex = new RegExp(
      `(?:(?:std::)?([a-zA-Z_][a-zA-Z0-9_]*)\\s*<[^>]*>|(?:std::)?(string|vector|map|unordered_map|set|unordered_set|stack|queue|priority_queue|deque|list|unique_ptr|shared_ptr))\\s+[*&]*\\b${objectName}\\b`,
      'g'
    );

    let match;
    let deducedType = '';
    while ((match = typeRegex.exec(code)) !== null) {
      deducedType = (match[1] || match[2] || '').toLowerCase();
    }

    if (deducedType) {
      return { objectName, type: deducedType, prefix, isMemberAccess: true };
    }

    return { objectName, type: 'unknown_object', prefix, isMemberAccess: true };
  }

  // 4. Check for std:: namespace access
  const stdMatch = textBeforeCursor.match(/std::([a-zA-Z0-9_]*)$/);
  if (stdMatch) {
    return { objectName: 'std', type: 'std_namespace', prefix: stdMatch[1] || '', isNamespace: true };
  }

  // 5. Word prefix for general autocomplete
  const wordMatch = textBeforeCursor.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
  const prefix = wordMatch ? wordMatch[1] : '';

  return { objectName: '', type: 'global', prefix, isMemberAccess: false };
}

/**
 * Lookup rich documentation for Hover Provider
 */
export function getDocumentation(symbolName) {
  if (!symbolName) return null;
  const cleanName = symbolName.replace(/^std::/, '').trim();
  return CPP_DOCS[cleanName] || CPP_DOCS[symbolName] || null;
}
