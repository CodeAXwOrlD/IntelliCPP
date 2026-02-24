import React from 'react';

export default function StatusBar({ symbolCount, latency, includedLibs }) {
  return (
    <div className="bottom-status-bar">
      <div className="status-left">
        <span className="status-item">🌿 main*</span>
        <span className="status-item">🔄 Sync</span>
      </div>
      <div className="status-right">
        <span className="status-item">📦 Symbols: {symbolCount}</span>
        <span className="status-item">⚡ {latency}ms</span>
        <span className="status-item">📚 {includedLibs.length > 0 ? includedLibs.join(', ') : 'No Headers'}</span>
        <span className="status-item">UTF-8</span>
        <span className="status-item">C++</span>
      </div>
    </div>
  );
}
