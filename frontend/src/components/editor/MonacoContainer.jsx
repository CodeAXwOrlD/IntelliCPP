import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useEditor } from '../../context/EditorContext';
import { useEngine } from '../../context/EngineContext';
import { deduceContextType, getDocumentation, analyzeScopesAtCursor, extractDeclaredTypes } from '../../utils/intelliDocs';

const STD_HEADERS = [
  { name: 'iostream', desc: 'Standard I/O stream' },
  { name: 'vector', desc: 'Dynamic array' },
  { name: 'string', desc: 'String container' },
  { name: 'string_view', desc: 'Non-owning string view (C++17)' },
  { name: 'algorithm', desc: 'Algorithms library' },
  { name: 'numeric', desc: 'Numeric operations' },
  { name: 'ranges', desc: 'C++20 Ranges library' },
  { name: 'map', desc: 'Ordered map (RB-tree)' },
  { name: 'unordered_map', desc: 'Hash map' },
  { name: 'set', desc: 'Ordered set (RB-tree)' },
  { name: 'unordered_set', desc: 'Hash set' },
  { name: 'stack', desc: 'LIFO container adapter' },
  { name: 'queue', desc: 'FIFO / priority queue adapter' },
  { name: 'deque', desc: 'Double-ended queue' },
  { name: 'list', desc: 'Doubly-linked list' },
  { name: 'array', desc: 'Fixed-size array' },
  { name: 'memory', desc: 'Smart pointers & allocators' },
  { name: 'utility', desc: 'std::pair, std::move, std::swap' },
  { name: 'tuple', desc: 'Fixed-size tuple' },
  { name: 'optional', desc: 'Optional value (C++17)' },
  { name: 'variant', desc: 'Type-safe union (C++17)' },
  { name: 'functional', desc: 'std::function & function objects' },
  { name: 'iterator', desc: 'Iterators library' },
  { name: 'cmath', desc: 'Math functions' },
  { name: 'chrono', desc: 'Clocks & durations' },
  { name: 'thread', desc: 'Threads library' },
  { name: 'mutex', desc: 'Mutex primitives' },
  { name: 'atomic', desc: 'Atomic operations' },
  { name: 'concepts', desc: 'C++20 Concepts' },
  { name: 'fstream', desc: 'File stream I/O' },
  { name: 'sstream', desc: 'String stream I/O' },
  { name: 'iomanip', desc: 'I/O manipulators' },
  { name: 'filesystem', desc: 'Filesystem library (C++17)' },
  { name: 'cassert', desc: 'Diagnostics assertions' },
  { name: 'cstring', desc: 'C-string utilities' },
  { name: 'cstdint', desc: 'Fixed-width integer types' },
  { name: 'limits', desc: 'Numeric limits' },
  { name: 'random', desc: 'Random number engines' },
  { name: 'bits/stdc++.h', desc: 'GCC precompiled STL super-header' }
];

const MEMBER_METHODS = {
  vector: [
    { label: 'push_back', sig: 'void push_back(const T& val)', comp: 'O(1) amortized' },
    { label: 'emplace_back', sig: 'T& emplace_back(Args&&... args)', comp: 'O(1) amortized' },
    { label: 'pop_back', sig: 'void pop_back()', comp: 'O(1)' },
    { label: 'size', sig: 'size_type size() const', comp: 'O(1)' },
    { label: 'capacity', sig: 'size_type capacity() const', comp: 'O(1)' },
    { label: 'reserve', sig: 'void reserve(size_type n)', comp: 'O(N)' },
    { label: 'resize', sig: 'void resize(size_type n)', comp: 'O(N)' },
    { label: 'clear', sig: 'void clear()', comp: 'O(N)' },
    { label: 'empty', sig: 'bool empty() const', comp: 'O(1)' },
    { label: 'front', sig: 'T& front()', comp: 'O(1)' },
    { label: 'back', sig: 'T& back()', comp: 'O(1)' },
    { label: 'begin', sig: 'iterator begin()', comp: 'O(1)' },
    { label: 'end', sig: 'iterator end()', comp: 'O(1)' },
    { label: 'data', sig: 'T* data()', comp: 'O(1)' }
  ],
  string: [
    { label: 'length', sig: 'size_type length() const', comp: 'O(1)' },
    { label: 'size', sig: 'size_type size() const', comp: 'O(1)' },
    { label: 'substr', sig: 'string substr(size_t pos, size_t len)', comp: 'O(N)' },
    { label: 'find', sig: 'size_t find(const string& s, size_t pos=0)', comp: 'O(N)' },
    { label: 'append', sig: 'string& append(const string& s)', comp: 'O(N)' },
    { label: 'push_back', sig: 'void push_back(char c)', comp: 'O(1) amortized' },
    { label: 'c_str', sig: 'const char* c_str() const', comp: 'O(1)' },
    { label: 'empty', sig: 'bool empty() const', comp: 'O(1)' },
    { label: 'clear', sig: 'void clear()', comp: 'O(1)' }
  ],
  stackAdapter: [
    { label: 'push', sig: 'void push(const T& val)', comp: 'O(1)' },
    { label: 'emplace', sig: 'void emplace(Args&&... args)', comp: 'O(1)' },
    { label: 'pop', sig: 'void pop()', comp: 'O(1)' },
    { label: 'top', sig: 'T& top()', comp: 'O(1)' },
    { label: 'size', sig: 'size_type size() const', comp: 'O(1)' },
    { label: 'empty', sig: 'bool empty() const', comp: 'O(1)' }
  ],
  queueAdapter: [
    { label: 'push', sig: 'void push(const T& val)', comp: 'O(1)' },
    { label: 'emplace', sig: 'void emplace(Args&&... args)', comp: 'O(1)' },
    { label: 'pop', sig: 'void pop()', comp: 'O(1)' },
    { label: 'front', sig: 'T& front()', comp: 'O(1)' },
    { label: 'back', sig: 'T& back()', comp: 'O(1)' },
    { label: 'size', sig: 'size_type size() const', comp: 'O(1)' },
    { label: 'empty', sig: 'bool empty() const', comp: 'O(1)' }
  ],
  pair: [
    { label: 'first', sig: 'T1 first', comp: 'O(1)' },
    { label: 'second', sig: 'T2 second', comp: 'O(1)' }
  ],
  associative: [
    { label: 'insert', sig: 'pair<iterator, bool> insert(const value_type& val)', comp: 'O(log N) / O(1)' },
    { label: 'emplace', sig: 'pair<iterator, bool> emplace(Args&&... args)', comp: 'O(log N) / O(1)' },
    { label: 'find', sig: 'iterator find(const Key& key)', comp: 'O(log N) / O(1)' },
    { label: 'contains', sig: 'bool contains(const Key& key) const', comp: 'C++20 O(log N) / O(1)' },
    { label: 'count', sig: 'size_type count(const Key& key) const', comp: 'O(log N) / O(1)' },
    { label: 'erase', sig: 'size_type erase(const Key& key)', comp: 'O(log N) / O(1)' },
    { label: 'lower_bound', sig: 'iterator lower_bound(const Key& key)', comp: 'O(log N)' },
    { label: 'upper_bound', sig: 'iterator upper_bound(const Key& key)', comp: 'O(log N)' },
    { label: 'size', sig: 'size_type size() const', comp: 'O(1)' },
    { label: 'empty', sig: 'bool empty() const', comp: 'O(1)' },
    { label: 'clear', sig: 'void clear()', comp: 'O(N)' }
  ],
  smart_ptr: [
    { label: 'get', sig: 'T* get() const noexcept', comp: 'O(1)' },
    { label: 'reset', sig: 'void reset(T* ptr = nullptr)', comp: 'O(1)' },
    { label: 'release', sig: 'T* release() noexcept', comp: 'O(1)' },
    { label: 'swap', sig: 'void swap(smart_ptr& other)', comp: 'O(1)' }
  ]
};

