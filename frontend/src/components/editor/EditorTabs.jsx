import React from 'react';
import { Plus, X, FileCode } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { getLanguageByFilename } from '../../languages/registry';

export default function EditorTabs() {
  const { files, activeFileId, setActiveFileId, closeFile, createNewFile, activeLanguage } = useEditor();

  return (
    <div className="tabs-bar">
      {files.map(file => {
        const isActive = file.id === activeFileId;
        const lang = getLanguageByFilename(file.name);

        return (
          <div
            key={file.id}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => setActiveFileId(file.id)}
          >
            <FileCode size={13} color={lang.iconColor || 'var(--accent-cyan)'} />
            <span>{file.name}</span>
            {file.dirty && <span className="tab-dirty-dot" title="Unsaved changes" />}
            {files.length > 1 && (
              <span
                className="tab-close-btn"
                onClick={(e) => closeFile(file.id, e)}
                title="Close tab"
              >
                <X size={12} />
              </span>
            )}
          </div>
        );
      })}

      <button
        onClick={() => createNewFile(null, activeLanguage.id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '6px 8px',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 'var(--radius-xs)'
        }}
        title="New Tab"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
