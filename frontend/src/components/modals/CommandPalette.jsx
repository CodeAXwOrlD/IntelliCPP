import React, { useState } from 'react';
import { Search, Play, FileCode, Plus, Zap, Terminal, Code2 } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useEngine } from '../../context/EngineContext';
import { SUPPORTED_LANGUAGES } from '../../languages/registry';

export default function CommandPalette() {
  const { 
    isCommandPaletteOpen, 
    setIsCommandPaletteOpen, 
    files, 
    setActiveFileId, 
    createNewFile,
    switchActiveLanguage,
    injectSnippetAtCursor,
    activeLanguage 
  } = useEditor();

  const { runCurrentCode, clearLogs } = useEngine();
  const [query, setQuery] = useState('');

  if (!isCommandPaletteOpen) return null;

  const actions = [
    {
      id: 'run',
      title: 'Run & Profile Active File',
      category: 'Execution',
      icon: Play,
      action: () => runCurrentCode()
    },
    {
      id: 'new_file',
      title: 'Create New File...',
      category: 'Files',
      icon: Plus,
      action: () => createNewFile(null, activeLanguage.id)
    },
    {
      id: 'clear_logs',
      title: 'Clear Terminal Output Buffer',
      category: 'Terminal',
      icon: Terminal,
      action: () => clearLogs()
    },
    ...Object.values(SUPPORTED_LANGUAGES).map(lang => ({
      id: `lang_${lang.id}`,
      title: `Switch Language Standard to ${lang.name}`,
      category: 'Language',
      icon: Code2,
      action: () => switchActiveLanguage(lang.id)
    })),
    ...files.map(f => ({
      id: `file_${f.id}`,
      title: `Open File: ${f.name}`,
      category: 'Workspace Files',
      icon: FileCode,
      action: () => setActiveFileId(f.id)
    })),
    ...(activeLanguage.quickInjects || []).map(inj => ({
      id: `inject_${inj.label}`,
      title: `Quick Inject: ${inj.label}`,
      category: 'Headers & Modules',
      icon: Zap,
      action: () => injectSnippetAtCursor(inj.snippet)
    }))
  ];

  const filtered = actions.filter(act => 
    act.title.toLowerCase().includes(query.toLowerCase()) || 
    act.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (action) => {
    action.action();
    setIsCommandPaletteOpen(false);
    setQuery('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        zIndex: 100
      }}
      onClick={() => setIsCommandPaletteOpen(false)}
    >
      <div
        className="glass-panel animate-slide-down"
        style={{
          width: '560px',
          maxWidth: '90vw',
          maxHeight: '440px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 242, 254, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* INPUT BOX */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <Search size={16} color="var(--accent-cyan)" />
          <input
            type="text"
            placeholder="Type a command, file name, or action..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'var(--font-ui)',
              outline: 'none'
            }}
          />
          <span className="kbd-shortcut">ESC</span>
        </div>

        {/* LIST OF ACTIONS */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No matching commands found
            </div>
          ) : (
            filtered.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div
                  key={idx}
                  onClick={() => handleSelect(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 120ms ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent-cyan-subtle)';
                    e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <IconComp size={15} color="var(--accent-cyan)" />
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.title}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)', background: 'rgba(255, 255, 255, 0.04)', padding: '2px 6px', borderRadius: 4 }}>
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
