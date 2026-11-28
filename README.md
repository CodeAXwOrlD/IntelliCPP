# ⚡ IntelliCPP — High-Performance C++20 Cloud IDE & IntelliSense Engine

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live%20Demo-intellicpp.onrender.com-10B981?style=for-the-badge&logo=render&logoColor=white)](https://intellicpp.onrender.com/)
[![C++ Standard](https://img.shields.io/badge/C%2B%2B-20-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white)](https://isocpp.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Node-API](https://img.shields.io/badge/Node--API-N--API%20v8-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Automated Tests](https://img.shields.io/badge/Tests-31%20Passed%20%2F%200%20Failed-10B981?style=for-the-badge)](backend/test_security.js)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?style=for-the-badge&logo=docker&logoColor=white)](Dockerfile)
[![License](https://img.shields.io/badge/License-MIT-gray?style=for-the-badge)](LICENSE)

**A production-ready C++20, Python, and Rust web IDE featuring a native C++20 Trie engine bound via Node-API (`N-API`), context-isolated Monaco IntelliSense, real-time AST Big-O complexity analysis, native OS File System Access API integration, sandboxed execution, and 31 automated security & concurrency tests.**

**[🚀 Launch Live IDE](https://intellicpp.onrender.com/)**

<br />

<p align="center">
  <img src="assets/screenshots/full_ide_preview.png" alt="IntelliCPP Full IDE Dashboard" width="98%" style="border-radius: 8px; border: 1px solid #27272A;" />
</p>

[✨ Key Features](#-key-features) • [📸 Interface Tour](#-user-interface-tour) • [🏗️ System Architecture](#-system-architecture) • [🧪 Automated Test Suites](#-automated-test-suites-31-tests) • [🛡️ Security Sandboxing](#-security--sandboxing-defense-in-depth) • [🚀 Quick Start](#-quick-start)

</div>

---

## 📸 User Interface Tour

<div align="center">

| File Explorer & Workspace | AST Symbol Outline | Code Insights & Trie Profiler |
|:---:|:---:|:---:|
| <img src="assets/screenshots/file_explorer_view.png" alt="File Explorer" width="280" /> | <img src="assets/screenshots/ast_symbols_view.png" alt="AST Symbols" width="280" /> | <img src="assets/screenshots/code_insights_profiler.png" alt="Code Insights Profiler" width="280" /> |
| *Native OS File I/O (`Ctrl+O`, `Ctrl+S`)* | *Live Variable Scoping & Indexed STL* | *O(L) Trie Graph & Dynamic Heap Allocator* |

</div>

---

## 📸 Architecture & Modern IDE Layout

IntelliCPP combines bare-metal C++20 execution performance with a clean, distraction-free **VS Code Dark Modern / Linear** user interface:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  ⚡ IntelliCPP       [ C++20 (GCC) ▾ ]    [ ▶ Run ]   [ ☀ / 🌙 ]   [ 345 Symbols Indexed ]│
├───────────┬────────────────────────────────────────────┬───────────────────────────────┤
│ EXPLORER  │ main.cpp ×        algorithm.hpp ×          │ 📊 CODE INSIGHTS              │
│ ├─ New    │ 1  #include <vector>                       │ ┌───────────────────────────┐ │
│ ├─ Open   │ 2  #include <algorithm>                    │ │ O(L) Trie Prefix Graph    │ │
│ ├─ Save   │ 3  int main() {                            │ │ Root ── 'v' ── 'e' ── Leaf│ │
│           │ 4      std::vector<int> v = {3, 1, 4};     │ └───────────────────────────┘ │
│ SYMBOLS   │ 5      sort(v.begin(), v.end());           │ ┌───────────────────────────┐ │
│ • v       │ 6      v.                                  │ │ STL Vector Heap Allocator │ │
│ • main()  │        ┌─────────────────────────────┐     │ │ Size: 3 | Cap: 4 | [4B]   │ │
│           │        │ • push_back(val)   O(1) am. │     │ └───────────────────────────┘ │
│ INJECTS   │        │ • emplace_back()   O(1)     │     │ ┌───────────────────────────┐ │
│ <vector>  │        │ • pop_back()       O(1)     │     │ │ TIME:  O(N log N)         │ │
│ <ranges>  │        └─────────────────────────────┘     │ │ SPACE: O(1) Auxiliary     │ │
│           │                                            │ └───────────────────────────┘ │
│ ⟷ Resize  │                                            │ ⟷ Resize Width                │
├───────────┴────────────────────────────────────────────┴───────────────────────────────┤
│ ↕ Resize Height (Terminal Resizer | Double Click to toggle size)                       │
│ 💻 TERMINAL DOCK: [Input & Output (Split STDIN/STDOUT)] [Problems (Monaco Jump Markers)]│
│ ⚡ Status: Execution Engine Ready | Ln 6, Col 8 | UTF-8 | C++20 (GCC)                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Engineering Highlights

* **Sub-2-Microsecond Native Trie Engine**:
  * *Engineered a custom **C++20 Trie** (`O(L)` prefix search) bound to Node.js via **Node-API (`N-API`)** indexing **28 STL containers (345 methods)** and **50 headers**, stress-tested at **1.0–1.8 µs** lookup latency across **1,550** symbols with an automatic pure-JS Trie + `O(1)` hash-map fallback.*
* **Context-Isolated Monaco IntelliSense & Static AST Profiler**:
  * *Extended **Monaco Editor** with strict C++20 context isolation (preprocessor directives with `#define`/`#if`/`#endif` scope priority, nested `<...>` template arguments, zero-space type inference like `stack<int>st;`), real-time syntax diagnostics, and live `O(1)`–`O(2ⁿ)` AST Big-O & heap allocation telemetry.*
* **Hardened Execution Sandbox & High-Concurrency Backend**:
  * *Architected a non-blocking **C++20 / Python 3 / Rust** execution pipeline backed by an async `O(1)`-dequeue **Job Queue** (4 workers), **LRU cache**, **Token-Bucket** + concurrency rate limiting, **Helmet CSP**, and `ulimit`/5s timeout hard-kills, verified by **31/31** automated security and concurrency checks.*
* **Native OS File I/O & Multi-Stage Docker Deployment**:
  * *Integrated the **File System Access API** (`Ctrl+O`, `Ctrl+Shift+S`) with `localStorage` persistence and packaged frontend + Node.js + N-API + `g++`/`python3`/`rustc` toolchains into a multi-stage **Docker** image deployed on **Render**.*

---

## 🚀 Key Features

### 1. ⚡ Bare-Metal C++20 Native Trie Engine
* **$O(L)$ Prefix Search**: Traverses trie by prefix length $L$ rather than linearly scanning $N$ symbols ($O(L) \ll O(N)$).
* **Native Node-API Bridge**: Compiled via `node-gyp` into `codeflow_native.node`, bypassing V8 JavaScript overhead.
* **Dual-Engine Architecture**: Auto-executes the compiled C++20 Trie engine with an automatic, seamless pure-JS Trie fallback for portability.
* **Deterministic LRU Caching**: In-memory cache instantly resolves identical rapid keystrokes with `X-Cache: HIT`.

### 2. 📊 Real-Time AST Complexity Analyzer
* **Big-O Time Complexity Detection**:
  * $O(N \log N)$: Accurately identifies `std::sort`, `stable_sort`, `ranges::sort`, and loops with logarithmic operations.
  * $O(N^2)$ / $O(N^3)$: Identifies 2-level and 3-level nested iteration loops.
  * $O(2^N)$: Identifies branching recursion trees (e.g. `fib(n-1) + fib(n-2)`).
  * $O(\log N)$: Identifies binary search algorithms (`lower_bound`, `binary_search`) and logarithmic step loops (`i *= 2`).
  * $O(1)$: Primitive operations and direct memory index access.
* **Big-O Space Complexity Detection**:
  * $O(N)$ Heap Storage: Detects dynamic heap allocations (`std::vector`, `std::map`, `std::unordered_map`, `std::set`, `new[]`).
  * $O(N^2)$ Dynamic Matrix: Detects 2D containers (`vector<vector<T>>`, dynamic grid arrays).
  * $O(1)$ Auxiliary: In-place memory operations without heap allocations.

### 3. 📂 Native OS File System Integration & Offline Persistence
* **System File Manager Support**:
  * **Open File (`Ctrl+O`)**: Opens native Linux/Windows/Mac file dialog to load local source files directly into editor tabs.
  * **Save File (`Ctrl+Shift+S`)**: Uses modern Web File System Access API (`showSaveFilePicker`) to save/export code directly to the user's local disk.
* **Offline-First Persistence**: Workspace files automatically synchronize with `localStorage`—zero code loss on browser reload or connection drops.
* **Backend Sync (`/api/writeFile`)**: Automatically persists workspace changes to disk when connected to the local development server.

### 4. 🛡️ Security & Sandboxing Defense-in-Depth
* **Process Limit Sandbox**:
  * `timeout -k 1 5`: Guaranteed 5-second hard process termination for infinite loops (`while(1){}`).
  * `maxBuffer: 512KB`: Protects Node.js memory against runaway stdout streams.
  * **Stdin/Stdout Piping**: Real bidirectional pipeline supporting interactive user input.
* **Token Bucket Rate Limiting**:
  * Burst allowance of 5 compilations + continuous refill of 1 token every 6 seconds (~10 runs/min max).
  * Concurrency semaphore capping simultaneous active compilations to **max 2 per IP**.
* **Strict Input Validation & Path Traversal Defense**:
  * 50KB code length cap, binary/null-byte rejection, language allowlist validation (`cpp`, `python`, `rust`).
  * `isPathSafe` traversal checks resolving symlinks and blocking sibling directory prefix escapes.
* **Security Headers**: `helmet` Content-Security-Policy (CSP), `X-Frame-Options: SAMEORIGIN`, and environment-driven `ALLOWED_ORIGINS`.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER  (Browser · React 18)                          │
│                                                                                        │
│   [ Monaco Editor UI ] ──── AST Static Analysis ───> [ Real-Time Big-O & Scope Engine ]│
│            │                                                                           │
│            ├─── File System Access API ────────────> [ Native OS Local File Sync ]     │
│            └─── Offline Persistence ───────────────> [ LocalStorage Workspace Cache ]  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTP + Gzip Compression
                                            v
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY & CACHE  (Express :3001)                           │
│                                                                                        │
│   [ Helmet CSP & Input Validation ] ──> [ Token-Bucket Rate Limiter & Concurrency Cap ]│
│            │                                                                           │
│            ├─── Autocomplete Lookup ──> [ O(1) LRUCache ] ──> [ Node-API Native Bridge]│
│            │                                                    ├─ codeflow_native.node│
│            │                                                    ├─ C++20 Trie Engine   │
│            │                                                    └─ 28 STL JSONs (345)  │
│            │                                                                           │
│            └─── Code Execution ───────> [ Async InMemoryJobQueue (4 Bounded Workers) ] │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ ulimits (RAM / CPU / fsize) + 5s Timeout
                                            v
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                       SANDBOXED COMPUTE LAYER  (Linux Container)                       │
│                                                                                        │
│        [ g++ (C++20) ]            [ python3 (Python 3) ]            [ rustc (Rust) ]   │
│               └─────────────────────────────┬──────────────────────────────┘           │
│                                             v  stdout / stderr / exit code             │
│                        [ Terminal Dock & Monaco Inline Markers ]                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Automated Test Suites (31 Tests)

The project includes automated test suites covering security boundaries, caching, probes, and concurrent execution:

### 1. Security & Sandbox Test Suite (`backend/test_security.js` — 15 Tests)
```bash
node backend/test_security.js
```
* ✅ **PASS**: Helmet Security Headers (`X-Content-Type-Options`, `Content-Security-Policy`, `X-Frame-Options`)
* ✅ **PASS**: Normal C++ execution succeeds with exit code 0
* ✅ **PASS**: Normal Python execution succeeds
* ✅ **PASS**: Normal Rust execution succeeds
* ✅ **PASS**: Infinite loop strictly terminates on 5s timeout (Exit 124)
* ✅ **PASS**: Rejects code payload > 50KB with 400
* ✅ **PASS**: Rejects null bytes with 400
* ✅ **PASS**: Rejects unsupported language with 400
* ✅ **PASS**: Blocks directory traversal on `/api/readFile` with 403
* ✅ **PASS**: Blocks sibling path traversal with 403
* ✅ **PASS**: Blocks directory traversal on `/api/listWorkspace` with 403
* ✅ **PASS**: Rate limiter returns 429 with `Retry-After` header
* ✅ **PASS**: Token bucket rate limiter throttles burst spam with 429

### 2. Concurrency & Scaling Test Suite (`backend/test_concurrency_scaling.js` — 16 Tests)
```bash
node backend/test_concurrency_scaling.js
```
* ✅ **PASS**: Liveness `/live` probe returns 200 alive
* ✅ **PASS**: Readiness `/ready` probe verifies STL database & GCC compiler availability
* ✅ **PASS**: `/health` telemetry reports active cache and queue statistics
* ✅ **PASS**: LRU Cache `X-Cache: MISS` followed by `X-Cache: HIT` on `/api/getSuggestions` and `/api/getStats`
* ✅ **PASS**: Synchronous code execution via `JobQueue` returns `jobId`
* ✅ **PASS**: Asynchronous code execution returns `202 Accepted` with `/api/jobs/:id` polling resolution
* ✅ **PASS**: `/api/jobs` reports active workers and processed job count

---

## 📊 Verified Benchmarks & Engine Telemetry

Measured directly from the C++20 engine (`g++ -std=c++20 -O2` on `test_backend.cpp`) and backend test suites:

| Metric | Measured Result | Implementation Detail |
|---|---|---|
| **Native Index Build** | **~1.13 ms** (`1,127 µs`) | `1,550` symbols inserted into `codeflow::Trie` |
| **Native Trie Prefix Search** | **1.00–1.77 µs** | Zero-copy DFS accumulator with `maxResults` early exit |
| **STL Catalog Indexed** | **28 containers / 345 methods** | Loaded into JS `Trie` + `O(1)` `STL_METHOD_MAPS` |
| **Compiler Hard Kill** | **Strictly $\le 5.0\text{s}$** | `timeout -k 1 5` + `ulimit` memory/file/PID caps |

---

## 🚀 Quick Start

### Prerequisites
* **Node.js**: v18.0.0 or higher (Docker uses Node 20 Bookworm)
* **GCC / G++**: Supporting C++20 (`g++ --version` $\ge$ 10.0)
* **Python 3** & **Rust** (optional, for multi-language execution)

### 1. Installation

```bash
git clone https://github.com/CodeAXwOrlD/IntelliCPP.git
cd IntelliCPP
npm run install-deps

# Optional: rebuild native C++ N-API addon
cd backend && npx node-gyp rebuild && cd ..
```

### 2. Run Test Suites & C++ Benchmark

```bash
# Security & concurrency suites (31 automated checks)
node backend/test_security.js
node backend/test_concurrency_scaling.js

# Standalone C++20 Trie benchmark
g++ -std=c++20 -O2 -Ibackend/include -Ibackend/node_modules/node-addon-api \
  test_backend.cpp backend/src/trie.cpp backend/src/tokenizer.cpp \
  backend/src/suggestion_engine.cpp backend/src/code_runner.cpp -lpthread -o /tmp/test_backend \
  && /tmp/test_backend
```

### 3. Start Development Servers

```bash
# Start both backend (:3001) and frontend (:3000) concurrently
npm run dev

# Or run separately
npm run dev:server
npm run dev:frontend
```

### 4. Production Docker Build

```bash
docker build -t intellicpp .
docker run -p 3001:3001 intellicpp
```

Open `http://localhost:3000` (dev) or `http://localhost:3001` (production Docker).

---

## 📜 License

MIT License. Designed and built by [CodeAXwOrlD](https://github.com/CodeAXwOrlD).
