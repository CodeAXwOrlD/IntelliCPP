import React from 'react';
import { Cpu, X } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import TrieVisualizer from './TrieVisualizer';
import MemoryVisualizer from './MemoryVisualizer';
import ComplexityBadge from './ComplexityBadge';

export default function BentoProfiler() {
  const { isProfilerOpen, setIsProfilerOpen } = useEditor();

  if (!isProfilerOpen) return null;

  return (
    <aside className="profiler-panel">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 4,
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={15} color="var(--accent-cyan)" />
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-code)', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
            Live Engine Profiler
          </span>
        </div>
        <button
          onClick={() => setIsProfilerOpen(false)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}
          title="Close Profiler"
        >
          <X size={14} />
        </button>
      </div>

      <TrieVisualizer />
      <MemoryVisualizer />
      <ComplexityBadge />
    </aside>
  );
}
