import React, { useEffect, useRef } from 'react';

const TYPE_COLORS = {
  method:   { bg: '#2f3440', text: '#94a3b8' },
  keyword:  { bg: '#3d2b00', text: '#d29922' },
  class:    { bg: '#334155', text: '#cbd5e1' },
  function: { bg: '#1f2d1d', text: '#3fb950' },
};

export default function SuggestionPopup({ suggestions, selectedIndex, onSelect }) {
  const selectedRef = useRef(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div style={{
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      width: 240,
      maxHeight: 260,
      display: 'flex',
      overflow: 'hidden',
      fontFamily: '"JetBrains Mono", monospace',
    }}>
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 260 }}>
        {suggestions.map((s, i) => {
          const colors = TYPE_COLORS[s.type] || TYPE_COLORS.method;
          const isSelected = i === selectedIndex;
          return (
            <div
              key={`${s.text}-${i}`}
              ref={isSelected ? selectedRef : null}
              onClick={() => onSelect(s)}
              style={{
                padding: '5px 10px',
                cursor: 'pointer',
                background: isSelected ? 'rgba(100, 116, 139, 0.2)' : 'transparent',
                borderLeft: isSelected ? '2px solid #64748b' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background 0.1s',
              }}
            >
              <span style={{
                fontSize: 9,
                background: colors.bg,
                color: colors.text,
                padding: '1px 5px',
                borderRadius: 3,
                minWidth: 40,
                textAlign: 'center',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}>
                {s.type || 'fn'}
              </span>

              <span style={{ fontSize: 12, color: isSelected ? '#e6edf3' : '#8b949e', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.text || s.label}
              </span>

              {s.complexity && s.complexity !== '-' && (
                <span style={{ fontSize: 9, color: '#484f58', whiteSpace: 'nowrap' }}>
                  {s.complexity}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
