/**
 * IntelliCPP Backend Server v2.0
 * Pure Node.js + Express — no Electron, no deployment config, no AI
 *
 * Features:
 * - Header-aware suggestions: #include <vector> → only vector methods
 * - Variable type inference: vector<int> v; then v. → vector methods only
 * - Trie-based O(L) prefix search
 * - C++ code compilation + execution via g++
 * - File read/write for workspace
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { execSync, exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT
  ? path.resolve(process.env.WORKSPACE_ROOT)
  : path.resolve(__dirname, '..');

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '2mb' }));

// Request timing
app.use((req, res, next) => {
  req._startTime = Date.now();
  next();
});

// ─────────────────────────────────────────────
// COMPLETE STL DATABASE
// Every header maps to its exact methods.
// When user writes #include <vector>, ONLY vector methods appear.
// ─────────────────────────────────────────────
const STL_DB = {
  vector: {
    header: 'vector',
    description: 'Dynamic array container',
    methods: [
      { name: 'push_back',      sig: 'void push_back(const T& val)',                  doc: 'Appends element to end.',                     complexity: 'O(1) amortized' },
      { name: 'pop_back',       sig: 'void pop_back()',                                doc: 'Removes last element. UB if empty.',           complexity: 'O(1)' },
      { name: 'emplace_back',   sig: 'T& emplace_back(Args&&... args)',               doc: 'Constructs element in-place at end.',          complexity: 'O(1) amortized' },
      { name: 'size',           sig: 'size_type size() const',                         doc: 'Returns number of elements.',                  complexity: 'O(1)' },
      { name: 'empty',          sig: 'bool empty() const',                             doc: 'Returns true if no elements.',                 complexity: 'O(1)' },
      { name: 'clear',          sig: 'void clear()',                                   doc: 'Removes all elements. Capacity unchanged.',    complexity: 'O(n)' },
      { name: 'at',             sig: 'T& at(size_type n)',                             doc: 'Bounds-checked access. Throws out_of_range.',  complexity: 'O(1)' },
      { name: 'front',          sig: 'T& front()',                                     doc: 'Access first element.',                        complexity: 'O(1)' },
      { name: 'back',           sig: 'T& back()',                                      doc: 'Access last element.',                         complexity: 'O(1)' },
      { name: 'begin',          sig: 'iterator begin()',                               doc: 'Iterator to first element.',                   complexity: 'O(1)' },
      { name: 'end',            sig: 'iterator end()',                                 doc: 'Iterator past last element.',                  complexity: 'O(1)' },
      { name: 'rbegin',         sig: 'reverse_iterator rbegin()',                      doc: 'Reverse iterator to last element.',            complexity: 'O(1)' },
      { name: 'rend',           sig: 'reverse_iterator rend()',                        doc: 'Reverse iterator before first.',               complexity: 'O(1)' },
      { name: 'insert',         sig: 'iterator insert(iterator pos, const T& val)',   doc: 'Insert before pos. O(n) if not at end.',       complexity: 'O(n)' },
      { name: 'erase',          sig: 'iterator erase(iterator pos)',                   doc: 'Erase at pos. Returns next iterator.',         complexity: 'O(n)' },
      { name: 'resize',         sig: 'void resize(size_type n)',                       doc: 'Resize to n elements.',                        complexity: 'O(n)' },
      { name: 'reserve',        sig: 'void reserve(size_type n)',                      doc: 'Reserve capacity for n elements.',             complexity: 'O(n)' },
      { name: 'capacity',       sig: 'size_type capacity() const',                     doc: 'Returns current allocated capacity.',          complexity: 'O(1)' },
      { name: 'shrink_to_fit',  sig: 'void shrink_to_fit()',                           doc: 'Request to reduce capacity to size.',          complexity: 'O(n)' },
      { name: 'data',           sig: 'T* data()',                                      doc: 'Pointer to underlying array.',                 complexity: 'O(1)' },
      { name: 'swap',           sig: 'void swap(vector& other)',                       doc: 'Swap contents with another vector.',           complexity: 'O(1)' },
      { name: 'assign',         sig: 'void assign(size_type n, const T& val)',        doc: 'Replace contents with n copies of val.',       complexity: 'O(n)' },
      { name: 'max_size',       sig: 'size_type max_size() const',                     doc: 'Maximum number of elements possible.',         complexity: 'O(1)' },
    ],
  },

  string: {
    header: 'string',
    description: 'Dynamic string container',
    methods: [
      { name: 'length',              sig: 'size_type length() const',                              doc: 'Returns string length.',                        complexity: 'O(1)' },
      { name: 'size',                sig: 'size_type size() const',                                doc: 'Same as length().',                             complexity: 'O(1)' },
      { name: 'empty',               sig: 'bool empty() const',                                    doc: 'Returns true if string is empty.',              complexity: 'O(1)' },
      { name: 'clear',               sig: 'void clear()',                                           doc: 'Clears string content.',                        complexity: 'O(1)' },
      { name: 'substr',              sig: 'string substr(size_t pos=0, size_t len=npos)',          doc: 'Returns substring.',                            complexity: 'O(n)' },
      { name: 'find',                sig: 'size_t find(const string& s, size_t pos=0)',            doc: 'First occurrence of s at or after pos.',        complexity: 'O(n*m)' },
      { name: 'rfind',               sig: 'size_t rfind(const string& s, size_t pos=npos)',        doc: 'Last occurrence of s.',                         complexity: 'O(n*m)' },
      { name: 'append',              sig: 'string& append(const string& s)',                       doc: 'Appends s to end.',                             complexity: 'O(n)' },
      { name: 'push_back',           sig: 'void push_back(char c)',                                doc: 'Appends single character.',                     complexity: 'O(1)' },
      { name: 'pop_back',            sig: 'void pop_back()',                                        doc: 'Removes last character.',                       complexity: 'O(1)' },
      { name: 'insert',              sig: 'string& insert(size_t pos, const string& s)',           doc: 'Inserts s at position pos.',                    complexity: 'O(n)' },
      { name: 'erase',               sig: 'string& erase(size_t pos=0, size_t len=npos)',         doc: 'Erases len chars starting at pos.',             complexity: 'O(n)' },
      { name: 'replace',             sig: 'string& replace(size_t pos, size_t len, const string& s)', doc: 'Replaces [pos,pos+len) with s.',           complexity: 'O(n)' },
      { name: 'c_str',               sig: 'const char* c_str() const',                             doc: 'Null-terminated C string.',                     complexity: 'O(1)' },
      { name: 'at',                  sig: 'char& at(size_t pos)',                                  doc: 'Bounds-checked char access.',                   complexity: 'O(1)' },
      { name: 'front',               sig: 'char& front()',                                          doc: 'First character.',                              complexity: 'O(1)' },
      { name: 'back',                sig: 'char& back()',                                           doc: 'Last character.',                               complexity: 'O(1)' },
      { name: 'begin',               sig: 'iterator begin()',                                       doc: 'Iterator to first character.',                  complexity: 'O(1)' },
      { name: 'end',                 sig: 'iterator end()',                                         doc: 'Iterator past last character.',                 complexity: 'O(1)' },
      { name: 'compare',             sig: 'int compare(const string& s) const',                    doc: 'Lexicographic comparison.',                     complexity: 'O(n)' },
      { name: 'capacity',            sig: 'size_type capacity() const',                             doc: 'Allocated storage capacity.',                   complexity: 'O(1)' },
      { name: 'reserve',             sig: 'void reserve(size_type n)',                              doc: 'Reserve at least n characters.',                complexity: 'O(n)' },
      { name: 'shrink_to_fit',       sig: 'void shrink_to_fit()',                                   doc: 'Reduce capacity to size.',                      complexity: 'O(n)' },
      { name: 'find_first_of',       sig: 'size_t find_first_of(const string& s, size_t pos=0)',  doc: 'First char matching any in s.',                 complexity: 'O(n)' },
      { name: 'find_last_of',        sig: 'size_t find_last_of(const string& s, size_t pos=npos)',doc: 'Last char matching any in s.',                  complexity: 'O(n)' },
      { name: 'find_first_not_of',   sig: 'size_t find_first_not_of(const string& s)',            doc: 'First char NOT matching any in s.',             complexity: 'O(n)' },
      { name: 'find_last_not_of',    sig: 'size_t find_last_not_of(const string& s)',             doc: 'Last char NOT matching any in s.',              complexity: 'O(n)' },
      { name: 'swap',                sig: 'void swap(string& other)',                               doc: 'Swap with another string.',                     complexity: 'O(1)' },
      { name: 'copy',                sig: 'size_t copy(char* dest, size_t len, size_t pos=0)',    doc: 'Copies len chars to dest.',                     complexity: 'O(n)' },
      { name: 'data',                sig: 'const char* data() const',                              doc: 'Pointer to underlying char array.',              complexity: 'O(1)' },
      { name: 'assign',              sig: 'string& assign(const string& s)',                       doc: 'Replaces string content.',                      complexity: 'O(n)' },
      { name: 'max_size',            sig: 'size_type max_size() const',                             doc: 'Maximum possible string length.',               complexity: 'O(1)' },
    ],
  },

  map: {
    header: 'map',
    description: 'Sorted key-value associative container (Red-Black Tree)',
    methods: [
      { name: 'insert',        sig: 'pair<iterator,bool> insert(value_type)',            doc: 'Insert key-value pair if key absent.',          complexity: 'O(log n)' },
      { name: 'emplace',       sig: 'pair<iterator,bool> emplace(Args&&...)',            doc: 'Construct key-value in-place.',                 complexity: 'O(log n)' },
      { name: 'find',          sig: 'iterator find(const Key& k)',                       doc: 'Find element by key. Returns end() if missing.',complexity: 'O(log n)' },
      { name: 'erase',         sig: 'size_type erase(const Key& k)',                     doc: 'Remove by key. Returns count removed.',          complexity: 'O(log n)' },
      { name: 'count',         sig: 'size_type count(const Key& k)',                     doc: '1 if key exists, 0 otherwise.',                 complexity: 'O(log n)' },
      { name: 'contains',      sig: 'bool contains(const Key& k) const',                doc: 'C++20: true if key exists.',                    complexity: 'O(log n)' },
      { name: 'at',            sig: 'V& at(const Key& k)',                               doc: 'Access value. Throws out_of_range if absent.',  complexity: 'O(log n)' },
      { name: 'size',          sig: 'size_type size() const',                            doc: 'Number of elements.',                           complexity: 'O(1)' },
      { name: 'empty',         sig: 'bool empty() const',                                doc: 'True if no elements.',                          complexity: 'O(1)' },
      { name: 'clear',         sig: 'void clear()',                                       doc: 'Remove all elements.',                          complexity: 'O(n)' },
      { name: 'begin',         sig: 'iterator begin()',                                   doc: 'Iterator to smallest key.',                     complexity: 'O(1)' },
      { name: 'end',           sig: 'iterator end()',                                     doc: 'Iterator past largest key.',                    complexity: 'O(1)' },
      { name: 'rbegin',        sig: 'reverse_iterator rbegin()',                          doc: 'Reverse iterator to largest key.',              complexity: 'O(1)' },
      { name: 'rend',          sig: 'reverse_iterator rend()',                            doc: 'Reverse iterator before smallest.',             complexity: 'O(1)' },
      { name: 'lower_bound',   sig: 'iterator lower_bound(const Key& k)',                doc: 'First key >= k.',                               complexity: 'O(log n)' },
      { name: 'upper_bound',   sig: 'iterator upper_bound(const Key& k)',                doc: 'First key > k.',                                complexity: 'O(log n)' },
      { name: 'equal_range',   sig: 'pair<it,it> equal_range(const Key& k)',             doc: 'Range of elements matching key.',               complexity: 'O(log n)' },
      { name: 'swap',          sig: 'void swap(map& other)',                              doc: 'Swap with another map.',                        complexity: 'O(1)' },
      { name: 'max_size',      sig: 'size_type max_size() const',                        doc: 'Maximum possible element count.',               complexity: 'O(1)' },
    ],
  },

  unordered_map: {
    header: 'unordered_map',
    description: 'Hash-table key-value container (avg O(1) operations)',
    methods: [
      { name: 'insert',         sig: 'pair<iterator,bool> insert(value_type)',           doc: 'Insert if key absent.',                         complexity: 'O(1) avg' },
      { name: 'emplace',        sig: 'pair<iterator,bool> emplace(Args&&...)',           doc: 'Construct in-place.',                           complexity: 'O(1) avg' },
      { name: 'find',           sig: 'iterator find(const Key& k)',                      doc: 'Find by key.',                                  complexity: 'O(1) avg' },
      { name: 'erase',          sig: 'size_type erase(const Key& k)',                    doc: 'Remove by key.',                                complexity: 'O(1) avg' },
      { name: 'count',          sig: 'size_type count(const Key& k)',                    doc: '1 if key exists, 0 otherwise.',                 complexity: 'O(1) avg' },
      { name: 'contains',       sig: 'bool contains(const Key& k) const',               doc: 'C++20: true if key exists.',                    complexity: 'O(1) avg' },
      { name: 'at',             sig: 'V& at(const Key& k)',                              doc: 'Throws if key absent.',                         complexity: 'O(1) avg' },
      { name: 'size',           sig: 'size_type size() const',                           doc: 'Number of elements.',                           complexity: 'O(1)' },
      { name: 'empty',          sig: 'bool empty() const',                               doc: 'True if no elements.',                          complexity: 'O(1)' },
      { name: 'clear',          sig: 'void clear()',                                      doc: 'Remove all elements.',                          complexity: 'O(n)' },
      { name: 'begin',          sig: 'iterator begin()',                                  doc: 'Iterator to first element.',                    complexity: 'O(1)' },
      { name: 'end',            sig: 'iterator end()',                                    doc: 'Iterator past last element.',                   complexity: 'O(1)' },
      { name: 'bucket_count',   sig: 'size_type bucket_count() const',                   doc: 'Number of hash buckets.',                       complexity: 'O(1)' },
      { name: 'load_factor',    sig: 'float load_factor() const',                         doc: 'Average elements per bucket.',                  complexity: 'O(1)' },
      { name: 'max_load_factor',sig: 'void max_load_factor(float ml)',                   doc: 'Set maximum load factor before rehash.',        complexity: 'O(1)' },
      { name: 'rehash',         sig: 'void rehash(size_type n)',                          doc: 'Set bucket count to at least n.',               complexity: 'O(n)' },
      { name: 'reserve',        sig: 'void reserve(size_type n)',                         doc: 'Reserve for n elements without rehash.',        complexity: 'O(n)' },
      { name: 'swap',           sig: 'void swap(unordered_map& other)',                   doc: 'Swap with another unordered_map.',              complexity: 'O(1)' },
    ],
  },

  set: {
    header: 'set',
    description: 'Sorted unique-element container (Red-Black Tree)',
    methods: [
      { name: 'insert',       sig: 'pair<iterator,bool> insert(const T& val)',          doc: 'Insert if not already present.',                complexity: 'O(log n)' },
      { name: 'emplace',      sig: 'pair<iterator,bool> emplace(Args&&...)',            doc: 'Construct in-place if absent.',                 complexity: 'O(log n)' },
      { name: 'find',         sig: 'iterator find(const T& val)',                       doc: 'Find val. Returns end() if absent.',            complexity: 'O(log n)' },
      { name: 'erase',        sig: 'size_type erase(const T& val)',                     doc: 'Remove val.',                                   complexity: 'O(log n)' },
      { name: 'count',        sig: 'size_type count(const T& val)',                     doc: '1 if present, 0 otherwise.',                   complexity: 'O(log n)' },
      { name: 'contains',     sig: 'bool contains(const T& val) const',                 doc: 'C++20: true if val exists.',                    complexity: 'O(log n)' },
      { name: 'size',         sig: 'size_type size() const',                            doc: 'Number of unique elements.',                    complexity: 'O(1)' },
      { name: 'empty',        sig: 'bool empty() const',                                doc: 'True if no elements.',                          complexity: 'O(1)' },
      { name: 'clear',        sig: 'void clear()',                                       doc: 'Remove all elements.',                          complexity: 'O(n)' },
      { name: 'begin',        sig: 'iterator begin()',                                   doc: 'Iterator to smallest element.',                 complexity: 'O(1)' },
      { name: 'end',          sig: 'iterator end()',                                     doc: 'Iterator past largest element.',                complexity: 'O(1)' },
      { name: 'rbegin',       sig: 'reverse_iterator rbegin()',                          doc: 'Reverse iterator to largest.',                  complexity: 'O(1)' },
      { name: 'rend',         sig: 'reverse_iterator rend()',                            doc: 'Reverse iterator before smallest.',             complexity: 'O(1)' },
      { name: 'lower_bound',  sig: 'iterator lower_bound(const T& val)',                doc: 'First element >= val.',                         complexity: 'O(log n)' },
      { name: 'upper_bound',  sig: 'iterator upper_bound(const T& val)',                doc: 'First element > val.',                          complexity: 'O(log n)' },
      { name: 'equal_range',  sig: 'pair<it,it> equal_range(const T& val)',             doc: 'Range of elements equal to val.',               complexity: 'O(log n)' },
      { name: 'swap',         sig: 'void swap(set& other)',                              doc: 'Swap with another set.',                        complexity: 'O(1)' },
      { name: 'max_size',     sig: 'size_type max_size() const',                        doc: 'Maximum possible element count.',               complexity: 'O(1)' },
    ],
  },

  unordered_set: {
    header: 'unordered_set',
    description: 'Hash-table unique-element container (avg O(1) operations)',
    methods: [
      { name: 'insert',       sig: 'pair<iterator,bool> insert(const T& val)',          doc: 'Insert if absent.',                             complexity: 'O(1) avg' },
      { name: 'find',         sig: 'iterator find(const T& val)',                       doc: 'Find val.',                                     complexity: 'O(1) avg' },
      { name: 'erase',        sig: 'size_type erase(const T& val)',                     doc: 'Remove val.',                                   complexity: 'O(1) avg' },
      { name: 'count',        sig: 'size_type count(const T& val)',                     doc: '1 if present, 0 otherwise.',                   complexity: 'O(1) avg' },
      { name: 'contains',     sig: 'bool contains(const T& val) const',                 doc: 'C++20: true if present.',                       complexity: 'O(1) avg' },
      { name: 'size',         sig: 'size_type size() const',                            doc: 'Number of elements.',                           complexity: 'O(1)' },
      { name: 'empty',        sig: 'bool empty() const',                                doc: 'True if no elements.',                          complexity: 'O(1)' },
      { name: 'clear',        sig: 'void clear()',                                       doc: 'Remove all elements.',                          complexity: 'O(n)' },
      { name: 'begin',        sig: 'iterator begin()',                                   doc: 'Iterator to first element.',                    complexity: 'O(1)' },
      { name: 'end',          sig: 'iterator end()',                                     doc: 'Iterator past last element.',                   complexity: 'O(1)' },
      { name: 'bucket_count', sig: 'size_type bucket_count() const',                    doc: 'Number of hash buckets.',                       complexity: 'O(1)' },
      { name: 'load_factor',  sig: 'float load_factor() const',                         doc: 'Average elements per bucket.',                  complexity: 'O(1)' },
      { name: 'rehash',       sig: 'void rehash(size_type n)',                           doc: 'Set bucket count to at least n.',               complexity: 'O(n)' },
      { name: 'reserve',      sig: 'void reserve(size_type n)',                          doc: 'Reserve for n elements.',                       complexity: 'O(n)' },
      { name: 'swap',         sig: 'void swap(unordered_set& other)',                    doc: 'Swap with another unordered_set.',              complexity: 'O(1)' },
    ],
  },

  stack: {
    header: 'stack',
    description: 'LIFO stack adaptor (backed by deque)',
    methods: [
      { name: 'push',    sig: 'void push(const T& val)',      doc: 'Push element onto top.',                 complexity: 'O(1)' },
      { name: 'pop',     sig: 'void pop()',                    doc: 'Remove top element. UB if empty.',       complexity: 'O(1)' },
      { name: 'top',     sig: 'T& top()',                      doc: 'Access top element. UB if empty.',       complexity: 'O(1)' },
      { name: 'empty',   sig: 'bool empty() const',            doc: 'True if no elements.',                   complexity: 'O(1)' },
      { name: 'size',    sig: 'size_type size() const',        doc: 'Number of elements.',                    complexity: 'O(1)' },
      { name: 'emplace', sig: 'void emplace(Args&&... args)',  doc: 'Construct element in-place at top.',     complexity: 'O(1)' },
      { name: 'swap',    sig: 'void swap(stack& other)',        doc: 'Swap with another stack.',               complexity: 'O(1)' },
    ],
  },

  queue: {
    header: 'queue',
    description: 'FIFO queue adaptor (backed by deque)',
    methods: [
      { name: 'push',    sig: 'void push(const T& val)',      doc: 'Add element to back.',                   complexity: 'O(1)' },
      { name: 'pop',     sig: 'void pop()',                    doc: 'Remove front element. UB if empty.',     complexity: 'O(1)' },
      { name: 'front',   sig: 'T& front()',                    doc: 'Access front element. UB if empty.',     complexity: 'O(1)' },
      { name: 'back',    sig: 'T& back()',                     doc: 'Access back element. UB if empty.',      complexity: 'O(1)' },
      { name: 'empty',   sig: 'bool empty() const',            doc: 'True if no elements.',                   complexity: 'O(1)' },
      { name: 'size',    sig: 'size_type size() const',        doc: 'Number of elements.',                    complexity: 'O(1)' },
      { name: 'emplace', sig: 'void emplace(Args&&... args)',  doc: 'Construct element in-place at back.',    complexity: 'O(1)' },
      { name: 'swap',    sig: 'void swap(queue& other)',        doc: 'Swap with another queue.',               complexity: 'O(1)' },
    ],
  },

  deque: {
    header: 'deque',
    description: 'Double-ended queue',
    methods: [
      { name: 'push_back',    sig: 'void push_back(const T& val)',   doc: 'Append to back.',             complexity: 'O(1)' },
      { name: 'push_front',   sig: 'void push_front(const T& val)',  doc: 'Prepend to front.',           complexity: 'O(1)' },
      { name: 'pop_back',     sig: 'void pop_back()',                 doc: 'Remove last element.',        complexity: 'O(1)' },
      { name: 'pop_front',    sig: 'void pop_front()',                doc: 'Remove first element.',       complexity: 'O(1)' },
      { name: 'emplace_back', sig: 'T& emplace_back(Args&&...)',      doc: 'Construct in-place at back.', complexity: 'O(1)' },
      { name: 'emplace_front',sig: 'T& emplace_front(Args&&...)',     doc: 'Construct at front.',         complexity: 'O(1)' },
      { name: 'at',           sig: 'T& at(size_type n)',              doc: 'Bounds-checked access.',      complexity: 'O(1)' },
      { name: 'front',        sig: 'T& front()',                      doc: 'Access first element.',       complexity: 'O(1)' },
      { name: 'back',         sig: 'T& back()',                       doc: 'Access last element.',        complexity: 'O(1)' },
      { name: 'size',         sig: 'size_type size() const',          doc: 'Number of elements.',         complexity: 'O(1)' },
      { name: 'empty',        sig: 'bool empty() const',              doc: 'True if no elements.',        complexity: 'O(1)' },
      { name: 'clear',        sig: 'void clear()',                     doc: 'Remove all elements.',        complexity: 'O(n)' },
      { name: 'begin',        sig: 'iterator begin()',                 doc: 'Iterator to first.',          complexity: 'O(1)' },
      { name: 'end',          sig: 'iterator end()',                   doc: 'Iterator past last.',         complexity: 'O(1)' },
      { name: 'insert',       sig: 'iterator insert(iterator pos, const T& val)', doc: 'Insert before pos.', complexity: 'O(n)' },
      { name: 'erase',        sig: 'iterator erase(iterator pos)',    doc: 'Erase at pos.',               complexity: 'O(n)' },
      { name: 'resize',       sig: 'void resize(size_type n)',        doc: 'Resize to n elements.',       complexity: 'O(n)' },
      { name: 'swap',         sig: 'void swap(deque& other)',          doc: 'Swap contents.',              complexity: 'O(1)' },
    ],
  },

  list: {
    header: 'list',
    description: 'Doubly-linked list',
    methods: [
      { name: 'push_back',    sig: 'void push_back(const T& val)',   doc: 'Append to back.',              complexity: 'O(1)' },
      { name: 'push_front',   sig: 'void push_front(const T& val)',  doc: 'Prepend to front.',            complexity: 'O(1)' },
      { name: 'pop_back',     sig: 'void pop_back()',                 doc: 'Remove last element.',         complexity: 'O(1)' },
      { name: 'pop_front',    sig: 'void pop_front()',                doc: 'Remove first element.',        complexity: 'O(1)' },
      { name: 'front',        sig: 'T& front()',                      doc: 'Access first element.',        complexity: 'O(1)' },
      { name: 'back',         sig: 'T& back()',                       doc: 'Access last element.',         complexity: 'O(1)' },
      { name: 'size',         sig: 'size_type size() const',          doc: 'Number of elements.',          complexity: 'O(1)' },
      { name: 'empty',        sig: 'bool empty() const',              doc: 'True if no elements.',         complexity: 'O(1)' },
      { name: 'clear',        sig: 'void clear()',                     doc: 'Remove all elements.',         complexity: 'O(n)' },
      { name: 'begin',        sig: 'iterator begin()',                 doc: 'Iterator to first.',           complexity: 'O(1)' },
      { name: 'end',          sig: 'iterator end()',                   doc: 'Iterator past last.',          complexity: 'O(1)' },
      { name: 'insert',       sig: 'iterator insert(iterator pos, const T& val)', doc: 'Insert before pos.', complexity: 'O(1)' },
      { name: 'erase',        sig: 'iterator erase(iterator pos)',    doc: 'Erase at pos.',                complexity: 'O(1)' },
      { name: 'remove',       sig: 'void remove(const T& val)',       doc: 'Remove all elements == val.',  complexity: 'O(n)' },
      { name: 'sort',         sig: 'void sort()',                      doc: 'Sort elements in-place.',      complexity: 'O(n log n)' },
      { name: 'reverse',      sig: 'void reverse()',                   doc: 'Reverse element order.',       complexity: 'O(n)' },
      { name: 'unique',       sig: 'void unique()',                    doc: 'Remove consecutive duplicates.',complexity: 'O(n)' },
      { name: 'merge',        sig: 'void merge(list& other)',          doc: 'Merge sorted list into this.', complexity: 'O(n)' },
      { name: 'splice',       sig: 'void splice(iterator pos, list& other)', doc: 'Transfer elements from other.',complexity: 'O(1)' },
      { name: 'swap',         sig: 'void swap(list& other)',           doc: 'Swap with another list.',      complexity: 'O(1)' },
    ],
  },

  priority_queue: {
    header: 'queue',
    description: 'Max-heap priority queue adaptor',
    methods: [
      { name: 'push',    sig: 'void push(const T& val)',       doc: 'Insert and heapify.',               complexity: 'O(log n)' },
      { name: 'pop',     sig: 'void pop()',                     doc: 'Remove max element.',               complexity: 'O(log n)' },
      { name: 'top',     sig: 'const T& top() const',           doc: 'Access max element. UB if empty.', complexity: 'O(1)' },
      { name: 'empty',   sig: 'bool empty() const',             doc: 'True if no elements.',              complexity: 'O(1)' },
      { name: 'size',    sig: 'size_type size() const',         doc: 'Number of elements.',               complexity: 'O(1)' },
      { name: 'emplace', sig: 'void emplace(Args&&... args)',   doc: 'Construct in-place and heapify.',   complexity: 'O(log n)' },
      { name: 'swap',    sig: 'void swap(priority_queue& other)', doc: 'Swap with another pq.',          complexity: 'O(1)' },
    ],
  },

  algorithm: {
    header: 'algorithm',
    description: 'Standard algorithms library',
    methods: [
      { name: 'sort',              sig: 'void sort(It first, It last)',                          doc: 'Sort range ascending. Requires RandomAccessIterator.', complexity: 'O(n log n)' },
      { name: 'stable_sort',       sig: 'void stable_sort(It first, It last)',                   doc: 'Sort preserving equal element order.',                  complexity: 'O(n log² n)' },
      { name: 'reverse',           sig: 'void reverse(It first, It last)',                        doc: 'Reverse range in-place.',                               complexity: 'O(n)' },
      { name: 'find',              sig: 'It find(It first, It last, const T& val)',               doc: 'First element == val.',                                 complexity: 'O(n)' },
      { name: 'find_if',           sig: 'It find_if(It first, It last, Pred p)',                  doc: 'First element satisfying predicate.',                   complexity: 'O(n)' },
      { name: 'count',             sig: 'ptrdiff_t count(It first, It last, const T& val)',       doc: 'Count occurrences of val.',                             complexity: 'O(n)' },
      { name: 'count_if',          sig: 'ptrdiff_t count_if(It first, It last, Pred p)',          doc: 'Count elements satisfying predicate.',                  complexity: 'O(n)' },
      { name: 'binary_search',     sig: 'bool binary_search(It first, It last, const T& val)',   doc: 'Binary search on sorted range.',                        complexity: 'O(log n)' },
      { name: 'lower_bound',       sig: 'It lower_bound(It first, It last, const T& val)',        doc: 'First element >= val in sorted range.',                 complexity: 'O(log n)' },
      { name: 'upper_bound',       sig: 'It upper_bound(It first, It last, const T& val)',        doc: 'First element > val in sorted range.',                  complexity: 'O(log n)' },
      { name: 'min',               sig: 'const T& min(const T& a, const T& b)',                   doc: 'Return smaller of a, b.',                               complexity: 'O(1)' },
      { name: 'max',               sig: 'const T& max(const T& a, const T& b)',                   doc: 'Return larger of a, b.',                                complexity: 'O(1)' },
      { name: 'min_element',       sig: 'It min_element(It first, It last)',                       doc: 'Iterator to minimum element.',                          complexity: 'O(n)' },
      { name: 'max_element',       sig: 'It max_element(It first, It last)',                       doc: 'Iterator to maximum element.',                          complexity: 'O(n)' },
      { name: 'for_each',          sig: 'F for_each(It first, It last, F fn)',                     doc: 'Apply fn to each element.',                             complexity: 'O(n)' },
      { name: 'transform',         sig: 'It2 transform(It first, It last, It2 out, F fn)',         doc: 'Apply fn, write results to out.',                       complexity: 'O(n)' },
      { name: 'copy',              sig: 'It2 copy(It first, It last, It2 out)',                    doc: 'Copy range to output iterator.',                        complexity: 'O(n)' },
      { name: 'fill',              sig: 'void fill(It first, It last, const T& val)',              doc: 'Fill range with val.',                                  complexity: 'O(n)' },
      { name: 'unique',            sig: 'It unique(It first, It last)',                            doc: 'Remove consecutive duplicates.',                        complexity: 'O(n)' },
      { name: 'remove',            sig: 'It remove(It first, It last, const T& val)',              doc: 'Remove elements == val (logical only).',                complexity: 'O(n)' },
      { name: 'replace',           sig: 'void replace(It first, It last, const T& old_v, const T& new_v)', doc: 'Replace old_v with new_v.',               complexity: 'O(n)' },
      { name: 'accumulate',        sig: 'T accumulate(It first, It last, T init)',                 doc: 'Sum range (needs <numeric>).',                          complexity: 'O(n)' },
      { name: 'any_of',            sig: 'bool any_of(It first, It last, Pred p)',                  doc: 'True if any element satisfies p.',                      complexity: 'O(n)' },
      { name: 'all_of',            sig: 'bool all_of(It first, It last, Pred p)',                  doc: 'True if all elements satisfy p.',                       complexity: 'O(n)' },
      { name: 'none_of',           sig: 'bool none_of(It first, It last, Pred p)',                 doc: 'True if no element satisfies p.',                       complexity: 'O(n)' },
      { name: 'next_permutation',  sig: 'bool next_permutation(It first, It last)',                doc: 'Advance to next lexicographic permutation.',            complexity: 'O(n)' },
      { name: 'prev_permutation',  sig: 'bool prev_permutation(It first, It last)',                doc: 'Go to previous permutation.',                           complexity: 'O(n)' },
      { name: 'nth_element',       sig: 'void nth_element(It first, It nth, It last)',             doc: 'Partial sort: nth is correct, rest unordered.',         complexity: 'O(n) avg' },
      { name: 'partial_sort',      sig: 'void partial_sort(It first, It mid, It last)',            doc: 'Sort [first,mid), rest unordered.',                     complexity: 'O(n log k)' },
      { name: 'rotate',            sig: 'It rotate(It first, It n_first, It last)',                doc: 'Rotate so n_first becomes new begin.',                  complexity: 'O(n)' },
      { name: 'shuffle',           sig: 'void shuffle(It first, It last, URNG&& g)',               doc: 'Randomly permute range.',                               complexity: 'O(n)' },
      { name: 'merge',             sig: 'It3 merge(It1 f1, It1 l1, It2 f2, It2 l2, It3 out)',    doc: 'Merge two sorted ranges.',                              complexity: 'O(n+m)' },
      { name: 'swap',              sig: 'void swap(T& a, T& b)',                                   doc: 'Swap two values.',                                      complexity: 'O(1)' },
      { name: 'iter_swap',         sig: 'void iter_swap(It1 a, It2 b)',                            doc: 'Swap values pointed to by iterators.',                  complexity: 'O(1)' },
    ],
  },

  iostream: {
    header: 'iostream',
    description: 'Standard I/O streams',
    methods: [
      { name: 'cout',   sig: 'std::ostream cout',       doc: 'Standard output stream.',     complexity: '-' },
      { name: 'cin',    sig: 'std::istream cin',        doc: 'Standard input stream.',      complexity: '-' },
      { name: 'cerr',   sig: 'std::ostream cerr',       doc: 'Standard error stream.',      complexity: '-' },
      { name: 'clog',   sig: 'std::ostream clog',       doc: 'Standard log stream.',        complexity: '-' },
      { name: 'endl',   sig: 'ostream& endl(ostream&)', doc: 'Output newline + flush.',    complexity: 'O(1)' },
      { name: 'flush',  sig: 'ostream& flush(ostream&)', doc: 'Flush output buffer.',      complexity: 'O(1)' },
      { name: 'ws',     sig: 'istream& ws(istream&)',   doc: 'Skip whitespace.',            complexity: 'O(n)' },
      { name: 'get',    sig: 'int get()',               doc: 'Read one character.',         complexity: 'O(1)' },
      { name: 'getline', sig: 'istream& getline(char*,int)', doc: 'Read line of input.',   complexity: 'O(n)' },
      { name: 'put',    sig: 'ostream& put(char)',      doc: 'Write one character.',        complexity: 'O(1)' },
      { name: 'peek',   sig: 'int peek()',              doc: 'Look at next character.',     complexity: 'O(1)' },
      { name: 'read',   sig: 'istream& read(char*,int)', doc: 'Read bytes.',               complexity: 'O(n)' },
      { name: 'write',  sig: 'ostream& write(const char*,int)', doc: 'Write bytes.',       complexity: 'O(n)' },
      { name: 'ignore', sig: 'istream& ignore(int,int)', doc: 'Skip characters.',          complexity: 'O(n)' },
      { name: 'good',   sig: 'bool good() const',       doc: 'Check stream is good.',      complexity: 'O(1)' },
      { name: 'eof',    sig: 'bool eof() const',        doc: 'Check end-of-file flag.',    complexity: 'O(1)' },
      { name: 'fail',   sig: 'bool fail() const',       doc: 'Check fail bit.',            complexity: 'O(1)' },
      { name: 'bad',    sig: 'bool bad() const',        doc: 'Check badbit.',              complexity: 'O(1)' },
    ],
  },

  memory: {
    header: 'memory',
    description: 'Smart pointers and memory management',
    methods: [
      { name: 'make_unique',  sig: 'unique_ptr<T> make_unique(Args&&... args)',   doc: 'Create unique_ptr (preferred over new).',  complexity: 'O(1)' },
      { name: 'make_shared',  sig: 'shared_ptr<T> make_shared(Args&&... args)',   doc: 'Create shared_ptr (single allocation).',   complexity: 'O(1)' },
      { name: 'unique_ptr',   sig: 'unique_ptr<T>',                               doc: 'Exclusive ownership smart pointer.',        complexity: '-' },
      { name: 'shared_ptr',   sig: 'shared_ptr<T>',                               doc: 'Shared ownership smart pointer.',           complexity: '-' },
      { name: 'weak_ptr',     sig: 'weak_ptr<T>',                                 doc: 'Non-owning observer to shared_ptr.',        complexity: '-' },
    ],
  },

  utility: {
    header: 'utility',
    description: 'Utility functions and types',
    methods: [
      { name: 'make_pair',  sig: 'pair<T1,T2> make_pair(T1 t, T2 u)',          doc: 'Create a pair.',           complexity: 'O(1)' },
      { name: 'move',       sig: 'T&& move(T& t)',                              doc: 'Cast to rvalue reference.', complexity: 'O(1)' },
      { name: 'forward',    sig: 'T&& forward(T& t)',                           doc: 'Perfect forward.',          complexity: 'O(1)' },
      { name: 'swap',       sig: 'void swap(T& a, T& b)',                       doc: 'Swap two values.',          complexity: 'O(1)' },
      { name: 'exchange',   sig: 'T exchange(T& obj, U&& new_val)',             doc: 'Replace and return old.',   complexity: 'O(1)' },
      { name: 'pair',       sig: 'pair<T1,T2>',                                 doc: 'Two-element tuple.',        complexity: '-' },
    ],
  },

  numeric: {
    header: 'numeric',
    description: 'Numeric algorithms',
    methods: [
      { name: 'accumulate',           sig: 'T accumulate(It first, It last, T init)',               doc: 'Sum range starting from init.',              complexity: 'O(n)' },
      { name: 'inner_product',        sig: 'T inner_product(It1 f1, It1 l1, It2 f2, T init)',       doc: 'Inner product of two ranges.',               complexity: 'O(n)' },
      { name: 'partial_sum',          sig: 'It2 partial_sum(It first, It last, It2 out)',            doc: 'Prefix sums.',                               complexity: 'O(n)' },
      { name: 'adjacent_difference',  sig: 'It2 adjacent_difference(It first, It last, It2 out)',   doc: 'Differences between adjacent elements.',     complexity: 'O(n)' },
      { name: 'iota',                 sig: 'void iota(It first, It last, T value)',                  doc: 'Fill with incrementing values from value.',  complexity: 'O(n)' },
      { name: 'gcd',                  sig: 'T gcd(T m, T n)',                                        doc: 'Greatest common divisor (C++17).',           complexity: 'O(log n)' },
      { name: 'lcm',                  sig: 'T lcm(T m, T n)',                                        doc: 'Least common multiple (C++17).',             complexity: 'O(log n)' },
    ],
  },

  chrono: {
    header: 'chrono',
    description: 'Time utilities',
    methods: [
      { name: 'system_clock',          sig: 'std::chrono::system_clock',             doc: 'Wall-clock time.',                           complexity: '-' },
      { name: 'steady_clock',          sig: 'std::chrono::steady_clock',             doc: 'Monotonic clock for measurements.',          complexity: '-' },
      { name: 'high_resolution_clock', sig: 'std::chrono::high_resolution_clock',    doc: 'Highest resolution clock available.',        complexity: '-' },
      { name: 'duration_cast',         sig: 'Duration duration_cast(Duration d)',    doc: 'Convert between duration types.',            complexity: 'O(1)' },
      { name: 'seconds',               sig: 'std::chrono::seconds',                  doc: 'Duration of one second.',                    complexity: '-' },
      { name: 'milliseconds',          sig: 'std::chrono::milliseconds',             doc: 'Duration of one millisecond.',               complexity: '-' },
      { name: 'microseconds',          sig: 'std::chrono::microseconds',             doc: 'Duration of one microsecond.',               complexity: '-' },
      { name: 'nanoseconds',           sig: 'std::chrono::nanoseconds',              doc: 'Duration of one nanosecond.',                complexity: '-' },
    ],
  },

  bitset: {
    header: 'bitset',
    description: 'Fixed-size sequence of N bits',
    methods: [
      { name: 'set',        sig: 'bitset& set(size_t pos)',     doc: 'Set bit at pos to 1.',          complexity: 'O(1)' },
      { name: 'reset',      sig: 'bitset& reset(size_t pos)',   doc: 'Set bit at pos to 0.',          complexity: 'O(1)' },
      { name: 'flip',       sig: 'bitset& flip(size_t pos)',    doc: 'Flip bit at pos.',              complexity: 'O(1)' },
      { name: 'test',       sig: 'bool test(size_t pos) const', doc: 'Return bit value at pos.',      complexity: 'O(1)' },
      { name: 'any',        sig: 'bool any() const',            doc: 'True if any bit is 1.',         complexity: 'O(N)' },
      { name: 'all',        sig: 'bool all() const',            doc: 'True if all bits are 1.',       complexity: 'O(N)' },
      { name: 'none',       sig: 'bool none() const',           doc: 'True if no bits are 1.',        complexity: 'O(N)' },
      { name: 'count',      sig: 'size_t count() const',        doc: 'Number of set bits.',           complexity: 'O(N)' },
      { name: 'size',       sig: 'size_t size() const',         doc: 'Total number of bits (N).',     complexity: 'O(1)' },
      { name: 'to_string',  sig: 'string to_string() const',   doc: 'Convert to "0"/"1" string.',    complexity: 'O(N)' },
      { name: 'to_ulong',   sig: 'unsigned long to_ulong()',   doc: 'Convert to unsigned long.',     complexity: 'O(N)' },
      { name: 'to_ullong',  sig: 'unsigned long long to_ullong()', doc: 'Convert to unsigned long long.', complexity: 'O(N)' },
    ],
  },

  array: {
    header: 'array',
    description: 'Fixed-size stack-allocated array',
    methods: [
      { name: 'at',       sig: 'T& at(size_type n)',      doc: 'Bounds-checked access.',     complexity: 'O(1)' },
      { name: 'front',    sig: 'T& front()',               doc: 'Access first element.',      complexity: 'O(1)' },
      { name: 'back',     sig: 'T& back()',                doc: 'Access last element.',       complexity: 'O(1)' },
      { name: 'data',     sig: 'T* data()',                doc: 'Pointer to underlying array.',complexity: 'O(1)' },
      { name: 'begin',    sig: 'iterator begin()',          doc: 'Iterator to first.',         complexity: 'O(1)' },
      { name: 'end',      sig: 'iterator end()',            doc: 'Iterator past last.',        complexity: 'O(1)' },
      { name: 'size',     sig: 'constexpr size_type size() const', doc: 'Fixed size N.',     complexity: 'O(1)' },
      { name: 'empty',    sig: 'constexpr bool empty() const',     doc: 'True if N == 0.',   complexity: 'O(1)' },
      { name: 'fill',     sig: 'void fill(const T& val)',  doc: 'Fill all elements with val.',complexity: 'O(N)' },
      { name: 'swap',     sig: 'void swap(array& other)',  doc: 'Swap with another array.',   complexity: 'O(N)' },
      { name: 'max_size', sig: 'constexpr size_type max_size()',  doc: 'Same as size().',     complexity: 'O(1)' },
    ],
  },

  forward_list: {
    header: 'forward_list',
    description: 'Singly-linked list',
    methods: [
      { name: 'push_front',   sig: 'void push_front(const T& val)',           doc: 'Insert element at front.',                     complexity: 'O(1)' },
      { name: 'pop_front',    sig: 'void pop_front()',                         doc: 'Remove first element.',                         complexity: 'O(1)' },
      { name: 'front',        sig: 'T& front()',                               doc: 'Access first element.',                         complexity: 'O(1)' },
      { name: 'empty',        sig: 'bool empty() const',                      doc: 'Return true if empty.',                         complexity: 'O(1)' },
      { name: 'clear',        sig: 'void clear()',                             doc: 'Remove all elements.',                           complexity: 'O(n)' },
      { name: 'insert_after', sig: 'iterator insert_after(iterator pos, const T& val)', doc: 'Insert after pos.',               complexity: 'O(1)' },
      { name: 'erase_after',  sig: 'iterator erase_after(iterator pos)',      doc: 'Erase element after pos.',                      complexity: 'O(1)' },
      { name: 'before_begin', sig: 'iterator before_begin()',                  doc: 'Iterator before first element.',                complexity: 'O(1)' },
      { name: 'remove',       sig: 'void remove(const T& val)',               doc: 'Remove all elements equal to val.',             complexity: 'O(n)' },
      { name: 'reverse',      sig: 'void reverse()',                           doc: 'Reverse list order.',                            complexity: 'O(n)' },
      { name: 'sort',         sig: 'void sort()',                              doc: 'Sort elements in-place.',                        complexity: 'O(n log n)' },
      { name: 'merge',        sig: 'void merge(forward_list& other)',         doc: 'Merge sorted list into this.',                  complexity: 'O(n)' },
      { name: 'swap',         sig: 'void swap(forward_list& other)',          doc: 'Swap with another forward_list.',               complexity: 'O(1)' },
    ],
  },

  fstream: {
    header: 'fstream',
    description: 'File stream I/O',
    methods: [
      { name: 'open',      sig: 'void open(const string& filename)',    doc: 'Open file.',                    complexity: 'O(1)' },
      { name: 'close',     sig: 'void close()',                         doc: 'Close file.',                   complexity: 'O(1)' },
      { name: 'is_open',   sig: 'bool is_open() const',                doc: 'Check whether file is open.',   complexity: 'O(1)' },
      { name: 'good',      sig: 'bool good() const',                   doc: 'Check stream state.',           complexity: 'O(1)' },
      { name: 'read',      sig: 'fstream& read(char* s, streamsize n)', doc: 'Read characters from file.',    complexity: 'O(n)' },
      { name: 'write',     sig: 'fstream& write(const char* s, streamsize n)', doc: 'Write characters to file.', complexity: 'O(n)' },
      { name: 'seekg',     sig: 'fstream& seekg(streampos pos)',        doc: 'Set input position.',           complexity: 'O(1)' },
      { name: 'seekp',     sig: 'fstream& seekp(streampos pos)',        doc: 'Set output position.',          complexity: 'O(1)' },
      { name: 'tellg',     sig: 'streampos tellg()',                   doc: 'Get input position.',           complexity: 'O(1)' },
      { name: 'tellp',     sig: 'streampos tellp()',                   doc: 'Get output position.',          complexity: 'O(1)' },
    ],
  },

  sstream: {
    header: 'sstream',
    description: 'String stream I/O',
    methods: [
      { name: 'str',      sig: 'string str() const',                  doc: 'Return underlying string.',     complexity: 'O(n)' },
      { name: 'str',      sig: 'void str(const string& s)',           doc: 'Set underlying string.',        complexity: 'O(n)' },
      { name: 'clear',    sig: 'void clear()',                         doc: 'Clear stream state flags.',      complexity: 'O(1)' },
      { name: 'seekg',    sig: 'stringstream& seekg(pos_type pos)',    doc: 'Set input position.',           complexity: 'O(1)' },
      { name: 'seekp',    sig: 'stringstream& seekp(pos_type pos)',    doc: 'Set output position.',          complexity: 'O(1)' },
      { name: 'tellg',    sig: 'pos_type tellg()',                    doc: 'Get input position.',           complexity: 'O(1)' },
      { name: 'tellp',    sig: 'pos_type tellp()',                    doc: 'Get output position.',          complexity: 'O(1)' },
    ],
  },

  iomanip: {
    header: 'iomanip',
    description: 'I/O manipulators',
    methods: [
      { name: 'setprecision', sig: 'std::setprecision(int n)', doc: 'Set decimal precision.', complexity: 'O(1)' },
      { name: 'setw',         sig: 'std::setw(int n)',      doc: 'Set field width.',          complexity: 'O(1)' },
      { name: 'setfill',      sig: 'std::setfill(char c)',  doc: 'Set fill character.',       complexity: 'O(1)' },
      { name: 'fixed',        sig: 'std::fixed',            doc: 'Use fixed-point notation.',  complexity: 'O(1)' },
      { name: 'scientific',   sig: 'std::scientific',       doc: 'Use scientific notation.',   complexity: 'O(1)' },
      { name: 'boolalpha',    sig: 'std::boolalpha',        doc: 'Format bool as true/false.', complexity: 'O(1)' },
    ],
  },

  thread: {
    header: 'thread',
    description: 'Thread support library',
    methods: [
      { name: 'join',               sig: 'void join()',              doc: 'Wait for thread to finish.', complexity: 'O(1)' },
      { name: 'detach',             sig: 'void detach()',            doc: 'Release thread resources.',   complexity: 'O(1)' },
      { name: 'joinable',           sig: 'bool joinable() const',    doc: 'Check if thread can be joined.', complexity: 'O(1)' },
      { name: 'hardware_concurrency', sig: 'static unsigned int hardware_concurrency()', doc: 'Number of concurrent threads supported.', complexity: 'O(1)' },
    ],
  },

  mutex: {
    header: 'mutex',
    description: 'Mutual exclusion primitives',
    methods: [
      { name: 'lock',      sig: 'void lock()',      doc: 'Acquire the mutex.',           complexity: 'O(1)' },
      { name: 'unlock',    sig: 'void unlock()',    doc: 'Release the mutex.',           complexity: 'O(1)' },
      { name: 'try_lock',  sig: 'bool try_lock()',  doc: 'Try to acquire without blocking.', complexity: 'O(1)' },
      { name: 'native_handle', sig: 'native_handle_type native_handle()', doc: 'Get native handle.', complexity: 'O(1)' },
    ],
  },

  functional: {
    header: 'functional',
    description: 'Function objects and wrappers',
    methods: [
      { name: 'bind',      sig: 'std::bind(F&& f, Args&&... args)',      doc: 'Bind arguments to function.',   complexity: 'O(1)' },
      { name: 'function',  sig: 'std::function<R(Args...)>',             doc: 'Type-erased callable wrapper.', complexity: 'O(1)' },
      { name: 'mem_fn',    sig: 'std::mem_fn(F f)',                     doc: 'Wrap pointer to member.',       complexity: 'O(1)' },
      { name: 'ref',       sig: 'std::ref(T& t)',                       doc: 'Create reference wrapper.',     complexity: 'O(1)' },
      { name: 'cref',      sig: 'std::cref(const T& t)',               doc: 'Create const reference wrapper.', complexity: 'O(1)' },
    ],
  },

  iterator: {
    header: 'iterator',
    description: 'Iterator utilities',
    methods: [
      { name: 'begin',      sig: 'std::begin(Container& c)',     doc: 'Iterator to first element.',    complexity: 'O(1)' },
      { name: 'end',        sig: 'std::end(Container& c)',       doc: 'Iterator past last element.',    complexity: 'O(1)' },
      { name: 'advance',    sig: 'void advance(It& it, int n)', doc: 'Advance iterator by n.',        complexity: 'O(n)' },
      { name: 'distance',   sig: 'typename std::iterator_traits<It>::difference_type distance(It first, It last)', doc: 'Distance between iterators.', complexity: 'O(n)' },
      { name: 'next',       sig: 'It next(It it, difference_type n = 1)', doc: 'Return advanced iterator.', complexity: 'O(n)' },
      { name: 'prev',       sig: 'It prev(It it, difference_type n = 1)', doc: 'Return previous iterator.', complexity: 'O(n)' },
    ],
  },

  random: {
    header: 'random',
    description: 'Random number generation utilities',
    methods: [
      { name: 'random_device', sig: 'std::random_device',                  doc: 'Non-deterministic random number source.', complexity: 'O(1)' },
      { name: 'mt19937',       sig: 'std::mt19937',                        doc: 'Mersenne Twister engine.',                 complexity: 'O(1)' },
      { name: 'uniform_int_distribution', sig: 'std::uniform_int_distribution<IntType>', doc: 'Integer distribution.', complexity: 'O(1)' },
      { name: 'uniform_real_distribution', sig: 'std::uniform_real_distribution<RealType>', doc: 'Real distribution.', complexity: 'O(1)' },
    ],
  },
};

const ALL_HEADERS = [
  'algorithm', 'array', 'bitset', 'chrono', 'complex',
  'deque', 'exception', 'filesystem', 'forward_list',
  'fstream', 'functional', 'future', 'initializer_list',
  'iomanip', 'ios', 'iosfwd', 'iostream', 'istream',
  'iterator', 'limits', 'list', 'locale', 'map', 'memory',
  'mutex', 'new', 'numeric', 'optional', 'ostream',
  'queue', 'random', 'ratio', 'regex', 'set', 'shared_mutex',
  'sstream', 'stack', 'stdexcept', 'streambuf', 'string',
  'string_view', 'thread', 'tuple', 'type_traits',
  'typeinfo', 'unordered_map', 'unordered_set', 'utility',
  'variant', 'vector'
];

const ALL_STL_TYPES = [
  { text: 'vector',         sig: 'std::vector<T>',          doc: 'Dynamic array. Include <vector>.',            type: 'class' },
  { text: 'string',         sig: 'std::string',             doc: 'String class. Include <string>.',             type: 'class' },
  { text: 'map',            sig: 'std::map<K,V>',           doc: 'Sorted map. Include <map>.',                  type: 'class' },
  { text: 'unordered_map',  sig: 'std::unordered_map<K,V>',  doc: 'Hash map. Include <unordered_map>.',          type: 'class' },
  { text: 'set',            sig: 'std::set<T>',             doc: 'Sorted unique set. Include <set>.',           type: 'class' },
  { text: 'unordered_set',  sig: 'std::unordered_set<T>',    doc: 'Hash set. Include <unordered_set>.',          type: 'class' },
  { text: 'stack',          sig: 'std::stack<T>',           doc: 'LIFO stack. Include <stack>.',                type: 'class' },
  { text: 'queue',          sig: 'std::queue<T>',           doc: 'FIFO queue. Include <queue>.',                type: 'class' },
  { text: 'priority_queue', sig: 'std::priority_queue<T>',  doc: 'Max-heap. Include <queue>.',                  type: 'class' },
  { text: 'deque',          sig: 'std::deque<T>',           doc: 'Double-ended queue. Include <deque>.',        type: 'class' },
  { text: 'list',           sig: 'std::list<T>',            doc: 'Doubly-linked list. Include <list>.',         type: 'class' },
  { text: 'forward_list',   sig: 'std::forward_list<T>',    doc: 'Singly-linked list. Include <forward_list>.', type: 'class' },
  { text: 'array',          sig: 'std::array<T,N>',         doc: 'Fixed-size array. Include <array>.',          type: 'class' },
  { text: 'bitset',         sig: 'std::bitset<N>',          doc: 'Fixed-size bitset. Include <bitset>.',        type: 'class' },
  { text: 'pair',           sig: 'std::pair<T1,T2>',        doc: 'Two-value pair. Include <utility>.',          type: 'class' },
  { text: 'tuple',          sig: 'std::tuple<T...>',        doc: 'N-value tuple. Include <tuple>.',             type: 'class' },
  { text: 'unique_ptr',     sig: 'std::unique_ptr<T>',      doc: 'Unique ownership pointer. Include <memory>.', type: 'class' },
  { text: 'shared_ptr',     sig: 'std::shared_ptr<T>',      doc: 'Shared ownership pointer. Include <memory>.', type: 'class' },
  { text: 'weak_ptr',       sig: 'std::weak_ptr<T>',        doc: 'Non-owning pointer. Include <memory>.',       type: 'class' },
  { text: 'optional',       sig: 'std::optional<T>',        doc: 'Optional value. Include <optional>.',         type: 'class' },
  { text: 'variant',        sig: 'std::variant<T...>',      doc: 'Type-safe union. Include <variant>.',         type: 'class' },
  { text: 'function',       sig: 'std::function<R(Args)>',  doc: 'Function wrapper. Include <functional>.',     type: 'class' },
  { text: 'cout',           sig: 'std::cout',               doc: 'Standard output stream. Include <iostream>.', type: 'object' },
  { text: 'cin',            sig: 'std::cin',                doc: 'Standard input stream. Include <iostream>.',  type: 'object' },
  { text: 'cerr',           sig: 'std::cerr',               doc: 'Standard error stream. Include <iostream>.', type: 'object' },
  { text: 'clog',           sig: 'std::clog',               doc: 'Standard log stream. Include <iostream>.',  type: 'object' },
  { text: 'endl',           sig: 'std::endl',               doc: 'Stream manipulator for newline. Include <iostream>.', type: 'function' },
];

const TEMPLATE_ARGS = [
  { text: 'int',      sig: 'int',      doc: '32-bit signed integer',         type: 'type' },
  { text: 'double',   sig: 'double',   doc: '64-bit floating point',          type: 'type' },
  { text: 'float',    sig: 'float',    doc: '32-bit floating point',          type: 'type' },
  { text: 'char',     sig: 'char',     doc: '8-bit character',                type: 'type' },
  { text: 'bool',     sig: 'bool',     doc: 'Boolean true/false',             type: 'type' },
  { text: 'long',     sig: 'long',     doc: '64-bit signed integer',          type: 'type' },
  { text: 'string',   sig: 'std::string', doc: 'String type (include <string>)', type: 'class' },
  { text: 'size_t',   sig: 'size_t',   doc: 'Unsigned size type',             type: 'type' },
  { text: 'auto',     sig: 'auto',     doc: 'Automatic type deduction',       type: 'keyword' },
  { text: 'unsigned', sig: 'unsigned', doc: 'Unsigned integer',               type: 'type' },
  { text: 'short',    sig: 'short',    doc: '16-bit integer',                 type: 'type' },
  { text: 'int64_t',  sig: 'int64_t',  doc: '64-bit signed (stdint.h)',       type: 'type' },
  { text: 'uint64_t', sig: 'uint64_t', doc: '64-bit unsigned (stdint.h)',     type: 'type' },
  { text: 'int32_t',  sig: 'int32_t',  doc: '32-bit signed (stdint.h)',       type: 'type' },
  { text: 'pair',     sig: 'std::pair<K,V>', doc: 'Key-value pair',           type: 'class' },
];

// ─────────────────────────────────────────────
// TRIE — O(L) prefix search per container
// ─────────────────────────────────────────────
class TrieNode {
  constructor() { this.children = new Map(); this.methods = []; }
}

class Trie {
  constructor() { this.root = new TrieNode(); }
  insert(method) {
    let node = this.root;
    for (const ch of method.name.toLowerCase()) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
    }
    node.methods.push(method);
  }
  search(prefix) {
    let node = this.root;
    for (const ch of prefix.toLowerCase()) {
      if (!node.children.has(ch)) return [];
      node = node.children.get(ch);
    }
    const results = [];
    const dfs = (n) => {
      results.push(...n.methods);
      for (const child of n.children.values()) dfs(child);
    };
    dfs(node);
    return results;
  }
}

// Build one Trie per container
const containerTries = {};
for (const [key, container] of Object.entries(STL_DB)) {
  containerTries[key] = new Trie();
  for (const method of container.methods) {
    containerTries[key].insert(method);
  }
}

// ─────────────────────────────────────────────
// HEADER PARSING
// Maps #include <xxx> → container key in STL_DB
// ─────────────────────────────────────────────
const HEADER_TO_CONTAINERS = {
  'vector':        ['vector'],
  'string':        ['string'],
  'map':           ['map'],
  'unordered_map': ['unordered_map'],
  'set':           ['set'],
  'unordered_set': ['unordered_set'],
  'stack':         ['stack'],
  'queue':         ['queue', 'priority_queue'],
  'deque':         ['deque'],
  'list':          ['list'],
  'forward_list':  ['forward_list'],
  'algorithm':     ['algorithm'],
  'iostream':      ['iostream'],
  'fstream':       ['fstream'],
  'sstream':       ['sstream'],
  'iomanip':       ['iomanip'],
  'memory':        ['memory'],
  'utility':       ['utility'],
  'numeric':       ['numeric'],
  'chrono':        ['chrono'],
  'bitset':        ['bitset'],
  'array':         ['array'],
  'thread':        ['thread'],
  'mutex':         ['mutex'],
  'functional':    ['functional'],
  'iterator':      ['iterator'],
  'random':        ['random'],
};

// C++ type name → STL_DB key (for variable type inference)
const TYPE_TO_KEY = {
  'vector':         'vector',
  'string':         'string',
  'map':            'map',
  'unordered_map':  'unordered_map',
  'set':            'set',
  'unordered_set':  'unordered_set',
  'stack':          'stack',
  'queue':          'queue',
  'priority_queue': 'priority_queue',
  'deque':          'deque',
  'list':           'list',
  'forward_list':   'forward_list',
  'bitset':         'bitset',
  'array':          'array',
  'cout':           'iostream',
  'cin':            'iostream',
  'cerr':           'iostream',
  'clog':           'iostream',
};

// ─────────────────────────────────────────────
// CORE PARSING FUNCTIONS
// ─────────────────────────────────────────────

/** Parse all #include <...> from code, return array of header names */
function parseIncludes(code) {
  const includes = [];
  // This regex handles:
  //   #include <vector>
  //   #include<vector>
  //   #include <vector >
  //   #include "myfile.h"
  const regex = /#\s*include\s*[<"]\s*([a-zA-Z0-9_/\.]+)\s*[>"]/g;
  let m;
  while ((m = regex.exec(code)) !== null) {
    const raw = m[1].replace(/\.h(pp)?$/, '').trim();
    if (raw.includes('stdc++') || raw.includes('bits')) {
      includes.push('__all__');
    } else {
      includes.push(raw);
    }
  }
  return includes;
}

