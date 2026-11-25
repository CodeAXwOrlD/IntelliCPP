import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useEditor } from './EditorContext';

const EngineContext = createContext(null);
const API_BASE = process.env.REACT_APP_API_BASE || '/api';

/**
 * Parse compiler/runtime stderr into structured diagnostics for Monaco markers & Problems tab.
 */
function parseDiagnostics(errorText, languageId) {
  if (!errorText) return [];
  const diagnostics = [];
  const lines = errorText.split('\n');

  for (const line of lines) {
    // GCC / Clang: file.cpp:12:5: error: expected ';' before '}' token
    if (languageId === 'cpp') {
      const match = line.match(/:(\d+):(\d+):\s+(error|warning|note):\s+(.+)$/);
      if (match) {
        diagnostics.push({
          line: parseInt(match[1], 10),
          column: parseInt(match[2], 10),
          severity: match[3] === 'warning' ? 'warning' : match[3] === 'note' ? 'info' : 'error',
          message: match[4].trim()
        });
      }
    } else if (languageId === 'python') {
      // Python: File "...", line 4
      const match = line.match(/File\s+"[^"]+",\s+line\s+(\d+)/);
      if (match) {
        diagnostics.push({
          line: parseInt(match[1], 10),
          column: 1,
          severity: 'error',
          message: lines[lines.length - 1] || 'Python runtime/syntax error'
        });
      }
    } else if (languageId === 'rust') {
      // Rust: --> main.rs:4:5
      const match = line.match(/-->\s+[^:]+:(\d+):(\d+)/);
      if (match) {
        diagnostics.push({
          line: parseInt(match[1], 10),
          column: parseInt(match[2], 10),
          severity: 'error',
          message: errorText.split('\n')[0] || 'Rust compiler error'
        });
      }
    }
  }
  return diagnostics;
}

