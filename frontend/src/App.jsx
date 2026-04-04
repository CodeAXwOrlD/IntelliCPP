import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { Play, Square, Trash2, Code, Map as MapIcon, WrapText, Plus, Upload, Save, Search, MoreVertical } from 'lucide-react';
import SuggestionPopup from './components/SuggestionPopup';
import ThemeToggle from './components/ThemeToggle';
import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';
import OutputPanel from './components/OutputPanel';
import FileExplorer from './components/FileExplorer';
import SearchPanel from './components/SearchPanel';
import SettingsPanel from './components/SettingsPanel';
import WelcomeScreen from './components/WelcomeScreen';
import './styles/glassmorphism.css';

// Improved UI Theme System
const THEMES = {
  dark: {
    bg: "#0d1117",
    surface: "#161b22",
    card: "#1c2230",
    border: "#30363d",
    accent: "#58a6ff",
    accentGlow: "#1f6feb44",
    accentHover: "#79c0ff",
    text: "#e6edf3",
    textMuted: "#8b949e",
    textDim: "#484f58",
    green: "#3fb950",
    red: "#f85149",
    orange: "#d29922",
    keyword: "#ff7b72",
    type: "#ffa657",
    func: "#d2a8ff",
    string: "#a5d6ff",
    comment: "#8b949e",
    macro: "#79c0ff",
    number: "#79c0ff",
  },
  light: {
    bg: "#f8fafc",
    surface: "#ffffff",
    card: "#f1f5f9",
    border: "#e2e8f0",
    accent: "#0969da",
    accentGlow: "#0969da22",
    accentHover: "#1d75d8",
    text: "#1e293b",
    textMuted: "#64748b",
    textDim: "#94a3b8",
    green: "#1a7f37",
    red: "#cf222e",
    orange: "#9a6700",
    keyword: "#cf222e",
    type: "#953800",
    func: "#6639ba",
    string: "#0550ae",
    comment: "#6e7781",
    macro: "#0550ae",
    number: "#0550ae",
  },
};

const STARTING_CODE = `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v;
    
    return 0;
}`;

// Cache for API responses
const apiCache = new Map();
const CACHE_DURATION = 500;

// STL Symbol Database (for reference/documentation)
const STL_CONTAINERS = {
  vector: { icon: "V", color: "#3fb950", header: "#include <vector>" },
  string: { icon: "S", color: "#58a6ff", header: "#include <string>" },
  map: { icon: "M", color: "#d2a8ff", header: "#include <map>" },
  stack: { icon: "Sk", color: "#ffa657", header: "#include <stack>" },
  queue: { icon: "Q", color: "#ff7b72", header: "#include <queue>" },
  set: { icon: "St", color: "#79c0ff", header: "#include <set>" },
  algorithm: { icon: "A", color: "#79c0ff", header: "#include <algorithm>" },
};

// Helper function to call backend API (works in both Electron and cloud)
const callBackendAPI = async (method, ...args) => {
  const isElectron = typeof window !== 'undefined' && window.process && window.process.type;
  if (isElectron && window.api && window.api[method]) {
    return window.api[method](...args);
  }

  const cacheKey = `${method}:${JSON.stringify(args)}`;
  const now = Date.now();
  
  if (apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    } else {
      apiCache.delete(cacheKey);
    }
  }

  const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
  const apiUrl = isDevelopment 
    ? `http://localhost:3001/api/${method}`
    : `/api/${method}`;

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
    } else if (method === 'listWorkspace') {
      const [subpath] = args;
      requestBody = { subpath };
    } else if (method === 'readFile') {
      const [filePath] = args;
      requestBody = { filePath };
    } else if (method === 'writeFile') {
      const [filePath, content] = args;
      requestBody = { filePath, content };
    }

    console.log('[Frontend] 🚀 API Call:', { method, apiUrl, requestBody });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Frontend] 📥 API Response:', data);

    apiCache.set(cacheKey, { data, timestamp: now });
    return data;
  } catch (error) {
    console.error('[Frontend] ❌ API Error:', error);
    
    if (method === 'getSuggestions') {
      return [];
    } else if (method === 'getStats') {
      return { symbolCount: 0, includedLibraries: [] };
    } else if (method === 'runCode') {
      return { success: false, output: 'Backend not available', error: error.message };
    }
    return [];
  }
};

