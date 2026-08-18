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

    editor.onDidChangeCursorPosition((e) => {
      if (e.position) {
        setCursorPos({ line: e.position.lineNumber, column: e.position.column });
      }
    });

    if (completionDisposableRef.current) {
      completionDisposableRef.current.dispose();
    }

    const langId = activeLanguage.monacoId || 'cpp';

    const completionProvider = monaco.languages.registerCompletionItemProvider(langId, {
      triggerCharacters: ['.', ':', '>', '#', '<', '"', ' '],
      provideCompletionItems: (model, position) => {
        try {
          const word = model.getWordUntilPosition(position);
          const code = model.getValue();
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          };

          const context = deduceContextType(code, position.lineNumber, position.column);

          // Directives (#include, #define, #pragma)
          if (context.isDirective) {
            const lineText = model.getLineContent(position.lineNumber);
            const textBefore = lineText.slice(0, position.column - 1);
            const hasHash = textBefore.trimStart().startsWith('#');

            // eslint-disable-next-line no-template-curly-in-string
            const directives = [
              { label: 'include <...>', insertText: hasHash ? 'include <${1:iostream}>' : '#include <${1:iostream}>', detail: 'Standard header' },
              { label: 'include "..."', insertText: hasHash ? 'include "${1:header.h}"' : '#include "${1:header.h}"', detail: 'Local header' },
              { label: 'define', insertText: hasHash ? 'define ${1:MACRO} ${2:val}' : '#define ${1:MACRO} ${2:val}', detail: 'Macro definition' },
              { label: 'pragma once', insertText: hasHash ? 'pragma once' : '#pragma once', detail: 'Header guard' },
              { label: 'ifdef', insertText: hasHash ? 'ifdef ${1:MACRO}\n$0\n#endif' : '#ifdef ${1:MACRO}\n$0\n#endif', detail: 'Conditional ifdef' },
              { label: 'ifndef', insertText: hasHash ? 'ifndef ${1:MACRO}\n#define ${1:MACRO}\n$0\n#endif' : '#ifndef ${1:MACRO}\n#define ${1:MACRO}\n$0\n#endif', detail: 'Conditional ifndef' }
            ];

            return {
              suggestions: directives.map(d => ({
                label: d.label,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: d.insertText,
                insertTextRules: monaco.languages.CompletionItemInsertValueRule.InsertAsSnippet,
                detail: d.detail,
                range
              }))
            };
          }

          // Header completions inside #include <...
          if (context.isInclude) {
            const headers = [
              { name: 'stack', desc: 'LIFO adapter' },
              { name: 'queue', desc: 'FIFO adapter' },
              { name: 'vector', desc: 'Dynamic array' },
              { name: 'string', desc: 'String container' },
              { name: 'iostream', desc: 'Standard I/O stream' },
              { name: 'algorithm', desc: 'Algorithms library' },
              { name: 'numeric', desc: 'Numeric library' },
              { name: 'map', desc: 'Ordered map' },
              { name: 'unordered_map', desc: 'Hash map' },
              { name: 'set', desc: 'Ordered set' },
              { name: 'unordered_set', desc: 'Hash set' },
              { name: 'deque', desc: 'Double-ended queue' },
              { name: 'list', desc: 'Linked list' },
              { name: 'memory', desc: 'Smart pointers' },
              { name: 'ranges', desc: 'C++20 Ranges' },
              { name: 'concepts', desc: 'C++20 Concepts' },
              { name: 'chrono', desc: 'Time library' },
              { name: 'thread', desc: 'Threads library' },
              { name: 'mutex', desc: 'Mutex primitives' },
              { name: 'cmath', desc: 'Math functions' }
            ];

            return {
              suggestions: headers.map(h => ({
                label: `<${h.name}>`,
                kind: monaco.languages.CompletionItemKind.Module,
                insertText: `${h.name}>`,
                detail: `Header <${h.name}>`,
                documentation: { value: `**#include <${h.name}>**\n\n${h.desc}` },
                range
              }))
            };
          }

          // Member access
          if (context.isMemberAccess) {
            const targetType = context.type;
            const suggestions = [];

            if (targetType === 'vector' || targetType === 'unknown_object') {
              const vectorMethods = [
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
              ];

              vectorMethods.forEach(m => {
                suggestions.push({
                  label: m.label,
                  kind: monaco.languages.CompletionItemKind.Method,
                  insertText: m.label,
                  detail: `[${m.comp}] ${m.sig}`,
                  range
                });
              });
            }

            if (targetType === 'string') {
              const stringMethods = [
                { label: 'length', sig: 'size_type length() const', comp: 'O(1)' },
                { label: 'substr', sig: 'string substr(size_t pos, size_t len)', comp: 'O(N)' },
                { label: 'find', sig: 'size_t find(const string& s, size_t pos=0)', comp: 'O(N)' },
                { label: 'append', sig: 'string& append(const string& s)', comp: 'O(N)' },
                { label: 'c_str', sig: 'const char* c_str() const', comp: 'O(1)' },
                { label: 'empty', sig: 'bool empty() const', comp: 'O(1)' },
                { label: 'clear', sig: 'void clear()', comp: 'O(1)' }
              ];
              stringMethods.forEach(m => {
                suggestions.push({
                  label: m.label,
                  kind: monaco.languages.CompletionItemKind.Method,
                  insertText: m.label,
                  detail: `[${m.comp}] ${m.sig}`,
                  range
                });
              });
            }

            if (targetType === 'stack' || targetType === 'queue' || targetType === 'priority_queue') {
              const adapterMethods = [
                { label: 'push', sig: 'void push(const T& val)', comp: 'O(1)' },
                { label: 'pop', sig: 'void pop()', comp: 'O(1)' },
                { label: 'top', sig: 'T& top()', comp: 'O(1)' },
                { label: 'front', sig: 'T& front()', comp: 'O(1)' },
                { label: 'back', sig: 'T& back()', comp: 'O(1)' },
                { label: 'size', sig: 'size_type size() const', comp: 'O(1)' },
                { label: 'empty', sig: 'bool empty() const', comp: 'O(1)' }
              ];
              adapterMethods.forEach(m => {
                suggestions.push({
                  label: m.label,
                  kind: monaco.languages.CompletionItemKind.Method,
                  insertText: m.label,
                  detail: `[${m.comp}] ${m.sig}`,
                  range
                });
              });
            }

            if (suggestions.length > 0) {
              return { suggestions };
            }
          }

          // Top-level symbols
          const topLevelCppSymbols = [
            { name: 'vector', type: 'class', detail: 'std::vector<T>', complexity: 'O(1) amortized push' },
            { name: 'string', type: 'class', detail: 'std::string', complexity: 'O(1) amortized append' },
            { name: 'map', type: 'class', detail: 'std::map<K, V>', complexity: 'O(log N)' },
            { name: 'unordered_map', type: 'class', detail: 'std::unordered_map<K, V>', complexity: 'O(1) avg' },
            { name: 'set', type: 'class', detail: 'std::set<T>', complexity: 'O(log N)' },
            { name: 'stack', type: 'class', detail: 'std::stack<T>', complexity: 'O(1)' },
            { name: 'queue', type: 'class', detail: 'std::queue<T>', complexity: 'O(1)' },
            { name: 'priority_queue', type: 'class', detail: 'std::priority_queue<T>', complexity: 'O(log N)' },
            { name: 'pair', type: 'class', detail: 'std::pair<T1, T2>', complexity: 'O(1)' },
            { name: 'unique_ptr', type: 'class', detail: 'std::unique_ptr<T>', complexity: 'Zero overhead' },
            { name: 'shared_ptr', type: 'class', detail: 'std::shared_ptr<T>', complexity: 'Atomic refcount' },
            { name: 'sort', type: 'function', detail: 'std::sort(first, last)', complexity: 'O(N log N)' },
            { name: 'accumulate', type: 'function', detail: 'std::accumulate(first, last, init)', complexity: 'O(N)' },
            { name: 'binary_search', type: 'function', detail: 'std::binary_search(first, last, val)', complexity: 'O(log N)' },
            { name: 'lower_bound', type: 'function', detail: 'std::lower_bound(first, last, val)', complexity: 'O(log N)' },
            { name: 'cout', type: 'object', detail: 'std::cout output stream', complexity: 'I/O' },
            { name: 'cin', type: 'object', detail: 'std::cin input stream', complexity: 'I/O' },
            { name: 'endl', type: 'object', detail: 'std::endl flush', complexity: 'I/O' },
            { name: 'using namespace std;', type: 'keyword', detail: 'Import std namespace', complexity: 'Scope' },
            { name: 'constexpr', type: 'keyword', detail: 'Compile-time constant', complexity: 'Zero cost' },
            { name: 'auto', type: 'keyword', detail: 'Deduced type', complexity: 'Compile-time' },
            { name: 'template<typename T>', type: 'keyword', detail: 'Template declaration', complexity: 'Compile-time' },
            { name: 'const', type: 'keyword', detail: 'Constant qualifier', complexity: 'Safety' }
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
            range
          }));

          const astItems = astTokens.map(tok => ({
            label: tok,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: tok,
            detail: 'Local Identifier',
            range
          }));

          return {
            suggestions: [...symbolItems, ...astItems]
          };
        } catch (err) {
          return { suggestions: [] };
        }
      }
    });

    completionDisposableRef.current = completionProvider;

    if (hoverDisposableRef.current) {
      hoverDisposableRef.current.dispose();
    }

    const hoverProvider = monaco.languages.registerHoverProvider(langId, {
      provideHover: (model, position) => {
        try {
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