/** Given included headers, return array of allowed container keys */
function getAllowedContainers(includes) {
  if (includes.includes('__all__')) {
    return Object.keys(STL_DB);
  }
  const allowed = new Set();
  for (const h of includes) {
    const containers = HEADER_TO_CONTAINERS[h] || [];
    for (const c of containers) allowed.add(c);
  }
  return [...allowed];
}

function parseAllVariables(code) {
  const symbolTable = {};
  if (!code) return symbolTable;

  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

    const normalized = trimmed.replace(/std::/g, '');
    const declPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<[^>]*>)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*[;=({]/g;

    let match;
    while ((match = declPattern.exec(normalized)) !== null) {
      const typeName = match[1].trim();
      const varName = match[2].trim();
      const skipWords = new Set([
        'if','else','for','while','do','switch','case','return','break',
        'continue','const','static','auto','int','double','float','char',
        'bool','void','long','short','unsigned','signed','new','delete',
        'class','struct','namespace','using','template','typename',
        'public','private','protected','inline','extern','cout','cin',
        'cerr','endl','main','std','nullptr','true','false'
      ]);
      if (!skipWords.has(typeName) && !skipWords.has(varName) && TYPE_TO_KEY[typeName]) {
        symbolTable[varName] = TYPE_TO_KEY[typeName];
      }
    }
  }

  return symbolTable;
}

