import React from 'react';
import { formatCompilerError } from '../utils/errorFormatter';
import './OutputPanel.css';

export default function OutputPanel({ output, isLoading, error, onClear, isVisible }) {
  if (!isVisible) return null;

  return (
    <div className="output-panel">
      <div className="output-header">
        <div className="output-title">🖥️ Output Terminal</div>
        <div className="output-controls">
          <button className="output-btn-clear" onClick={onClear} title="Clear output">
            🗑️ Clear
          </button>
        </div>
      </div>
      
      <div className={`output-content ${error ? 'error' : 'success'}`}>
        {isLoading ? (
          <div className="output-loading">
            <span>⚙️ Compiling and running code...</span>
          </div>
        ) : error ? (
          <div 
            className="output-error"
            dangerouslySetInnerHTML={{ __html: formatCompilerError(error) }}
          />
        ) : output ? (
          <pre className="output-text">
            {output}
          </pre>
        ) : (
          <div className="output-empty">
            Run code to see output here
          </div>
        )}
      </div>
    </div>
  );
}