const SEQUENTIAL_LIST_METHODS = [...MEMBER_METHODS.vector.slice(0, 4), ...MEMBER_METHODS.vector.slice(7)];

const MEMBER_METHOD_LOOKUP = {
  vector: MEMBER_METHODS.vector,
  string: MEMBER_METHODS.string,
  stack: MEMBER_METHODS.stackAdapter,
  queue: MEMBER_METHODS.queueAdapter,
  priority_queue: MEMBER_METHODS.stackAdapter,
  pair: MEMBER_METHODS.pair,
  map: MEMBER_METHODS.associative,
  unordered_map: MEMBER_METHODS.associative,
  set: MEMBER_METHODS.associative,
  unordered_set: MEMBER_METHODS.associative,
  deque: SEQUENTIAL_LIST_METHODS,
  list: SEQUENTIAL_LIST_METHODS,
  unique_ptr: MEMBER_METHODS.smart_ptr,
  shared_ptr: MEMBER_METHODS.smart_ptr
};

/* eslint-disable no-template-curly-in-string */
const CPP_DIRECTIVES = [
  { label: '#include <...>', insert: 'include <${1:iostream}>', filter: 'include', detail: 'Standard library header' },
  { label: '#include "..."', insert: 'include "${1:header.h}"', filter: 'include', detail: 'Local header file' },
  { label: '#define',        insert: 'define ${1:MACRO} ${2:value}', filter: 'define', detail: 'Define preprocessor macro' },
  { label: '#undef',         insert: 'undef ${1:MACRO}', filter: 'undef', detail: 'Undefine macro' },
  { label: '#ifdef',         insert: 'ifdef ${1:MACRO}\n$0\n#endif', filter: 'ifdef', detail: 'Conditional if defined' },
  { label: '#ifndef',        insert: 'ifndef ${1:MACRO}\n#define ${1:MACRO}\n$0\n#endif', filter: 'ifndef', detail: 'Header guard / if not defined' },
  { label: '#if',            insert: 'if ${1:condition}\n$0\n#endif', filter: 'if', detail: 'Preprocessor conditional' },
  { label: '#elif',          insert: 'elif ${1:condition}', filter: 'elif', detail: 'Preprocessor else-if' },
  { label: '#else',          insert: 'else', filter: 'else', detail: 'Preprocessor else' },
  { label: '#endif',         insert: 'endif', filter: 'endif', detail: 'End conditional block' },
  { label: '#pragma once',   insert: 'pragma once', filter: 'pragma', detail: 'Single-inclusion guard' },
  { label: '#error',         insert: 'error "${1:message}"', filter: 'error', detail: 'Compile-time error directive' },
  { label: '#warning',       insert: 'warning "${1:message}"', filter: 'warning', detail: 'Compile-time warning directive' },
  { label: '#line',          insert: 'line ${1:1}', filter: 'line', detail: 'Line control directive' }
];

const CPP_PRAGMAS = [
  { label: 'once', detail: 'Include header only once per translation unit' },
  { label: 'GCC optimize("O3")', detail: 'GCC O3 optimization' },
  { label: 'pack(push, 1)', detail: 'Set 1-byte struct alignment' },
  { label: 'pack(pop)', detail: 'Restore struct alignment' }
];

