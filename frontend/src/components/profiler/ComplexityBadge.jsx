import React, { useMemo } from 'react';
import { Gauge, Activity, Sparkles } from 'lucide-react';
import { useEngine } from '../../context/EngineContext';
import { useEditor } from '../../context/EditorContext';
import { analyzeComplexity } from '../../utils/complexityAnalyzer';

export default function ComplexityBadge() {
  const { astTokens } = useEngine();
  const { activeFile, activeLanguage } = useEditor();

  const complexityReport = useMemo(() => {
    const code = activeFile?.content || '';
    return analyzeComplexity(code, activeLanguage?.id || 'cpp');
  }, [activeFile?.content, activeLanguage?.id]);

  const { timeComp, timeReason, spaceComp, spaceReason, status, details } = complexityReport;

  const statusBadgeStyle = {
    fontSize: '9px',
    background:
      status === 'OPTIMAL'
        ? 'rgba(16, 185, 129, 0.15)'
        : status === 'WARN'
        ? 'rgba(245, 158, 11, 0.15)'
        : status === 'HIGH'
        ? 'rgba(244, 63, 94, 0.15)'
        : 'rgba(0, 242, 254, 0.15)',
    color:
      status === 'OPTIMAL'
        ? 'var(--text-emerald)'
        : status === 'WARN'
        ? 'var(--accent-amber)'
        : status === 'HIGH'
        ? 'var(--accent-coral)'
        : 'var(--text-cyan)',
    padding: '2px 6px',
    borderRadius: 'var(--radius-xs)',
    fontWeight: 700,
    letterSpacing: '0.04em'
  };

  return (
    <div className="bento-card">
      <div className="bento-card-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Gauge size={14} color="var(--accent-emerald)" />
          <span>Real-Time Complexity & Telemetry</span>
        </div>
        <span style={statusBadgeStyle}>
          {status}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
        {/* TIME COMPLEXITY CARD */}
        <div 
          style={{ 
            background: 'rgba(255, 255, 255, 0.02)', 
            padding: '8px 10px', 
            borderRadius: 'var(--radius-xs)', 
            border: '1px solid var(--border-subtle)' 
          }}
          title={timeReason}
        >
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
            TIME COMPLEXITY
          </div>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-code)', color: 'var(--text-cyan)', fontWeight: 700, marginTop: 2 }}>
            {timeComp}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {timeReason}
          </div>
        </div>

        {/* SPACE COMPLEXITY CARD */}
        <div 
          style={{ 
            background: 'rgba(255, 255, 255, 0.02)', 
            padding: '8px 10px', 
            borderRadius: 'var(--radius-xs)', 
            border: '1px solid var(--border-subtle)' 
          }}
          title={spaceReason}
        >
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
            SPACE COMPLEXITY
          </div>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-code)', color: 'var(--text-violet)', fontWeight: 700, marginTop: 2 }}>
            {spaceComp}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {spaceReason}
          </div>
        </div>
      </div>

      {/* REASONING & TELEMETRY FOOTER */}
      {details && details.length > 0 && (
        <div style={{ 
          marginTop: 6, 
          padding: '4px 8px', 
          background: 'rgba(0, 242, 254, 0.03)', 
          border: '1px solid rgba(0, 242, 254, 0.1)', 
          borderRadius: 'var(--radius-xs)',
          fontSize: '10px',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <Sparkles size={11} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {details[0]}
          </span>
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        fontSize: '9px', 
        color: 'var(--text-dim)', 
        marginTop: 4,
        paddingTop: 4,
        borderTop: '1px solid rgba(255, 255, 255, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Activity size={10} color="var(--accent-emerald)" />
          <span>AST Tokens: {astTokens?.length || 0}</span>
        </div>
        <span>Real-Time Static Engine</span>
      </div>
    </div>
  );
}
