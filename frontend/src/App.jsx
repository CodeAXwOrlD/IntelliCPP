import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { Play, Code, Plus, Save, Upload } from 'lucide-react';
import SuggestionPopup from './components/SuggestionPopup';
import './styles/glassmorphism.css';

// ─────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: '#0d1117', surface: '#161b22', card: '#1c2230',
    border: '#30363d', accent: '#58a6ff', accentGlow: '#1f6feb33',
    text: '#e6edf3', textMuted: '#8b949e', textDim: '#484f58',
    green: '#3fb950', red: '#f85149', orange: '#d29922',
  },
  light: {
    bg: '#f6f8fa', surface: '#ffffff', card: '#f1f5f9',
    border: '#d0d7de', accent: '#0969da', accentGlow: '#0969da22',
    text: '#1f2328', textMuted: '#656d76', textDim: '#9198a1',
    green: '#1a7f37', red: '#cf222e', orange: '#9a6700',
  },
};

// ─────────────────────────────────────────────
// DEFAULT CODE
// ─────────────────────────────────────────────
const DEFAULT_CODE = `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v = {3, 1, 4, 1, 5};
    
    // Try typing v.  to see vector suggestions
    // Add #include <map> to get map suggestions
    
    cout << "Hello, IntelliCPP!" << endl;
    return 0;
}`;

// ─────────────────────────────────────────────
// API HELPER
// Always points to local backend on port 3001.
// No Electron, no Vercel serverless.
// ─────────────────────────────────────────────
const API_BASE = 'http://localhost:3001/api';

// Small cache so rapid identical calls don't spam backend
const cache = new Map();

