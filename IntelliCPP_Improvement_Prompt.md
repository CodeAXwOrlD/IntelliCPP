# IntelliCPP v2.0 — Master Improvement Prompt

## Context

You are improving **IntelliCPP** — a production-grade C++ IntelliSense engine built by Akhil Agarwal.

**Repository**: https://github.com/CodeAXwOrlD/IntelliCPP  
**Live site**: https://intelli-cpp.vercel.app  
**Tech stack**: React 18 + Monaco Editor (frontend), Node.js/Express (backend API), C++20 Trie engine (native N-API module), deployed on Vercel

**Current capabilities**:
- Trie-based O(L) prefix search for C++ STL symbols
- Monaco Editor integration with syntax highlighting
- ~10,000 STL symbols indexed
- 92% test coverage via GTest + Jest
- Sub-30ms response latency

---

## Frontend Improvements to Implement

### 1. Enhanced Autocomplete UX
```
- Add keyboard navigation (↑↓ arrows, Tab to accept, Escape to dismiss)
- Show function signature preview as you type (inline ghost text)
- Display complexity badge (O(1), O(log n), O(n)) next to each suggestion
- Add "since C++11/17/20" badges to highlight modern API suggestions
- Highlight matched prefix characters in bold within suggestion list
- Group suggestions by category: constructors, modifiers, accessors, iterators
```

### 2. Split-Pane Layout
```
Layout: [Sidebar (containers)] | [Editor + Search] | [Detail Panel]

Detail panel shows on selection:
  - Full function signature with colored params
  - Complexity analysis (time + space)
  - Usage example with syntax highlighting
  - "Copy snippet" button
  - "Since" version badge
  - Related functions list
```

### 3. Dark/Light Theme Toggle
```
- Dark mode: #0d1117 bg, #58a6ff accents (GitHub Dark style)
- Light mode: #f8fafc bg, #0969da accents (GitHub Light style)
- Syntax colors match VS Code token semantics
- Persist preference in localStorage
```

### 4. AI Assistant Tab (Claude API integration)
```
POST https://api.anthropic.com/v1/messages
Model: claude-sonnet-4-20250514

System prompt:
"You are IntelliCPP, an expert C++ IntelliSense assistant. 
Answer concisely. Use code blocks. Focus on STL, algorithms, 
modern C++20/23 features, and performance implications."

UI:
- Chat input at bottom
- Streaming response with typing indicator
- Code blocks rendered with syntax highlighting
- Suggested follow-up questions as chips
```

### 5. Code Snippets Library
```
- Curated snippets: sorting, binary search, BFS/DFS, frequency counting, etc.
- Syntax-highlighted viewer with line numbers
- One-click copy to clipboard
- Category filter: Algorithms | Data Structures | I/O | Modern C++
```

### 6. Performance Dashboard
```
Real-time metrics:
- Latency per query (line chart, last 20 queries)
- Symbols indexed (animated counter)
- Search algorithm visualization (trie traversal)
- Hit rate (prefix match vs fuzzy fallback)
```

---

## Backend Improvements to Implement

### 1. Structured Symbol Database
Replace flat arrays with rich metadata objects:
```js
{
  name: "push_back",
  returnType: "void",
  params: "const T& val",
  complexity: "O(1) amortized",
  doc: "Appends element to end...",
  since: "C++98",
  container: "vector",
  score: 0  // populated by ranking
}
```

### 2. Relevance Ranking Algorithm
```
Score formula:
  +100 if exact name match
  +50  if name starts with query
  +20  if name contains query
  +10  if it's a commonly used method (size, find, push_back, etc.)
  -5   if C++20/23 (less common in practice)
  
Sort descending by score.
```

### 3. Fuzzy Search Fallback
```
If prefix search returns 0 results:
  → Fall back to substring search (name.includes(query))
  → Fall back to Levenshtein distance ≤ 2
  → Return top 5 fuzzy matches with match type="fuzzy"
```

### 4. Context-Aware Completions
```
POST /api/context-complete
Body: {
  headers: ["<vector>", "<algorithm>"],
  prefix: "sor",
  variables: [{ name: "v", type: "vector<int>" }]
}

Logic:
  - Only suggest symbols from included headers
  - If cursor is after "v.", filter to vector member functions
  - Return variable-aware suggestions with type info
```

