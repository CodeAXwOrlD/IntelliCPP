import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { SUPPORTED_LANGUAGES, getLanguageByFilename } from '../languages/registry';

const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  // Initial file set with localStorage persistence
  const [files, setFiles] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('intellicpp_workspace_files');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Failed to load files from localStorage', err);
      }
    }
    return [
      { id: 1, name: 'main.cpp', content: SUPPORTED_LANGUAGES.cpp.defaultCode, languageId: 'cpp', dirty: false },
      { id: 2, name: 'algorithm.hpp', content: '// C++20 Header Template\n#pragma once\n#include <vector>\n\ntemplate<typename T>\nvoid quick_inspect(const std::vector<T>& data) {\n    // Inspect elements\n}\n', languageId: 'cpp', dirty: false },
      { id: 3, name: 'benchmark.py', content: SUPPORTED_LANGUAGES.python.defaultCode, languageId: 'python', dirty: false }
    ];
  });

  const [activeFileId, setActiveFileId] = useState(1);
  const nextFileId = useRef(4);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saved' | 'error'

  // Active file & language derivation
  const activeFile = files.find(f => f.id === activeFileId) || files[0] || null;
  const activeLanguage = activeFile ? getLanguageByFilename(activeFile.name) : SUPPORTED_LANGUAGES.cpp;

  // Editor cursor & telemetry
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 14,
    minimap: true,
    wordWrap: false,
    lineNumbers: true,
    fontLigatures: true
  });

  // Layout View States (Mobile-aware initial states)
  const isDesktop = typeof window !== 'undefined' ? window.innerWidth > 1024 : true;
  const [activeDockItem, setActiveDockItem] = useState('explorer');
  const [isSidebarOpen, setIsSidebarOpen] = useState(isDesktop);
  const [isProfilerOpen, setIsProfilerOpen] = useState(isDesktop);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [profilerWidth, setProfilerWidth] = useState(320);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(240);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('intellicpp-theme') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('intellicpp-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Editor ref for direct operations
  const monacoEditorRef = useRef(null);

  // File Operations
  const updateFileContent = (content) => {
    setFiles(prev => prev.map(file => {
      if (file.id === activeFileId) {
        return { ...file, content, dirty: true };
      }
      return file;
    }));
  };

  const createNewFile = (customName, langId = 'cpp') => {
    const lang = SUPPORTED_LANGUAGES[langId] || SUPPORTED_LANGUAGES.cpp;
    const filename = customName || `file_${nextFileId.current}${lang.extension}`;
    const newFile = {
      id: nextFileId.current,
      name: filename,
      content: '',
      languageId: lang.id,
      dirty: false
    };
    nextFileId.current += 1;
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
    return newFile;
  };

  const closeFile = (fileId, e) => {
    if (e) e.stopPropagation();
    if (files.length <= 1) return;

    const targetIdx = files.findIndex(f => f.id === fileId);
    const newFiles = files.filter(f => f.id !== fileId);
    setFiles(newFiles);

    if (activeFileId === fileId) {
      const nextActive = newFiles[Math.max(0, targetIdx - 1)];
      if (nextActive) setActiveFileId(nextActive.id);
    }
  };

  const saveActiveFile = useCallback(async () => {
    let savedFile = null;
    setFiles(prev => {
      const updated = prev.map(f => {
        if (f.id === activeFileId) {
          savedFile = { ...f, dirty: false };
          return savedFile;
        }
        return f;
      });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('intellicpp_workspace_files', JSON.stringify(updated));
        } catch (e) {
          console.warn('LocalStorage save failed:', e);
        }
      }
      return updated;
    });

    if (savedFile) {
      try {
        await fetch('/api/writeFile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: savedFile.name,
            content: savedFile.content || ''
          })
        });
      } catch (err) {
        // LocalStorage save already succeeded
      }
    }

    setSaveStatus('saved');
    setTimeout(() => {
      setSaveStatus(null);
    }, 2500);
  }, [activeFileId]);

  // Open File from local system file manager
  const openSystemFile = useCallback(async () => {
    // 1. Try modern File System Access API
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: 'C/C++/Source Files',
              accept: {
                'text/*': ['.cpp', '.hpp', '.c', '.h', '.cc', '.cxx', '.py', '.rs', '.js', '.txt', '.json', '.md']
              }
            }
          ]
        });
        const file = await handle.getFile();
        const content = await file.text();
        loadOpenedFile(file.name, content);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User cancelled dialog
      }
    }

    // 2. Universal fallback using native file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.cpp,.hpp,.c,.h,.cc,.cxx,.py,.rs,.js,.txt,.json,.md';
    input.style.display = 'none';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const content = await file.text();
      loadOpenedFile(file.name, content);
      document.body.removeChild(input);
    };
    document.body.appendChild(input);
    input.click();
  }, []);

  const loadOpenedFile = useCallback((filename, content) => {
    const lang = getLanguageByFilename(filename);
    setFiles(prev => {
      const existing = prev.find(f => f.name.toLowerCase() === filename.toLowerCase());
      if (existing) {
        setActiveFileId(existing.id);
        const updated = prev.map(f => f.id === existing.id ? { ...f, content, dirty: false } : f);
        try { localStorage.setItem('intellicpp_workspace_files', JSON.stringify(updated)); } catch {}
        return updated;
      }
      const newFile = {
        id: nextFileId.current++,
        name: filename,
        content,
        languageId: lang.id,
        dirty: false
      };
      setActiveFileId(newFile.id);
      const updated = [...prev, newFile];
      try { localStorage.setItem('intellicpp_workspace_files', JSON.stringify(updated)); } catch {}
      return updated;
    });
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(null), 2500);
  }, []);

  // Save / Export Active File to local system disk via native file manager
  const saveSystemFile = useCallback(async () => {
    if (!activeFile) return;

    // Save internally first
    await saveActiveFile();

    // 1. Try modern File System Access API
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const ext = activeFile.name.includes('.') ? `.${activeFile.name.split('.').pop()}` : '.cpp';
        const handle = await window.showSaveFilePicker({
          suggestedName: activeFile.name,
          types: [
            {
              description: 'Source Code File',
              accept: { 'text/plain': [ext] }
            }
          ]
        });
        const writable = await handle.createWritable();
        await writable.write(activeFile.content || '');
        await writable.close();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2500);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User cancelled dialog
      }
    }

    // 2. Universal fallback: trigger browser save/download dialog
    const blob = new Blob([activeFile.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(null), 2500);
  }, [activeFile, saveActiveFile]);

  const switchActiveLanguage = (langId) => {
    const targetLang = SUPPORTED_LANGUAGES[langId];
    if (!targetLang || !activeFile) return;

    const baseName = activeFile.name.replace(/\.[^/.]+$/, '');
    const newName = `${baseName}${targetLang.extension}`;
    
    setFiles(prev => prev.map(f => {
      if (f.id === activeFileId) {
        return {
          ...f,
          name: newName,
          languageId: targetLang.id,
          content: targetLang.defaultCode,
          dirty: false
        };
      }
      return f;
    }));
  };

  const injectSnippetAtCursor = (snippet) => {
    if (!monacoEditorRef.current) return;
    const editor = monacoEditorRef.current;
    const position = editor.getPosition();
    editor.executeEdits('quick-inject', [{
      range: {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      },
      text: snippet,
      forceMoveMarkers: true
    }]);
    editor.focus();
  };

  // Keyboard shortcut listener (Cmd+K / Ctrl+K, Ctrl+S, Ctrl+O)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (e.shiftKey) {
          saveSystemFile();
        } else {
          saveActiveFile();
        }
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        openSystemFile();
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, saveActiveFile, saveSystemFile, openSystemFile]);

  return (
    <EditorContext.Provider
      value={{
        files,
        activeFileId,
        setActiveFileId,
        activeFile,
        activeLanguage,
        cursorPos,
        setCursorPos,
        editorSettings,
        setEditorSettings,
        activeDockItem,
        setActiveDockItem,
        isSidebarOpen,
        setIsSidebarOpen,
        sidebarWidth,
        setSidebarWidth,
        isProfilerOpen,
        setIsProfilerOpen,
        profilerWidth,
        setProfilerWidth,
        isTerminalOpen,
        setIsTerminalOpen,
        terminalHeight,
        setTerminalHeight,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        theme,
        toggleTheme,
        monacoEditorRef,
        updateFileContent,
        createNewFile,
        closeFile,
        saveActiveFile,
        openSystemFile,
        saveSystemFile,
        saveStatus,
        switchActiveLanguage,
        injectSnippetAtCursor
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) throw new Error('useEditor must be used within an EditorProvider');
  return context;
}
