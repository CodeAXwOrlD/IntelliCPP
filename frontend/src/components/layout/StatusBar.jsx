import React from 'react';
import { Wifi, WifiOff, Code2, Database } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useEngine } from '../../context/EngineContext';

export default function StatusBar() {
  const { activeLanguage, cursorPos } = useEditor();
  const { isBackendConnected, executionStats } = useEngine();

  return (
    <footer className="status-bar">
      {/* LEFT STATUS ITEMS */}
      <div className="status-left">
        <div className="status-item" style={{ color: isBackendConnected ? 'var(--text-emerald)' : 'var(--accent-red)' }}>
          {isBackendConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className="status-text-desktop">{isBackendConnected ? 'Clang Core Connected (127.0.0.1:3001)' : 'Offline / Standalone Mode'}</span>
          <span className="status-text-mobile">{isBackendConnected ? 'Connected' : 'Offline'}</span>
        </div>

        <div className="status-item status-item-hide-mobile">
          <Database size={12} color="var(--accent-violet)" />
          <span>Trie: ~{executionStats.memoryUsageKb} KB</span>
        </div>
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

        <div className="status-item" style={{ color: 'var(--text-cyan)', fontWeight: 600 }}>
          <Code2 size={12} />
          <span>{activeLanguage.standard}</span>
        </div>
      </div>
    </footer>
  );
}
