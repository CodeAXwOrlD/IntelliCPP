import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import SuggestionPopup from './components/SuggestionPopup';
import ThemeToggle from './components/ThemeToggle';
import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';
import { useTheme } from './theme/ThemeContext';
import './styles/glassmorphism.css';

const STARTING_CODE = `#include <iostream>
using namespace std;

int main() {
        
    return 0;
}`;

// Helper function to call backend API (works in both Electron and dev mode)
const callBackendAPI = async (method, ...args) => {
  // Try Electron IPC first
  if (window.api && window.api[method]) {
    return window.api[method](...args);
  }

  // Fallback: HTTP API for dev mode (if backend HTTP server is available)
  try {
    const response = await fetch('http://localhost:3001/api/' + method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ args }),
    });
    if (response.ok) {
      return response.json();
    }
  } catch (err) {
    // HTTP API not available, return empty
    return method === 'getStats' 
      ? { symbolCount: 0, includedLibraries: [] }
      : [];
  }
};

export default function App() {
  const { theme, themeName } = useTheme();
  const [code, setCode] = useState(STARTING_CODE);
  const [suggestions, setSuggestions] = useState([]);
  const [popupVisible, setPopupVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [symbolCount, setSymbolCount] = useState(0);
  const [latency, setLatency] = useState(0);
  const [includedLibs, setIncludedLibs] = useState([]);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const triggerTimeout = useRef(null);

  const handleEditorChange = (value) => {
    setCode(value || '');
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  const handleKeyDown = (e) => {
    if (!popupVisible || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (suggestions[selectedIndex]) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setPopupVisible(false);
    }
  };

  // ✅ RULE 5: DOT REPLACEMENT INSERTION
  const handleSelectSuggestion = (suggestion) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    const position = editor.getPosition();
    const lineContent = model.getLineContent(position.lineNumber);
    const beforeCursor = lineContent.substring(0, position.column - 1);

    // Find the dot position
    const dotPos = beforeCursor.lastIndexOf('.');
    if (dotPos >= 0) {
      // Monaco columns are 1-based
      // dotPos is 0-based index in the line
      // We want to replace from after the dot to the current cursor
      const range = new monaco.Range(
        position.lineNumber,
        dotPos + 2,  // Column after the dot (1-based: dotPos + 1 for dot, + 1 for after)
        position.lineNumber,
        position.column  // Current cursor position (1-based)
      );
      
      // Insert method with parentheses
      editor.executeEdits('suggestion', [{
        range: range,
        text: suggestion.text + '()'
      }]);
      
      // ✅ RULE 5: Position cursor inside parentheses
      // After insertion, cursor should be inside the empty parentheses
      const newPosition = {
        lineNumber: position.lineNumber,
        column: dotPos + 2 + suggestion.text.length + 1  // Position between ()
      };
      editor.setPosition(newPosition);
    }

    setPopupVisible(false);
    editor.focus();
  };

  const calculatePopupPosition = () => {
    const editor = editorRef.current;
    if (!editor) return { top: 0, left: 0 };

    try {
      const position = editor.getPosition();
      const containerDom = editor.getDomNode();
      const editorRect = containerDom.getBoundingClientRect();

      const cursorCoords = editor.getScrolledVisiblePosition(position);
      if (!cursorCoords) return { top: 0, left: 0 };

      return {
        top: editorRect.top + cursorCoords.top + 24,
        left: editorRect.left + cursorCoords.left
      };
    } catch (err) {
      console.error('Error calculating popup position:', err);
      return { top: 0, left: 0 };
    }
  };

  // ✅ RULE 4: LIVE FILTERING - dynamically filter suggestions as user types
  const triggerSuggestions = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    const position = editor.getPosition();
    const lineContent = model.getLineContent(position.lineNumber);
    const beforeCursor = lineContent.substring(0, position.column - 1);

    // ✅ RULE 4: Check if cursor is after a dot followed by prefix
    const dotMatch = beforeCursor.match(/(\w+)\.([a-zA-Z_]*)$/);
    if (dotMatch) {
      const startTime = Date.now();
      const objectName = dotMatch[1];
      const prefix = dotMatch[2];  // Captured prefix for filtering

      // Call backend with prefix for live filtering
      callBackendAPI('getSuggestions', prefix, objectName, code, position.column).then((realSuggestions) => {
        const elapsed = Date.now() - startTime;
        setLatency(elapsed);
        setSuggestions(realSuggestions || []);
        setSelectedIndex(0);
        setPopupPosition(calculatePopupPosition());
        setPopupVisible((realSuggestions || []).length > 0);
      }).catch(() => {
        setSuggestions([]);
        setPopupVisible(false);
      });
    } else if (beforeCursor.endsWith('.')) {
      // ✅ RULE 3: Initial suggestion (empty prefix) - show all methods
      const match = beforeCursor.match(/(\w+)\.$/);
      if (match) {
        const startTime = Date.now();
        const objectName = match[1];

        callBackendAPI('getSuggestions', '', objectName, code, position.column).then((realSuggestions) => {
          const elapsed = Date.now() - startTime;
          setLatency(elapsed);
          setSuggestions(realSuggestions || []);
          setSelectedIndex(0);
          setPopupPosition(calculatePopupPosition());
          setPopupVisible((realSuggestions || []).length > 0);
        }).catch(() => {
          setSuggestions([]);
          setPopupVisible(false);
        });
      }
    } else {
      setPopupVisible(false);
    }

    // Update system statistics
    callBackendAPI('getStats', code).then((stats) => {
      setSymbolCount(stats.symbolCount || 0);
      setIncludedLibs(stats.includedLibraries || []);
    }).catch(() => {
      // Fallback to empty if API fails
      setSymbolCount(0);
      setIncludedLibs([]);
    });
  };

  const handleEditorChange2 = (value) => {
    setCode(value || '');
    // Debounce suggestion trigger
    if (triggerTimeout.current) {
      clearTimeout(triggerTimeout.current);
    }
    triggerTimeout.current = setTimeout(triggerSuggestions, 100);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="header">
          <div className="header-left">
            <h1>🚀 CodeFlow AI</h1>
          </div>
          <div className="header-right">
            <ThemeToggle />
          </div>
        </div>

        <div className="editor-wrapper">
          <div className="editor-container" onKeyDown={handleKeyDown}>
            <Editor
              height="100%"
              defaultLanguage="cpp"
              value={code}
              onChange={handleEditorChange2}
              onMount={handleEditorDidMount}
              theme={theme['--monaco-theme']}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineHeight: 24,
                fontFamily: 'Fira Code, monospace',
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                formatOnPaste: true,
                formatOnType: true,
                suggestOnTriggerCharacters: true,
                wordBasedSuggestions: false,
                cursorSmoothCaretAnimation: "on",
                smoothScrolling: true,
                padding: { top: 20 },
                automaticLayout: true
              }}
            />

            {popupVisible && suggestions.length > 0 && (
              <div style={{
                position: 'fixed',
                top: `${popupPosition.top}px`,
                left: `${popupPosition.left}px`,
                zIndex: 1000
              }}>
                <SuggestionPopup
                  suggestions={suggestions}
                  selectedIndex={selectedIndex}
                  onSelect={handleSelectSuggestion}
                />
              </div>
            )}
          </div>
        </div>
        
        <StatusBar 
          symbolCount={symbolCount} 
          latency={latency} 
          includedLibs={includedLibs} 
        />
      </div>
    </div>
  );
}
