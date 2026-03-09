import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { Play, Square, Trash2 } from 'lucide-react';
import SuggestionPopup from './components/SuggestionPopup';
import ThemeToggle from './components/ThemeToggle';
import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';
import OutputPanel from './components/OutputPanel';
import { useTheme } from './theme/ThemeContext';
import './styles/glassmorphism.css';

const STARTING_CODE = `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v;
    
    return 0;
}`;

// Cache for API responses to improve performance
const apiCache = new Map();
const CACHE_DURATION = 500; // 500ms cache duration

// Helper function to call backend API (works in both Electron and cloud environments)
const callBackendAPI = async (method, ...args) => {
  // Try Electron IPC first
  if (window.api && window.api[method]) {
    return window.api[method](...args);
  }

  // Create cache key based on method and arguments
  const cacheKey = `${method}:${JSON.stringify(args)}`;
  const now = Date.now();
  
  // Check if we have a valid cached response
  if (apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    } else {
      // Remove expired cache entry
      apiCache.delete(cacheKey);
    }
  }

  // Call backend API directly
  const apiUrl = `http://localhost:3001/api/${method}`;

  try {
    let requestBody = {};

    if (method === 'getSuggestions') {
      const [prefix, contextType, code, cursorPosition] = args;
      requestBody = { prefix, contextType, code, cursorPosition };
    } else if (method === 'getStats') {
      const [code] = args;
      requestBody = { code };
    } else if (method === 'runCode') {
      const [code] = args;
      requestBody = { code };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Cache the response
    apiCache.set(cacheKey, {
      data: result,
      timestamp: now
    });
    
    return result;
  } catch (err) {
    console.error('[Frontend] API Error:', err.message);
    
    // Return appropriate default values
    if (method === 'getStats') {
      return { symbolCount: 0, includedLibraries: [], symbolTable: {} };
    } else if (method === 'runCode') {
      return { success: false, output: '', error: 'Backend not available' };
    }
    return [];
  }
};

