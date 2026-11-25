import React from 'react';
import {
  Play,
  Search,
  PanelBottom,
  PanelRight,
  PanelLeft,
  Code2,
  ChevronDown,
  Menu,
  Sun,
  Moon,
  Loader2
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useEngine } from '../../context/EngineContext';
import { SUPPORTED_LANGUAGES } from '../../languages/registry';

export default function NavbarHUD() {
  const {
    activeLanguage,
    switchActiveLanguage,
    setIsCommandPaletteOpen,
    isSidebarOpen,
    setIsSidebarOpen,
    isProfilerOpen,
    setIsProfilerOpen,
    isTerminalOpen,
    setIsTerminalOpen,
    theme,
    toggleTheme
  } = useEditor();

  const {
    latency,
    symbolCount,
    isBackendConnected,
    isRunning,
    runCurrentCode
  } = useEngine();

  return (
    <header className="navbar-hud">
      {/* LEFT: BRAND & LANGUAGE */}
      <div className="brand-section">
        <button
          className="btn-ghost-icon btn-nav-hamburger"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title="Toggle Explorer"
          aria-label="Toggle Explorer"
        >
          <Menu size={18} />
        </button>

        <div className="logo-badge">
          <Code2 size={18} color="var(--accent-cyan)" />
          <span className="logo-text">IntelliCPP</span>
        </div>

        <div className="hud-lang-select-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
          <select
            value={activeLanguage.id}
            onChange={(e) => switchActiveLanguage(e.target.value)}
            className="hud-lang-select"
            aria-label="Select Programming Language"
            style={{
              appearance: 'none',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              padding: '5px 28px 5px 10px',
              fontSize: '12px',
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {Object.values(SUPPORTED_LANGUAGES).map(lang => (
              <option key={lang.id} value={lang.id} style={{ background: 'var(--bg-dropdown-option)', color: 'var(--text-primary)' }}>
                {lang.badge}
              </option>
            ))}
          </select>
          <ChevronDown size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* CENTER: COMMAND PALETTE */}
      <div className="hud-center">
        <button
          className="command-search-btn"
          onClick={() => setIsCommandPaletteOpen(true)}
          title="Open Command Palette (⌘K / Ctrl+K)"
          aria-label="Open Command Palette"
        >
          <div className="command-search-inner">
            <Search size={14} className="command-search-icon" />
            <span className="command-search-label">Search files, symbols, or commands...</span>
          </div>
          <span className="kbd-shortcut">⌘K</span>
        </button>
      </div>

      {/* RIGHT: ACTIONS & LAYOUT CONTROLS */}
      <div className="hud-actions">
        {(isBackendConnected || latency !== null) && (
          <div className="hud-pill hud-telemetry-pill" title="Live API status">
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: isBackendConnected ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                display: 'inline-block'
              }}
            />
            {symbolCount !== null && <span>{symbolCount} symbols</span>}
            {latency !== null && <span>{latency} ms</span>}
          </div>
        )}

        <button
          className="btn-run-primary"
          onClick={runCurrentCode}
          disabled={isRunning}
          title="Compile & Run (F5)"
          aria-label="Run Code"
        >
          {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
          <span className="btn-run-label">{isRunning ? 'Running...' : 'Run'}</span>
        </button>

        <div className="hud-toggle-group" style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn-ghost-icon"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Color Theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            className={`btn-ghost-icon ${isSidebarOpen ? 'active' : ''}`}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            <PanelLeft size={15} />
          </button>
          <button
            className={`btn-ghost-icon ${isTerminalOpen ? 'active' : ''}`}
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            title="Toggle Output Panel"
            aria-label="Toggle Output Panel"
          >
            <PanelBottom size={15} />
          </button>
          <button
            className={`btn-ghost-icon ${isProfilerOpen ? 'active' : ''}`}
            onClick={() => setIsProfilerOpen(!isProfilerOpen)}
            title="Toggle Code Insights"
            aria-label="Toggle Code Insights"
          >
            <PanelRight size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