const PREDEFINED_MACROS = [
  { name: '__cplusplus', detail: 'C++ standard version macro' },
  { name: 'NDEBUG', detail: 'Disable assertions in release builds' },
  { name: '__linux__', detail: 'Linux target platform' },
  { name: '_WIN32', detail: 'Windows target platform' },
  { name: '__GNUC__', detail: 'GCC compiler version' }
];

const STD_NAMESPACE_MEMBERS = [
  { name: 'vector', kind: 'Class', detail: 'std::vector<T>' },
  { name: 'string', kind: 'Class', detail: 'std::string' },
  { name: 'map', kind: 'Class', detail: 'std::map<K, V>' },
  { name: 'unordered_map', kind: 'Class', detail: 'std::unordered_map<K, V>' },
  { name: 'set', kind: 'Class', detail: 'std::set<T>' },
  { name: 'unordered_set', kind: 'Class', detail: 'std::unordered_set<T>' },
  { name: 'stack', kind: 'Class', detail: 'std::stack<T>' },
  { name: 'queue', kind: 'Class', detail: 'std::queue<T>' },
  { name: 'priority_queue', kind: 'Class', detail: 'std::priority_queue<T>' },
  { name: 'pair', kind: 'Class', detail: 'std::pair<T1, T2>' },
  { name: 'unique_ptr', kind: 'Class', detail: 'std::unique_ptr<T>' },
  { name: 'shared_ptr', kind: 'Class', detail: 'std::shared_ptr<T>' },
  { name: 'make_unique', kind: 'Function', detail: 'std::make_unique<T>(args...)' },
  { name: 'make_shared', kind: 'Function', detail: 'std::make_shared<T>(args...)' },
  { name: 'sort', kind: 'Function', detail: 'std::sort(first, last)' },
  { name: 'accumulate', kind: 'Function', detail: 'std::accumulate(first, last, init)' },
  { name: 'binary_search', kind: 'Function', detail: 'std::binary_search(first, last, val)' },
  { name: 'lower_bound', kind: 'Function', detail: 'std::lower_bound(first, last, val)' },
  { name: 'upper_bound', kind: 'Function', detail: 'std::upper_bound(first, last, val)' },
  { name: 'cout', kind: 'Variable', detail: 'Standard output stream' },
  { name: 'cin', kind: 'Variable', detail: 'Standard input stream' },
  { name: 'endl', kind: 'Variable', detail: 'Newline & flush' },
  { name: 'move', kind: 'Function', detail: 'std::move(t)' },
  { name: 'swap', kind: 'Function', detail: 'std::swap(a, b)' }
];

const TOP_LEVEL_CPP_SYMBOLS = [
  { name: 'if', insertText: 'if (${1:condition}) {\n\t$0\n}', type: 'snippet', detail: 'if statement', complexity: 'Branch' },
  { name: 'else', insertText: 'else {\n\t$0\n}', type: 'snippet', detail: 'else statement', complexity: 'Branch' },
  { name: 'else if', insertText: 'else if (${1:condition}) {\n\t$0\n}', type: 'snippet', detail: 'else if statement', complexity: 'Branch' },
  { name: 'for', insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ++${1:i}) {\n\t$0\n}', type: 'snippet', detail: 'for loop', complexity: 'Loop' },
  { name: 'while', insertText: 'while (${1:condition}) {\n\t$0\n}', type: 'snippet', detail: 'while loop', complexity: 'Loop' },
  { name: 'do while', insertText: 'do {\n\t$0\n} while (${1:condition});', type: 'snippet', detail: 'do-while loop', complexity: 'Loop' },
  { name: 'switch', insertText: 'switch (${1:expr}) {\n\tcase ${2:val}:\n\t\t$0\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}', type: 'snippet', detail: 'switch statement', complexity: 'Branch' },
  { name: 'return', insertText: 'return $0;', type: 'keyword', detail: 'return statement', complexity: 'Control' },
  { name: 'vector', type: 'class', detail: 'std::vector<T>', complexity: 'O(1) amortized push' },
  { name: 'string', type: 'class', detail: 'std::string', complexity: 'O(1) amortized append' },
  { name: 'map', type: 'class', detail: 'std::map<K, V>', complexity: 'O(log N)' },
  { name: 'unordered_map', type: 'class', detail: 'std::unordered_map<K, V>', complexity: 'O(1) avg' },
  { name: 'set', type: 'class', detail: 'std::set<T>', complexity: 'O(log N)' },
  { name: 'unordered_set', type: 'class', detail: 'std::unordered_set<T>', complexity: 'O(1) avg' },
  { name: 'stack', type: 'class', detail: 'std::stack<T>', complexity: 'O(1)' },
  { name: 'queue', type: 'class', detail: 'std::queue<T>', complexity: 'O(1)' },
  { name: 'priority_queue', type: 'class', detail: 'std::priority_queue<T>', complexity: 'O(log N)' },
  { name: 'deque', type: 'class', detail: 'std::deque<T>', complexity: 'O(1)' },
  { name: 'pair', type: 'class', detail: 'std::pair<T1, T2>', complexity: 'O(1)' },
  { name: 'unique_ptr', type: 'class', detail: 'std::unique_ptr<T>', complexity: 'Zero overhead' },
  { name: 'shared_ptr', type: 'class', detail: 'std::shared_ptr<T>', complexity: 'Atomic refcount' },
  { name: 'sort', type: 'function', detail: 'std::sort(first, last)', complexity: 'O(N log N)' },
  { name: 'accumulate', type: 'function', detail: 'std::accumulate(first, last, init)', complexity: 'O(N)' },
  { name: 'binary_search', type: 'function', detail: 'std::binary_search(first, last, val)', complexity: 'O(log N)' },
  { name: 'lower_bound', type: 'function', detail: 'std::lower_bound(first, last, val)', complexity: 'O(log N)' },
  { name: 'upper_bound', type: 'function', detail: 'std::upper_bound(first, last, val)', complexity: 'O(log N)' },
  { name: 'cout', type: 'object', detail: 'std::cout output stream', complexity: 'I/O' },
  { name: 'cin', type: 'object', detail: 'std::cin input stream', complexity: 'I/O' },
  { name: 'endl', type: 'object', detail: 'std::endl flush', complexity: 'I/O' },
  { name: 'using namespace std;', type: 'keyword', detail: 'Import std namespace', complexity: 'Scope' },
  { name: 'constexpr', type: 'keyword', detail: 'Compile-time constant', complexity: 'Zero cost' },
  { name: 'auto', type: 'keyword', detail: 'Deduced type', complexity: 'Compile-time' },
  { name: 'template<typename T>', type: 'keyword', detail: 'Template declaration', complexity: 'Compile-time' },
  { name: 'const', type: 'keyword', detail: 'Constant qualifier', complexity: 'Safety' },
  { name: 'struct', insertText: 'struct ${1:Name} {\n\t$0\n};', type: 'snippet', detail: 'struct declaration', complexity: 'Type' },
  { name: 'class', insertText: 'class ${1:Name} {\npublic:\n\t${1:Name}();\n\t~$1();\nprivate:\n\t$0\n};', type: 'snippet', detail: 'class declaration', complexity: 'Type' }
];