export default function App() {
  const { theme } = useTheme();
  const [code, setCode] = useState(STARTING_CODE);
  const [suggestions, setSuggestions] = useState([]);
  const [popupVisible, setPopupVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [symbolCount, setSymbolCount] = useState(0);
  const [latency, setLatency] = useState(0);
  const [includedLibs, setIncludedLibs] = useState([]);
  const [outputPanelVisible, setOutputPanelVisible] = useState(false);
  const [outputLoading, setOutputLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [outputResult, setOutputResult] = useState('');
  const [outputError, setOutputError] = useState('');
  // const [syntaxErrors, setSyntaxErrors] = useState([]); // Not currently used in UI
  const [outputPanelHeight, setOutputPanelHeight] = useState(220);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const triggerTimeout = useRef(null);
  const syntaxCheckTimeout = useRef(null);
  const cursorUpdateInterval = useRef(null);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (cursorUpdateInterval.current) {
        clearInterval(cursorUpdateInterval.current);
      }
      if (triggerTimeout.current) {
        clearTimeout(triggerTimeout.current);
      }
      if (syntaxCheckTimeout.current) {
        clearTimeout(syntaxCheckTimeout.current);
      }
    };
  }, []);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Update cursor position immediately on any cursor movement
    const updateCursorPosition = () => {
      const position = editor.getPosition();
      if (position) {
        console.log('Cursor position:', position.lineNumber, position.column);
        setCursorPosition({
          line: position.lineNumber,
          column: position.column
        });
      }
    };
    
    // Add listener for cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      console.log('Cursor changed:', e.position);
      updateCursorPosition();
    });
    
    // Add listener for mouse clicks
    editor.onMouseDown((e) => {
      setTimeout(updateCursorPosition, 10);
    });
    
    // Add listener for key presses
    editor.onKeyDown((e) => {
      setTimeout(updateCursorPosition, 10);
    });
    
    // Add listener for content changes (typing)
    editor.onDidChangeModelContent((e) => {
      updateCursorPosition();
    });
    
    // Set initial position
    updateCursorPosition();
    
    // Start polling as fallback (every 200ms)
    cursorUpdateInterval.current = setInterval(updateCursorPosition, 200);
    
    // Add real-time syntax error highlighting
    editor.onDidChangeModelContent(() => {
      if (syntaxCheckTimeout.current) {
        clearTimeout(syntaxCheckTimeout.current);
      }
      syntaxCheckTimeout.current = setTimeout(() => {
        checkSyntaxErrors(editor, monaco);
      }, 500); // Debounce for 500ms
    });
  };
  
  const checkSyntaxErrors = (editor, monaco) => {
    const model = editor.getModel();
    const code = model.getValue();
    
    // Simple syntax error detection
    const errors = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Check for common syntax errors
      if (line.includes('<<') && line.includes('<') && !line.includes('<=')) {
        // Potential missing second < in cout statement
        const coutMatch = line.match(/cout\s*<</);
        if (coutMatch && !line.includes('<<') && line.includes('<')) {
          errors.push({
            startLineNumber: lineNumber,
            startColumn: line.indexOf('<') + 1,
            endLineNumber: lineNumber,
            endColumn: line.indexOf('<') + 2,
            message: 'Missing second < operator. Should be <<',
            severity: monaco.MarkerSeverity.Error
          });
        }
      }
      
      // Check for unmatched brackets
      const openBrackets = (line.match(/\(/g) || []).length;
      const closeBrackets = (line.match(/\)/g) || []).length;
      if (openBrackets !== closeBrackets) {
        // Find the exact position of extra brackets
        let bracketCount = 0;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '(') {
            bracketCount++;
          } else if (line[i] === ')') {
            bracketCount--;
          }
          
          // If we have more closing than opening at any point, highlight the extra )
          if (bracketCount < 0) {
            errors.push({
              startLineNumber: lineNumber,
              startColumn: i + 1,
              endLineNumber: lineNumber,
              endColumn: i + 2,
              message: 'Extra closing parenthesis',
              severity: monaco.MarkerSeverity.Error
            });
            bracketCount = 0; // Reset to continue checking
          }
        }
        
        // If we still have unmatched opening brackets
        if (bracketCount > 0) {
          errors.push({
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: line.length + 1,
            message: `Unmatched opening parentheses: ${bracketCount} extra`,
            severity: monaco.MarkerSeverity.Warning
          });
        }
      }
      
      // Check for unmatched braces (but ignore main function declaration)
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        // Don't warn for main function opening brace
        const isMainFunction = line.includes('int main()') || line.includes('main()');
        if (!isMainFunction || openBraces !== 1 || closeBraces !== 0) {
          errors.push({
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: line.length + 1,
            message: `Unmatched braces: ${openBraces} opening, ${closeBraces} closing`,
            severity: monaco.MarkerSeverity.Warning
          });
        }
      }
      
      // Check for missing semicolons at end of statements
      if (line.trim().length > 0 && 
          !line.trim().endsWith(';') && 
          !line.trim().endsWith('{') && 
          !line.trim().endsWith('}') &&
          !line.trim().startsWith('#') &&
          !line.trim().includes('//')) {
        // Only flag if it looks like a statement
        if (line.includes('=') || line.includes('(') || line.match(/\w+\s+\w+/)) {
          errors.push({
            startLineNumber: lineNumber,
            startColumn: line.length,
            endLineNumber: lineNumber,
            endColumn: line.length + 1,
            message: 'Missing semicolon at end of statement',
            severity: monaco.MarkerSeverity.Warning
          });
        }
      }
    });
    
    // Set markers in the editor
    monaco.editor.setModelMarkers(model, 'owner', errors);
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

    // Extract the actual text to insert from the suggestion
    const suggestionText = suggestion.insertText || suggestion.label || suggestion.text || '';

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
        text: suggestionText + '()'
      }]);
      
      // ✅ RULE 5: Position cursor inside parentheses
      // After insertion, cursor should be inside the empty parentheses
      const newPosition = {
        lineNumber: position.lineNumber,
        column: dotPos + 2 + suggestionText.length + 1  // Position between ()
      };
      editor.setPosition(newPosition);
    } else {
      // General case: replace the current word/token with the suggestion
      // Find the start of the current token
      let startPos = position.column - 1;
      while (startPos > 0 && /[a-zA-Z0-9_]/.test(beforeCursor[startPos - 1])) {
        startPos--;
      }

      const range = new monaco.Range(
        position.lineNumber,
        startPos + 1, // Convert to 1-based
        position.lineNumber,
        position.column // Current cursor position (1-based)
      );

      editor.executeEdits('suggestion', [{
        range: range,
        text: suggestionText
      }]);

      // Position cursor after the inserted text
      const newPosition = {
        lineNumber: position.lineNumber,
        column: startPos + 1 + suggestionText.length
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
  const triggerSuggestions = (currentCode) => {
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

      // Call backend with prefix for live filtering - use currentCode from parameter
      callBackendAPI('getSuggestions', prefix, objectName, currentCode, position.column).then((realSuggestions) => {
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

        // Use currentCode from parameter
        callBackendAPI('getSuggestions', '', objectName, currentCode, position.column).then((realSuggestions) => {
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
      // Check for general keywords/functions when not after a dot
      const wordMatch = beforeCursor.match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
      if (wordMatch) {
        const prefix = wordMatch[0];
        const startTime = Date.now();

        // Call backend for general suggestions
        callBackendAPI('getSuggestions', prefix, 'global', currentCode, position.column).then((realSuggestions) => {
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
      } else {
        setPopupVisible(false);
      }
    }

    // Update system statistics - use currentCode from parameter
    callBackendAPI('getStats', currentCode).then((stats) => {
      setSymbolCount(stats.symbolCount || 0);
      setIncludedLibs(stats.includedLibraries || []);
    }).catch(() => {
      // Fallback to empty if API fails
      setSymbolCount(0);
      setIncludedLibs([]);
    });
  };

  const handleEditorChange2 = (value) => {
    const newCode = value || '';
    setCode(newCode);
    // Debounce suggestion trigger - wait slightly longer for better performance
    if (triggerTimeout.current) {
      clearTimeout(triggerTimeout.current);
    }
    // Increase delay to 200ms for better performance in cloud environment
    triggerTimeout.current = setTimeout(() => triggerSuggestions(newCode), 200);
  };

  const handleRunCode = async () => {
    setOutputLoading(true);
    setIsRunning(true);
    setOutputError('');
    setOutputResult('');
    setOutputPanelVisible(true);

    try {
      const result = await callBackendAPI('runCode', code);
      
      // Handle both JSON string (from HTTP) and already-parsed JSON (from Electron IPC)
      let parsed = result;
      if (typeof result === 'string') {
        try {
          parsed = JSON.parse(result);
        } catch (e) {
          setOutputError('Invalid response format from backend');
          return;
        }
      }
      
      if (parsed && typeof parsed === 'object') {
        if (parsed.success) {
          setOutputResult(parsed.output || 'Code executed successfully');
          setOutputError('');
        } else {
          setOutputError(parsed.error || 'Unknown error occurred');
          setOutputResult(parsed.output || '');
        }
      } else {
        setOutputError('Unexpected response format from backend');
      }
    } catch (err) {
      console.error('[Frontend] Code execution error:', err);
      setOutputError(`Error: ${err.message}`);
    } finally {
      setOutputLoading(false);
      setIsRunning(false);
    }
  };

  const handleStopExecution = () => {
    setOutputLoading(false);
    setIsRunning(false);
    setOutputError('Execution stopped by user');
  };

  const handleClearOutput = () => {
    setOutputResult('');
    setOutputError('');
  };
  
  const handleOutputResize = (direction) => {
    if (direction === 'minimize') {
      setOutputPanelHeight(100);
    } else if (direction === 'maximize') {
      setOutputPanelHeight(400);
    }
  };

  return (
    <div className="app-layout">
      <div className="main-content">
        <div className="toolbar">
          <div className="toolbar-left">
            <h1>IntelliCPP</h1>
          </div>
          <div className="toolbar-center">
            <div className="toolbar-actions">
              {!isRunning ? (
                <button 
                  className="run-button"
                  onClick={handleRunCode} 
                  disabled={outputLoading} 
                  title="Run Code"
                >
                  <Play size={16} />
                  <span>Run Code</span>
                </button>
              ) : (
                <button 
                  className="stop-button"
                  onClick={handleStopExecution} 
                  title="Stop Execution"
                >
                  <Square size={16} />
                  <span>Stop</span>
                </button>
              )}
              <button 
                className="clear-button"
                onClick={handleClearOutput} 
                title="Clear Output"
              >
                <Trash2 size={16} />
                <span>Clear Output</span>
              </button>
            </div>
          </div>
          <div className="toolbar-right">
            <ThemeToggle />
          </div>
        </div>

        <div className="editor-area">
          <Sidebar />
          <div className="editor-wrapper">
            <div className="editor-container" onKeyDown={handleKeyDown} onClick={() => {
              // Update cursor position on click
              if (editorRef.current) {
                const position = editorRef.current.getPosition();
                if (position) {
                  setCursorPosition({
                    line: position.lineNumber,
                    column: position.column
                  });
                }
              }
            }}>
              <Editor
                height="100%"
                defaultLanguage="cpp"
                value={code}
                onChange={handleEditorChange2}
                onMount={handleEditorDidMount}
                theme={theme['--monaco-theme']}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  lineHeight: 24,
                  fontFamily: 'JetBrains Mono, "Fira Code", "Cascadia Code", Consolas, monospace',
                  fontLigatures: true,
                  autoClosingBrackets: 'always',
                  autoClosingQuotes: 'always',
                  formatOnPaste: true,
                  formatOnType: true,
                  suggestOnTriggerCharacters: true,
                  wordBasedSuggestions: false,
                  cursorSmoothCaretAnimation: "on",
                  smoothScrolling: true,
                  padding: { top: 20, bottom: 20 },
                  automaticLayout: true,
                  renderLineHighlight: 'line',
                  renderWhitespace: 'selection',
                  scrollBeyondLastLine: false,
                  bracketPairColorization: { enabled: true },
                  guides: {
                    bracketPairs: true,
                    indentation: true
                  }
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
        </div>
        
        <OutputPanel
          output={outputResult}
          isLoading={outputLoading}
          error={outputError}
          onClear={handleClearOutput}
          isVisible={outputPanelVisible}
          onResize={handleOutputResize}
          minHeight={100}
          maxHeight={500}
          height={outputPanelHeight}
        />
        
        <StatusBar 
          symbolCount={symbolCount} 
          latency={latency} 
          includedLibs={includedLibs} 
          cursorPosition={cursorPosition}
        />
      </div>
    </div>
  );
}
