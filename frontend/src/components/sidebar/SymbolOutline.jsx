import React from 'react';
import { Box, Variable } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useEngine } from '../../context/EngineContext';

export default function SymbolOutline() {
  const { activeLanguage } = useEditor();
  const { astTokens } = useEngine();

  const builtins = activeLanguage.builtinSymbols || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* USER DEFINED SYMBOLS */}
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-cyan)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Live AST Identifiers ({astTokens.length})
        </div>
        {astTokens.length === 0 ? (
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic', padding: '4px 6px' }}>
            No variables/functions declared yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {astTokens.map((token, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-code)'
                }}
              >
                <Variable size={13} color="var(--accent-cyan)" />
                <span style={{ color: 'var(--text-secondary)' }}>{token}</span>
                <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-dim)' }}>Scope</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BUILT-IN STL / LANGUAGE SYMBOLS */}
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-violet)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Indexed {activeLanguage.name} Symbols ({builtins.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {builtins.map((sym, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Box size={13} color="var(--accent-violet)" />
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-code)', color: 'var(--text-violet)', fontWeight: 600 }}>
                  {sym.name}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '9px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--text-violet)', padding: '1px 4px', borderRadius: 3 }}>
                  {sym.type}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 3 }}>
                {sym.detail}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--accent-emerald)', marginTop: 2, fontFamily: 'var(--font-code)' }}>
                ⚡ {sym.complexity}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