export default function App() {
  // Monaco & Code State
  const [code, setCode] = useState(STARTING_CODE);
  const [currentFile, setCurrentFile] = useState('main.cpp');
  const [files, setFiles] = useState([
    { name: 'main.cpp', content: STARTING_CODE, isActive: true }
  ]);

  // UI Theme & Layout
  const [uiTheme, setUiTheme] = useState('dark');
  const t = THEMES[uiTheme];
  const [activeTab, setActiveTab] = useState('editor'); // editor | search | settings | ai
  const [showAIPanel, setShowAIPanel] = useState(false);

  // Suggestions & Autocomplete
  const [suggestions, setSuggestions] = useState([]);
  const [popupVisible, setPopupVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  // Metrics
  const [symbolCount, setSymbolCount] = useState(0);
  const [latency, setLatency] = useState(0);
  const [includedLibs, setIncludedLibs] = useState([]);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  // Output Panel
  const [outputPanelVisible, setOutputPanelVisible] = useState(false);
  const [outputLoading, setOutputLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [outputResult, setOutputResult] = useState('');
  const [outputError, setOutputError] = useState('');
  const [outputPanelHeight, setOutputPanelHeight] = useState(220);

  // AI Assistant
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Workspace
  const [workspaceTree, setWorkspaceTree] = useState([]);
  const [workspacePath, setWorkspacePath] = useState('');
  const [backendStatus, setBackendStatus] = useState({ healthy: false, message: 'Checking backend...' });

  // Settings
  const [settings, setSettings] = useState({
    minimap: true,
    wordWrap: false,
    lineNumbers: true,
    fontSize: 14,
    theme: 'vs-dark',
    suggestions: true,
  });

  // Refs
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const hiddenFileInputRef = useRef(null);
  const triggerTimeout = useRef(null);
  const syntaxCheckTimeout = useRef(null);
  const cursorUpdateInterval = useRef(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (cursorUpdateInterval.current) clearInterval(cursorUpdateInterval.current);
      if (triggerTimeout.current) clearTimeout(triggerTimeout.current);
      if (syntaxCheckTimeout.current) clearTimeout(syntaxCheckTimeout.current);
    };
  }, []);

  // Monaco Editor Mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    const updateCursorPosition = () => {
      const position = editor.getPosition();
      if (position) {
        setCursorPosition({
          line: position.lineNumber,
          column: position.column
        });
      }
    };
    
    editor.onDidChangeCursorPosition(() => updateCursorPosition());
    editor.onMouseDown(() => setTimeout(updateCursorPosition, 10));
    editor.onKeyDown(() => setTimeout(updateCursorPosition, 10));
    editor.onDidChangeModelContent(() => updateCursorPosition());
    
    updateCursorPosition();
    cursorUpdateInterval.current = setInterval(updateCursorPosition, 200);
    
    // Syntax checking
    editor.onDidChangeModelContent(() => {
      if (syntaxCheckTimeout.current) clearTimeout(syntaxCheckTimeout.current);
      syntaxCheckTimeout.current = setTimeout(() => {
        checkSyntaxErrors(editor, monaco);
      }, 500);
    });
  };

  // Syntax Error Detection
  const checkSyntaxErrors = (editor, monaco) => {
    const model = editor.getModel();
    const code = model.getValue();
    const errors = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Bracket matching
      const openBrackets = (line.match(/\(/g) || []).length;
      const closeBrackets = (line.match(/\)/g) || []).length;
      if (openBrackets !== closeBrackets) {
        let bracketCount = 0;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '(') bracketCount++;
          else if (line[i] === ')') bracketCount--;
          
          if (bracketCount < 0) {
            errors.push({
              startLineNumber: lineNumber,
              startColumn: i + 1,
              endLineNumber: lineNumber,
              endColumn: i + 2,
              message: 'Extra closing parenthesis',
              severity: monaco.MarkerSeverity.Error
            });
            bracketCount = 0;
          }
        }
        
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
    });
    
    monaco.editor.setModelMarkers(model, 'owner', errors);
  };

  // Backend Health Check
  const checkBackendHealth = useCallback(async () => {
    try {
      const response = await fetch('/health');
      if (!response.ok) throw new Error('Backend unreachable');
      setBackendStatus({ healthy: true, message: 'Backend online' });
      if (!workspaceTree.length) {
        await refreshWorkspace('');
      }
      return true;
    } catch (err) {
      setBackendStatus({ healthy: false, message: 'Backend offline' });
      return false;
    }
  }, [workspaceTree.length]);

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 5000);
    return () => clearInterval(interval);
  }, [checkBackendHealth]);

  // Workspace Functions
  const refreshWorkspace = async (subpath = '') => {
    if (!backendStatus.healthy) return;
    try {
      const result = await callBackendAPI('listWorkspace', subpath);
      if (result && result.entries) {
        setWorkspaceTree(result.entries);
        setWorkspacePath(result.path || '');
      }
    } catch (err) {
      console.error('Failed to refresh workspace', err);
    }
  };

  const openFileFromWorkspace = async (filePath) => {
    if (!backendStatus.healthy) return;
    try {
      const result = await callBackendAPI('readFile', filePath);
      if (result && typeof result.content === 'string') {
        setCurrentFile(filePath);
        setCode(result.content);
        setFiles((prev) => {
          const existing = prev.find((f) => f.name === filePath);
          if (existing) {
            return prev.map((f) => (f.name === filePath ? { ...f, content: result.content } : f));
          }
          return [...prev, { name: filePath, content: result.content }];
        });
      }
    } catch (err) {
      console.error('Read file failed:', err);
    }
  };

  const saveFileToWorkspace = async () => {
    if (!backendStatus.healthy) {
      alert('Backend offline, using local download fallback.');
      handleSaveFile();
      return;
    }
    try {
      const result = await callBackendAPI('writeFile', currentFile, code);
      if (result && result.success) {
        alert(`Saved to workspace: ${currentFile}`);
      } else {
        throw new Error(result?.error || 'save failed');
      }
    } catch (err) {
      console.error('writeFile failed', err);
      alert(`Save failed: ${err.message}`);
    }
  };

  // Suggestion Triggering
  const triggerSuggestions = (currentCode) => {
    const editor = editorRef.current;
    if (!editor) {
      setPopupVisible(false);
      return;
    }

    const model = editor.getModel();
    const position = editor.getPosition();
    const lineContent = model.getLineContent(position.lineNumber);
    const beforeCursor = lineContent.substring(0, position.column - 1);

    if (!beforeCursor || beforeCursor.trim().length === 0) {
      setPopupVisible(false);
      return;
    }

    // Dot suggestion
    const dotMatch = beforeCursor.match(/(\w+)\.([a-zA-Z_]*)$/);
    if (dotMatch) {
      const startTime = Date.now();
      const objectName = dotMatch[1];
      const prefix = dotMatch[2];

      if (prefix.length > 0) {
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
      } else {
        setPopupVisible(false);
      }
    } else if (beforeCursor.endsWith('.')) {
      const match = beforeCursor.match(/(\w+)\.$/);
      if (match) {
        const startTime = Date.now();
        const objectName = match[1];

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
    }

    // Stats
    callBackendAPI('getStats', currentCode).then((stats) => {
      setSymbolCount(stats.symbolCount || 0);
      setIncludedLibs(stats.includedLibraries || []);
    }).catch(() => {
      setSymbolCount(0);
      setIncludedLibs([]);
    });
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

  const handleEditorChange = (value) => {
    const newCode = value || '';
    setCode(newCode);
    setFiles(files.map(f =>
      f.name === currentFile ? { ...f, content: newCode } : f
    ));

    if (triggerTimeout.current) {
      clearTimeout(triggerTimeout.current);
    }
    triggerTimeout.current = setTimeout(() => triggerSuggestions(newCode), 200);
  };

  const handleSelectSuggestion = (suggestion) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    const position = editor.getPosition();
    const lineContent = model.getLineContent(position.lineNumber);
    const beforeCursor = lineContent.substring(0, position.column - 1);

    const suggestionText = suggestion.insertText || suggestion.label || suggestion.text || '';
    const dotPos = beforeCursor.lastIndexOf('.');

    if (dotPos >= 0) {
      const range = new monaco.Range(
        position.lineNumber,
        dotPos + 2,
        position.lineNumber,
        position.column
      );
      
      editor.executeEdits('suggestion', [{
        range: range,
        text: suggestionText + '()'
      }]);
      
      const newPosition = {
        lineNumber: position.lineNumber,
        column: dotPos + 2 + suggestionText.length + 1
      };
      editor.setPosition(newPosition);
    } else {
      let startPos = position.column - 1;
      while (startPos > 0 && /[a-zA-Z0-9_]/.test(beforeCursor[startPos - 1])) {
        startPos--;
      }

      const range = new monaco.Range(
        position.lineNumber,
        startPos + 1,
        position.lineNumber,
        position.column
      );

      editor.executeEdits('suggestion', [{
        range: range,
        text: suggestionText
      }]);

      const newPosition = {
        lineNumber: position.lineNumber,
        column: startPos + 1 + suggestionText.length
      };
      editor.setPosition(newPosition);
    }

    setPopupVisible(false);
    editor.focus();
  };

  // Run Code
  const handleRunCode = async () => {
    setOutputLoading(true);
    setIsRunning(true);
    setOutputError('');
    setOutputResult('');
    setOutputPanelVisible(true);

    try {
      const result = await callBackendAPI('runCode', code);
      
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

  // AI Assistant
  const askAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are IntelliCPP, an expert C++ assistant. Answer concisely. Use code blocks.",
          messages: [{ role: "user", content: aiQuery }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map((c) => c.text || "").join("") || "No response.";
      setAiResponse(text);
    } catch (e) {
      setAiResponse("Error contacting AI. Check network and API key.");
    }
    setAiLoading(false);
  };

  // UI Handlers
  const handleKeyDown = (e) => {
    if (popupVisible && suggestions.length > 0) {
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
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 's':
          e.preventDefault();
          handleSaveFile();
          break;
        case 'o':
          e.preventDefault();
          handleOpenFile();
          break;
        case 'n':
          e.preventDefault();
          handleNewFile();
          break;
        case 'j':
          e.preventDefault();
          setShowAIPanel(!showAIPanel);
          break;
        default:
          break;
      }
    } else if (e.key === 'F5') {
      e.preventDefault();
      if (!isRunning) handleRunCode();
    } else if (e.key === 'F6') {
      e.preventDefault();
      if (isRunning) handleStopExecution();
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

  const handleNewFile = () => {
    const fileName = prompt('Enter file name (with .cpp extension):');
    if (fileName) {
      const newFile = {
        name: fileName,
        content: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from ${fileName}!" << endl;
    return 0;
}`,
        isActive: true
      };
      setFiles(files.map(f => ({ ...f, isActive: false })).concat(newFile));
      setCurrentFile(fileName);
      setCode(newFile.content);
    }
  };

  const handleSaveFile = () => {
    const currentFileData = files.find((f) => f.name === currentFile);
    if (currentFileData) {
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentFile;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      alert(`File ${currentFile} saved successfully!`);
    }
  };

  const handleOpenFile = async () => {
    const health = await checkBackendHealth();
    if (health && backendStatus.healthy) {
      await refreshWorkspace('');
      return;
    }

    if (hiddenFileInputRef.current) {
      hiddenFileInputRef.current.click();
    }
  };

  const handleFileInputChange = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const loadedFiles = await Promise.all(selectedFiles.map((file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            type: 'file',
            content: reader.result || ''
          });
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
    }));

    setFiles((prevFiles) => {
      const nextFiles = [...prevFiles];
      loadedFiles.forEach((file) => {
        const existing = nextFiles.find((f) => f.name === file.name);
        if (existing) {
          existing.content = file.content;
        } else {
          nextFiles.push(file);
        }
      });
      return nextFiles;
    });

    if (loadedFiles[0]) {
      setCurrentFile(loadedFiles[0].name);
      setCode(loadedFiles[0].content);
    }

    event.target.value = '';
  };

  const handleToggleMinimap = () => {
    const newSettings = { ...settings, minimap: !settings.minimap };
    setSettings(newSettings);
    if (editorRef.current) {
      editorRef.current.updateOptions({
        minimap: { enabled: newSettings.minimap }
      });
    }
  };

  const handleToggleWordWrap = () => {
    const newSettings = { ...settings, wordWrap: !settings.wordWrap };
    setSettings(newSettings);
    if (editorRef.current) {
      editorRef.current.updateOptions({
        wordWrap: newSettings.wordWrap ? 'on' : 'off'
      });
    }
  };

  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: 'inherit' }} onKeyDown={handleKeyDown}>
      <input
        ref={hiddenFileInputRef}
        type="file"
        webkitdirectory="true"
        directory="true"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Header */}
      <div style={{
        background: t.surface,
        borderBottom: `1px solid ${t.border}`,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, #58a6ff, #3fb950)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700,
          }}>⚡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>IntelliCPP</div>
            <div style={{ fontSize: 11, color: t.textMuted }}>C++ IntelliSense Engine</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="toolbar-button-primary"
            onClick={handleRunCode}
            disabled={outputLoading}
            title="Run Code (F5)"
            style={{
              background: t.accent, color: '#fff', border: 'none', borderRadius: 6,
              padding: '8px 14px', cursor: outputLoading ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Play size={14} /> Run
          </button>
          <button
            style={{
              background: t.card, border: `1px solid ${t.border}`, borderRadius: 6,
              padding: '6px 12px', color: t.text, cursor: 'pointer', fontSize: 13,
            }}
            onClick={handleFormatCode}
            title="Format Code"
          >
            <Code size={14} />
          </button>
          <button
            onClick={() => setUiTheme(uiTheme === 'dark' ? 'light' : 'dark')}
            style={{
              background: t.card, border: `1px solid ${t.border}`, borderRadius: 6,
              padding: '6px 12px', color: t.text, cursor: 'pointer', fontSize: 13,
            }}
          >{uiTheme === 'dark' ? '☀ Light' : '🌙 Dark'}</button>
          <div style={{ marginRight: 12, color: backendStatus.healthy ? t.green : t.red, fontSize: '12px' }}>
            {backendStatus.message}
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div style={{
        background: t.surface,
        borderBottom: `1px solid ${t.border}`,
        padding: '8px 24px',
        display: 'flex', gap: 24, alignItems: 'center',
        fontSize: 12, color: t.textMuted,
      }}>
        {[
          { label: "Symbols", val: symbolCount },
          { label: "Libraries", val: includedLibs.length },
          { label: "Latency", val: latency ? `${latency}ms` : "—" },
          { label: "Cursor", val: `${cursorPosition.line}:${cursorPosition.column}` },
        ].map((m) => (
          <div key={m.label} style={{ display: 'flex', gap: 6 }}>
            <span style={{ color: t.textDim }}>{m.label}:</span>
            <span style={{ color: t.accent, fontWeight: 600, fontFamily: 'monospace' }}>{m.val}</span>
          </div>
        ))}
      </div>

      {/* File Tabs */}
      <div style={{
        background: t.surface,
        borderBottom: `1px solid ${t.border}`,
        padding: '0 12px',
        display: 'flex',
        gap: 4,
        overflowX: 'auto',
      }}>
        {files.map((file) => (
          <div
            key={file.name}
            onClick={() => {
              setCurrentFile(file.name);
              setCode(file.content);
            }}
            style={{
              padding: '8px 12px',
              borderBottom: currentFile === file.name ? `2px solid ${t.accent}` : 'none',
              color: currentFile === file.name ? t.accent : t.textMuted,
              cursor: 'pointer',
              fontSize: 13,
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 40,
              whiteSpace: 'nowrap',
            }}
          >
            <span>{file.name}</span>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: t.textMuted,
                cursor: 'pointer',
                padding: 0,
                fontSize: 12,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setFiles(files.filter((f) => f.name !== file.name));
                if (currentFile === file.name) {
                  const nextFile = files.find((f) => f.name !== file.name);
                  if (nextFile) {
                    setCurrentFile(nextFile.name);
                    setCode(nextFile.content);
                  }
                }
              }}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={handleNewFile}
          style={{
            background: 'none',
            border: 'none',
            color: t.textMuted,
            cursor: 'pointer',
            padding: '8px 12px',
            fontSize: 12,
            minHeight: 40,
            display: 'flex',
            alignItems: 'center',
          }}
          title="New File"
        >
          +
        </button>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'flex', height: 'calc(100vh - 152px)', overflow: 'hidden' }}>
        {/* Editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Editor
            height="100%"
            defaultLanguage="cpp"
            value={code}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            theme={uiTheme === 'dark' ? 'vs-dark' : 'vs-light'}
            options={{
              minimap: { enabled: settings.minimap },
              fontSize: settings.fontSize,
              lineHeight: 24,
              fontFamily: 'JetBrains Mono, "Fira Code", "Cascadia Code", Consolas, monospace',
              fontLigatures: true,
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
              formatOnPaste: true,
              formatOnType: true,
              wordWrap: settings.wordWrap ? 'on' : 'off',
              lineNumbers: settings.lineNumbers ? 'on' : 'off',
              scrollBeyondLastLine: false,
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true, indentation: true },
              padding: { top: 20, bottom: 20 },
              automaticLayout: true,
              renderLineHighlight: 'line',
            }}
          />

          {popupVisible && suggestions.length > 0 && (
            <div
              style={{
                position: 'fixed',
                top: `${popupPosition.top}px`,
                left: `${popupPosition.left}px`,
                zIndex: 1000
              }}
            >
              <SuggestionPopup
                suggestions={suggestions}
                selectedIndex={selectedIndex}
                onSelect={handleSelectSuggestion}
              />
            </div>
          )}
        </div>

        {/* AI Panel (Right Side) */}
        {showAIPanel && (
          <div style={{
            width: 320,
            background: t.surface,
            borderLeft: `1px solid ${t.border}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${t.border}`,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span>🤖 AI Assistant</span>
              <button
                onClick={() => setShowAIPanel(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: t.textMuted,
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {aiResponse && (
                <div style={{
                  background: t.card,
                  border: `1px solid ${t.border}`,
                  borderRadius: 6,
                  padding: '10px 12px',
                  fontSize: 12,
                  color: t.text,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  marginBottom: 12,
                }}>
                  {aiResponse}
                </div>
              )}
              {!aiResponse && !aiLoading && (
                <div style={{ color: t.textDim, textAlign: 'center', marginTop: 20, fontSize: 12 }}>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>🤖</div>
                  <div>Ask me anything about C++!</div>
                </div>
              )}
              {aiLoading && (
                <div style={{ color: t.accent, textAlign: 'center', marginTop: 20 }}>
                  <div style={{ fontSize: 18, marginBottom: 8 }}>⚡</div>
                  Generating...
                </div>
              )}
            </div>
            <div style={{
              padding: '8px',
              borderTop: `1px solid ${t.border}`,
              display: 'flex',
              gap: 6,
              background: t.surface,
              flexShrink: 0,
            }}>
              <input
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && askAI()}
                placeholder="Ask about C++..."
                style={{
                  flex: 1,
                  background: t.card,
                  border: `1px solid ${t.border}`,
                  borderRadius: 6,
                  padding: '6px 8px',
                  color: t.text,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  outline: 'none',
                }}
              />
              <button
                onClick={askAI}
                disabled={aiLoading}
                style={{
                  background: t.accent,
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 10px',
                  color: '#fff',
                  cursor: aiLoading ? 'not-allowed' : 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  opacity: aiLoading ? 0.6 : 1,
                }}
              >
                {aiLoading ? '…' : '→'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Output Panel */}
      {outputPanelVisible && (
        <OutputPanel
          output={outputResult}
          isLoading={outputLoading}
          error={outputError}
          onClear={handleClearOutput}
          isVisible={outputPanelVisible}
          minHeight={100}
          maxHeight={500}
          height={outputPanelHeight}
        />
      )}

      {/* Status Bar */}
      <StatusBar
        symbolCount={symbolCount}
        latency={latency}
        includedLibs={includedLibs}
        cursorPosition={cursorPosition}
      />
    </div>
  );
}
