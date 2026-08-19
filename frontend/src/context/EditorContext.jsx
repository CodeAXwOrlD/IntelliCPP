import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { SUPPORTED_LANGUAGES, getLanguageByFilename } from '../languages/registry';

const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  // Initial file set
  const [files, setFiles] = useState([
    { id: 1, name: 'main.cpp', content: SUPPORTED_LANGUAGES.cpp.defaultCode, languageId: 'cpp', dirty: false },
    { id: 2, name: 'algorithm.hpp', content: '// C++20 Header Template\n#pragma once\n#include <vector>\n\ntemplate<typename T>\nvoid quick_inspect(const std::vector<T>& data) {\n    // Inspect elements\n}\n', languageId: 'cpp', dirty: false },
    { id: 3, name: 'benchmark.py', content: SUPPORTED_LANGUAGES.python.defaultCode, languageId: 'python', dirty: false }
  ]);

  const [activeFileId, setActiveFileId] = useState(1);
  const nextFileId = useRef(4);

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
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(240);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

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
      content: lang.defaultCode,
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

  const saveActiveFile = useCallback(() => {
    setFiles(prev => prev.map(f => {
      if (f.id === activeFileId) {
        return { ...f, dirty: false };
      }
      return f;
    }));
  }, [activeFileId]);

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

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveActiveFile();
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, saveActiveFile]);

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
        isProfilerOpen,
        setIsProfilerOpen,
        isTerminalOpen,
        setIsTerminalOpen,
        terminalHeight,
        setTerminalHeight,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        monacoEditorRef,
        updateFileContent,
        createNewFile,
        closeFile,
        saveActiveFile,
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
