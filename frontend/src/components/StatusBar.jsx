import React from 'react';

export default function StatusBar({ symbolCount, latency, includedLibs, cursorPosition }) {
  // Default position if not provided
  const position = cursorPosition || { line: 1, column: 1 };

  return (
    <div className="bottom-status-bar">
      <div className="status-left">
        <span className="status-item">C++</span>
        <span className="status-item">UTF-8</span>
        <span className="status-item">⚡ {latency}ms</span>
      </div>
      <div className="status-right">
        <span className="status-item">Ln {position.line}, Col {position.column}</span>
      </div>
    </div>
  );
}
