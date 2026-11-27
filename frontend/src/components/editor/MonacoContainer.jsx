import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { useEditor } from '../../context/EditorContext';
import { useEngine } from '../../context/EngineContext';
import { deduceContextType, getDocumentation, extractDeclaredVariables } from '../../utils/intelliDocs';

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

          if (context.isDirective) {
            const lineText = model.getLineContent(position.lineNumber);
            const hashIndex = lineText.indexOf('#');
            const hashCol = hashIndex >= 0 ? hashIndex + 1 : 1;
            /* eslint-disable no-template-curly-in-string */
            const directives = [
              { label: '#include <...>', insert: 'include <${1:iostream}>', filter: 'include' },
              { label: '#include "..."', insert: 'include "${1:header.h}"', filter: 'include' },
              { label: '#define',        insert: 'define ${1:MACRO} ${2:value}', filter: 'define' },
              { label: '#pragma once',   insert: 'pragma once',                 filter: 'pragma' },
              { label: '#ifdef',         insert: 'ifdef ${1:MACRO}\n$0\n#endif',         filter: 'ifdef' },
              { label: '#ifndef',        insert: 'ifndef ${1:MACRO}\n#define ${1:MACRO}\n$0\n#endif', filter: 'ifndef' },
              { label: '#if',            insert: 'if ${1:condition}\n$0\n#endif',        filter: 'if' },
              { label: '#elif',          insert: 'elif ${1:condition}',                   filter: 'elif' },
              { label: '#else',          insert: 'else',                                  filter: 'else' },
              { label: '#endif',         insert: 'endif',                                 filter: 'endif' },
            ];
            /* eslint-enable no-template-curly-in-string */
            // Range covers from '#' to cursor; insertText MUST NOT include '#'
            // because '#' is left in place (startColumn points to char after '#').
            // filterText without '#': Monaco word-token is "incl" (strips '#'),
            // so "incl" prefix-matches "include" correctly.
            const dRange = {
              startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
              startColumn: hashCol + 1,  // char AFTER '#', so '#' stays
              endColumn: position.column // cover typed chars: "incl"
            };
            return {
              suggestions: directives.map((d, i) => ({
                label: d.label,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: d.insert,
                filterText: d.filter,
                insertTextRules: monaco.languages.CompletionItemInsertValueRule.InsertAsSnippet,
                detail: 'Preprocessor',
                sortText: `000${i}_${d.filter}`,
                range: dRange,
              })),
            };
          }

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

            return { suggestions };
          }

          /* eslint-disable no-template-curly-in-string */
          const topLevelCppSymbols = [
            { name: '#include <...>', insertText: '#include <${1:iostream}>', type: 'snippet', detail: 'Standard Header', complexity: 'Preprocessor' },
            { name: 'include', insertText: '#include <${1:iostream}>', type: 'snippet', detail: '#include <...>', complexity: 'Preprocessor' },
            { name: '#include "..."', insertText: '#include "${1:header.h}"', type: 'snippet', detail: 'Local Header', complexity: 'Preprocessor' },
            { name: '#define', insertText: '#define ${1:MACRO} ${2:value}', type: 'snippet', detail: 'Macro Definition', complexity: 'Preprocessor' },
            { name: 'define', insertText: '#define ${1:MACRO} ${2:value}', type: 'snippet', detail: '#define MACRO', complexity: 'Preprocessor' },
            { name: '#pragma once', insertText: '#pragma once', type: 'snippet', detail: 'Header guard', complexity: 'Preprocessor' },
            { name: 'pragma', insertText: '#pragma once', type: 'snippet', detail: '#pragma once', complexity: 'Preprocessor' },
            { name: '#ifdef', insertText: '#ifdef ${1:MACRO}\n$0\n#endif', type: 'snippet', detail: 'Conditional ifdef', complexity: 'Preprocessor' },
            { name: 'ifdef', insertText: '#ifdef ${1:MACRO}\n$0\n#endif', type: 'snippet', detail: '#ifdef MACRO', complexity: 'Preprocessor' },
            { name: '#ifndef', insertText: '#ifndef ${1:MACRO}\n#define ${1:MACRO}\n$0\n#endif', type: 'snippet', detail: 'Header guard', complexity: 'Preprocessor' },
            { name: 'ifndef', insertText: '#ifndef ${1:MACRO}\n#define ${1:MACRO}\n$0\n#endif', type: 'snippet', detail: '#ifndef MACRO', complexity: 'Preprocessor' },
            { name: '#if', insertText: '#if ${1:condition}\n$0\n#endif', type: 'snippet', detail: 'Preprocessor if', complexity: 'Preprocessor' },
            { name: '#elif', insertText: '#elif ${1:condition}', type: 'snippet', detail: 'Preprocessor elif', complexity: 'Preprocessor' },
            { name: '#else', insertText: '#else', type: 'snippet', detail: 'Preprocessor else', complexity: 'Preprocessor' },
            { name: '#endif', insertText: '#endif', type: 'snippet', detail: 'End conditional', complexity: 'Preprocessor' },
            { name: 'endif', insertText: '#endif', type: 'snippet', detail: '#endif', complexity: 'Preprocessor' },
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
            { name: 'const', type: 'keyword', detail: 'Constant qualifier', complexity: 'Safety' },
            { name: 'struct', insertText: 'struct ${1:Name} {\n\t$0\n};', type: 'snippet', detail: 'struct declaration', complexity: 'Type' },
            { name: 'class', insertText: 'class ${1:Name} {\npublic:\n\t${1:Name}();\n\t~$1();\nprivate:\n\t$0\n};', type: 'snippet', detail: 'class declaration', complexity: 'Type' }
          ];
          /* eslint-enable no-template-curly-in-string */

          const declaredVars = extractDeclaredVariables(code);
          const localVariableNames = new Set(declaredVars.map(v => v.name));
          if (Array.isArray(astTokens)) {
            astTokens.forEach(t => {
              if (t && !localVariableNames.has(t)) {
                declaredVars.push({ name: t, type: 'variable', detail: 'Local Identifier' });
              }
            });
          }

          const localVariableItems = declaredVars.map(v => ({
            label: v.name,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: v.name,
            detail: `[Local] ${v.detail || v.type}`,
            documentation: {
              value: `**Local Variable**: \`${v.name}\`\n\nType: \`${v.type}\`\n\n*(User-declared scope identifier - Priority 1)*`
            },
            sortText: `0000_${v.name}`,
            range
          }));

          const symbolItems = topLevelCppSymbols.map(sym => ({
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
            insertTextRules: sym.type === 'snippet'
              ? monaco.languages.CompletionItemInsertValueRule.InsertAsSnippet
              : undefined,
            detail: `[${sym.complexity}] ${sym.detail}`,
            sortText: `0100_${sym.name.replace('#', '')}`,
            range
          }));

          return {
            suggestions: [...localVariableItems, ...symbolItems]
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
      quickSuggestions: { other: true, comments: true, strings: true },
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