const TEMPLATE_ARG_ITEMS = [
  // Primitive & fundamental C++ types
  { label: 'int', insertText: 'int', kind: 'Keyword', detail: '32-bit signed integer' },
  { label: 'long long', insertText: 'long long', kind: 'Keyword', detail: '64-bit signed integer' },
  { label: 'double', insertText: 'double', kind: 'Keyword', detail: '64-bit floating-point' },
  { label: 'float', insertText: 'float', kind: 'Keyword', detail: '32-bit floating-point' },
  { label: 'char', insertText: 'char', kind: 'Keyword', detail: '8-bit character' },
  { label: 'bool', insertText: 'bool', kind: 'Keyword', detail: 'Boolean true/false' },
  { label: 'long', insertText: 'long', kind: 'Keyword', detail: 'Signed long integer' },
  { label: 'short', insertText: 'short', kind: 'Keyword', detail: '16-bit integer' },
  { label: 'unsigned int', insertText: 'unsigned int', kind: 'Keyword', detail: '32-bit unsigned integer' },
  { label: 'unsigned long long', insertText: 'unsigned long long', kind: 'Keyword', detail: '64-bit unsigned integer' },
  { label: 'long double', insertText: 'long double', kind: 'Keyword', detail: 'Extended precision float' },
  { label: 'void', insertText: 'void', kind: 'Keyword', detail: 'Void type (e.g. function<void(...)>)' },
  { label: 'const', insertText: 'const ', kind: 'Keyword', detail: 'Const qualifier' },
  // Fixed-width & standard typedefs
  { label: 'size_t', insertText: 'size_t', kind: 'TypeParameter', detail: 'Unsigned size type (<cstddef>)' },
  { label: 'int64_t', insertText: 'int64_t', kind: 'TypeParameter', detail: '64-bit signed (<cstdint>)' },
  { label: 'uint64_t', insertText: 'uint64_t', kind: 'TypeParameter', detail: '64-bit unsigned (<cstdint>)' },
  { label: 'int32_t', insertText: 'int32_t', kind: 'TypeParameter', detail: '32-bit signed (<cstdint>)' },
  { label: 'uint32_t', insertText: 'uint32_t', kind: 'TypeParameter', detail: '32-bit unsigned (<cstdint>)' },
  // STL Data Structures & Nested Containers
  { label: 'string', insertText: 'string', kind: 'Class', detail: 'std::string (<string>)' },
  { label: 'string_view', insertText: 'string_view', kind: 'Class', detail: 'std::string_view (C++17)' },
  { label: 'pair<T1, T2>', insertText: 'pair<${1:int}, ${2:int}>', filterText: 'pair', kind: 'Class', detail: 'std::pair<T1, T2> (<utility>)' },
  { label: 'vector<T>', insertText: 'vector<${1:int}>', filterText: 'vector', kind: 'Class', detail: 'std::vector<T> (<vector>)' },
  { label: 'tuple<T...>', insertText: 'tuple<${1:int}, ${2:int}>', filterText: 'tuple', kind: 'Class', detail: 'std::tuple<T...> (<tuple>)' },
  { label: 'map<K, V>', insertText: 'map<${1:string}, ${2:int}>', filterText: 'map', kind: 'Class', detail: 'std::map<K, V> (<map>)' },
  { label: 'unordered_map<K, V>', insertText: 'unordered_map<${1:string}, ${2:int}>', filterText: 'unordered_map', kind: 'Class', detail: 'std::unordered_map<K, V>' },
  { label: 'set<T>', insertText: 'set<${1:int}>', filterText: 'set', kind: 'Class', detail: 'std::set<T> (<set>)' },
  { label: 'unordered_set<T>', insertText: 'unordered_set<${1:int}>', filterText: 'unordered_set', kind: 'Class', detail: 'std::unordered_set<T>' },
  { label: 'stack<T>', insertText: 'stack<${1:int}>', filterText: 'stack', kind: 'Class', detail: 'std::stack<T> (<stack>)' },
  { label: 'queue<T>', insertText: 'queue<${1:int}>', filterText: 'queue', kind: 'Class', detail: 'std::queue<T> (<queue>)' },
  { label: 'priority_queue<T>', insertText: 'priority_queue<${1:int}>', filterText: 'priority_queue', kind: 'Class', detail: 'std::priority_queue<T> (<queue>)' },
  { label: 'deque<T>', insertText: 'deque<${1:int}>', filterText: 'deque', kind: 'Class', detail: 'std::deque<T> (<deque>)' },
  { label: 'list<T>', insertText: 'list<${1:int}>', filterText: 'list', kind: 'Class', detail: 'std::list<T> (<list>)' },
  { label: 'array<T, N>', insertText: 'array<${1:int}, ${2:10}>', filterText: 'array', kind: 'Class', detail: 'std::array<T, N> (<array>)' },
  { label: 'bitset<N>', insertText: 'bitset<${1:32}>', filterText: 'bitset', kind: 'Class', detail: 'std::bitset<N> (<bitset>)' },
  { label: 'optional<T>', insertText: 'optional<${1:int}>', filterText: 'optional', kind: 'Class', detail: 'std::optional<T> (C++17)' },
  { label: 'variant<T...>', insertText: 'variant<${1:int}, ${2:string}>', filterText: 'variant', kind: 'Class', detail: 'std::variant<T...> (C++17)' },
  { label: 'any', insertText: 'any', kind: 'Class', detail: 'std::any (C++17)' },
  { label: 'unique_ptr<T>', insertText: 'unique_ptr<${1:int}>', filterText: 'unique_ptr', kind: 'Class', detail: 'std::unique_ptr<T> (<memory>)' },
  { label: 'shared_ptr<T>', insertText: 'shared_ptr<${1:int}>', filterText: 'shared_ptr', kind: 'Class', detail: 'std::shared_ptr<T> (<memory>)' },
  { label: 'weak_ptr<T>', insertText: 'weak_ptr<${1:int}>', filterText: 'weak_ptr', kind: 'Class', detail: 'std::weak_ptr<T> (<memory>)' },
  // Functors, comparators & function wrappers valid as template args
  { label: 'greater<T>', insertText: 'greater<${1:int}>', filterText: 'greater', kind: 'Function', detail: 'Min-heap / descending comparator (<functional>)' },
  { label: 'greater<>', insertText: 'greater<>', filterText: 'greater', kind: 'Function', detail: 'Transparent greater comparator (C++14)' },
  { label: 'less<T>', insertText: 'less<${1:int}>', filterText: 'less', kind: 'Function', detail: 'Ascending comparator (<functional>)' },
  { label: 'less<>', insertText: 'less<>', filterText: 'less', kind: 'Function', detail: 'Transparent less comparator (C++14)' },
  { label: 'equal_to<T>', insertText: 'equal_to<${1:int}>', filterText: 'equal_to', kind: 'Function', detail: 'Equality comparator (<functional>)' },
  { label: 'hash<T>', insertText: 'hash<${1:string}>', filterText: 'hash', kind: 'Function', detail: 'Default hash functor (<functional>)' },
  { label: 'function<R(Args)>', insertText: 'function<${1:void}(${2:int})>', filterText: 'function', kind: 'Function', detail: 'Callable wrapper (<functional>)' },
  { label: 'allocator<T>', insertText: 'allocator<${1:int}>', filterText: 'allocator', kind: 'Class', detail: 'Default allocator (<memory>)' }
];
/* eslint-enable no-template-curly-in-string */

