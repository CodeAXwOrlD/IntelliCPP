import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { useEditor } from '../../context/EditorContext';
import { useEngine } from '../../context/EngineContext';
import { deduceContextType, getDocumentation } from '../../utils/intelliDocs';

export default function MonacoContainer() {
  const { 
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
  const completionDisposableRef = useRef(null);
  const hoverDisposableRef = useRef(null);

  const triggerLayout = useCallback(() => {
    if (monacoEditorRef.current) {
      requestAnimationFrame(() => {
        if (monacoEditorRef.current) {
          monacoEditorRef.current.layout();
        }
      });
    }
  }, [monacoEditorRef]);

  // ResizeObserver and Orientation / Window Resize Listeners
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

  // Trigger editor layout when panels or terminal dock resize/toggle
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
        'editor.selectionBackground': 'rgba(59, 130, 246, 0.3)',
        'editor.lineHighlightBackground': '#00000000',
        'editor.lineHighlightBorder': '#00000000',
        'editorCursor.foreground': '#FFFFFF',
        'editorWidget.background': '#18181B',
        'editorWidget.border': '#27272A',
        'editorSuggestWidget.background': '#18181B',
        'editorSuggestWidget.border': '#27272A',
        'editorSuggestWidget.selectedBackground': 'rgba(59, 130, 246, 0.2)',
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
    monacoEditorRef.current = editor;
    triggerLayout();

    // Ensure click anywhere in editor wrapper properly places cursor
    editor.onMouseDown(() => {
      editor.focus();
    });

    editor.focus();

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
      triggerCharacters: ['.', ':', '>', '#', '<', '"'],
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

            /* eslint-disable no-template-curly-in-string */
            const directives = [
              { label: 'include <...>', insertText: hasHash ? 'include <${1:iostream}>' : '#include <${1:iostream}>', detail: 'Standard header' },
              { label: 'include "..."', insertText: hasHash ? 'include "${1:header.h}"' : '#include "${1:header.h}"', detail: 'Local header' },
              { label: 'define', insertText: hasHash ? 'define ${1:MACRO} ${2:val}' : '#define ${1:MACRO} ${2:val}', detail: 'Macro definition' },
              { label: 'pragma once', insertText: hasHash ? 'pragma once' : '#pragma once', detail: 'Header guard' },
              { label: 'ifdef', insertText: hasHash ? 'ifdef ${1:MACRO}\n$0\n#endif' : '#ifdef ${1:MACRO}\n$0\n#endif', detail: 'Conditional ifdef' },
              { label: 'ifndef', insertText: hasHash ? 'ifndef ${1:MACRO}\n#define ${1:MACRO}\n$0\n#endif' : '#ifndef ${1:MACRO}\n#define ${1:MACRO}\n$0\n#endif', detail: 'Conditional ifndef' }
            ];
            /* eslint-enable no-template-curly-in-string */

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

            // If typing member access (e.g. v. or v.pu), strictly return member methods
            // Never leak global symbols/keywords into member dot completions
            return { suggestions };
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
          // On mobile / touch screens (< 640px), skip hover popup
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
      quickSuggestions: { other: true, comments: false, strings: true },
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
        showSnippets: true
      },
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
      onClick={() => monacoEditorRef.current?.focus()}
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
