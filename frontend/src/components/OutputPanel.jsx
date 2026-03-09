import React, { useState, useRef, useEffect } from 'react';
import { formatCompilerError } from '../utils/errorFormatter';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import './OutputPanel.css';

export default function OutputPanel({ output, isLoading, error, onClear, isVisible, onResize, minHeight = 100, maxHeight = 500, height = 220 }) {
  const [activeTab, setActiveTab] = useState('output');
  const outputRef = useRef(null);

  // Auto scroll to bottom when new content is added
  useEffect(() => {
    if (outputRef.current && (output || error)) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, error]);

  if (!isVisible) return null;

  const handleResize = (direction) => {
    if (onResize) {
      onResize(direction);
    }
  };

  // Apply dynamic height
  const panelStyle = {
    height: `${height}px`
  };

  const handleSuggestionClick = (suggestion) => {
    navigator.clipboard.writeText(suggestion).then(() => {
      const originalTitle = document.title;
      document.title = "✅ Copied to clipboard!";
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    });
  };

  return (
    <div className="terminal-panel" style={panelStyle}>
      <div className="terminal-header">
        <div className="terminal-tabs">
          <button 
            className={`terminal-tab ${activeTab === 'output' ? 'active' : ''}`}
            onClick={() => setActiveTab('output')}
          >
            Output
          </button>
          <button 
            className={`terminal-tab ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            Terminal
          </button>
        </div>
        <div className="terminal-controls">
          <button 
            className="terminal-btn-resize" 
            onClick={() => handleResize('minimize')} 
            title="Minimize terminal"
          >
            <ChevronDown size={14} />
          </button>
          <button 
            className="terminal-btn-resize" 
            onClick={() => handleResize('maximize')} 
            title="Maximize terminal"
          >
            <ChevronUp size={14} />
          </button>
          <button className="terminal-btn-clear" onClick={onClear} title="Clear terminal">
            <X size={14} />
          </button>
        </div>
      </div>
      
      <div className="terminal-content" ref={outputRef}>
        {activeTab === 'output' && (
          <>
            {isLoading ? (
              <div className="terminal-loading">
                <span>Compiling and running code...</span>
              </div>
            ) : error ? (
              <div 
                className="terminal-error"
                dangerouslySetInnerHTML={{ 
                  __html: formatCompilerError(error, handleSuggestionClick) 
                }}
              />
            ) : output ? (
              <div className="terminal-output">
                {output}
              </div>
            ) : (
              <div className="terminal-empty">
                Run code to see output here
              </div>
            )}
          </>
        )}
        
        {activeTab === 'terminal' && (
          <div className="terminal-output">
            <div className="terminal-prompt">$ </div>
            <div className="terminal-message">Terminal tab - Ready for commands</div>
          </div>
        )}
      </div>
    </div>
  );
}
