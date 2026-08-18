import React from 'react';
import { Gauge } from 'lucide-react';
import { useEngine } from '../../context/EngineContext';

export default function ComplexityBadge() {
  const { executionStats } = useEngine();

  return (
    <div className="bento-card">
      <div className="bento-card-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Gauge size={14} color="var(--accent-emerald)" />
          <span>Complexity & Telemetry</span>
        </div>
        <span style={{ fontSize: '9px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--text-emerald)', padding: '1px 5px', borderRadius: 3 }}>
          PASS
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 2 }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '6px 8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>TIME COMPLEXITY</div>
          <div style={{ fontSize: '12px', fontFamily: 'var(--font-code)', color: 'var(--text-cyan)', fontWeight: 700, marginTop: 2 }}>
            O(N log N)
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '6px 8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>SPACE FOOTPRINT</div>
          <div style={{ fontSize: '12px', fontFamily: 'var(--font-code)', color: 'var(--text-violet)', fontWeight: 700, marginTop: 2 }}>
            {executionStats.memoryUsageKb} KB
          </div>
        </div>
      </div>
    </div>
  );
}
