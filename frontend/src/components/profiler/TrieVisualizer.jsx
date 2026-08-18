import React, { useState } from 'react';
import { GitCommit, Search } from 'lucide-react';
import { useEngine } from '../../context/EngineContext';

export default function TrieVisualizer() {
  const { latency } = useEngine();
  const [testPrefix, setTestPrefix] = useState('vec');

  // Simulated Trie Nodes based on prefix
  const trieNodes = [
    { char: 'ROOT', level: 0, active: true },
    { char: testPrefix[0]?.toUpperCase() || 'V', level: 1, active: true },
    { char: testPrefix[1]?.toUpperCase() || 'E', level: 2, active: testPrefix.length >= 2 },
    { char: testPrefix[2]?.toUpperCase() || 'C', level: 3, active: testPrefix.length >= 3 },
    { char: 'TOR', level: 4, isTerminal: true, symbol: 'std::vector', active: testPrefix.length >= 3 }
  ];

  return (
    <div className="bento-card">
      <div className="bento-card-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <GitCommit size={14} color="var(--accent-cyan)" />
          <span>O(L) Trie Prefix Graph</span>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-emerald)' }}>⚡ {latency}µs</span>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        Prefix lookup complexity depends only on query length <i>L</i>, not total symbols <i>N</i>.
      </div>

      {/* PREFIX TESTER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0' }}>
        <Search size={12} color="var(--text-muted)" />
        <input
          type="text"
          value={testPrefix}
          onChange={(e) => setTestPrefix(e.target.value)}
          placeholder="Test prefix (e.g. vec, sor, mak)"
          style={{
            flex: 1,
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xs)',
            color: 'var(--text-cyan)',
            padding: '3px 6px',
            fontSize: '11px',
            fontFamily: 'var(--font-code)',
            outline: 'none'
          }}
        />
      </div>

      {/* INTERACTIVE NODE GRAPH */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(7, 8, 11, 0.7)',
        padding: '10px 8px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        marginTop: 4
      }}>
        {trieNodes.map((node, idx) => (
          <React.Fragment key={idx}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2
            }}>
              <div style={{
                width: node.level === 0 ? 28 : 24,
                height: 24,
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontFamily: 'var(--font-code)',
                fontWeight: 700,
                background: node.active ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(139, 92, 246, 0.2))' : 'rgba(255, 255, 255, 0.04)',
                border: node.active ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                color: node.active ? 'var(--text-cyan)' : 'var(--text-dim)',
                boxShadow: node.active ? '0 0 8px rgba(0, 242, 254, 0.3)' : 'none',
                transition: 'all 200ms ease'
              }}>
                {node.char}
              </div>
              {node.isTerminal && (
                <span style={{ fontSize: '8px', color: 'var(--accent-emerald)', fontWeight: 600 }}>Leaf</span>
              )}
            </div>
            {idx < trieNodes.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                background: node.active ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                boxShadow: node.active ? '0 0 6px var(--accent-cyan)' : 'none',
                margin: '0 4px',
                transition: 'all 200ms ease'
              }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
