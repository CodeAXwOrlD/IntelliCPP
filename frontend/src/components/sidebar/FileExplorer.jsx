import React, { useState } from 'react';
import { FileCode, Plus, Trash2, Check, X } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { getLanguageByFilename } from '../../languages/registry';

export default function FileExplorer() {
  const { files, activeFileId, setActiveFileId, createNewFile, closeFile, activeLanguage } = useEditor();
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Workspace Files ({files.length})
        </span>
        <button
          onClick={() => setIsCreating(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--accent-cyan)',
            cursor: 'pointer',
            padding: 2,
            display: 'flex'
          }}
          title="New File"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* NEW FILE INPUT FORM */}
      {isCreating && (
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}>
          <input
            type="text"
            placeholder="filename.cpp"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              background: 'var(--bg-input)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-primary)',
              padding: '3px 6px',
              fontSize: '12px',
              fontFamily: 'var(--font-code)',
              outline: 'none'
            }}
          />
          <button type="submit" style={{ background: 'none', border: 'none', color: 'var(--accent-emerald)', cursor: 'pointer' }}>
            <Check size={14} />
          </button>
          <button type="button" onClick={() => setIsCreating(false)} style={{ background: 'none', border: 'none', color: 'var(--accent-coral)', cursor: 'pointer' }}>
            <X size={14} />
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
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                background: isActive ? 'var(--accent-cyan-subtle)' : 'transparent',
                border: isActive ? '1px solid rgba(0, 242, 254, 0.2)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 150ms ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <FileCode size={15} color={iconColor} style={{ flexShrink: 0 }} />
                <span style={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-code)',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {file.name}
                </span>
                {file.dirty && <span className="tab-dirty-dot" style={{ width: 4, height: 4 }} />}
              </div>

              {files.length > 1 && (
                <button
                  onClick={(e) => closeFile(file.id, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex'
                  }}
                  title="Delete/Close file"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