export function EngineProvider({ children }) {
  const { activeFile, activeLanguage, cursorPos, setIsTerminalOpen } = useEditor();

  // Real Engine Telemetry (populated from /health and actual API calls)
  const [latency, setLatency] = useState(null);
  const [symbolCount, setSymbolCount] = useState(null);
  const [cacheHitRate, setCacheHitRate] = useState(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Execution & I/O state
  const [isRunning, setIsRunning] = useState(false);
  const [stdinInput, setStdinInput] = useState('');
  const [terminalActiveTab, setTerminalActiveTab] = useState('io');
  const [diagnostics, setDiagnostics] = useState([]);
  const [lastRunResult, setLastRunResult] = useState({
    status: 'idle', // 'idle' | 'running' | 'success' | 'error'
    stdout: '',
    stderr: '',
    exitCode: null,
    durationMs: null
  });

  // Autocomplete Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [astTokens, setAstTokens] = useState([]);

  // Backend Health & Real Telemetry Polling
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
        if (res.ok) {
          setIsBackendConnected(true);
          const data = await res.json().catch(() => null);
          if (data?.cache?.suggestions?.hitRate !== undefined) {
            setCacheHitRate(parseFloat(data.cache.suggestions.hitRate));
          }
          if (typeof data?.totalSymbols === 'number') {
            setSymbolCount(data.totalSymbols);
          }
        } else {
          setIsBackendConnected(false);
        }
      } catch {
        setIsBackendConnected(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Real-time AST Tokenizer & Symbol Extractor
  useEffect(() => {
    if (!activeFile?.content) return;
    const content = activeFile.content;

    const regex = /\b(?:int|float|double|char|string|auto|void|class|struct|def|fn|let|const|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const tokens = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[1] && !tokens.includes(match[1])) {
        tokens.push(match[1]);
      }
    }
    setAstTokens(tokens);
  }, [activeFile?.content]);

  // Live Token at Cursor Position
  const activeWord = (() => {
    if (!activeFile?.content || !cursorPos) return '';
    const lines = activeFile.content.split('\n');
    const line = lines[cursorPos.line - 1] || '';
    const textBefore = line.slice(0, cursorPos.column - 1);
    const match = textBefore.match(/([a-zA-Z0-9_]+)$/);
    return match ? match[1] : '';
  })();

  // Query Autocomplete Suggestions from API or fallback to local symbols
  const querySuggestions = useCallback(async (prefix, line, column) => {
    if (!prefix || prefix.length < 1) {
      setSuggestions([]);
      return;
    }

    const startTime = performance.now();
    setIsSuggesting(true);

    try {
      const localBuiltins = activeLanguage.builtinSymbols || [];
      const matchedBuiltins = localBuiltins.filter(s =>
        s.name.toLowerCase().includes(prefix.toLowerCase())
      );

      const matchedAst = astTokens
        .filter(t => t.toLowerCase().startsWith(prefix.toLowerCase()))
        .map(name => ({
          name,
          type: 'variable',
          detail: 'User Identifier (Local Scope)',
          complexity: 'Local'
        }));

      let combined = [...matchedBuiltins, ...matchedAst];

      try {
        const res = await fetch(`${API_BASE}/getSuggestions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: activeFile?.content || '',
            prefix,
            line,
            column,
            language: activeLanguage.id
          })
        });

        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data?.suggestions;
          if (Array.isArray(list)) {
            const apiSuggestions = list.map(item =>
              typeof item === 'string'
                ? { name: item, type: 'stl', detail: 'STL Symbol' }
                : { name: item.text || item.name, ...item }
            );
            combined = [...apiSuggestions, ...combined];
          }
        }
      } catch {
        // Local fallback handles suggestions
      }

      const uniqueMap = new Map();
      combined.forEach(item => {
        if (item.name && !uniqueMap.has(item.name)) uniqueMap.set(item.name, item);
      });

      setSuggestions(Array.from(uniqueMap.values()).slice(0, 10));
      const elapsed = Math.round((performance.now() - startTime) * 10) / 10;
      setLatency(elapsed);
    } finally {
      setIsSuggesting(false);
    }
  }, [activeFile, activeLanguage, astTokens]);

  // Real Code Execution Runner
  const runCurrentCode = async () => {
    if (isRunning || !activeFile) return;

    setIsRunning(true);
    setIsTerminalOpen(true);
    setDiagnostics([]);
    setLastRunResult({
      status: 'running',
      stdout: '',
      stderr: '',
      exitCode: null,
      durationMs: null
    });

    const startExec = performance.now();

    try {
      const res = await fetch(`${API_BASE}/runCode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeFile.content,
          language: activeLanguage.id,
          stdin: stdinInput,
          fileName: activeFile.name
        })
      });

      const elapsed = Math.round(performance.now() - startExec);
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setLastRunResult({
          status: 'success',
          stdout: data.output || '',
          stderr: data.error || '',
          exitCode: data.exitCode ?? 0,
          durationMs: data.durationMs ?? elapsed
        });
      } else {
        const errMsg = data.error || `Request failed (HTTP ${res.status})`;
        const parsedDiags = parseDiagnostics(errMsg, activeLanguage.id);
        setDiagnostics(parsedDiags);
        setLastRunResult({
          status: 'error',
          stdout: data.output || '',
          stderr: errMsg,
          exitCode: data.exitCode ?? (res.ok ? 1 : res.status),
          durationMs: data.durationMs ?? elapsed
        });
        if (parsedDiags.length > 0) {
          setTerminalActiveTab('problems');
        }
      }
    } catch (err) {
      const elapsed = Math.round(performance.now() - startExec);
      setLastRunResult({
        status: 'error',
        stdout: '',
        stderr: err.message || 'Failed to reach execution backend',
        exitCode: 1,
        durationMs: elapsed
      });
    } finally {
      setIsRunning(false);
    }
  };

  const clearOutput = () => {
    setDiagnostics([]);
    setLastRunResult({
      status: 'idle',
      stdout: '',
      stderr: '',
      exitCode: null,
      durationMs: null
    });
  };

  return (
    <EngineContext.Provider
      value={{
        latency,
        symbolCount,
        cacheHitRate,
        isBackendConnected,
        isRunning,
        stdinInput,
        setStdinInput,
        terminalActiveTab,
        setTerminalActiveTab,
        diagnostics,
        lastRunResult,
        suggestions,
        isSuggesting,
        astTokens,
        activeWord,
        querySuggestions,
        runCurrentCode,
        clearOutput
      }}
    >
      {children}
    </EngineContext.Provider>
  );
}

export function useEngine() {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error('useEngine must be used within an EngineProvider');
  return ctx;
}