### 5. New API Endpoints
```
GET  /health                    → uptime, symbol count, version
GET  /api/containers            → list all containers with metadata
GET  /api/container/:name       → all symbols for a container
GET  /api/complete?q=&container= → prefix search with ranking
GET  /api/search?q=             → full-text search across all symbols
POST /api/context-complete      → header-aware + variable-aware suggestions
GET  /api/stats                 → usage analytics
```

### 6. Rate Limiting + Error Handling
```
- 200 requests/minute per IP
- Structured error responses: { error: string, code: string, hint?: string }
- Request timing header: X-Response-Time
- CORS configured for Vercel domain
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  IntelliCPP v2.0                        │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Sidebar    │  │  Main Panel  │  │ Detail Panel  │  │
│  │  ─────────  │  │  ──────────  │  │ ─────────     │  │
│  │  Containers │  │  Search Bar  │  │ Signature     │  │
│  │  • vector   │  │  Completion  │  │ Complexity    │  │
│  │  • string   │  │    List      │  │ Code Example  │  │
│  │  • map      │  │  ──────────  │  │ Related Fns   │  │
│  │  • set      │  │  Monaco      │  └───────────────┘  │
│  │  • stack    │  │  Editor      │                      │
│  │  • queue    │  │              │  ┌───────────────┐  │
│  │  • algorithm│  │              │  │ AI Assistant  │  │
│  │  ─────────  │  │              │  │ ─────────     │  │
│  │  Tabs:      │  │              │  │ Claude API    │  │
│  │  Autocomplete│  │              │  │ Streaming     │  │
│  │  Snippets   │  │              │  └───────────────┘  │
│  │  AI Chat    │  │              │                      │
│  └─────────────┘  └──────────────┘                      │
└─────────────────────────────────────────────────────────┘

                        │ REST API
                        ▼
         ┌──────────────────────────────┐
         │     Node.js Express API      │
         │  /api/complete (Trie O(L))   │
         │  /api/search  (full-text)    │
         │  /api/context-complete       │
         │  /api/stats                  │
         └──────────────────────────────┘
                        │
                        ▼ (N-API bridge)
         ┌──────────────────────────────┐
         │   C++20 Engine (native)      │
         │   Trie data structure        │
         │   Tokenizer / Parser         │
         │   Symbol Table (10K+ syms)  │
         └──────────────────────────────┘
```

---

## File Structure (Improved)

```
IntelliCPP/
├── frontend/
│   ├── src/
│   │   ├── App.jsx              ← Root: layout, routing, theme context
│   │   ├── components/
│   │   │   ├── Sidebar.jsx      ← Container selector + tab nav
│   │   │   ├── SearchBar.jsx    ← Prefix input with keyboard nav
│   │   │   ├── CompletionList.jsx ← Ranked suggestion list
│   │   │   ├── DetailPanel.jsx  ← Signature, doc, complexity, example
│   │   │   ├── SnippetViewer.jsx ← Code snippets with copy
│   │   │   ├── AIAssistant.jsx  ← Claude API chat interface
│   │   │   ├── MetricsBar.jsx   ← Real-time performance stats
│   │   │   └── CodeBlock.jsx    ← Syntax-highlighted code renderer
│   │   ├── hooks/
│   │   │   ├── useAutocomplete.js  ← Trie query logic + keyboard nav
│   │   │   ├── useTheme.js         ← Dark/light + localStorage persist
│   │   │   └── useAI.js            ← Claude API streaming hook
│   │   ├── data/
│   │   │   └── stl_symbols.js  ← Client-side STL metadata for offline
│   │   └── styles/
│   │       └── tokens.css      ← CSS variables for theming
│   └── package.json
│
├── backend/
│   ├── server.js               ← Express app entry point
│   ├── routes/
│   │   ├── complete.js         ← GET /api/complete
│   │   ├── search.js           ← GET /api/search
│   │   ├── context.js          ← POST /api/context-complete
│   │   └── stats.js            ← GET /api/stats
│   ├── lib/
│   │   ├── trie.js             ← JS Trie implementation (web fallback)
│   │   ├── ranker.js           ← Relevance scoring algorithm
│   │   ├── database.js         ← Structured STL symbol database
│   │   └── rateLimit.js        ← In-memory rate limiter
│   └── package.json
│
├── src/                        ← C++ native engine
│   ├── trie.cpp / trie.h
│   ├── tokenizer.cpp
│   ├── symbol_table.cpp
│   └── napi_bridge.cpp         ← N-API bindings
│
├── tests/
│   ├── backend/                ← Jest API tests
│   └── cpp/                    ← GTest unit tests
│
└── vercel.json                 ← Vercel routing config
```

