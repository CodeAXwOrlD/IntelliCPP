import React from 'react';
import { formatCompilerError } from '../utils/errorFormatter';
import './OutputPanel.css';

export default function OutputPanel({ output, isLoading, error, onClear, isVisible, onResize, minHeight = 100, maxHeight = 500, height = 250 }) {
  if (!isVisible) return null;

  const handleResize = (direction) => {
    if (onResize) {
      onResize(direction);
    }
  };

  // Apply dynamic height
  const panelStyle = {
    '--output-panel-height': `${height}px`
  };

  const handleSuggestionClick = (suggestion) => {
    // Handle suggestion click - could copy to clipboard or apply to editor
    navigator.clipboard.writeText(suggestion).then(() => {
      // Show temporary feedback
      const originalTitle = document.title;
      document.title = "✅ Copied to clipboard!";
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    });
  };

  return (
    <div className="output-panel" style={panelStyle}>
      <div className="output-header">
        <div className="output-title">🖥️ Output Terminal</div>
        <div className="output-controls">
          <button 
            className="output-btn-resize" 
            onClick={() => handleResize('minimize')} 
            title="Minimize output panel"
          >
          −
          </button>
          <button 
            className="output-btn-resize" 
            onClick={() => handleResize('maximize')} 
            title="Maximize output panel"
          >
         □
          </button>
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
            dangerouslySetInnerHTML={{ 
              __html: formatCompilerError(error, handleSuggestionClick) 
            }}
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
