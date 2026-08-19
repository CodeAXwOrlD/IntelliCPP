import React from 'react';
import { Plus, X, FileCode } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { getLanguageByFilename } from '../../languages/registry';

export default function EditorTabs() {
  const { files, activeFileId, setActiveFileId, closeFile, createNewFile, activeLanguage } = useEditor();

  return (
    <div className="tabs-bar" role="tablist" aria-label="Editor Tabs">
      {files.map(file => {
        const isActive = file.id === activeFileId;
        const lang = getLanguageByFilename(file.name);

        return (
          <div
            key={file.id}
            role="tab"
            aria-selected={isActive}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => setActiveFileId(file.id)}
          >
            <FileCode size={13} color={lang.iconColor || 'var(--accent-cyan)'} />
            <span className="tab-title">{file.name}</span>
            {file.dirty && <span className="tab-dirty-dot" title="Unsaved changes" />}
            {files.length > 1 && (
              <span
                className="tab-close-btn"
                onClick={(e) => closeFile(file.id, e)}
                title="Close tab"
                aria-label={`Close tab ${file.name}`}
                role="button"
              >
                <X size={12} />
              </span>
            )}
          </div>
        );
      })}

      <button
        onClick={() => createNewFile(null, activeLanguage.id)}
        className="tab-new-btn"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '6px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-xs)'
        }}
        title="New Tab"
        aria-label="Create new tab"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