---

## Specific Prompt for Claude/AI to Improve Each File

### Frontend: App.jsx
```
You are improving IntelliCPP, a C++ IntelliSense web app.

Rewrite App.jsx with:
1. Three-column layout: sidebar (200px) | main (flex) | detail panel (320px)
2. Theme context using React.createContext (dark/light)
3. Tab state: "autocomplete" | "snippets" | "ai"
4. Selected container state (default: "vector")
5. Keyboard shortcut: Cmd+K to focus search
6. Sticky header with branding, live status badge, theme toggle
7. Metrics bar: symbols count, latency, matches, algorithm name

Use CSS-in-JS (inline styles) with t = THEMES[theme] pattern.
```

### Backend: server.js
```
You are improving the IntelliCPP Node.js backend.

Rewrite server.js with:
1. Structured STL_DB object with full metadata per symbol (name, returnType, params, complexity, doc, since)
2. Trie class with insert() and prefixSearch() methods
3. Relevance ranking: exact > prefix > substring; +10 for common methods
4. GET /api/complete?q=push&container=vector → ranked prefix results
5. GET /api/search?q=sort → full-text search
6. POST /api/context-complete with headers[] and prefix body
7. GET /api/stats → analytics
8. Rate limiting: 200 req/min/IP
9. X-Response-Time header on all responses
10. Structured error responses with hints

Use only built-in Node.js + Express. No external DB.
```

### AI Assistant Hook: useAI.js
```
Create a React hook for streaming Claude API responses.

API endpoint: https://api.anthropic.com/v1/messages
Model: claude-sonnet-4-20250514
Max tokens: 800

System prompt:
"You are IntelliCPP, an expert C++ IntelliSense assistant. 
Answer questions about C++ STL, algorithms, modern C++20/23 features, 
and performance. Be concise. Format code with triple backticks and cpp language tag."

Hook interface:
  const { response, loading, error, ask } = useAI();
  await ask("What is std::move?");

Handle:
  - Loading state
  - Error state  
  - Response parsing from data.content[].text
  - Rate limit errors (HTTP 429)
```

---

## Deployment Notes (Vercel)

```json
// vercel.json (improved)
{
  "version": 2,
  "builds": [
    { "src": "frontend/package.json", "use": "@vercel/static-build", "config": { "distDir": "build" } },
    { "src": "backend/server.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/backend/server.js" },
    { "src": "/(.*)", "dest": "/frontend/build/index.html" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

---

## Summary of All Improvements

| Area | Before | After |
|------|--------|-------|
| Search | Prefix only | Prefix + fuzzy + full-text |
| Ranking | Alphabetical | Relevance scoring |
| Symbol metadata | Name + description | + returnType, complexity, params, since |
| Context | None | Header-aware + variable-aware |
| AI | None | Claude API assistant tab |
| Snippets | None | Curated C++ snippet library |
| Theme | Dark only | Dark + Light with system preference |
| Keyboard nav | Partial | Full ↑↓ Tab Escape Cmd+K |
| Metrics | Static | Real-time latency tracking |
| Error handling | Basic | Structured with hints |
| Rate limiting | None | 200 req/min/IP |
| Analytics | None | Usage stats endpoint |
| API endpoints | 1 | 6 structured endpoints |
| Tests | 92% C++ | + API integration tests |

---

*Generated: April 2026 | IntelliCPP v2.0 Improvement Guide*
