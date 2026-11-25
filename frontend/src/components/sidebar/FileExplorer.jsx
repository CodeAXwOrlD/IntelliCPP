import React, { useState } from 'react';
import { FileCode, Plus, Trash2, Check, X, FolderOpen, Download } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { getLanguageByFilename } from '../../languages/registry';

export default function FileExplorer() {
  const { 
    files, 
    activeFileId, 
    setActiveFileId, 
    createNewFile, 
    closeFile, 
    activeLanguage,
    openSystemFile,
    saveSystemFile
  } = useEditor();
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (newFileName.trim()) {
      createNewFile(newFileName.trim(), activeLanguage.id);
      setNewFileName('');
      setIsCreating(false);
    }
  };

  const getFileIconColor = (filename) => {
    const lang = getLanguageByFilename(filename);
    return lang.iconColor || 'var(--text-muted)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* HEADER ACTION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Workspace ({files.length})
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <button
            onClick={() => setIsCreating(true)}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '3px 5px',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: '11px',
              transition: 'all 120ms ease'
            }}
            title="Create New File"
          >
            <Plus size={11} />
            <span>New</span>
          </button>
          <button
            onClick={openSystemFile}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '3px 5px',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: '11px',
              transition: 'all 120ms ease'
            }}
            title="Open File from System File Manager (Ctrl+O)"
          >
            <FolderOpen size={11} />
            <span>Open</span>
          </button>
          <button
            onClick={saveSystemFile}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '3px 5px',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: '11px',
              transition: 'all 120ms ease'
            }}
            title="Save Active File to Computer Disk (Ctrl+Shift+S)"
          >
            <Download size={11} />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* NEW FILE INPUT FORM */}
      {isCreating && (
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px' }}>
          <input
            type="text"
            placeholder="filename.cpp"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              background: 'var(--bg-void)',
              border: '1px solid var(--border-focus)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-primary)',
              padding: '4px 8px',
              fontSize: '12px',
              fontFamily: 'var(--font-code)',
              outline: 'none'
            }}
          />
          <button type="submit" style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-emerald)', borderRadius: 'var(--radius-xs)', padding: '4px 6px', cursor: 'pointer' }}>
            <Check size={13} />
          </button>
          <button type="button" onClick={() => setIsCreating(false)} style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', borderRadius: 'var(--radius-xs)', padding: '4px 6px', cursor: 'pointer' }}>
            <X size={13} />
          </button>
        </form>
      )}

      {/* FILE LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {files.map(file => {
          const isActive = file.id === activeFileId;
          const iconColor = getFileIconColor(file.name);

          return (
            <div
              key={file.id}
              onClick={() => setActiveFileId(file.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                background: isActive ? 'var(--bg-surface-elevated)' : 'transparent',
                border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                borderLeft: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'background 120ms ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <FileCode size={14} color={iconColor} style={{ flexShrink: 0 }} />
                <span style={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-code)',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 500 : 400,
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {file.name}
                </span>
                {file.dirty && <span className="tab-dirty-dot" style={{ width: 5, height: 5 }} />}
              </div>

              {files.length > 1 && (
                <button
                  onClick={(e) => closeFile(file.id, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    borderRadius: 'var(--radius-xs)',
                    opacity: 0.6,
                    transition: 'opacity 120ms ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                  title="Close file"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
