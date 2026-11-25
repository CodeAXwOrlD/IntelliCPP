import React, { useState, useEffect } from 'react';
import { Database, Plus, Minus, RefreshCw, Zap } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

export default function MemoryVisualizer() {
  const { activeFile } = useEditor();
  const [elements, setElements] = useState([3, 1, 4, 1, 5]);
  const [capacity, setCapacity] = useState(8);
  const [baseAddr, setBaseAddr] = useState('0x7ffe000');
  const [reallocFlash, setReallocFlash] = useState(false);

  // Sync initial state if code has vector initializer
  useEffect(() => {
    if (!activeFile?.content) return;
    const match = activeFile.content.match(/vector<\w+>\s+\w+\s*=\s*\{([^}]+)\}/);
    if (match && match[1]) {
      const parsed = match[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      if (parsed.length > 0 && parsed.length <= 16) {
        setElements(parsed);
        let cap = 4;
        while (cap < parsed.length) cap *= 2;
        setCapacity(cap);
      }
    }
  }, [activeFile?.content]);

  const pushElement = () => {
    const nextVal = Math.floor(Math.random() * 90) + 10;
    const newLength = elements.length + 1;
    
    if (newLength > capacity) {
      // Vector 2x geometric growth & heap reallocation
      const newCap = capacity * 2;
      setCapacity(newCap);
      const newHex = '0x7ffe' + (Math.floor(Math.random() * 800) + 100).toString(16);
      setBaseAddr(newHex);
      setReallocFlash(true);
      setTimeout(() => setReallocFlash(false), 1200);
    }
    
    setElements([...elements, nextVal]);
  };

  const popElement = () => {
    if (elements.length > 0) {
      setElements(elements.slice(0, -1));
    }
  };

  const resetVector = () => {
    setElements([3, 1, 4, 1, 5]);
    setCapacity(8);
    setBaseAddr('0x7ffe000');
    setReallocFlash(false);
  };

  const shrinkToFit = () => {
    if (elements.length > 0 && elements.length !== capacity) {
      setCapacity(elements.length);
      const newHex = '0x7ffe' + (Math.floor(Math.random() * 800) + 100).toString(16);
      setBaseAddr(newHex);
      setReallocFlash(true);
      setTimeout(() => setReallocFlash(false), 1200);
    }
  };

  return (
    <div className="bento-card">
      <div className="bento-card-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Database size={14} color="var(--accent-violet)" />
          <span>STL Vector Heap Allocator</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={resetVector}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 2 }}
            title="Reset Buffer"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      {/* METRICS & CONTROLS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-code)' }}>
        <span>Size: <b style={{ color: 'var(--text-primary)' }}>{elements.length}</b></span>
        <span>Cap: <b style={{ color: 'var(--text-secondary)' }}>{capacity}</b></span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={pushElement}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-primary)',
              padding: '2px 6px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
            title="push_back() O(1) amortized"
          >
            <Plus size={10} />
            <span>push</span>
          </button>
          <button
            onClick={popElement}
            disabled={elements.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-secondary)',
              padding: '2px 6px',
              fontSize: '11px',
              cursor: elements.length === 0 ? 'not-allowed' : 'pointer',
              opacity: elements.length === 0 ? 0.4 : 1
            }}
            title="pop_back() O(1)"
          >
            <Minus size={10} />
            <span>pop</span>
          </button>
          <button
            onClick={shrinkToFit}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-muted)',
              padding: '2px 6px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
            title="shrink_to_fit()"
          >
            shrink
          </button>
        </div>
      </div>

      {/* REALLOCATION ALERT */}
      {reallocFlash && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: '10px',
          color: 'var(--accent-amber)',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          padding: '3px 8px',
          borderRadius: 3
        }}>
          <Zap size={10} />
          <span><b>Buffer Resized:</b> Vector reallocated to {baseAddr} (2x geometric growth)</span>
        </div>
      )}

      {/* CONTIGUOUS MEMORY BLOCK DIAGRAM */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(capacity, 16)}, 1fr)`,
        gap: 3,
        background: 'var(--bg-void)',
        padding: 5,
        borderRadius: 'var(--radius-xs)',
        border: reallocFlash ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
        marginTop: 4,
        transition: 'border 200ms ease'
      }}>
        {Array.from({ length: capacity }).map((_, idx) => {
          const isFilled = idx < elements.length;
          const val = isFilled ? elements[idx] : null;

          return (
            <div
              key={idx}
              style={{
                height: 28,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                background: isFilled 
                  ? 'var(--bg-surface-elevated)' 
                  : 'transparent',
                border: isFilled ? '1px solid var(--border-hover)' : '1px dashed var(--border-subtle)',
                fontSize: '10px',
                fontFamily: 'var(--font-code)',
                color: isFilled ? 'var(--text-primary)' : 'var(--text-dim)',
                fontWeight: isFilled ? 600 : 400,
                transition: 'all 120ms ease'
              }}
              title={isFilled ? `Element[${idx}] = ${val}` : `Empty Capacity Slot[${idx}]`}
            >
              <span>{isFilled ? val : '·'}</span>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-code)', display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span>Heap Buffer {baseAddr}</span>
        <span>Contiguous Int32 [4B]</span>
      </div>
    </div>
  );
}
