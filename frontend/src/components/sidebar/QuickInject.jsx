import React from 'react';
import { Zap } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

export default function QuickInject() {
  const { activeLanguage, injectSnippetAtCursor } = useEditor();
  const injects = activeLanguage.quickInjects || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
        Click any capsule to inject pre-configured header, library, or template directly into the active editor.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {injects.map((inj, i) => (
          <button
            key={i}
            onClick={() => injectSnippetAtCursor(inj.snippet)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(0, 242, 254, 0.08)',
              border: '1px solid rgba(0, 242, 254, 0.25)',
              borderRadius: 'var(--radius-pill)',
              padding: '4px 10px',
              color: 'var(--text-cyan)',
              fontSize: '11px',
              fontFamily: 'var(--font-code)',
              cursor: 'pointer',
              transition: 'all 150ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 242, 254, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.25)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Zap size={11} />
            <span>{inj.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
