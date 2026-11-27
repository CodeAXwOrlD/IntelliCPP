import React, { useRef, useState } from 'react';
import {
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader2,
  TerminalSquare
} from 'lucide-react';
import { useEngine } from '../../context/EngineContext';
import { useEditor } from '../../context/EditorContext';

export default function NeonTerminal() {
  const {
    stdinInput,
    setStdinInput,
    terminalActiveTab,
    setTerminalActiveTab,
    diagnostics,
    lastRunResult,
    clearOutput,
    isRunning
  } = useEngine();

  const { terminalHeight, setTerminalHeight, setIsTerminalOpen, monacoEditorRef } = useEditor();
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(terminalHeight);

  const startResize = (clientY) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    startYRef.current = clientY;
    startHeightRef.current = terminalHeight;

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const currentY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
      if (currentY === undefined) return;
      const deltaY = startYRef.current - currentY;
      const minHeight = 140;
      const maxHeight = Math.max(minHeight, window.innerHeight - 160);
      setTerminalHeight(Math.min(Math.max(startHeightRef.current + deltaY, minHeight), maxHeight));
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove, { passive: false });
    window.addEventListener('touchend', onMouseUp);
  };

  const handleCopy = () => {
    const text = [lastRunResult.stdout, lastRunResult.stderr].filter(Boolean).join('\n');
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const jumpToDiagnostic = (diag) => {
    const editor = monacoEditorRef.current;
    if (!editor) return;
    editor.revealLineInCenter(diag.line);
    editor.setPosition({ lineNumber: diag.line, column: diag.column || 1 });
    editor.focus();
  };

  const toggleHeight = (direction) => {
    if (direction === 'up') {
      setTerminalHeight(prev => Math.min(prev + 80, 520));
    } else {
      setTerminalHeight(prev => Math.max(prev - 80, 140));
    }
  };

  return (
    <section
      className={`terminal-dock ${isDragging ? 'resizing' : ''}`}
      style={{ height: `${terminalHeight}px` }}
    >
      {/* DRAG RESIZER */}
      <div
        className="terminal-resizer"
        onMouseDown={(e) => { e.preventDefault(); startResize(e.clientY); }}
        onTouchStart={(e) => e.touches?.[0] && startResize(e.touches[0].clientY)}
        title="Drag to resize output panel"
      >
        <div className="resizer-handle-indicator-h" />
      </div>

      {/* PANEL HEADER */}
      <div className="terminal-header-bar">
        <div className="terminal-tabs">
          <button
            className={`term-tab-btn ${terminalActiveTab === 'io' ? 'active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setTerminalActiveTab('io')}
          >
            <TerminalSquare size={13} />
            <span className="term-tab-title-full">Input &amp; Output</span>
            <span className="term-tab-title-short">I/O</span>
          </button>

          <button
            className={`term-tab-btn ${terminalActiveTab === 'problems' ? 'active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setTerminalActiveTab('problems')}
          >
            <AlertCircle size={13} />
            <span>Problems</span>
            {diagnostics.length > 0 && (
              <span className="diag-count-badge">{diagnostics.length}</span>
            )}
          </button>
        </div>

        {/* STATUS & CONTROLS */}
        <div className="terminal-controls-group">
          {isRunning && (
            <span className="exec-status-pill running">
              <Loader2 size={12} className="animate-spin" />
              <span className="status-pill-text">Running...</span>
            </span>
          )}
          {!isRunning && lastRunResult.status === 'success' && (
            <span className="exec-status-pill success">
              <CheckCircle2 size={12} />
              <span className="status-pill-text">Exited {lastRunResult.exitCode} • {lastRunResult.durationMs}ms</span>
            </span>
          )}
          {!isRunning && lastRunResult.status === 'error' && (
            <span className="exec-status-pill error">
              <AlertCircle size={12} />
              <span className="status-pill-text">Exit {lastRunResult.exitCode} • {lastRunResult.durationMs}ms</span>
            </span>
          )}

          <button className="btn-ghost-icon" onClick={handleCopy} title="Copy Output" aria-label="Copy Output">
            {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
          </button>
          <button className="btn-ghost-icon" onClick={clearOutput} title="Clear Output" aria-label="Clear Output">
            <Trash2 size={14} />
          </button>
          <button className="btn-ghost-icon" onClick={() => toggleHeight('up')} title="Expand Panel" aria-label="Expand Panel">
            <ChevronUp size={14} />
          </button>
          <button className="btn-ghost-icon" onClick={() => toggleHeight('down')} title="Collapse Panel" aria-label="Collapse Panel">
            <ChevronDown size={14} />
          </button>
          <button className="btn-ghost-icon" onClick={() => setIsTerminalOpen(false)} title="Close Panel" aria-label="Close Panel">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* PANEL BODY */}
      <div className="io-panel-body">
        {terminalActiveTab === 'io' ? (
          <div className="io-split-grid">
            {/* STDIN CARD */}
            <div className="io-card">
              <div className="io-card-label">Standard Input (stdin)</div>
              <textarea
                className="io-stdin-textarea"
                value={stdinInput}
                onChange={(e) => setStdinInput(e.target.value)}
                placeholder="Enter input values here (e.g. 15 27)..."
                spellCheck={false}
              />
            </div>

            {/* STDOUT / STDERR CARD */}
            <div className="io-card">
              <div className="io-card-label">Program Output</div>
              <div className="io-output-box">
                {lastRunResult.status === 'idle' && (
                  <span className="io-placeholder">Click Run (F5) to compile and execute your code.</span>
                )}
                {lastRunResult.status === 'running' && (
                  <span className="io-placeholder">Executing in sandbox...</span>
                )}
                {lastRunResult.stdout && (
                  <pre className="io-stdout">{lastRunResult.stdout}</pre>
                )}
                {lastRunResult.stderr && (
                  <pre className="io-stderr">{lastRunResult.stderr}</pre>
                )}
                {lastRunResult.status === 'success' && !lastRunResult.stdout && !lastRunResult.stderr && (
                  <span className="io-placeholder">Program finished with no output.</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="problems-list">
            {diagnostics.length === 0 ? (
              <div className="io-placeholder" style={{ padding: 16 }}>
                No compiler problems detected.
              </div>
            ) : (
              diagnostics.map((d, idx) => (
                <button
                  key={idx}
                  className="problem-row"
                  onClick={() => jumpToDiagnostic(d)}
                >
                  <AlertCircle size={14} color={d.severity === 'warning' ? 'var(--accent-amber)' : 'var(--accent-red)'} />
                  <span className="problem-loc">Ln {d.line}, Col {d.column}</span>
                  <span className="problem-msg">{d.message}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