/**
 * Infer variable type from code.
 * e.g. "vector<int> v;" with varName="v" → "vector"
 */
function inferVariableType(varName, code) {
  if (!varName || !code) return null;
  const lines = code.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // Remove std:: prefix for easier matching
    const normalized = trimmed.replace(/std::/g, '');

    // Patterns ordered from most specific to least:
    const patterns = [
      // WITH space:    vector<int> v;   map<int,int> m = ...
      new RegExp(`^([a-zA-Z_][a-zA-Z0-9_]*)\\s*<[^>]*>\\s+${varName}\\s*[;=({]`),

      // WITHOUT space: queue<int>qwer;  stack<int>st;
      new RegExp(`^([a-zA-Z_][a-zA-Z0-9_]*)\\s*<[^>]*>${varName}\\s*[;=({]`),

      // No template:   string s;   (no angle brackets)
      new RegExp(`^([a-zA-Z_][a-zA-Z0-9_]*)\\s+${varName}\\s*[;=({]`),

      // After comma in for loop or multiple decls
      new RegExp(`([a-zA-Z_][a-zA-Z0-9_]*)\\s*<[^>]*>[\\s>]*${varName}\\s*[;,=({]`),
    ];

    const skipWords = new Set([
      'if','else','for','while','do','switch','case','return','break','continue',
      'const','static','auto','int','double','float','char','bool','void',
      'long','short','unsigned','signed','new','delete','class','struct',
      'namespace','using','template','typename','public','private','protected',
      'inline','extern','register','mutable','virtual','override','final',
      'nullptr','true','false','this','sizeof','decltype','noexcept','constexpr'
    ]);

    for (const re of patterns) {
      const match = re.exec(normalized);
      if (match) {
        const baseType = match[1].trim();
        if (!skipWords.has(baseType) && TYPE_TO_KEY[baseType]) {
          return TYPE_TO_KEY[baseType];
        }
      }
    }
  }
  return null;
}