export default function MonacoContainer() {
  const { 
    files,
    activeFile, 
    activeLanguage, 
    updateFileContent, 
    setCursorPos, 
    editorSettings, 
    monacoEditorRef,
    isTerminalOpen,
    isSidebarOpen,
    isProfilerOpen,
    terminalHeight,
    theme
  } = useEditor();
  const { astTokens, diagnostics } = useEngine();
  const wrapperRef = useRef(null);
  const monacoInstanceRef = useRef(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const astTokensRef = useRef(astTokens);
  const activeLanguageRef = useRef(activeLanguage);
  const filesRef = useRef(files);

  astTokensRef.current = astTokens;
  activeLanguageRef.current = activeLanguage;
  filesRef.current = files;

  const triggerLayout = useCallback(() => {
    if (monacoEditorRef.current) {
      requestAnimationFrame(() => {
        if (monacoEditorRef.current) {
          monacoEditorRef.current.layout();
        }
      });
    }
  }, [monacoEditorRef]);

  useEffect(() => {
    const handleResize = () => {
      triggerLayout();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    let observer = null;
    if (typeof ResizeObserver !== 'undefined' && wrapperRef.current) {
      observer = new ResizeObserver(() => {
        triggerLayout();
      });
      observer.observe(wrapperRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [triggerLayout]);

  useEffect(() => {
    triggerLayout();
    const timer = setTimeout(triggerLayout, 300);
    return () => clearTimeout(timer);
  }, [isTerminalOpen, isSidebarOpen, isProfilerOpen, terminalHeight, triggerLayout]);

  const handleEditorWillMount = (monaco) => {
    monacoInstanceRef.current = monaco;
    monaco.editor.defineTheme('intellicpp-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '60A5FA', fontStyle: 'bold' },
        { token: 'type', foreground: '34D399' },
        { token: 'identifier', foreground: 'F4F4F5' },
        { token: 'string', foreground: 'FCA5A5' },
        { token: 'number', foreground: 'FBBF24' },
        { token: 'comment', foreground: '71717A', fontStyle: 'italic' },
        { token: 'function', foreground: 'A5B4FC' }
      ],
      colors: {
        'editor.background': '#09090B',
        'editor.foreground': '#E4E4E7',
        'editorGutter.background': '#09090B',
        'editorLineNumber.foreground': '#71717A',
        'editorLineNumber.activeForeground': '#FAFAFA',
        'editor.selectionBackground': '#264F7880',
        'editor.selectionHighlightBackground': '#264F7840',
        'editor.inactiveSelectionBackground': '#3A3D4160',
        'editor.lineHighlightBackground': '#00000000',
        'editor.lineHighlightBorder': '#00000000',
        'editorCursor.foreground': '#FFFFFF',
        'editorWidget.background': '#18181B',
        'editorWidget.border': '#27272A',
        'editorSuggestWidget.background': '#18181B',
        'editorSuggestWidget.border': '#27272A',
        'editorSuggestWidget.selectedBackground': '#3B82F633',
        'editorHoverWidget.background': '#18181B',
        'editorHoverWidget.border': '#27272A'
      }
    });

    monaco.editor.defineTheme('intellicpp-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#FFFFFF',
        'editorGutter.background': '#FFFFFF',
        'editor.lineHighlightBackground': '#F8FAFC',
        'editorCursor.foreground': '#2563EB'
      }
    });
  };

  useEffect(() => {
    const monaco = monacoInstanceRef.current;
    const editor = monacoEditorRef.current;
    if (!monaco || !editor) return;
    const model = editor.getModel();
    if (!model) return;

    const markers = (diagnostics || []).map(d => ({
      startLineNumber: Math.max(1, d.line),
      startColumn: Math.max(1, d.column || 1),
      endLineNumber: Math.max(1, d.line),
      endColumn: Math.max(1, (d.column || 1) + 12),
      message: d.message,
      severity:
        d.severity === 'warning'
          ? monaco.MarkerSeverity.Warning
          : d.severity === 'info'
          ? monaco.MarkerSeverity.Info
          : monaco.MarkerSeverity.Error
    }));
    monaco.editor.setModelMarkers(model, 'intellicpp-compiler', markers);
  }, [diagnostics, activeFile?.id, monacoEditorRef]);

  const handleEditorDidMount = (editor, monaco) => {
    monacoInstanceRef.current = editor ? monaco : null;
    monacoEditorRef.current = editor;
    triggerLayout();

    editor.onMouseDown(() => {
      editor.focus();
    });

    editor.focus();

    editor.onDidChangeCursorPosition((e) => {
      if (e.position) {
        setCursorPos({ line: e.position.lineNumber, column: e.position.column });
      }
    });

    setIsEditorReady(true);
  };

  useEffect(() => {
    const monaco = monacoInstanceRef.current;
    const editor = monacoEditorRef.current;
    if (!isEditorReady || !monaco || !editor) return;

    const snippetRule = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;

    const provideCompletions = (model, position) => {
      try {
        const modelLang = model.getLanguageId();
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        if (modelLang !== 'cpp') {
          const langBuiltins = activeLanguageRef.current?.builtinSymbols || [];
          return {
            suggestions: langBuiltins.map(sym => ({
              label: sym.name,
              kind: sym.type === 'function'
                ? monaco.languages.CompletionItemKind.Function
                : sym.type === 'method'
                ? monaco.languages.CompletionItemKind.Method
                : monaco.languages.CompletionItemKind.Variable,
              insertText: sym.name,
              detail: `[${sym.complexity}] ${sym.detail}`,
              range
            }))
          };
        }

        const code = model.getValue();
        const context = deduceContextType(code, position.lineNumber, position.column);

        if (context.isDirective) {
          return {
            suggestions: CPP_DIRECTIVES.map((d, i) => ({
              label: d.label,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: d.insert,
              filterText: d.filter,
              insertTextRules: snippetRule,
              detail: `[Preprocessor] ${d.detail}`,
              sortText: `000${String(i).padStart(2, '0')}_${d.filter}`,
              range
            }))
          };
        }

        if (context.isInclude) {
          const lineText = model.getLineContent(position.lineNumber);
          const nextChar = lineText[position.column - 1] || '';

          if (context.delimiter === '"') {
            const localHeaders = (filesRef.current || [])
              .filter(f => /\.(h|hpp)$/i.test(f.name))
              .map(f => ({ name: f.name, desc: 'Workspace header' }));
            if (localHeaders.length === 0) {
              localHeaders.push({ name: 'algorithm.hpp', desc: 'Header template' });
            }
            const closeQuote = nextChar === '"' ? '' : '"';
            return {
              suggestions: localHeaders.map(h => ({
                label: `"${h.name}"`,
                kind: monaco.languages.CompletionItemKind.File,
                insertText: `${h.name}${closeQuote}`,
                filterText: h.name,
                detail: h.desc,
                range
              }))
            };
          }

          const openAngle = context.needsAngle ? '<' : '';
          const closeAngle = nextChar === '>' ? '' : '>';
          return {
            suggestions: STD_HEADERS.map((h, i) => ({
              label: `<${h.name}>`,
              kind: monaco.languages.CompletionItemKind.Module,
              insertText: `${openAngle}${h.name}${closeAngle}`,
              filterText: h.name,
              detail: `Header <${h.name}>`,
              documentation: { value: `**#include <${h.name}>**\n\n${h.desc}` },
              sortText: `00${String(i).padStart(2, '0')}_${h.name}`,
              range
            }))
          };
        }

        if (context.isPragma) {
          return {
            suggestions: CPP_PRAGMAS.map(p => ({
              label: p.label,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: p.label,
              detail: p.detail,
              range
            }))
          };
        }

        if (context.isMacroCondition || context.isDefineName || context.isDefineBody) {
          const scopes = analyzeScopesAtCursor(code, position.lineNumber, position.column);
          const suggestions = [];
          const seen = new Set();

          scopes.prioritySymbols.forEach(sym => {
            if (context.isDefineBody && sym.type !== 'macro') return;
            if (context.isDefineName && !sym.detail?.includes('#ifndef')) return;
            seen.add(sym.name);
            suggestions.push({
              label: sym.name,
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: sym.name,
              detail: sym.detail || 'Active Macro',
              sortText: `0000_${sym.name}`,
              range
            });
          });

          if (context.isMacroCondition) {
            if (context.directive === 'if' || context.directive === 'elif') {
              /* eslint-disable no-template-curly-in-string */
              suggestions.push({
                label: 'defined(...)',
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: 'defined(${1:MACRO})',
                filterText: 'defined',
                insertTextRules: snippetRule,
                detail: 'Check whether macro is defined',
                sortText: '0050_defined',
                range
              });
              /* eslint-enable no-template-curly-in-string */
            }
            PREDEFINED_MACROS.forEach(m => {
              if (!seen.has(m.name)) {
                suggestions.push({
                  label: m.name,
                  kind: monaco.languages.CompletionItemKind.Constant,
                  insertText: m.name,
                  detail: m.detail,
                  sortText: `0100_${m.name}`,
                  range
                });
              }
            });
            scopes.closedSymbols.forEach(sym => {
              if (!seen.has(sym.name) && !sym.detail?.includes('#undef')) {
                suggestions.push({
                  label: sym.name,
                  kind: monaco.languages.CompletionItemKind.Constant,
                  insertText: sym.name,
                  detail: sym.detail,
                  sortText: `0999_${sym.name}`,
                  range
                });
              }
            });
          }

          return { suggestions };
        }

        if (context.isPreprocessorOther) {
          return { suggestions: [] };
        }

        if (context.isMemberAccess) {
          const methods = MEMBER_METHOD_LOOKUP[context.type] || [];
          return {
            suggestions: methods.map(m => ({
              label: m.label,
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: m.label,
              detail: `[${m.comp}] ${m.sig}`,
              range
            }))
          };
        }

        if (context.isTemplateArg) {
          const declaredTypes = extractDeclaredTypes(code);
          const scopes = analyzeScopesAtCursor(code, position.lineNumber, position.column);
          const typeSuggestions = [];

          declaredTypes.forEach(t => {
            typeSuggestions.push({
              label: t.name,
              kind: monaco.languages.CompletionItemKind.Struct,
              insertText: t.name,
              detail: t.detail,
              sortText: `0000_${t.name}`,
              range
            });
          });

          // Active #define macros are legal inside non-type templates like array<int, MAXN> / bitset<MAXN>
          scopes.prioritySymbols
            .filter(s => s.type === 'macro')
            .forEach(m => {
              typeSuggestions.push({
                label: m.name,
                kind: monaco.languages.CompletionItemKind.Constant,
                insertText: m.name,
                detail: `${m.detail} (Non-type template constant)`,
                sortText: `0010_${m.name}`,
                range
              });
            });

          TEMPLATE_ARG_ITEMS.forEach((item, i) => {
            typeSuggestions.push({
              label: item.label,
              kind: monaco.languages.CompletionItemKind[item.kind],
              insertText: item.insertText,
              filterText: item.filterText || item.label,
              insertTextRules: item.insertText.includes('$') ? snippetRule : undefined,
              detail: item.detail,
              sortText: `01${String(i).padStart(2, '0')}_${item.filterText || item.label}`,
              range
            });
          });

          return { suggestions: typeSuggestions };
        }

        if (context.isNamespace) {
          return {
            suggestions: STD_NAMESPACE_MEMBERS.map(s => ({
              label: s.name,
              kind: monaco.languages.CompletionItemKind[s.kind],
              insertText: s.name,
              detail: s.detail,
              range
            }))
          };
        }

        const scopes = analyzeScopesAtCursor(code, position.lineNumber, position.column);

        const priorityItems = scopes.prioritySymbols.map(s => ({
          label: s.name,
          kind: s.type === 'macro'
            ? monaco.languages.CompletionItemKind.Constant
            : monaco.languages.CompletionItemKind.Variable,
          insertText: s.name,
          detail: s.detail,
          sortText: `0000_${s.name}`,
          range
        }));

        const localVariableItems = scopes.localVars.map(v => ({
          label: v.name,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: v.name,
          detail: `[Local] ${v.detail || v.type}`,
          documentation: {
            value: `**Local Variable**: \`${v.name}\`\n\nType: \`${v.type}\``
          },
          sortText: `0001_${v.name}`,
          range
        }));

        const symbolItems = TOP_LEVEL_CPP_SYMBOLS.map(sym => ({
          label: sym.name,
          kind: sym.type === 'snippet'
            ? monaco.languages.CompletionItemKind.Snippet
            : sym.type === 'class' 
            ? monaco.languages.CompletionItemKind.Class 
            : sym.type === 'function' 
            ? monaco.languages.CompletionItemKind.Function 
            : sym.type === 'keyword'
            ? monaco.languages.CompletionItemKind.Keyword
            : monaco.languages.CompletionItemKind.Variable,
          insertText: sym.insertText || sym.name,
          insertTextRules: sym.type === 'snippet' || sym.insertText?.includes('$')
            ? snippetRule
            : undefined,
          detail: `[${sym.complexity}] ${sym.detail}`,
          sortText: `0200_${sym.name}`,
          range
        }));

        const closedItems = scopes.closedSymbols
          .filter(s => !s.detail?.includes('#undef'))
          .map(s => ({
            label: s.name,
            kind: monaco.languages.CompletionItemKind.Constant,
            insertText: s.name,
            detail: s.detail,
            sortText: `0999_${s.name}`,
            range
          }));

        return {
          suggestions: [...priorityItems, ...localVariableItems, ...symbolItems, ...closedItems]
        };
      } catch (err) {
        return { suggestions: [] };
      }
    };

    const completionDisposables = ['cpp', 'python', 'rust'].map(id =>
      monaco.languages.registerCompletionItemProvider(id, {
        triggerCharacters: ['.', ':', '>', '#', '<', '"'],
        provideCompletionItems: provideCompletions
      })
    );

    const typeTriggerDisposable = editor.onDidType((text) => {
      if (text !== ' ' && text !== ',') return;
      const model = editor.getModel();
      const pos = editor.getPosition();
      if (!model || !pos || model.getLanguageId() !== 'cpp') return;
      const before = model.getLineContent(pos.lineNumber).slice(0, pos.column - 1);
      if (
        (text === ' ' && /^\s*#\s*(?:include|ifdef|ifndef|if|elif|undef|pragma)\s$/.test(before)) ||
        (text === ',' && deduceContextType(model.getValue(), pos.lineNumber, pos.column).isTemplateArg) ||
        (text === ' ' && /,\s$/.test(before) && deduceContextType(model.getValue(), pos.lineNumber, pos.column).isTemplateArg)
      ) {
        editor.trigger('intellicpp', 'editor.action.triggerSuggest', {});
      }
    });

    const hoverDisposable = monaco.languages.registerHoverProvider('cpp', {
      provideHover: (model, position) => {
        try {
          if (typeof window !== 'undefined' && window.innerWidth < 640) {
            return null;
          }

          const word = model.getWordAtPosition(position);
          if (!word) return null;

          const symbolName = word.word;
          const doc = getDocumentation(symbolName);

          if (doc) {
            let exampleSection = null;
            if (doc.example) {
              if (doc.example.length <= 120) {
                exampleSection = { value: `**Example**:\n\`\`\`cpp\n${doc.example}\n\`\`\`` };
              } else {
                const truncated = doc.example.slice(0, 100).trim() + '\n// ... (see docs)';
                exampleSection = { value: `**Example**:\n\`\`\`cpp\n${truncated}\n\`\`\`` };
              }
            }

            return {
              range: new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
              ),
              contents: [
                { value: `### 📦 \`${doc.name}\`  \n*${doc.type} • \`${doc.header}\`*` },
                { value: `\`\`\`cpp\n${doc.signature}\n\`\`\`` },
                { value: `**Description**: ${doc.summary}` },
                { value: `⚡ **Performance**: \`${doc.complexity}\`` },
                ...(exampleSection ? [exampleSection] : [])
              ]
            };
          }

          if (astTokensRef.current.includes(symbolName)) {
            return {
              range: new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
              ),
              contents: [
                { value: `### 🔹 Local Identifier: \`${symbolName}\`` },
                { value: `*Local Scope Variable / Symbol*` }
              ]
            };
          }

          return null;
        } catch {
          return null;
        }
      }
    });

    return () => {
      completionDisposables.forEach(d => d?.dispose());
      typeTriggerDisposable?.dispose();
      hoverDisposable?.dispose();
    };
  }, [isEditorReady, monacoEditorRef]);

  const editorOptions = useMemo(() => {
    const isTouch = typeof window !== 'undefined' && window.innerWidth < 640;
    return {
      fontSize: editorSettings.fontSize,
      fontFamily: "'JetBrains Mono', monospace",
      fontLigatures: editorSettings.fontLigatures,
      minimap: { enabled: editorSettings.minimap && !isTouch, scale: 0.8 },
      wordWrap: editorSettings.wordWrap ? 'on' : 'off',
      lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
      automaticLayout: true,
      smoothScrolling: true,
      cursorBlinking: 'blink',
      cursorStyle: 'line',
      cursorWidth: 2,
      cursorSmoothCaretAnimation: 'off',
      renderLineHighlight: 'none',
      scrollBeyondLastLine: false,
      padding: { top: 12, bottom: 12 },
      suggestOnTriggerCharacters: true,
      quickSuggestions: { other: 'on', comments: 'off', strings: 'on' },
      hover: {
        enabled: !isTouch,
        delay: 200,
        sticky: true
      },
      suggest: {
        showWords: false,
        preview: true,
        filterGraceful: true,
        showClasses: true,
        showFunctions: true,
        showKeywords: true,
        showMethods: true,
        showVariables: true,
        showModules: true,
        showSnippets: true,
        showConstants: true,
        showFiles: true,
        showStructs: true,
        showTypeParameters: true
      },
      snippetSuggestions: 'inline',
      guides: {
        indentation: true,
        highlightActiveIndentation: true
      }
    };
  }, [editorSettings]);

  return (
    <div
      className="monaco-wrapper"
      ref={wrapperRef}
      onClick={(e) => {
        if (e.target === wrapperRef.current) monacoEditorRef.current?.focus();
      }}
    >
      <Editor
        height="100%"
        path={activeFile ? `intellicpp://${activeFile.id}/${activeFile.name}` : 'intellicpp://0/main.cpp'}
        theme={theme === 'light' ? 'intellicpp-light' : 'intellicpp-dark'}
        language={activeLanguage.monacoId || 'cpp'}
        value={activeFile?.content || ''}
        onChange={(value) => updateFileContent(value || '')}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        options={editorOptions}
        keepCurrentModel={false}
      />
    </div>
  );
}
