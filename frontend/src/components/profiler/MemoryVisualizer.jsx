import React, { useState } from 'react';
import { Database, Plus, RefreshCw } from 'lucide-react';

export default function MemoryVisualizer() {
  const [elements, setElements] = useState([3, 1, 4, 1, 5]);
  const [capacity, setCapacity] = useState(8);

  const pushElement = () => {
    const nextVal = Math.floor(Math.random() * 90) + 10;
    const newElements = [...elements, nextVal];
    setElements(newElements);
    if (newElements.length > capacity) {
      setCapacity(capacity * 2); // Vector geometric 2x growth
    }
  };

  const resetVector = () => {
    setElements([3, 1, 4, 1, 5]);
    setCapacity(8);
  };

  return (
    <div className="bento-card">
      <div className="bento-card-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Database size={14} color="var(--accent-violet)" />
          <span>STL Vector Heap Allocator</span>
        </div>
        <button
          onClick={resetVector}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
          title="Reset Buffer"
        >
          <RefreshCw size={11} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-code)' }}>
        <span>Size: <b style={{ color: 'var(--text-cyan)' }}>{elements.length}</b></span>
        <span>Capacity: <b style={{ color: 'var(--text-violet)' }}>{capacity}</b></span>
        <button
          onClick={pushElement}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--accent-cyan-subtle)',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            borderRadius: 'var(--radius-xs)',
            color: 'var(--text-cyan)',
            padding: '2px 8px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          <Plus size={10} />
          <span>push_back()</span>
        </button>
      </div>

      {/* CONTIGUOUS MEMORY BLOCK DIAGRAM */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 3,
        background: 'rgba(7, 8, 11, 0.7)',
        padding: 6,
        borderRadius: 'var(--radius-xs)',
        border: '1px solid var(--border-subtle)',
        marginTop: 4
      }}>
        {Array.from({ length: capacity }).map((_, idx) => {
          const isFilled = idx < elements.length;
          const val = isFilled ? elements[idx] : null;

          return (
            <div
              key={idx}
              style={{
                height: 32,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                background: isFilled 
                  ? 'linear-gradient(180deg, rgba(0, 242, 254, 0.25), rgba(139, 92, 246, 0.15))' 
                  : 'rgba(255, 255, 255, 0.02)',
                border: isFilled ? '1px solid rgba(0, 242, 254, 0.4)' : '1px dashed var(--border-subtle)',
                fontSize: '10px',
                fontFamily: 'var(--font-code)',
                color: isFilled ? 'var(--text-primary)' : 'var(--text-dim)',
                fontWeight: isFilled ? 700 : 400
              }}
              title={isFilled ? `Element[${idx}] = ${val} at 0x7ffe00${idx * 4}` : `Unallocated Capacity Slot[${idx}]`}
            >
              <span>{isFilled ? val : '·'}</span>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-code)', display: 'flex', justifyContent: 'space-between' }}>
        <span>Addr: 0x7ffe000</span>
        <span>2x Geometric Growth</span>
      </div>
    </div>
  );
}