/**
 * Extract simple declared variable names from code
 * Intentionally lightweight - only first 100 lines
 */
function extractVariableNames(code) {
  const names = new Set();
  const lines = code.split('\n').slice(0, 200); // check more lines for declared identifiers

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    // Strip inline comments for cleaner parsing
    const commentIndex = line.indexOf('//');
    if (commentIndex !== -1) {
      line = line.slice(0, commentIndex);
    }

    const declRegex = /^\s*(?:const\s+|static\s+|unsigned\s+|signed\s+|long\s+|short\s+|volatile\s+|mutable\s+|register\s+|constexpr\s+|inline\s+|extern\s+)*(?:std::)?[a-zA-Z_][a-zA-Z0-9_]*(?:\s*<[^>]+>)?(?:\s*::\s*[a-zA-Z_][a-zA-Z0-9_]*)*\s*([a-zA-Z_][a-zA-Z0-9_]*)\b/;
    const autoRegex = /^\s*(?:const\s+)?auto\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/;

    const declMatch = line.match(declRegex);
    if (declMatch) {
      names.add(declMatch[1]);
      continue;
    }

    const autoMatch = line.match(autoRegex);
    if (autoMatch) {
      names.add(autoMatch[1]);
    }
  }

  return Array.from(names).slice(0, 10);
}

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    uptime: Math.round(process.uptime()),
    containers: Object.keys(STL_DB).length,
    totalMethods: Object.values(STL_DB).reduce((s, c) => s + c.methods.length, 0),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    uptime: Math.round(process.uptime()),
    containers: Object.keys(STL_DB).length,
    totalMethods: Object.values(STL_DB).reduce((s, c) => s + c.methods.length, 0),
  });
});

