import React from 'react';
import { Code } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

export default function QuickInject() {
  const { activeLanguage, injectSnippetAtCursor } = useEditor();
  const injects = activeLanguage.quickInjects || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
        Inject pre-configured header or boilerplate template directly into the cursor position.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {injects.map((inj, i) => (
          <button
            key={i}
            onClick={() => injectSnippetAtCursor(inj.snippet)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              padding: '4px 8px',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'var(--font-code)',
              cursor: 'pointer',
              transition: 'border-color 120ms ease, background 120ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-hover)';
              e.currentTarget.style.background = 'var(--bg-glass-active)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.background = 'var(--bg-surface-elevated)';
            }}
          >
            <Code size={11} color="var(--text-muted)" />
            <span>{inj.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
