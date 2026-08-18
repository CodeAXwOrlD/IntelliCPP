import React from 'react';
import { 
  Play, 
  Search, 
  Terminal, 
  Cpu, 
  Layers, 
  Sparkles, 
  Code2,
  ChevronDown
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
    setIsTerminalOpen
  } = useEditor();

  const { 
    latency, 
    symbolCount, 
    cacheHitRate, 
    isBackendConnected, 
    isRunning, 
    runCurrentCode 
  } = useEngine();

  return (
    <header className="navbar-hud glass-specular">
      {/* BRAND & LOGO */}
      <div className="brand-section">
        <div className="logo-badge">
          <Code2 className="logo-hex" />
          <span className="text-shimmer" style={{ fontWeight: 800 }}>IntelliCPP</span>
          <span style={{ fontSize: '10px', color: 'var(--text-cyan)', fontFamily: 'var(--font-code)' }}>v2.0</span>
        </div>

        {/* CORE STATUS PILL */}
        <div className={`hud-pill ${isBackendConnected ? 'active-emerald' : ''}`}>
          <span className="animate-radar" style={{ 
            width: 6, 
            height: 6, 
            borderRadius: '50%', 
            backgroundColor: isBackendConnected ? 'var(--accent-emerald)' : 'var(--accent-red)',
            display: 'inline-block'
          }}></span>
          <span>{activeLanguage.badge}</span>
        </div>

        {/* LANGUAGE SELECTOR */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <select
            value={activeLanguage.id}
            onChange={(e) => switchActiveLanguage(e.target.value)}
            style={{
              appearance: 'none',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              padding: '4px 24px 4px 10px',
              fontSize: '11px',
              fontFamily: 'var(--font-code)',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {Object.values(SUPPORTED_LANGUAGES).map(lang => (
              <option key={lang.id} value={lang.id} style={{ background: '#0E1117', color: '#F8FAFC' }}>
                {lang.name}
              </option>
            ))}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* CENTER: COMMAND PALETTE TRIGGER & BREADCRUMBS */}
      <div className="hud-center">
        <button 
          className="command-search-btn"
          onClick={() => setIsCommandPaletteOpen(true)}
          title="Open Command Palette (⌘K / Ctrl+K)"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={14} style={{ marginTop: 2 }} />
            <span>Search symbols, STL headers, refactor actions...</span>
          </div>
          <span className="kbd-shortcut">⌘K</span>
        </button>
      </div>

      {/* RIGHT TELEMETRY & ACTIONS */}
      <div className="hud-actions">
        {/* TELEMETRY PILL */}
        <div className="hud-pill" style={{ background: 'rgba(0, 242, 254, 0.05)', borderColor: 'rgba(0, 242, 254, 0.2)' }}>
          <Sparkles size={12} color="var(--accent-cyan)" />
          <span style={{ color: 'var(--text-cyan)' }}>{latency}µs</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span>{symbolCount.toLocaleString()} Syms</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span style={{ color: 'var(--text-emerald)' }}>{cacheHitRate}% Hit</span>
        </div>

        {/* RUN & PROFILE BUTTON */}
        <button 
          className="btn-run-primary"
          onClick={runCurrentCode}
          disabled={isRunning}
          title="Compile, Execute & Profile (F5)"
        >
          <Play size={14} fill="#07080B" />
          <span>{isRunning ? 'Compiling...' : 'Run & Profile'}</span>
        </button>

        {/* TOGGLE BUTTONS */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button 
            className={`btn-ghost-icon ${isSidebarOpen ? 'active' : ''}`}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="Toggle File Sidebar"
          >
            <Layers size={15} />
          </button>
          <button 
            className={`btn-ghost-icon ${isProfilerOpen ? 'active' : ''}`}
            onClick={() => setIsProfilerOpen(!isProfilerOpen)}
            title="Toggle Memory & Trie Profiler"
          >
            <Cpu size={15} />
          </button>
          <button 
            className={`btn-ghost-icon ${isTerminalOpen ? 'active' : ''}`}
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            title="Toggle Neon Terminal"
          >
            <Terminal size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