async function callAPI(endpoint, body) {
  const key = endpoint + JSON.stringify(body);
  const now = Date.now();
  if (cache.has(key)) {
    const { data, ts } = cache.get(key);
    if (now - ts < 300) return data; // 300ms cache
    cache.delete(key);
  }
  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    cache.set(key, { data, ts: now });
    return data;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  // Theme
  const [uiTheme, setUiTheme] = useState('dark');
  const t = THEMES[uiTheme];

  // Files / tabs
  const [files, setFiles] = useState([{ id: 1, name: 'main.cpp', content: DEFAULT_CODE, dirty: false }]);
  const [activeFileId, setActiveFileId] = useState(1);
  const nextId = useRef(2);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const code = activeFile?.content || '';

  // Editor refs
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [popupVisible, setPopupVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const triggerTimer = useRef(null);
  const popupVisibleRef = useRef(false);
  const suggestionsRef = useRef([]);
  const selectedIndexRef = useRef(0);

  // Output panel
  const [outputVisible, setOutputVisible] = useState(false);
  const [outputResult, setOutputResult] = useState('');
  const [outputError, setOutputError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [outputHeight, setOutputHeight] = useState(220);
  const [outputMinimized, setOutputMinimized] = useState(false);
  const [outputMaximized, setOutputMaximized] = useState(false);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartH = useRef(0);

  // Status bar
  const [latency, setLatency] = useState(0);
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [includedLibs, setIncludedLibs] = useState([]);
  const [backendOk, setBackendOk] = useState(false);

  // Settings
  const [settings, setSettings] = useState({ minimap: true, wordWrap: false, fontSize: 14 });

  const hiddenInput = useRef(null);

  // ─── Backend health check ───
  useEffect(() => {
    const check = () =>
      fetch('http://localhost:3001/health')
        .then(r => setBackendOk(r.ok))
        .catch(() => setBackendOk(false));
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { popupVisibleRef.current = popupVisible; }, [popupVisible]);
  useEffect(() => { suggestionsRef.current = suggestions; }, [suggestions]);
  useEffect(() => { selectedIndexRef.current = selectedIndex; }, [selectedIndex]);

  // ─── Editor mount ───
  const onEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.onDidChangeCursorPosition(() => {
      const p = editor.getPosition();
      if (p) setCursorPos({ line: p.lineNumber, column: p.column });
    });
    editor.onKeyDown((event) => {
      const key = event.browserEvent.key;
      if (!popupVisibleRef.current || suggestionsRef.current.length === 0) return;
      if (key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex(i => Math.min(i + 1, suggestionsRef.current.length - 1));
        return;
      }
      if (key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (key === 'Tab' || key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        acceptSuggestion(suggestionsRef.current[selectedIndexRef.current]);
        return;
      }
      if (key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setPopupVisible(false);
        return;
      }
    });
  };

  // ─── Code change ───
  const onCodeChange = (value) => {
    const newCode = value || '';
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: newCode, dirty: true } : f));
    if (triggerTimer.current) clearTimeout(triggerTimer.current);
    triggerTimer.current = setTimeout(() => triggerSuggestions(newCode), 180);
  };

  // ─── Suggestion trigger ───
  const triggerSuggestions = async (currentCode) => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    const position = editor.getPosition();
    if (!model || !position) return;

    const lineContent = model.getLineContent(position.lineNumber);
    const beforeCursor = lineContent.substring(0, position.column - 1);
    const trimmedLine = lineContent.trim();

    // ── TRIGGER 1: Inside #include <...>
    // Detects: #include <st  OR  #include "st
    const includeMatch = beforeCursor.match(/#include\s*[<"]\s*([a-zA-Z0-9_/]*)$/);
    if (includeMatch) {
      const prefix = includeMatch[1];
      await fetchSuggestions(prefix, 'include_header', currentCode, position);
      return;
    }

    // ── TRIGGER 2: After a dot — member method suggestions
    // Detects: myObj.prefix  OR  myObj.
    const dotWithPrefix = beforeCursor.match(/(\w+)\.(\w*)$/);
    if (dotWithPrefix) {
      const objectName = dotWithPrefix[1];
      const prefix = dotWithPrefix[2];
      await fetchSuggestions(prefix, objectName, currentCode, position);
      return;
    }

    // ── TRIGGER 3: Inside template angle brackets
    // Detects: vector<i  OR  map<int,  OR  stack
    const templateMatch = beforeCursor.match(/\b([a-zA-Z_]\w*)\s*<([a-zA-Z0-9_,\s]*)$/);
    if (templateMatch && !beforeCursor.includes('>')) {
      const inner = templateMatch[2];
      const parts = inner.split(',');
      const prefix = parts[parts.length - 1].trim();
      await fetchSuggestions(prefix, 'template_arg', currentCode, position);
      return;
    }

    // ── TRIGGER 4: Typing an identifier in code (global context)
    // Detects: typing "st" → suggests stack, string, set, STL types, keywords
    // Only trigger after 2+ chars to avoid noise
    const identMatch = beforeCursor.match(/\b([a-zA-Z_]\w*)$/);
    if (identMatch && identMatch[1].length >= 2) {
      const prefix = identMatch[1];
      if (!beforeCursor.includes('.')) {
        await fetchSuggestions(prefix, 'global', currentCode, position);
        return;
      }
    }

    // ── TRIGGER 5: Right after typing a dot with nothing after
    const justDot = beforeCursor.match(/(\w+)\.$/);
    if (justDot) {
      await fetchSuggestions('', justDot[1], currentCode, position);
      return;
    }

    setPopupVisible(false);

    callAPI('getStats', { code: currentCode }).then(stats => {
      if (stats) setIncludedLibs(stats.includedLibraries || []);
    });
  };

  const fetchSuggestions = async (prefix, contextType, currentCode, position) => {
    const start = Date.now();
    const data = await callAPI('getSuggestions', { prefix, contextType, code: currentCode, cursorPosition: position.column });
    const elapsed = Date.now() - start;
    setLatency(elapsed);

    const results = Array.isArray(data) ? data : [];
    setSuggestions(results);
    setSelectedIndex(0);
    setPopupVisible(results.length > 0);

    if (results.length > 0) {
      setPopupPos(calcPopupPos(position));
    }

    // Update stats
    callAPI('getStats', { code: currentCode }).then(stats => {
      if (stats) setIncludedLibs(stats.includedLibraries || []);
    });
  };

  const calcPopupPos = (position) => {
    const editor = editorRef.current;
    if (!editor) return { top: 0, left: 0 };
    try {
      const domNode = editor.getDomNode();
      const coords = editor.getScrolledVisiblePosition(position);
      if (!coords) return { top: 0, left: 0 };
      const popupWidth = 240;
      const editorRect = domNode.getBoundingClientRect();
      const maxTop = Math.max(0, editorRect.height - 28);
      const maxLeft = Math.max(0, editorRect.width - popupWidth - 16);
      return {
        top: Math.min(coords.top + 18, maxTop),
        left: Math.min(coords.left, maxLeft),
      };
    } catch { return { top: 0, left: 0 }; }
  };

  // ─── Accept suggestion ───
  const acceptSuggestion = useCallback((suggestion) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !suggestion) return;

    const model = editor.getModel();
    const position = editor.getPosition();
    const lineContent = model.getLineContent(position.lineNumber);
    const beforeCursor = lineContent.substring(0, position.column - 1);
    const dotPos = beforeCursor.lastIndexOf('.');

    const text = suggestion.text || suggestion.label || '';
    // Add () for methods that take parameters
    const isFnLike = suggestion.type === 'method' && suggestion.sig && suggestion.sig.includes('(') && !suggestion.sig.endsWith('()');
    const insertText = isFnLike ? text + '()' : text;

    if (dotPos >= 0) {
      const range = new monaco.Range(position.lineNumber, dotPos + 2, position.lineNumber, position.column);
      editor.executeEdits('intellicpp', [{ range, text: insertText }]);
      const newCol = dotPos + 2 + insertText.length;
      // Move cursor inside parens if method
      if (isFnLike) {
        editor.setPosition({ lineNumber: position.lineNumber, column: newCol - 1 });
      } else {
        editor.setPosition({ lineNumber: position.lineNumber, column: newCol });
      }
    } else {
      // keyword/global insert
      let start = position.column - 1;
      while (start > 0 && /\w/.test(beforeCursor[start - 1])) start--;
      const range = new monaco.Range(position.lineNumber, start + 1, position.lineNumber, position.column);
      editor.executeEdits('intellicpp', [{ range, text }]);
      editor.setPosition({ lineNumber: position.lineNumber, column: start + 1 + text.length });
    }

    setPopupVisible(false);
    editor.focus();
  }, []);

  // ─── Run code ───
  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setOutputResult('');
    setOutputError('');
    setOutputVisible(true);
    setOutputMinimized(false);

    const result = await callAPI('runCode', { code });
    setIsRunning(false);

    if (!result) {
      setOutputError('Backend unreachable. Is the server running on port 3001?');
      return;
    }
    if (result.success) {
      setOutputResult(result.output || '(no output)');
      setOutputError(result.error || '');
    } else {
      setOutputError(result.error || 'Unknown error');
      setOutputResult(result.output || '');
    }
  }, [code]);

  // ─── File operations ───
  const handleNewFile = useCallback(() => {
    const name = `untitled-${nextId.current}.cpp`;
    const newFile = {
      id: nextId.current++,
      name,
      content: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello!" << endl;\n    return 0;\n}\n`,
      dirty: false,
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  }, []);

  const handleSave = useCallback(() => {
    if (!activeFile) return;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, dirty: false } : f));
  }, [activeFile, activeFileId, code]);

  const handleOpenFile = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const id = nextId.current++;
        setFiles(prev => [...prev, { id, name: file.name, content: reader.result, dirty: false }]);
        setActiveFileId(id);
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  const handleCloseFile = (fileId) => {
    setFiles(prev => {
      const next = prev.filter(f => f.id !== fileId);
      if (next.length === 0) {
        const newFile = { id: nextId.current++, name: 'main.cpp', content: DEFAULT_CODE, dirty: false };
        setActiveFileId(newFile.id);
        return [newFile];
      }
      if (activeFileId === fileId) setActiveFileId(next[next.length - 1].id);
      return next;
    });
  };

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const onKey = (e) => {
      if (popupVisible && suggestions.length > 0) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1)); return; }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); return; }
        if (e.key === 'Escape')    { e.preventDefault(); setPopupVisible(false); return; }
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') { e.preventDefault(); handleSave(); }
        if (e.key === 'n') { e.preventDefault(); handleNewFile(); }
        if (e.key === 'o') { e.preventDefault(); hiddenInput.current?.click(); }
        if (e.key === '`') { e.preventDefault(); setOutputVisible(v => !v); }
      }
      if (e.key === 'F5') { e.preventDefault(); if (!isRunning) handleRun(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [popupVisible, suggestions, isRunning, handleSave, handleNewFile, handleRun]);

  const onEditorKeyDown = (editorEvent) => {
    if (!popupVisible || suggestions.length === 0) return;
    const key = editorEvent.event.browserEvent.key;
    if (key === 'ArrowDown') {
      editorEvent.event.preventDefault();
      editorEvent.event.stopPropagation();
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (key === 'ArrowUp') {
      editorEvent.event.preventDefault();
      editorEvent.event.stopPropagation();
      setSelectedIndex(i => Math.max(i - 1, 0));
      return;
    }
    if (key === 'Tab' || key === 'Enter') {
      editorEvent.event.preventDefault();
      editorEvent.event.stopPropagation();
      acceptSuggestion(suggestions[selectedIndex]);
      return;
    }
    if (key === 'Escape') {
      editorEvent.event.preventDefault();
      editorEvent.event.stopPropagation();
      setPopupVisible(false);
      return;
    }
  };

  // ─── Output resize (drag) ───
  const onDragStart = (e) => {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartH.current = outputHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      const delta = dragStartY.current - e.clientY;
      const newH = Math.min(Math.max(dragStartH.current + delta, 80), Math.floor(window.innerHeight * 0.6));
      setOutputHeight(newH);
      setOutputMinimized(false);
      setOutputMaximized(newH >= Math.floor(window.innerHeight * 0.58));
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [outputHeight]);

  const handleMinimize = () => { setOutputMinimized(true); setOutputMaximized(false); };
  const handleMaximize = () => {
    if (outputMaximized) {
      setOutputHeight(220); setOutputMaximized(false);
    } else {
      setOutputHeight(Math.floor(window.innerHeight * 0.6)); setOutputMaximized(true);
    }
    setOutputMinimized(false);
  };

  const formatCode = () => editorRef.current?.getAction('editor.action.formatDocument')?.run();

  return (
    <div style={{ height: '100vh', minHeight: '100vh', background: t.bg, color: t.text, fontFamily: "'Segoe UI', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Hidden file input */}
      <input ref={hiddenInput} type="file" accept=".cpp,.h,.hpp,.cc,.cxx,.c,.txt" multiple style={{ display: 'none' }} onChange={handleOpenFile} />

      {/* ─── Header ─── */}
      <div style={{ height: 56, background: t.surface, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 200 }}>
        {/* Left: Logo + file buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg,#58a6ff,#3fb950)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.3px' }}>IntelliCPP</span>
          </div>
          <div style={{ width: 1, height: 20, background: t.border }} />
          <ToolBtn icon={<Plus size={14} />} label="New (Ctrl+N)" onClick={handleNewFile} t={t} />
          <ToolBtn icon={<Upload size={14} />} label="Open (Ctrl+O)" onClick={() => hiddenInput.current?.click()} t={t} />
          <ToolBtn icon={<Save size={14} />} label="Save (Ctrl+S)" onClick={handleSave} t={t} />
          <ToolBtn icon={<Code size={14} />} label="Format" onClick={formatCode} t={t} />
        </div>

        {/* Right: Run, theme, backend status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleRun}
            disabled={isRunning}
            title="Run (F5)"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: isRunning ? t.card : t.accent, color: isRunning ? t.textMuted : '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: isRunning ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <Play size={13} /> {isRunning ? 'Running…' : 'Run'}
          </button>
          <button
            onClick={() => setUiTheme(uiTheme === 'dark' ? 'light' : 'dark')}
            style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 6, padding: '6px 10px', color: t.text, cursor: 'pointer', fontSize: 12 }}
          >{uiTheme === 'dark' ? '☀' : '🌙'}</button>
          <div style={{ fontSize: 11, color: backendOk ? t.green : t.red, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: backendOk ? t.green : t.red, display: 'inline-block' }} />
            {backendOk ? 'Backend online' : 'Backend offline'}
          </div>
        </div>
      </div>

      {/* ─── Metrics bar ─── */}
      <div style={{ height: 36, background: t.surface, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 20, fontSize: 11, color: t.textMuted, flexShrink: 0 }}>
        <MetricItem label="Headers" value={includedLibs.length ? includedLibs.join(', ') : 'none'} accent={t.accent} dim={t.textDim} />
        <MetricItem label="Latency" value={latency ? `${latency}ms` : '—'} accent={t.accent} dim={t.textDim} />
        <MetricItem label="Cursor" value={`${cursorPos.line}:${cursorPos.column}`} accent={t.accent} dim={t.textDim} />
        <MetricItem label="Engine" value="Trie O(L)" accent={t.green} dim={t.textDim} />
        <span style={{ fontSize: 10, color: t.textDim }}>Ctrl+` toggles terminal · F5 runs</span>
      </div>

      {/* ─── File tabs ─── */}
      <div style={{ height: 40, background: t.surface, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 2, overflowX: 'auto', flexShrink: 0 }}>
        {files.map(file => (
          <div
            key={file.id}
            onClick={() => setActiveFileId(file.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 4,
              background: file.id === activeFileId ? t.card : 'transparent',
              border: `1px solid ${file.id === activeFileId ? t.border : 'transparent'}`,
              color: file.id === activeFileId ? t.text : t.textMuted,
              cursor: 'pointer', fontSize: 12, userSelect: 'none', whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 10, color: file.name.endsWith('.cpp') || file.name.endsWith('.h') ? t.accent : t.textMuted }}>◈</span>
            <span>{file.name}{file.dirty ? ' ●' : ''}</span>
            <button
              onClick={e => { e.stopPropagation(); handleCloseFile(file.id); }}
              style={{ background: 'none', border: 'none', color: t.textDim, cursor: 'pointer', padding: '0 2px', fontSize: 11, lineHeight: 1 }}
            >✕</button>
          </div>
        ))}
        <button onClick={handleNewFile} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: '4px 8px', fontSize: 16, lineHeight: 1 }} title="New file">+</button>
      </div>

      {/* ─── Editor ─── */}
      <div style={{ flex: 1, minHeight: 320, minWidth: 0, position: 'relative', overflow: 'hidden', zIndex: 1 }}>
        <Editor
          height="100%"
          language="cpp"
          value={code}
          onChange={onCodeChange}
          onMount={onEditorMount}
          theme={uiTheme === 'dark' ? 'vs-dark' : 'vs-light'}
          options={{
            fontSize: settings.fontSize,
            fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
            fontLigatures: true,
            minimap: { enabled: settings.minimap },
            wordWrap: settings.wordWrap ? 'on' : 'off',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            formatOnPaste: true,
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            padding: { top: 16, bottom: 16 },
            automaticLayout: true,
            renderLineHighlight: 'line',
            // Disable built-in C++ completions to avoid conflict with our popup
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            wordBasedSuggestions: 'off',
            parameterHints: { enabled: false },
          }}
        />

        {/* Suggestion popup */}
        {popupVisible && suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: popupPos.top, left: popupPos.left, zIndex: 10 }}>
            <SuggestionPopup
              suggestions={suggestions}
              selectedIndex={selectedIndex}
              onSelect={acceptSuggestion}
              theme={t}
            />
          </div>
        )}
      </div>

      {/* ─── Output Panel ─── */}
      {outputVisible && (
        <div style={{ flexShrink: 0 }}>
          {/* Drag handle */}
          <div
            onMouseDown={onDragStart}
            style={{ height: 6, background: t.border, cursor: 'row-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Drag to resize"
          >
            <div style={{ width: 40, height: 2, borderRadius: 2, background: t.textDim }} />
          </div>

          <div style={{ height: outputMinimized ? 30 : outputHeight, background: '#0d0d0d', borderTop: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Terminal header */}
            <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', borderBottom: `1px solid #222`, flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>OUTPUT TERMINAL</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <SmallBtn title="Minimize" onClick={handleMinimize} color="#888">▼</SmallBtn>
                <SmallBtn title={outputMaximized ? 'Restore' : 'Maximize'} onClick={handleMaximize} color="#888">{outputMaximized ? '◆' : '▲'}</SmallBtn>
                <SmallBtn title="Clear" onClick={() => { setOutputResult(''); setOutputError(''); }} color="#888">✕</SmallBtn>
                <SmallBtn title="Close" onClick={() => setOutputVisible(false)} color="#f85149">×</SmallBtn>
              </div>
            </div>

            {/* Terminal content */}
            {!outputMinimized && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', fontFamily: '"JetBrains Mono", monospace', fontSize: 12, lineHeight: 1.6 }}>
                {isRunning && <div style={{ color: '#58a6ff' }}>▶ Compiling and running…</div>}
                {!isRunning && !outputResult && !outputError && (
                  <div style={{ color: '#484f58' }}>▶ IntelliCPP v2.0 ready. Press F5 or click Run to execute code.</div>
                )}
                {outputResult && (
                  <div style={{ color: '#3fb950', whiteSpace: 'pre-wrap' }}>{outputResult}</div>
                )}
                {outputError && (
                  <div style={{ color: '#f85149', whiteSpace: 'pre-wrap', marginTop: outputResult ? 8 : 0 }}>
                    {outputError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Status bar ─── */}
      <div style={{ height: 22, background: uiTheme === 'dark' ? '#1f6feb' : '#0969da', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#fff', alignItems: 'center' }}>
          <span>⚡ IntelliCPP</span>
          <span>C++ 20</span>
          <span>UTF-8</span>
          {latency > 0 && <span>{latency}ms</span>}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#fff', alignItems: 'center' }}>
          <span
            style={{ cursor: 'pointer' }}
            onClick={() => setSettings(s => ({ ...s, minimap: !s.minimap }))}
          >{settings.minimap ? 'Minimap On' : 'Minimap Off'}</span>
          <span
            style={{ cursor: 'pointer' }}
            onClick={() => setSettings(s => ({ ...s, wordWrap: !s.wordWrap }))}
          >{settings.wordWrap ? 'Wrap On' : 'Wrap Off'}</span>
          <span>Ln {cursorPos.line}, Col {cursorPos.column}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Small reusable components ───
function ToolBtn({ icon, label, onClick, t }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${t.border}`, borderRadius: 5, padding: '5px 9px', color: t.textMuted, cursor: 'pointer', fontSize: 12 }}
    >
      {icon}
    </button>
  );
}

function MetricItem({ label, value, accent, dim }) {
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      <span style={{ color: dim }}>{label}:</span>
      <span style={{ color: accent, fontFamily: 'monospace', fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

function SmallBtn({ children, onClick, title, color }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ background: 'none', border: 'none', color: color || '#888', cursor: 'pointer', padding: '2px 5px', fontSize: 11, borderRadius: 3 }}
    >{children}</button>
  );
}
