/**
 * IntelliCPP Frontend Language Registry
 * Client-side language configuration, Monaco language IDs, and syntax templates.
 *
 * NOTE: The language keys ('cpp', 'python', 'rust') MUST remain synchronized with
 * backend/languages/registry.js so execution payloads map 1:1 to server toolchains.
 */

export const SUPPORTED_LANGUAGES = {
  cpp: {
    id: 'cpp',
    name: 'C++20',
    extension: '.cpp',
    monacoId: 'cpp',
    badge: 'C++20 Clang',
    standard: 'C++20 ISO/IEC 14882',
    iconColor: '#00F2FE',
    defaultFileName: 'main.cpp',
    defaultCode: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    cout << "⚡ Initializing IntelliCPP Engine v2.0..." << endl;
    
    // Type 'v.' to trigger fast Trie autocomplete for vector methods
    vector<int> v = {3, 1, 4, 1, 5, 9, 2, 6};
    sort(v.begin(), v.end());
    
    cout << "Sorted elements: ";
    for (int n : v) {
        cout << n << " ";
    }
    cout << endl;
    
    return 0;
}`,
    quickInjects: [
      { label: '<vector>', snippet: '#include <vector>\n' },
      { label: '<algorithm>', snippet: '#include <algorithm>\n' },
      { label: '<map>', snippet: '#include <map>\n' },
      { label: '<memory>', snippet: '#include <memory>\n' },
      { label: '<ranges>', snippet: '#include <ranges>\n' },
      { label: '<chrono>', snippet: '#include <chrono>\n' }
    ],
    builtinSymbols: [
      { name: 'std::vector', type: 'class', detail: 'Dynamic array container with O(1) random access', complexity: 'O(1) amortized push' },
      { name: 'std::push_back', type: 'method', detail: 'Adds an element to the end', complexity: 'O(1) amortized' },
      { name: 'std::emplace_back', type: 'method', detail: 'Constructs element in-place at the end', complexity: 'O(1) amortized' },
      { name: 'std::size', type: 'method', detail: 'Returns the number of elements', complexity: 'O(1)' },
      { name: 'std::capacity', type: 'method', detail: 'Returns total allocated storage capacity', complexity: 'O(1)' },
      { name: 'std::sort', type: 'function', detail: 'Sorts elements in range [first, last)', complexity: 'O(N log N)' },
      { name: 'std::make_unique', type: 'function', detail: 'Creates a std::unique_ptr with specified arguments', complexity: 'O(1)' },
      { name: 'std::cout', type: 'object', detail: 'Standard output stream', complexity: 'I/O' }
    ]
  },

  python: {
    id: 'python',
    name: 'Python 3.12',
    extension: '.py',
    monacoId: 'python',
    badge: 'Python 3.12 Core',
    standard: 'CPython 3.12.2',
    iconColor: '#38BDF8',
    defaultFileName: 'script.py',
    defaultCode: `import sys
import math
from typing import List, Dict

def compute_fibonacci(n: int) -> List[int]:
    """Generates Fibonacci sequence up to n terms."""
    if n <= 0:
        return []
    fib = [0, 1]
    for _ in range(2, n):
        fib.append(fib[-1] + fib[-2])
    return fib[:n]

if __name__ == "__main__":
    print("⚡ IntelliCPP Multi-Language Python Engine")
    series = compute_fibonacci(10)
    print(f"Fibonacci Sequence: {series}")
    print(f"Golden Ratio approx: {series[-1] / series[-2]:.6f}")
`,
    quickInjects: [
      { label: 'numpy', snippet: 'import numpy as np\n' },
      { label: 'math', snippet: 'import math\n' },
      { label: 'typing', snippet: 'from typing import List, Dict, Optional, Tuple\n' },
      { label: 'dataclass', snippet: 'from dataclasses import dataclass\n' }
    ],
    builtinSymbols: [
      { name: 'append', type: 'method', detail: 'Append object to the end of the list', complexity: 'O(1)' },
      { name: 'pop', type: 'method', detail: 'Remove and return item at index (default last)', complexity: 'O(1) last, O(n) arbitrary' },
      { name: 'extend', type: 'method', detail: 'Extend list by appending elements from the iterable', complexity: 'O(k)' },
      { name: 'len', type: 'function', detail: 'Return the number of items in a container', complexity: 'O(1)' },
      { name: 'sorted', type: 'function', detail: 'Return a new list containing all items from the iterable in ascending order', complexity: 'O(N log N)' }
    ]
  },

  rust: {
    id: 'rust',
    name: 'Rust 1.75',
    extension: '.rs',
    monacoId: 'rust',
    badge: 'Rustc 1.75 (Zero-Cost)',
    standard: 'Rust Edition 2021',
    iconColor: '#F97316',
    defaultFileName: 'main.rs',
    defaultCode: `use std::collections::HashMap;

fn main() {
    println!("⚡ IntelliCPP Rust Engine Running!");
    
    let mut scores: HashMap<String, u32> = HashMap::new();
    scores.insert(String::from("Trie_Lookup_Speed"), 100);
    scores.insert(String::from("Memory_Safety"), 100);
    
    for (metric, val) in &scores {
        println!("{}: {}%", metric, val);
    }
}
`,
    quickInjects: [
      { label: 'HashMap', snippet: 'use std::collections::HashMap;\n' },
      { label: 'HashSet', snippet: 'use std::collections::HashSet;\n' },
      { label: 'Arc/Mutex', snippet: 'use std::sync::{Arc, Mutex};\n' },
      { label: 'Duration', snippet: 'use std::time::{Duration, Instant};\n' }
    ],
    builtinSymbols: [
      { name: 'Vec::new', type: 'function', detail: 'Constructs a new, empty Vec<T>', complexity: 'O(1)' },
      { name: 'push', type: 'method', detail: 'Appends an element to the back of a collection', complexity: 'O(1) amortized' },
      { name: 'HashMap::insert', type: 'method', detail: 'Inserts a key-value pair into the map', complexity: 'O(1) average' },
      { name: 'Option::unwrap', type: 'method', detail: 'Returns the contained Some value, consuming the self value', complexity: 'O(1)' }
    ]
  }
};

export function getLanguageByFilename(filename = '') {
  if (filename.endsWith('.cpp') || filename.endsWith('.hpp') || filename.endsWith('.cc') || filename.endsWith('.h')) {
    return SUPPORTED_LANGUAGES.cpp;
  }
  if (filename.endsWith('.py')) {
    return SUPPORTED_LANGUAGES.python;
  }
  if (filename.endsWith('.rs')) {
    return SUPPORTED_LANGUAGES.rust;
  }
  return SUPPORTED_LANGUAGES.cpp;
}
