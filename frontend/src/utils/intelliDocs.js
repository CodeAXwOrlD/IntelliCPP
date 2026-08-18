export const CPP_DOCS = {
  // ── Containers ───────────────────────────────────────────────────────
  vector: {
    name: 'std::vector<T>',
    header: '<vector>',
    type: 'Sequence Container',
    standard: 'C++98 / C++11 / C++20',
    summary: 'A dynamic contiguous array that automatically resizes when elements are inserted or deleted. Provides O(1) random access and O(1) amortized insertion at the end.',
    signature: 'template<class T, class Allocator = std::allocator<T>>\nclass vector;',
    complexity: 'Random Access: O(1) | Push/Pop Back: O(1) amortized | Insert/Erase: O(N)',
    example: `#include <vector>\n\nstd::vector<int> nums = {1, 2, 3};\nnums.push_back(4); // O(1) amortized`
  },
  string: {
    name: 'std::string',
    header: '<string>',
    type: 'Character Sequence Container',
    standard: 'C++98 / C++20',
    summary: 'A dynamic sequence of characters supporting string manipulation, search, concatenation, and substring extraction.',
    signature: 'typedef std::basic_string<char> string;',
    complexity: 'Access: O(1) | Append/Push: O(1) amortized | Substr/Find: O(N)',
    example: `#include <string>\n\nstd::string s = "Hello World";\nstd::string sub = s.substr(0, 5); // "Hello"`
  },
  map: {
    name: 'std::map<Key, Value>',
    header: '<map>',
    type: 'Ordered Associative Container',
    standard: 'C++98 / C++20',
    summary: 'A sorted associative container that contains key-value pairs with unique keys. Typically implemented as a Red-Black Tree.',
    signature: 'template<class Key, class T, class Compare = std::less<Key>>\nclass map;',
    complexity: 'Search: O(log N) | Insert: O(log N) | Erase: O(log N)',
    example: `#include <map>\n\nstd::map<std::string, int> ages;\nages["Alice"] = 25; // O(log N)`
  },
  unordered_map: {
    name: 'std::unordered_map<Key, Value>',
    header: '<unordered_map>',
    type: 'Unordered Associative Container',
    standard: 'C++11 / C++20',
    summary: 'A hash-table-based key-value container offering average constant-time lookups and insertions with bucket hashing.',
    signature: 'template<class Key, class T, class Hash = std::hash<Key>>\nclass unordered_map;',
    complexity: 'Average Search/Insert/Erase: O(1) | Worst Case: O(N)',
    example: `#include <unordered_map>\n\nstd::unordered_map<int, int> count;\ncount[42]++; // Average O(1)`
  },
  set: {
    name: 'std::set<T>',
    header: '<set>',
    type: 'Ordered Associative Container',
    standard: 'C++98 / C++20',
    summary: 'A container that stores unique elements in sorted order based on a comparison function (Red-Black Tree).',
    signature: 'template<class Key, class Compare = std::less<Key>>\nclass set;',
    complexity: 'Search: O(log N) | Insert: O(log N) | Erase: O(log N)',
    example: `#include <set>\n\nstd::set<int> unique_nums = {5, 2, 8, 2};\n// Contains: {2, 5, 8}`
  },
  unordered_set: {
    name: 'std::unordered_set<T>',
    header: '<unordered_set>',
    type: 'Unordered Associative Container',
    standard: 'C++11 / C++20',
    summary: 'A collection of unique keys organized into hash buckets for average O(1) lookup.',
    signature: 'template<class Key, class Hash = std::hash<Key>>\nclass unordered_set;',
    complexity: 'Average Search: O(1) | Worst Case: O(N)',
    example: `#include <unordered_set>\n\nstd::unordered_set<int> seen;\nseen.insert(10);`
  },
  stack: {
    name: 'std::stack<T>',
    header: '<stack>',
    type: 'Container Adapter (LIFO)',
    standard: 'C++98 / C++20',
    summary: 'A Last-In, First-Out (LIFO) container adapter providing restricted access to the top element.',
    signature: 'template<class T, class Container = std::deque<T>>\nclass stack;',
    complexity: 'Push: O(1) | Pop: O(1) | Top: O(1)',
    example: `#include <stack>\n\nstd::stack<int> s;\ns.push(10);\ns.pop();`
  },
  queue: {
    name: 'std::queue<T>',
    header: '<queue>',
    type: 'Container Adapter (FIFO)',
    standard: 'C++98 / C++20',
    summary: 'A First-In, First-Out (FIFO) container adapter allowing insertion at the back and extraction from the front.',
    signature: 'template<class T, class Container = std::deque<T>>\nclass queue;',
    complexity: 'Push: O(1) | Pop: O(1) | Front: O(1)',
    example: `#include <queue>\n\nstd::queue<int> q;\nq.push(1);\nq.pop();`
  },
  priority_queue: {
    name: 'std::priority_queue<T>',
    header: '<queue>',
    type: 'Container Adapter (Heap)',
    standard: 'C++98 / C++20',
    summary: 'A max-heap by default providing O(log N) insertion and constant-time lookup of the largest element.',
    signature: 'template<class T, class Container = std::vector<T>, class Compare = std::less<T>>\nclass priority_queue;',
    complexity: 'Top: O(1) | Push: O(log N) | Pop: O(log N)',
    example: `#include <queue>\n\nstd::priority_queue<int> maxHeap;\nmaxHeap.push(30);`
  },
  deque: {
    name: 'std::deque<T>',
    header: '<deque>',
    type: 'Double-Ended Queue Container',
    standard: 'C++98 / C++20',
    summary: 'A indexed sequence container allowing fast insertion and deletion at both ends in amortized O(1).',
    signature: 'template<class T, class Allocator = std::allocator<T>>\nclass deque;',
    complexity: 'Push Front/Back: O(1) | Random Access: O(1) | Middle Insert: O(N)',
    example: `#include <deque>\n\nstd::deque<int> dq;\ndq.push_front(1);\ndq.push_back(2);`
  },
  unique_ptr: {
    name: 'std::unique_ptr<T>',
    header: '<memory>',
    type: 'Smart Pointer (Exclusive Ownership)',
    standard: 'C++11 / C++20',
    summary: 'A zero-overhead smart pointer that owns and manages another object through a pointer and disposes of that object when the unique_ptr goes out of scope.',
    signature: 'template<class T, class Deleter = std::default_delete<T>>\nclass unique_ptr;',
    complexity: 'Deref / Move: O(1) | Overhead: Zero runtime cost',
    example: `#include <memory>\n\nauto ptr = std::make_unique<int>(42);`
  },
  shared_ptr: {
    name: 'std::shared_ptr<T>',
    header: '<memory>',
    type: 'Smart Pointer (Reference-Counted)',
    standard: 'C++11 / C++20',
    summary: 'A smart pointer that retains shared ownership of an object through a control block reference counter.',
    signature: 'template<class T>\nclass shared_ptr;',
    complexity: 'Deref: O(1) | Copy / Destruction: Atomic ref-count increment O(1)',
    example: `#include <memory>\n\nauto p1 = std::make_shared<std::string>("data");\nauto p2 = p1; // Ref-count: 2`
  },

  // ── Methods ──────────────────────────────────────────────────────────
  push_back: {
    name: 'push_back(const T& val)',
    header: '<vector> / <string> / <deque> / <list>',
    type: 'Member Function (Modifier)',
    signature: 'void push_back(const T& value);\nvoid push_back(T&& value);',
    summary: 'Appends the given element to the end of the container. If the new size exceeds current capacity, dynamic reallocation occurs ($2\\times$ growth).',
    complexity: '⚡ O(1) amortized time, O(1) space',
    example: `std::vector<int> v;\nv.push_back(100); // Inserts 100 at end`
  },
  emplace_back: {
    name: 'emplace_back(Args&&... args)',
    header: '<vector> / <deque> / <list>',
    type: 'Member Function (Direct Construction)',
    signature: 'template<class... Args>\nreference emplace_back(Args&&... args);',
    summary: 'Constructs an element in-place directly at the end of the container, avoiding unnecessary copy or move operations.',
    complexity: '⚡ O(1) amortized time | Avoids temporary copies',
    example: `struct Point { int x, y; Point(int a, int b): x(a), y(b) {} };\nstd::vector<Point> pts;\npts.emplace_back(10, 20); // In-place construction`
  },
  pop_back: {
    name: 'pop_back()',
    header: '<vector> / <string> / <deque>',
    type: 'Member Function (Modifier)',
    signature: 'void pop_back();',
    summary: 'Removes the last element of the container. Calling pop_back on an empty container causes Undefined Behavior.',
    complexity: '⚡ O(1) constant time',
    example: `if (!v.empty()) {\n    v.pop_back();\n}`
  },
  size: {
    name: 'size() const noexcept',
    header: 'Standard STL Containers',
    type: 'Member Function (Capacity)',
    signature: '[[nodiscard]] size_type size() const noexcept;',
    summary: 'Returns the number of elements currently stored in the container.',
    complexity: '⚡ O(1) constant time',
    example: `std::cout << "Element count: " << v.size() << std::endl;`
  },
  capacity: {
    name: 'capacity() const noexcept',
    header: '<vector> / <string>',
    type: 'Member Function (Capacity)',
    signature: '[[nodiscard]] size_type capacity() const noexcept;',
    summary: 'Returns the total number of elements that the container has currently allocated space for without needing a reallocation.',
    complexity: '⚡ O(1) constant time',
    example: `std::cout << "Allocated capacity: " << v.capacity() << std::endl;`
  },
  reserve: {
    name: 'reserve(size_type new_cap)',
    header: '<vector> / <string> / <unordered_map>',
    type: 'Member Function (Capacity Optimization)',
    signature: 'void reserve(size_type new_cap);',
    summary: 'Pre-allocates memory for at least new_cap elements, preventing multiple expensive heap reallocations when populating data.',
    complexity: '⚡ O(N) reallocation once | Subsequent insertions: Pure O(1)',
    example: `std::vector<int> v;\nv.reserve(1000000); // 1 allocation only!`
  },
  resize: {
    name: 'resize(size_type count)',
    header: '<vector> / <string> / <deque> / <list>',
    type: 'Member Function (Modifier)',
    signature: 'void resize(size_type count, const value_type& value = value_type());',
    summary: 'Resizes the container to contain count elements. If new size is larger, new elements are default-constructed.',
    complexity: 'O(N) where N is the difference in sizes',
    example: `v.resize(10, 0); // 10 elements initialized to 0`
  },
  clear: {
    name: 'clear() noexcept',
    header: 'Standard STL Containers',
    type: 'Member Function (Modifier)',
    signature: 'void clear() noexcept;',
    summary: 'Erases all elements from the container. Capacity remains unchanged.',
    complexity: 'O(N) linear in number of destroyed elements',
    example: `v.clear(); // size becomes 0, capacity preserved`
  },
  empty: {
    name: 'empty() const noexcept',
    header: 'Standard STL Containers',
    type: 'Member Function (Capacity)',
    signature: '[[nodiscard]] bool empty() const noexcept;',
    summary: 'Checks whether the container has no elements (i.e. whether begin() == end()).',
    complexity: '⚡ O(1) constant time',
    example: `if (v.empty()) { /* handle empty */ }`
  },
  begin: {
    name: 'begin() / cbegin()',
    header: 'Standard STL Containers',
    type: 'Member Function (Iterators)',
    signature: 'iterator begin() noexcept;\nconst_iterator cbegin() const noexcept;',
    summary: 'Returns an iterator pointing to the first element in the container.',
    complexity: '⚡ O(1) constant time',
    example: `for (auto it = v.begin(); it != v.end(); ++it) { /* ... */ }`
  },
  end: {
    name: 'end() / cend()',
    header: 'Standard STL Containers',
    type: 'Member Function (Iterators)',
    signature: 'iterator end() noexcept;\nconst_iterator cend() const noexcept;',
    summary: 'Returns an iterator pointing past the last element in the container (sentinel).',
    complexity: '⚡ O(1) constant time',
    example: `auto it = v.end();`
  },
  substr: {
    name: 'substr(size_t pos = 0, size_t count = npos)',
    header: '<string>',
    type: 'Member Function (String Operation)',
    signature: 'string substr(size_type pos = 0, size_type count = npos) const;',
    summary: 'Returns a newly constructed string object with its value initialized to a copy of a substring of this string.',
    complexity: '⚡ O(count) linear in substring length',
    example: `std::string s = "IntelliCPP";\nstd::string prefix = s.substr(0, 7); // "Intelli"`
  },
  find: {
    name: 'find(const Key& key)',
    header: '<string> / <map> / <set> / <unordered_map>',
    type: 'Member Function (Search)',
    signature: 'iterator find(const Key& key);',
    summary: 'Finds an element with key equivalent to key. Returns end() if not found.',
    complexity: 'Map/Set: O(log N) | Unordered: O(1) average | String: O(N*M)',
    example: `if (myMap.find("key") != myMap.end()) { /* found */ }`
  },

  // ── Algorithms ───────────────────────────────────────────────────────
  sort: {
    name: 'std::sort(first, last)',
    header: '<algorithm>',
    type: 'Standard Algorithm',
    signature: 'template<class RandomIt>\nvoid sort(RandomIt first, RandomIt last);\n\ntemplate<class RandomIt, class Compare>\nvoid sort(RandomIt first, RandomIt last, Compare comp);',
    summary: 'Sorts the elements in the range [first, last) into ascending order using Introsort (QuickSort + HeapSort + InsertionSort).',
    complexity: '⚡ O(N log N) comparisons guaranteed (Introsort)',
    example: `#include <algorithm>\n#include <vector>\n\nstd::vector<int> v = {4, 1, 3};\nstd::sort(v.begin(), v.end()); // {1, 3, 4}`
  },
  accumulate: {
    name: 'std::accumulate(first, last, init)',
    header: '<numeric>',
    type: 'Standard Numeric Algorithm',
    signature: 'template<class InputIt, class T>\nT accumulate(InputIt first, InputIt last, T init);',
    summary: 'Computes the sum of the given initial value init and the elements in the range [first, last).',
    complexity: '⚡ O(N) linear time',
    example: `#include <numeric>\n\nint sum = std::accumulate(v.begin(), v.end(), 0);`
  },
  binary_search: {
    name: 'std::binary_search(first, last, val)',
    header: '<algorithm>',
    type: 'Standard Search Algorithm',
    signature: 'template<class ForwardIt, class T>\nbool binary_search(ForwardIt first, ForwardIt last, const T& value);',
    summary: 'Checks if an element equivalent to value appears within the partitioned range [first, last).',
    complexity: '⚡ O(log N) comparisons for RandomAccessIterators',
    example: `bool exists = std::binary_search(v.begin(), v.end(), 42);`
  },
  lower_bound: {
    name: 'std::lower_bound(first, last, val)',
    header: '<algorithm>',
    type: 'Standard Binary Search',
    signature: 'template<class ForwardIt, class T>\nForwardIt lower_bound(ForwardIt first, ForwardIt last, const T& value);',
    summary: 'Returns an iterator pointing to the first element in the range [first, last) that is not less than (i.e. >=) value.',
    complexity: '⚡ O(log N) comparisons',
    example: `auto it = std::lower_bound(v.begin(), v.end(), 10);`
  },
  upper_bound: {
    name: 'std::upper_bound(first, last, val)',
    header: '<algorithm>',
    type: 'Standard Binary Search',
    signature: 'template<class ForwardIt, class T>\nForwardIt upper_bound(ForwardIt first, ForwardIt last, const T& value);',
    summary: 'Returns an iterator pointing to the first element in the range [first, last) that is strictly greater than (>) value.',
    complexity: '⚡ O(log N) comparisons',
    example: `auto it = std::upper_bound(v.begin(), v.end(), 10);`
  },

  // ── Keywords ─────────────────────────────────────────────────────────
  constexpr: {
    name: 'constexpr specifier',
    header: 'C++11 / C++14 / C++20 Core Language',
    type: 'Compile-Time Specifier',
    signature: 'constexpr int square(int x) { return x * x; }',
    summary: 'Declares that it is possible to evaluate the value of the function or variable at compile time, eliminating runtime overhead.',
    complexity: '⚡ Zero Runtime Cost (Evaluated during compilation)',
    example: `constexpr int BufferSize = 1024 * 1024;\nconstexpr int val = square(5); // Computed at compile-time!`
  },
  auto: {
    name: 'auto type deduction',
    header: 'C++11 / C++14 / C++20 Core Language',
    type: 'Type Specifier',
    signature: 'auto variable = expression;',
    summary: 'Specifies that the type of the variable being declared will be automatically deduced from its initializer expression.',
    complexity: '⚡ Zero Runtime Cost (Compile-time type resolution)',
    example: `auto v = std::vector<int>{1, 2, 3};\nauto it = v.begin(); // Deduced as std::vector<int>::iterator`
  },
  template: {
    name: 'template <typename T>',
    header: 'C++ Core Language',
    type: 'Generic Metaprogramming',
    signature: 'template <typename T, typename... Args>\nclass Container { /* ... */ };',
    summary: 'Allows functions and classes to operate with generic types, enabling code reuse with full type-safety and zero runtime abstraction penalty.',
    complexity: '⚡ Monomorphized at compile-time (Zero runtime overhead)',
    example: `template<typename T>\nT max(T a, T b) { return a > b ? a : b; }`
  },
  const: {
    name: 'const type qualifier',
    header: 'C++ Core Language',
    type: 'Immutability Qualifier',
    signature: 'const T& read_only_ref = obj;',
    summary: 'Prevents the object from being modified. When applied to member functions, certifies that the method does not modify object state.',
    complexity: 'Compiler safety guarantee',
    example: `const int MaxLimit = 100;\nint getSize() const { return size_; }`
  },
  concept: {
    name: 'concept (C++20)',
    header: '<concepts> / C++20 Core',
    type: 'Template Constraint',
    signature: 'template<typename T>\nconcept Integral = std::is_integral_v<T>;',
    summary: 'Named sets of requirements evaluated at compile time to constrain template arguments, providing clean compiler error messages.',
    complexity: '⚡ Compile-time constraint verification',
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
