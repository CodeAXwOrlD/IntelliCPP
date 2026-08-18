import React, { useState, useEffect } from 'react';
import { GitCommit, Search } from 'lucide-react';
import { useEngine } from '../../context/EngineContext';
import { getDocumentation } from '../../utils/intelliDocs';

export default function TrieVisualizer() {
  const { latency, activeWord } = useEngine();
  const [manualPrefix, setManualPrefix] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Use active editor word if available, else manual test input
  const currentQuery = isSearching ? manualPrefix : (activeWord || manualPrefix || 'vec');
  const cleanQuery = currentQuery.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 5);

  const [displayNodes, setDisplayNodes] = useState([]);

  useEffect(() => {
    const chars = cleanQuery.toUpperCase().split('');
    const matchedDoc = getDocumentation(currentQuery);

    const nodes = [
      { char: 'ROOT', level: 0, active: true }
    ];

    chars.forEach((ch, idx) => {
      nodes.push({
        char: ch,
        level: idx + 1,
        active: true
      });
    });

    if (matchedDoc || cleanQuery.length >= 3) {
      nodes.push({
        char: matchedDoc ? matchedDoc.name.replace(/^std::/, '').slice(0, 4).toUpperCase() : 'LEAF',
        level: chars.length + 1,
        isTerminal: true,
        symbol: matchedDoc ? matchedDoc.name : `match(${cleanQuery})`,
        active: true
      });
    }

    setDisplayNodes(nodes);
  }, [cleanQuery, currentQuery]);

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

      {/* PREFIX TESTER / LIVE INDICATOR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0' }}>
        <Search size={12} color="var(--text-muted)" />
        <input
          type="text"
          value={isSearching ? manualPrefix : (activeWord || manualPrefix)}
          onFocus={() => setIsSearching(true)}
          onBlur={() => !manualPrefix && setIsSearching(false)}
          onChange={(e) => {
            setManualPrefix(e.target.value);
            setIsSearching(true);
          }}
          placeholder={activeWord ? `Live: ${activeWord}` : 'Type prefix (e.g. vec, sor)'}
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
        {!isSearching && activeWord && (
          <span style={{ fontSize: '9px', background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)', padding: '2px 5px', borderRadius: 3 }}>
            LIVE
          </span>
        )}
      </div>

      {/* DYNAMIC NODE GRAPH */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(7, 8, 11, 0.7)',
        padding: '10px 8px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        marginTop: 4,
        overflowX: 'auto'
      }}>
        {displayNodes.map((node, idx) => (
          <React.Fragment key={idx}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              flexShrink: 0
            }}>
              <div style={{
                width: node.level === 0 ? 28 : (node.isTerminal ? 32 : 24),
                height: 24,
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: node.isTerminal ? '9px' : '10px',
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
            {idx < displayNodes.length - 1 && (
              <div style={{
                flex: 1,
                minWidth: 8,
                height: 2,
                background: node.active ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                boxShadow: node.active ? '0 0 6px var(--accent-cyan)' : 'none',
                margin: '0 3px',
                transition: 'all 200ms ease'
              }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
