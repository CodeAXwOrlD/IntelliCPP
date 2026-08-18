import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useEditor } from '../../context/EditorContext';
import { useEngine } from '../../context/EngineContext';

export default function MonacoContainer() {
  const { activeFile, activeLanguage, updateFileContent, setCursorPos, editorSettings, monacoEditorRef } = useEditor();
  const { astTokens } = useEngine();
  const completionDisposableRef = useRef(null);

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
        'editor.lineHighlightBackground': 'rgba(0, 242, 254, 0.03)',
        'editorCursor.foreground': '#00F2FE',
        'editorWhitespace.foreground': 'rgba(255, 255, 255, 0.1)',
        'editorIndentGuide.background': 'rgba(255, 255, 255, 0.06)',
        'editorIndentGuide.activeBackground': 'rgba(0, 242, 254, 0.25)',
        'editorWidget.background': '#0E1117',
        'editorWidget.border': 'rgba(0, 242, 254, 0.3)',
        'editorSuggestWidget.background': '#0E1117',
        'editorSuggestWidget.border': 'rgba(0, 242, 254, 0.3)',
        'editorSuggestWidget.selectedBackground': 'rgba(0, 242, 254, 0.15)',
        'editorSuggestWidget.foreground': '#E3E2E6',
        'editorSuggestWidget.highlightForeground': '#00F2FE',
        'editorError.foreground': '#FFB4AB',
        'editorWarning.foreground': '#F59E0B',
        'editorInfo.foreground': '#00F2FE'
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

    // Register Native Autocomplete Provider for C++, Python, Rust
    if (completionDisposableRef.current) {
      completionDisposableRef.current.dispose();
    }

    const provider = monaco.languages.registerCompletionItemProvider(activeLanguage.monacoId || 'cpp', {
      triggerCharacters: ['.', ':', '>', '#', ' '],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const builtins = activeLanguage.builtinSymbols || [];
        const builtinItems = builtins.map(sym => ({
          label: sym.name,
          kind: sym.type === 'method' 
            ? monaco.languages.CompletionItemKind.Method 
            : sym.type === 'class' 
            ? monaco.languages.CompletionItemKind.Class 
            : monaco.languages.CompletionItemKind.Function,
          insertText: sym.name.replace(/std::/, ''),
          detail: `[${sym.complexity}] ${sym.detail}`,
          documentation: `${sym.detail}\nTime Complexity: ${sym.complexity}`,
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
          suggestions: [...builtinItems, ...astItems]
        };
      }
    });

    completionDisposableRef.current = provider;
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
          renderLineHighlight: 'all',
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, comments: false, strings: true }
        }}
      />
    </div>
  );
}
