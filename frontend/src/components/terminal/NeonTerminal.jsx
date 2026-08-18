import React, { useRef, useEffect } from 'react';
import { Trash2, X, ChevronUp, ChevronDown } from 'lucide-react';
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
  const logsEndRef = useRef(null);

  // Auto-scroll on new output
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [outputLogs, assemblyOutput]);

  const toggleHeight = (direction) => {
    if (direction === 'up') {
      setTerminalHeight(prev => Math.min(prev + 80, 500));
    } else {
      setTerminalHeight(prev => Math.max(prev - 80, 140));
    }
  };

  return (
    <div className="terminal-dock" style={{ height: `${terminalHeight}px` }}>
      {/* TERMINAL HEADER BAR */}
      <div className="terminal-header-bar">
        <div className="terminal-tabs">
          <button
            className={`term-tab-btn ${terminalActiveTab === 'output' ? 'active' : ''}`}
            onClick={() => setTerminalActiveTab('output')}
          >
            Output & Logs
          </button>
          <button
            className={`term-tab-btn ${terminalActiveTab === 'assembly' ? 'active' : ''}`}
            onClick={() => setTerminalActiveTab('assembly')}
          >
            Clang Assembly (.s)
          </button>
          <button
            className={`term-tab-btn ${terminalActiveTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setTerminalActiveTab('terminal')}
          >
            Interactive CLI
          </button>
        </div>

        {/* CONTROLS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => toggleHeight('down')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
            title="Decrease Terminal Height"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => toggleHeight('up')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
            title="Increase Terminal Height"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={clearLogs}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
            title="Clear Logs"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={() => setIsTerminalOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
            title="Close Terminal"
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
              const isHeader = log.includes('════════');

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