/**
 * POST /api/getSuggestions
 * Body: { prefix, contextType, code, cursorPosition }
 *
 * contextType can be:
 *   - "global"    → return keywords filtered to included headers
 *   - "vector"    → explicit container type
 *   - "v"         → variable name, infer its type from code
 *
 * RULE: If contextType is a known STL type AND its header is NOT included
 *       → return [] (no suggestions from unrequired headers).
 */
app.post('/api/getSuggestions', (req, res) => {
  try {
    const { prefix = '', contextType = 'global', code = '', cursorPosition = 0 } = req.body;
    const startTime = Date.now();

    const includes = parseIncludes(code);
    const allowedContainers = getAllowedContainers(includes);

    // Build full variable→type map from the entire code
    const variableMap = parseAllVariables(code);

    let resolvedType = contextType; // the STL_DB key we'll use

    // Step 1: Resolve variable name → container type
    if (contextType !== 'global' && contextType !== 'include_header' && contextType !== 'template_arg') {
      if (variableMap[contextType]) {
        resolvedType = variableMap[contextType];
      } else if (TYPE_TO_KEY[contextType]) {
        resolvedType = TYPE_TO_KEY[contextType];
      } else {
        const inferred = inferVariableType(contextType, code);
        if (inferred) {
          resolvedType = inferred;
        } else {
          return res.json([]);
        }
      }
    }

    // ── CASE 0: User is typing inside #include <...>
    if (contextType === 'include_header') {
      const matches = ALL_HEADERS.filter(h => !prefix || h.startsWith(prefix.toLowerCase()));
      const results = matches.map(h => ({
        text: h,
        type: 'header',
        sig: `#include <${h}>`,
        doc: `Include the <${h}> standard library header`,
        complexity: '',
        score: 1.0,
      }));
      return res.json(results);
    }

    // ── CASE 0.5: User is typing inside template args
    if (contextType === 'template_arg') {
      const matches = TEMPLATE_ARGS.filter(t => !prefix || t.text.startsWith(prefix.toLowerCase()));
      return res.json(matches.map(t => ({ ...t, score: 1.0 })));
    }

    // Step 1: resolve variable name → type
    if (contextType !== 'global' && !STL_DB[contextType] && !TYPE_TO_KEY[contextType]) {
      const inferred = inferVariableType(contextType, code);
      if (inferred) {
        resolvedType = inferred;
      } else {
        return res.json([]);
      }
    } else if (TYPE_TO_KEY[contextType]) {
      resolvedType = TYPE_TO_KEY[contextType];
    }

    // Step 2: global context — return container class names + global functions
    // Step 2: global context — return declared variables first, then header-level functions and type names
    if (resolvedType === 'global') {
      const results = [];
      const seen = new Set();

      // Add declared variable names first for top priority
      const variableNames = Object.keys(variableMap);
      for (const varName of variableNames) {
        if (results.length >= 20) break;
        if (!prefix || varName.startsWith(prefix.toLowerCase())) {
          seen.add(varName);
          results.push({
            text: varName,
            type: 'variable',
            sig: varName,
            doc: 'Declared variable',
            complexity: '',
            score: 1.0,
          });
        }
      }

      // Add std namespace suggestion when typing std
      if ((!prefix || 'std'.startsWith(prefix.toLowerCase())) && !seen.has('std')) {
        seen.add('std');
        results.push({
          text: 'std',
          type: 'keyword',
          sig: 'std',
          doc: 'Standard namespace',
          complexity: '',
          score: 0.96,
        });
      }

      // Add free-function suggestions for included headers like <algorithm>
      const functionHeaders = new Set([
        'algorithm', 'iostream', 'fstream', 'sstream', 'iomanip',
        'numeric', 'random', 'chrono', 'thread', 'mutex', 'functional',
        'iterator', 'utility', 'tuple'
      ]);
      for (const key of allowedContainers) {
        if (results.length >= 20) break;
        if (!functionHeaders.has(key) || !STL_DB[key]) continue;
        for (const method of STL_DB[key].methods) {
          if (results.length >= 20) break;
          if (seen.has(method.name)) continue;
          if (prefix && !method.name.startsWith(prefix.toLowerCase())) continue;
          seen.add(method.name);
          results.push({
            text: method.name,
            type: 'function',
            sig: method.sig,
            doc: method.doc,
            complexity: method.complexity,
            score: 0.9,
          });
        }
      }

      // Add STL type names always available
      const typeMatches = ALL_STL_TYPES.filter(t => !prefix || t.text.startsWith(prefix.toLowerCase()));
      for (const t of typeMatches) {
        if (results.length >= 20) break;
        if (seen.has(t.text)) continue;
        seen.add(t.text);
        results.push({ ...t, score: 0.95 });
      }

      // Add names of available containers from included headers
      for (const key of allowedContainers) {
        if (results.length >= 20) break;
        if ((!prefix || key.startsWith(prefix.toLowerCase())) && !seen.has(key)) {
          seen.add(key);
          results.push({
            text: key,
            type: 'class',
            sig: `std.${key}`,
            doc: STL_DB[key]?.description || '',
            complexity: '',
            score: 0.9,
          });
        }
      }

      // Load keywords from file
      const kwPath = path.join(WORKSPACE_ROOT, 'data', 'cpp_keywords.txt');
      if (fs.existsSync(kwPath) && results.length < 18) {
        try {
          const keywords = fs.readFileSync(kwPath, 'utf8')
            .split('\n')
            .map(k => k.trim())
            .filter(k => k && !k.startsWith('#'));
          for (const kw of keywords) {
            if (results.length >= 20) break;
            if (!prefix || kw.startsWith(prefix.toLowerCase())) {
              if (seen.has(kw)) continue;
              seen.add(kw);
              results.push({ text: kw, type: 'keyword', sig: kw, doc: 'C++ keyword', complexity: '', score: 0.7 });
            }
          }
        } catch (e) {
          // ignore file read errors
        }
      }

      return res.json(results.slice(0, 20));
    }

    // Step 3: specific container context
    const containerKey = resolvedType;

    // CRITICAL: check that the required header is included
    const containerDef = STL_DB[containerKey];
    if (!containerDef) {
      return res.json([]); // unknown container
    }

    // Check if the header for this container is included
    if (!allowedContainers.includes(containerKey)) {
      // Header not included — return empty
      return res.json([]);
    }

    // Use Trie for prefix search
    const trie = containerTries[containerKey];
    if (!trie) return res.json([]);

    const methods = prefix ? trie.search(prefix) : containerDef.methods;
    const results = methods.map(m => ({
      text: m.name,
      type: 'method',
      sig: m.sig,
      doc: m.doc,
      complexity: m.complexity,
      score: 0.8,
    }));

    const latencyMs = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${latencyMs}ms`);
    return res.json(results);

  } catch (err) {
    console.error('[getSuggestions] Error:', err.message);
    res.json([]);
  }
});

/**
 * POST /api/getStats
 * Body: { code }
 * Returns: { symbolCount, includedLibraries, lines, characters }
 */
app.post('/api/getStats', (req, res) => {
  try {
    const { code = '' } = req.body;
    const includes = parseIncludes(code);
    const lines = code.split('\n').length;
    const identifiers = (code.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || []);
    res.json({
      symbolCount: identifiers.length,
      includedLibraries: includes.filter(i => i !== '__all__'),
      lines,
      characters: code.length,
    });
  } catch (err) {
    res.json({ symbolCount: 0, includedLibraries: [], lines: 0, characters: 0 });
  }
});

/**
 * POST /api/runCode
 * Body: { code }
 * Compiles and runs C++ code using g++, returns { success, output, error }
 */
app.post('/api/runCode', (req, res) => {
  const { code = '' } = req.body;
  if (!code.trim()) {
    return res.json({ success: false, output: '', error: 'No code provided' });
  }

  const tmpDir = '/tmp/intellicpp_run';
  const srcFile = `${tmpDir}/main.cpp`;
  const binFile = `${tmpDir}/program`;

  try {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(srcFile, code, 'utf8');

    // Compile
    try {
      execSync(`g++ -std=c++20 -o "${binFile}" "${srcFile}" 2>&1`, { timeout: 15000 });
    } catch (compileErr) {
      return res.json({
        success: false,
        output: '',
        error: compileErr.stdout?.toString() || compileErr.message,
      });
    }

    // Run with timeout
    exec(`timeout 5 "${binFile}"`, { timeout: 6000 }, (runErr, stdout, stderr) => {
      if (runErr && runErr.killed) {
        return res.json({ success: false, output: '', error: 'Execution timed out (5s limit)' });
      }
      if (runErr && runErr.code !== 0 && !stdout) {
        return res.json({ success: false, output: '', error: stderr || runErr.message });
      }
      res.json({ success: true, output: stdout || '', error: stderr || '' });
    });
  } catch (err) {
    res.json({ success: false, output: '', error: err.message });
  }
});

/**
 * POST /api/listWorkspace
 * Body: { subpath }
 */
app.post('/api/listWorkspace', (req, res) => {
  const { subpath = '' } = req.body;
  try {
    const fullPath = path.resolve(WORKSPACE_ROOT, subpath);
    if (!fullPath.startsWith(WORKSPACE_ROOT)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!fs.existsSync(fullPath)) {
      return res.json({ path: subpath, entries: [] });
    }
    const entries = fs.readdirSync(fullPath, { withFileTypes: true })
      .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
      .map(e => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        path: path.join(subpath, e.name).replace(/\\/g, '/'),
      }))
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    res.json({ path: subpath, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/readFile
 * Body: { filePath }
 */
app.post('/api/readFile', (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });
  try {
    const full = path.resolve(WORKSPACE_ROOT, filePath);
    if (!full.startsWith(WORKSPACE_ROOT)) return res.status(403).json({ error: 'Access denied' });
    if (!fs.existsSync(full)) return res.status(404).json({ error: 'File not found' });
    const content = fs.readFileSync(full, 'utf8');
    res.json({ filePath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/writeFile
 * Body: { filePath, content }
 */
app.post('/api/writeFile', (req, res) => {
  const { filePath, content } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });
  try {
    const full = path.resolve(WORKSPACE_ROOT, filePath);
    if (!full.startsWith(WORKSPACE_ROOT)) return res.status(403).json({ error: 'Access denied' });
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content || '', 'utf8');
    res.json({ success: true, filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  const totalMethods = Object.values(STL_DB).reduce((s, c) => s + c.methods.length, 0);
  console.log(`\n⚡ IntelliCPP Backend v2.0`);
  console.log(`   Port:      ${PORT}`);
  console.log(`   Containers: ${Object.keys(STL_DB).length}`);
  console.log(`   Methods:   ${totalMethods}`);
  console.log(`   Workspace: ${WORKSPACE_ROOT}`);
  console.log(`   Endpoints: /health /api/getSuggestions /api/getStats /api/runCode /api/readFile /api/writeFile /api/listWorkspace\n`);
});

module.exports = app;
