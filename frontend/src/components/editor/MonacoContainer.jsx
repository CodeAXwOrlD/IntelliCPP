import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useEditor } from '../../context/EditorContext';
import { useEngine } from '../../context/EngineContext';
import { deduceContextType, getDocumentation } from '../../utils/intelliDocs';

export default function MonacoContainer() {
  const { activeFile, activeLanguage, updateFileContent, setCursorPos, editorSettings, monacoEditorRef } = useEditor();
  const { astTokens } = useEngine();
  const completionDisposableRef = useRef(null);
  const hoverDisposableRef = useRef(null);

  // Setup custom Obsidian Cyber Monaco Theme
  const handleEditorWillMount = (monaco) => {
    monaco.editor.defineTheme('obsidian-cyber-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '00F2FE', fontStyle: 'bold' },
        { token: 'type', foreground: '67F4B7' },
        { token: 'identifier', foreground: 'F8FAFC' },
        { token: 'string', foreground: 'FFB4AB' },
        { token: 'number', foreground: 'FFC470' },
        { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
        { token: 'delimiter', foreground: '849495' },
        { token: 'function', foreground: 'D0BCFF' },
        { token: 'operator', foreground: '6FF6FF' }
      ],
      colors: {
        'editor.background': '#07080B',
        'editor.foreground': '#E3E2E6',
        'editorGutter.background': '#07080B',
        'editorLineNumber.foreground': '#4B5563',
        'editorLineNumber.activeForeground': '#00F2FE',
        'editor.selectionBackground': 'rgba(0, 242, 254, 0.18)',
        'editor.inactiveSelectionBackground': 'rgba(0, 242, 254, 0.08)',
        'editor.selectionHighlightBackground': 'rgba(0, 242, 254, 0.12)',
        'editor.findMatchBackground': 'rgba(0, 242, 254, 0.25)',
        'editor.findMatchHighlightBackground': 'rgba(0, 242, 254, 0.12)',
        'editor.findMatchBorder': 'rgba(0, 242, 254, 0.5)',
        'editor.lineHighlightBackground': 'rgba(0, 242, 254, 0.04)',
        'editor.lineHighlightBorder': 'rgba(0, 242, 254, 0.15)',
        'editorCursor.foreground': '#00F2FE',
        'editorWhitespace.foreground': 'rgba(255, 255, 255, 0.08)',
        'editorIndentGuide.background': 'rgba(255, 255, 255, 0.05)',
        'editorIndentGuide.activeBackground': 'rgba(0, 242, 254, 0.25)',
        'editorWidget.background': '#0E1117',
        'editorWidget.border': 'rgba(0, 242, 254, 0.35)',
        'editorSuggestWidget.background': '#0E1117',
        'editorSuggestWidget.border': 'rgba(0, 242, 254, 0.35)',
        'editorSuggestWidget.selectedBackground': 'rgba(0, 242, 254, 0.16)',
        'editorSuggestWidget.selectedIconForeground': '#00F2FE',
        'editorSuggestWidget.foreground': '#E3E2E6',
        'editorSuggestWidget.highlightForeground': '#00F2FE',
        'editorSuggestWidget.focusHighlightForeground': '#00F2FE',
        'list.activeSelectionBackground': 'rgba(0, 242, 254, 0.16)',
        'list.activeSelectionForeground': '#FFFFFF',
        'list.activeSelectionIconForeground': '#00F2FE',
        'list.focusBackground': 'rgba(0, 242, 254, 0.16)',
        'list.focusForeground': '#FFFFFF',
        'list.focusOutline': 'rgba(0, 242, 254, 0.4)',
        'list.hoverBackground': 'rgba(255, 255, 255, 0.05)',
        'list.hoverForeground': '#E3E2E6',
        'list.highlightForeground': '#00F2FE',
        'editorHoverWidget.background': '#0D1117',
        'editorHoverWidget.border': 'rgba(0, 242, 254, 0.35)',
        'editorHoverWidget.foreground': '#E3E2E6',
        'editorError.foreground': '#F43F5E',
        'editorError.background': 'rgba(244, 63, 94, 0.06)',
        'editorError.border': 'transparent',
        'editorWarning.foreground': '#F59E0B',
        'editorWarning.background': 'rgba(245, 158, 11, 0.06)',
        'editorInfo.foreground': '#00F2FE',
        'editorGutter.modifiedBackground': '#00F2FE',
        'editorGutter.addedBackground': '#10B981',
        'editorGutter.deletedBackground': '#F43F5E',
        'editorOverviewRuler.border': 'transparent',
        'editorOverviewRuler.errorForeground': 'rgba(244, 63, 94, 0.5)',
        'editorOverviewRuler.warningForeground': 'rgba(245, 158, 11, 0.5)'
      }
    });
  };

  const handleEditorDidMount = (editor, monaco) => {
    monacoEditorRef.current = editor;

    // Track Cursor Coordinates
    editor.onDidChangeCursorPosition((e) => {
      if (e.position) {
        setCursorPos({ line: e.position.lineNumber, column: e.position.column });
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // 1. CONTEXT-AWARE INTELLISENSE COMPLETION PROVIDER
    // ─────────────────────────────────────────────────────────────────
    if (completionDisposableRef.current) {
      completionDisposableRef.current.dispose();
    }

    const langId = activeLanguage.monacoId || 'cpp';

    const completionProvider = monaco.languages.registerCompletionItemProvider(langId, {
      triggerCharacters: ['.', ':', '>', '#', '<', '"', ' '],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const code = model.getValue();
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const context = deduceContextType(code, position.lineNumber, position.column);

        // ── Case 1: Preprocessor Directives (#in, #include, #define, #pragma) ──
        if (context.isDirective) {
          const currentLine = model.getLineContent(position.lineNumber);
          const hashIdx = currentLine.indexOf('#');
          const directiveRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: hashIdx >= 0 ? hashIdx + 1 : word.startColumn,
            endColumn: word.endColumn
          };

          const directives = [
            { label: '#include <...>', insertText: '#include <${1:iostream}>', detail: 'Includes standard library header', doc: 'Directs compiler to paste contents of standard header.' },
            { label: '#include "..."', insertText: '#include "${1:header.h}"', detail: 'Includes local project header', doc: 'Directs compiler to include local header file relative to workspace.' },
            { label: '#define', insertText: '#define ${1:MACRO} ${2:value}', detail: 'Macro definition', doc: 'Defines a preprocessor macro or constant value.' },
            { label: '#pragma once', insertText: '#pragma once', detail: 'Header guard directive', doc: 'Ensures this header file is included only once per translation unit.' },
            { label: '#ifdef', insertText: '#ifdef ${1:MACRO}\n$0\n#endif', detail: 'Conditional compilation if macro defined', doc: 'Compiles enclosed block only if MACRO is defined.' },
            { label: '#ifndef', insertText: '#ifndef ${1:MACRO}\n#define ${1:MACRO}\n$0\n#endif', detail: 'Conditional compilation if not defined', doc: 'Standard include guard idiom.' },
            { label: '#if', insertText: '#if ${1:EXPRESSION}\n$0\n#endif', detail: 'Conditional preprocessor expression', doc: 'Evaluates constant expression at compile time.' },
            { label: '#endif', insertText: '#endif', detail: 'Closes conditional preprocessor block', doc: 'Terminates an #if, #ifdef, or #ifndef block.' }
          ];

          return {
            suggestions: directives.map(d => ({
              label: d.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: d.insertText,
              insertTextRules: monaco.languages.CompletionItemInsertValueRule.InsertAsSnippet,
              detail: d.detail,
              documentation: { value: `**${d.label}**\n\n${d.doc}` },
              range: directiveRange
            }))
          };
        }

        // ── Case 2: #include Header Completions (#include <stack, #include<stack) ──
        if (context.isInclude) {
          const headers = [
            { name: 'stack', desc: 'LIFO container adapter' },
            { name: 'queue', desc: 'FIFO queue and priority_queue container adapters' },
            { name: 'vector', desc: 'Dynamic array container' },
            { name: 'string', desc: 'Dynamic string class' },
            { name: 'iostream', desc: 'Standard input/output streams (cin, cout, endl)' },
            { name: 'algorithm', desc: 'Sorting, searching, and mutating algorithms' },
            { name: 'numeric', desc: 'Numeric operations (accumulate, iota, gcd, lcm)' },
            { name: 'map', desc: 'Ordered Red-Black tree associative map' },
            { name: 'unordered_map', desc: 'Hash-table based key-value container' },
            { name: 'set', desc: 'Unique sorted element container' },
            { name: 'unordered_set', desc: 'Hash-table based unique set' },
            { name: 'deque', desc: 'Double-ended queue sequence container' },
            { name: 'list', desc: 'Doubly-linked list container' },
            { name: 'memory', desc: 'Smart pointers (unique_ptr, shared_ptr, weak_ptr)' },
            { name: 'ranges', desc: 'C++20 Ranges library (views, adaptors)' },
            { name: 'concepts', desc: 'C++20 Concepts and type constraints' },
            { name: 'chrono', desc: 'Date, time, duration, and high_resolution_clock' },
            { name: 'thread', desc: 'Multithreading and concurrency utilities' },
            { name: 'mutex', desc: 'Synchronization primitives (mutex, lock_guard)' },
            { name: 'cmath', desc: 'Standard mathematical functions' },
            { name: 'cassert', desc: 'Runtime assert macros' }
          ];

          return {
            suggestions: headers.map(h => ({
              label: `<${h.name}>`,
              kind: monaco.languages.CompletionItemKind.Module,
              insertText: `${h.name}>`,
              detail: `C++ Standard Library Header`,
              documentation: { value: `**#include <${h.name}>**\n\n${h.desc}` },
              range
            }))
          };
        }

        // ── Case 3: Member Dot/Arrow Access (nums., v., str.) ──
        if (context.isMemberAccess) {
          const targetType = context.type;
          const suggestions = [];

          if (targetType === 'vector' || targetType === 'unknown_object') {
            const vectorMethods = [
              { label: 'push_back', sig: 'void push_back(const T& val)', doc: 'Appends element to end (O(1) amortized).', comp: 'O(1) amortized' },
              { label: 'emplace_back', sig: 'T& emplace_back(Args&&... args)', doc: 'Constructs element in-place at end.', comp: 'O(1) amortized' },
              { label: 'pop_back', sig: 'void pop_back()', doc: 'Removes last element.', comp: 'O(1)' },
              { label: 'size', sig: 'size_type size() const', doc: 'Returns element count.', comp: 'O(1)' },
              { label: 'capacity', sig: 'size_type capacity() const', doc: 'Returns allocated capacity.', comp: 'O(1)' },
              { label: 'reserve', sig: 'void reserve(size_type n)', doc: 'Pre-allocates capacity for n elements.', comp: 'O(N)' },
              { label: 'resize', sig: 'void resize(size_type n)', doc: 'Resizes to n elements.', comp: 'O(N)' },
              { label: 'clear', sig: 'void clear()', doc: 'Erases all elements.', comp: 'O(N)' },
              { label: 'empty', sig: 'bool empty() const', doc: 'Checks if container is empty.', comp: 'O(1)' },
              { label: 'front', sig: 'T& front()', doc: 'Returns reference to first element.', comp: 'O(1)' },
              { label: 'back', sig: 'T& back()', doc: 'Returns reference to last element.', comp: 'O(1)' },
              { label: 'begin', sig: 'iterator begin()', doc: 'Iterator to beginning.', comp: 'O(1)' },
              { label: 'end', sig: 'iterator end()', doc: 'Iterator to past-the-end.', comp: 'O(1)' },
              { label: 'data', sig: 'T* data()', doc: 'Direct pointer to underlying array.', comp: 'O(1)' }
            ];

            vectorMethods.forEach(m => {
              suggestions.push({
                label: m.label,
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: m.label,
                detail: `[${m.comp}] ${m.sig}`,
                documentation: {
                  value: `**${m.label}** — \`${m.sig}\`\n\n${m.doc}\n\n⚡ **Time Complexity**: \`${m.comp}\``
                },
                range
              });
            });
          }

          if (targetType === 'string') {
            const stringMethods = [
              { label: 'length', sig: 'size_type length() const', doc: 'Returns character length.', comp: 'O(1)' },
              { label: 'substr', sig: 'string substr(size_t pos, size_t len)', doc: 'Extracts substring.', comp: 'O(N)' },
              { label: 'find', sig: 'size_t find(const string& s, size_t pos=0)', doc: 'Finds first occurrence of s.', comp: 'O(N)' },
              { label: 'append', sig: 'string& append(const string& s)', doc: 'Appends string to end.', comp: 'O(N)' },
              { label: 'c_str', sig: 'const char* c_str() const', doc: 'Returns null-terminated C string.', comp: 'O(1)' },
              { label: 'empty', sig: 'bool empty() const', doc: 'Checks if string is empty.', comp: 'O(1)' },
              { label: 'clear', sig: 'void clear()', doc: 'Clears string content.', comp: 'O(1)' }
            ];
            stringMethods.forEach(m => {
              suggestions.push({
                label: m.label,
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: m.label,
                detail: `[${m.comp}] ${m.sig}`,
                documentation: { value: `**${m.label}** — \`${m.sig}\`\n\n${m.doc}` },
                range
              });
            });
          }

          if (targetType === 'map' || targetType === 'unordered_map') {
            const mapMethods = [
              { label: 'insert', sig: 'pair<iterator, bool> insert(const value_type& val)', doc: 'Inserts key-value pair.', comp: 'O(log N)' },
              { label: 'erase', sig: 'size_type erase(const key_type& k)', doc: 'Removes key from map.', comp: 'O(log N)' },
              { label: 'find', sig: 'iterator find(const key_type& k)', doc: 'Finds element with key k.', comp: 'O(log N)' },
              { label: 'count', sig: 'size_type count(const key_type& k)', doc: 'Returns count of key (0 or 1).', comp: 'O(log N)' },
              { label: 'size', sig: 'size_type size() const', doc: 'Returns element count.', comp: 'O(1)' },
              { label: 'empty', sig: 'bool empty() const', doc: 'Checks if map is empty.', comp: 'O(1)' }
            ];
            mapMethods.forEach(m => {
              suggestions.push({
                label: m.label,
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: m.label,
                detail: `[${m.comp}] ${m.sig}`,
                documentation: { value: `**${m.label}** — \`${m.sig}\`\n\n${m.doc}` },
                range
              });
            });
          }

          if (targetType === 'stack' || targetType === 'queue' || targetType === 'priority_queue') {
            const adapterMethods = [
              { label: 'push', sig: 'void push(const T& val)', doc: 'Pushes element into adapter.', comp: 'O(1) / O(log N)' },
              { label: 'pop', sig: 'void pop()', doc: 'Pops top element from adapter.', comp: 'O(1) / O(log N)' },
              { label: 'top', sig: 'T& top()', doc: 'Accesses top element (stack/priority_queue).', comp: 'O(1)' },
              { label: 'front', sig: 'T& front()', doc: 'Accesses front element (queue).', comp: 'O(1)' },
              { label: 'back', sig: 'T& back()', doc: 'Accesses back element (queue).', comp: 'O(1)' },
              { label: 'size', sig: 'size_type size() const', doc: 'Returns element count.', comp: 'O(1)' },
              { label: 'empty', sig: 'bool empty() const', doc: 'Checks if empty.', comp: 'O(1)' }
            ];
            adapterMethods.forEach(m => {
              suggestions.push({
                label: m.label,
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: m.label,
                detail: `[${m.comp}] ${m.sig}`,
                documentation: { value: `**${m.label}** — \`${m.sig}\`\n\n${m.doc}` },
                range
              });
            });
          }

          if (suggestions.length > 0) {
            return { suggestions };
          }
        }

        // ── Case 4: General Top-Level Symbols, Classes & Keywords ──
        const topLevelCppSymbols = [
          // Classes / Types
          { name: 'vector', type: 'class', detail: 'std::vector<T> dynamic array', complexity: 'O(1) amortized push' },
          { name: 'string', type: 'class', detail: 'std::string character sequence', complexity: 'O(1) amortized append' },
          { name: 'map', type: 'class', detail: 'std::map<K, V> ordered map (Red-Black Tree)', complexity: 'O(log N) search' },
          { name: 'unordered_map', type: 'class', detail: 'std::unordered_map<K, V> hash table', complexity: 'O(1) avg search' },
          { name: 'set', type: 'class', detail: 'std::set<T> unique sorted collection', complexity: 'O(log N)' },
          { name: 'unordered_set', type: 'class', detail: 'std::unordered_set<T> unique hash set', complexity: 'O(1) avg' },
          { name: 'stack', type: 'class', detail: 'std::stack<T> LIFO adapter', complexity: 'O(1) push/pop' },
          { name: 'queue', type: 'class', detail: 'std::queue<T> FIFO adapter', complexity: 'O(1) push/pop' },
          { name: 'priority_queue', type: 'class', detail: 'std::priority_queue<T> max-heap', complexity: 'O(log N) push/pop' },
          { name: 'pair', type: 'class', detail: 'std::pair<T1, T2> two-value tuple', complexity: 'O(1)' },
          { name: 'unique_ptr', type: 'class', detail: 'std::unique_ptr<T> exclusive ownership pointer', complexity: 'Zero overhead' },
          { name: 'shared_ptr', type: 'class', detail: 'std::shared_ptr<T> reference-counted pointer', complexity: 'Atomic refcount' },
          
          // Functions / Algorithms
          { name: 'sort', type: 'function', detail: 'std::sort(first, last)', complexity: 'O(N log N)' },
          { name: 'accumulate', type: 'function', detail: 'std::accumulate(first, last, init)', complexity: 'O(N)' },
          { name: 'binary_search', type: 'function', detail: 'std::binary_search(first, last, val)', complexity: 'O(log N)' },
          { name: 'lower_bound', type: 'function', detail: 'std::lower_bound(first, last, val)', complexity: 'O(log N)' },
          { name: 'upper_bound', type: 'function', detail: 'std::upper_bound(first, last, val)', complexity: 'O(log N)' },
          { name: 'make_unique', type: 'function', detail: 'std::make_unique<T>(args...)', complexity: 'O(1)' },
          { name: 'make_shared', type: 'function', detail: 'std::make_shared<T>(args...)', complexity: 'O(1)' },
          { name: 'cout', type: 'object', detail: 'std::cout standard output stream', complexity: 'I/O' },
          { name: 'cin', type: 'object', detail: 'std::cin standard input stream', complexity: 'I/O' },
          { name: 'endl', type: 'object', detail: 'std::endl newline and flush', complexity: 'I/O' },

          // Core Keywords
          { name: 'using namespace std;', type: 'keyword', detail: 'Imports std namespace into global scope', complexity: 'Scope' },
          { name: 'constexpr', type: 'keyword', detail: 'Compile-time constant expression', complexity: 'Zero runtime cost' },
          { name: 'auto', type: 'keyword', detail: 'Type deduced from initializer', complexity: 'Compile-time' },
          { name: 'template<typename T>', type: 'keyword', detail: 'Generic template declaration', complexity: 'Compile-time' },
          { name: 'concept', type: 'keyword', detail: 'C++20 template constraint', complexity: 'Compile-time' },
          { name: 'const', type: 'keyword', detail: 'Read-only immutability qualifier', complexity: 'Safety' },
          { name: 'override', type: 'keyword', detail: 'Virtual function override specifier', complexity: 'Safety' },
          { name: 'noexcept', type: 'keyword', detail: 'Specifies function does not throw', complexity: 'Optimizer friendly' }
        ];

        const symbolItems = topLevelCppSymbols.map(sym => ({
          label: sym.name,
          kind: sym.type === 'class' 
            ? monaco.languages.CompletionItemKind.Class 
            : sym.type === 'function' 
            ? monaco.languages.CompletionItemKind.Function 
            : sym.type === 'keyword'
            ? monaco.languages.CompletionItemKind.Keyword
            : monaco.languages.CompletionItemKind.Variable,
          insertText: sym.name,
          detail: `[${sym.complexity}] ${sym.detail}`,
          documentation: {
            value: `**${sym.name}**\n\n${sym.detail}\n\n⚡ **Complexity**: \`${sym.complexity}\``
          },
          range
        }));

        const astItems = astTokens.map(tok => ({
          label: tok,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: tok,
          detail: 'Live AST Identifier (Local Scope)',
          range
        }));

        return {
          suggestions: [...symbolItems, ...astItems]
        };
      }
    });

    completionDisposableRef.current = completionProvider;

    // ─────────────────────────────────────────────────────────────────
    // 2. ADVANCED HOVER DOCUMENTATION PROVIDER (TYPE & ORIGIN INSPECTOR)
    // ─────────────────────────────────────────────────────────────────
    if (hoverDisposableRef.current) {
      hoverDisposableRef.current.dispose();
    }

    const hoverProvider = monaco.languages.registerHoverProvider(langId, {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const symbolName = word.word;
        const doc = getDocumentation(symbolName);

        if (doc) {
          return {
            range: new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: [
              { value: `### 📦 \`${doc.name}\`  \n*${doc.type} • Defined in \`${doc.header}\`*` },
              { value: `\`\`\`cpp\n${doc.signature}\n\`\`\`` },
              { value: `**Description**: ${doc.summary}` },
              { value: `⚡ **Performance**: \`${doc.complexity}\`` },
              ...(doc.example ? [{ value: `**Example Usage**:\n\`\`\`cpp\n${doc.example}\n\`\`\`` }] : [])
            ]
          };
        }

        // Check if it's a local AST token
        if (astTokens.includes(symbolName)) {
          return {
            range: new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: [
              { value: `### 🔹 Local Identifier: \`${symbolName}\`` },
              { value: `*Extracted from Active AST Translation Unit (Local Scope)*` },
              { value: `Live memory allocated in active workspace stack frame.` }
            ]
          };
        }

        return null;
      }
    });

    hoverDisposableRef.current = hoverProvider;
  };

  return (
    <div className="monaco-wrapper">
      <Editor
        height="100%"
        theme="obsidian-cyber-dark"
        language={activeLanguage.monacoId || 'cpp'}
        value={activeFile?.content || ''}
        onChange={(value) => updateFileContent(value || '')}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        options={{
          fontSize: editorSettings.fontSize,
          fontFamily: "'JetBrains Mono', monospace",
          fontLigatures: editorSettings.fontLigatures,
          minimap: { enabled: editorSettings.minimap, scale: 0.8 },
          wordWrap: editorSettings.wordWrap ? 'on' : 'off',
          lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
          automaticLayout: true,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          renderLineHighlight: 'line',
          renderLineHighlightOnlyWhenFocus: true,
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, comments: false, strings: true },
          hover: {
            enabled: true,
            delay: 200,
            sticky: true
          },
          guides: {
            indentation: true,
            highlightActiveIndentation: true
          }
        }}
      />
    </div>
  );
}
