import React from 'react';
import { CheckCircle2, Cloud, Code2, Clock, Check } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useEngine } from '../../context/EngineContext';

export default function StatusBar() {
  const { activeLanguage, cursorPos, saveStatus, activeFile } = useEditor();
  const { isBackendConnected, lastRunResult } = useEngine();

  return (
    <footer className="status-bar">
      {/* LEFT STATUS ITEMS */}
      <div className="status-left">
        <div
          className="status-item"
          style={{ color: isBackendConnected ? 'var(--text-emerald)' : 'var(--text-muted)' }}
        >
          {isBackendConnected ? <CheckCircle2 size={12} /> : <Cloud size={12} />}
          <span className="status-text-desktop">
            {isBackendConnected ? 'Execution Engine Ready' : 'Serverless / Local Fallback'}
          </span>
          <span className="status-text-mobile">
            {isBackendConnected ? 'Ready' : 'Cloud'}
          </span>
        </div>

        {saveStatus === 'saved' && (
          <div className="status-item" style={{ color: 'var(--text-emerald)', fontWeight: 500 }}>
            <Check size={12} />
            <span>Saved {activeFile?.name}</span>
          </div>
        )}

        {lastRunResult?.durationMs !== null && (
          <div className="status-item status-item-hide-mobile">
            <Clock size={12} />
            <span>Last Run: {lastRunResult.durationMs} ms (Exit {lastRunResult.exitCode})</span>
          </div>
        )}
      </div>

      {/* RIGHT STATUS ITEMS */}
      <div className="status-right">
        <div className="status-item">
          <span>Ln {cursorPos.line}, Col {cursorPos.column}</span>
        </div>

        <div className="status-item status-item-hide-mobile">
          <span>Spaces: 4</span>
        </div>

        <div className="status-item status-item-hide-mobile">
          <span>UTF-8</span>
        </div>

        <div className="status-item" style={{ color: 'var(--text-cyan)', fontWeight: 500 }}>
          <Code2 size={12} />
          <span>{activeLanguage.badge}</span>
        </div>
      </div>
    </footer>
  );
}
