import React, { useRef, useEffect, useState } from 'react';
import { Trash2, X, ChevronUp, ChevronDown, Minimize2, Maximize2 } from 'lucide-react';
import { useEngine } from '../../context/EngineContext';
import { useEditor } from '../../context/EditorContext';

export default function NeonTerminal() {
  const { 
    outputLogs, 
    terminalActiveTab, 
    setTerminalActiveTab, 
    assemblyOutput, 
    clearLogs,
    isRunning 
  } = useEngine();

  const { terminalHeight, setTerminalHeight, setIsTerminalOpen } = useEditor();
  const [isMinimized, setIsMinimized] = useState(false);
  const logsEndRef = useRef(null);

  // Auto-scroll on new output
  useEffect(() => {
    if (logsEndRef.current && !isMinimized) {
      logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [outputLogs, assemblyOutput, isMinimized]);

  const toggleHeight = (direction) => {
    if (isMinimized) setIsMinimized(false);
    if (direction === 'up') {
      setTerminalHeight(prev => Math.min(prev + 80, 500));
    } else {
      setTerminalHeight(prev => Math.max(prev - 80, 140));
    }
  };

  return (
    <div 
      className={`terminal-dock ${isMinimized ? 'minimized' : ''}`} 
      style={{ height: isMinimized ? '36px' : `${terminalHeight}px` }}
    >
      {/* TERMINAL HEADER BAR */}
      <div className="terminal-header-bar">
        <div className="terminal-tabs" role="tablist" aria-label="Terminal Tabs">
          <button
            role="tab"
            aria-selected={terminalActiveTab === 'output'}
            className={`term-tab-btn ${terminalActiveTab === 'output' ? 'active' : ''}`}
            onClick={() => {
              setTerminalActiveTab('output');
              if (isMinimized) setIsMinimized(false);
            }}
          >
            Output & Logs
          </button>
          <button
            role="tab"
            aria-selected={terminalActiveTab === 'assembly'}
            className={`term-tab-btn ${terminalActiveTab === 'assembly' ? 'active' : ''}`}
            onClick={() => {
              setTerminalActiveTab('assembly');
              if (isMinimized) setIsMinimized(false);
            }}
          >
            Clang Assembly (.s)
          </button>
          <button
            role="tab"
            aria-selected={terminalActiveTab === 'terminal'}
            className={`term-tab-btn ${terminalActiveTab === 'terminal' ? 'active' : ''}`}
            onClick={() => {
              setTerminalActiveTab('terminal');
              if (isMinimized) setIsMinimized(false);
            }}
          >
            Interactive CLI
          </button>
        </div>

        {/* CONTROLS */}
        <div className="terminal-controls" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* MINIMIZE / EXPAND TOGGLE FOR BOTTOM SHEET */}
          <button
            onClick={() => setIsMinimized(prev => !prev)}
            className="term-control-btn"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={isMinimized ? 'Expand Terminal' : 'Minimize Terminal'}
            aria-label={isMinimized ? 'Expand Terminal' : 'Minimize Terminal'}
          >
            {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
          <button
            onClick={() => toggleHeight('down')}
            className="term-control-btn term-resize-btn"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Decrease Terminal Height"
            aria-label="Decrease Terminal Height"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => toggleHeight('up')}
            className="term-control-btn term-resize-btn"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Increase Terminal Height"
            aria-label="Increase Terminal Height"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={clearLogs}
            className="term-control-btn"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Clear Logs"
            aria-label="Clear Terminal Logs"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={() => setIsTerminalOpen(false)}
            className="term-control-btn"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Close Terminal"
            aria-label="Close Terminal"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* TERMINAL BODY CONTENT */}
      <div className="terminal-body" ref={logsEndRef}>
        {/* OUTPUT TAB */}
        {terminalActiveTab === 'output' && (
          <div>
            {outputLogs.map((log, idx) => {
              const isError = log.includes('❌') || log.includes('error:') || log.includes('Error:');
              const isSuccess = log.includes('✓') || log.includes('Hello,') || log.includes('Sorted');
              const isHeader = log.startsWith('---') || log.includes('[Running');

              return (
                <div
                  key={idx}
                  style={{
                    color: isError ? 'var(--accent-coral)' : isSuccess ? 'var(--accent-emerald)' : isHeader ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                    marginBottom: 2
                  }}
                >
                  {log}
                </div>
              );
            })}

            {isRunning && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-cyan)', marginTop: 6 }}>
                <span className="animate-radar" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-cyan)' }} />
                <span>Compiling translation unit with C++20 Clang...</span>
              </div>
            )}
          </div>
        )}

        {/* ASSEMBLY TAB */}
        {terminalActiveTab === 'assembly' && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 6 }}>
              Target: x86_64-pc-linux-gnu | Optimizer: -O3 | Standard: C++20
            </div>
            <pre style={{ margin: 0, color: 'var(--text-violet)', fontSize: '11px', fontFamily: 'var(--font-code)' }}>
              {assemblyOutput || '; Compile the active file to generate assembly output (F5)'}
            </pre>
          </div>
        )}

        {/* TERMINAL CLI TAB */}
        {terminalActiveTab === 'terminal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ color: 'var(--text-muted)' }}>IntelliCPP Sandboxed Terminal Session (Node-API Bridge)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ color: 'var(--accent-cyan)' }}>intellicpp@sandbox:~$</span>
              <span style={{ color: 'var(--text-emerald)' }}>./main</span>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>Hello, IntelliCPP!</div>
          </div>
        )}
      </div>
    </div>
  );
}
