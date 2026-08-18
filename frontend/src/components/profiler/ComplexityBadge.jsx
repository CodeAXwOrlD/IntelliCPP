import React, { useMemo } from 'react';
import { Gauge, Activity } from 'lucide-react';
import { useEngine } from '../../context/EngineContext';
import { useEditor } from '../../context/EditorContext';
import { getDocumentation } from '../../utils/intelliDocs';

export default function ComplexityBadge() {
  const { activeWord, astTokens } = useEngine();
  const { activeFile } = useEditor();

  const { timeComp, algorithm, spaceComp, status } = useMemo(() => {
    const doc = getDocumentation(activeWord);
    const content = activeFile?.content || '';

    // Check if token under cursor has direct complexity metadata
    if (doc && doc.complexity) {
      const compStr = doc.complexity.split('|')[0].trim();
      return {
        timeComp: compStr.includes('O(') ? compStr : `O(1) [${doc.name}]`,
        algorithm: doc.name,
        spaceComp: `${Math.max(120, astTokens.length * 48 + 420)} B (Stack/Heap)`,
        status: 'OPTIMAL'
      };
    }

    // Check code AST patterns for nested loops or recursion
    const hasNestedLoops = /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)/s.test(content);
    if (hasNestedLoops) {
      return {
        timeComp: 'O(N²)',
        algorithm: 'Nested Loop Scan',
        spaceComp: 'O(1) Auxiliary',
        status: 'WARN'
      };
    }

    const hasSingleLoop = /for\s*\([^)]*\)|while\s*\([^)]*\)/.test(content);
    if (hasSingleLoop) {
      return {
        timeComp: 'O(N)',
        algorithm: 'Linear Iteration',
        spaceComp: 'O(1) Auxiliary',
        status: 'OPTIMAL'
      };
    }

    return {
      timeComp: 'O(1)',
      algorithm: 'Constant Time / Direct',
      spaceComp: `${Math.max(80, astTokens.length * 32 + 256)} B`,
      status: 'PASS'
    };
  }, [activeWord, activeFile?.content, astTokens]);

  return (
    <div className="bento-card">
      <div className="bento-card-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Gauge size={14} color="var(--accent-emerald)" />
          <span>Complexity & Telemetry</span>
        </div>
        <span style={{
          fontSize: '9px',
          background: status === 'OPTIMAL' ? 'rgba(16, 185, 129, 0.15)' : status === 'WARN' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 242, 254, 0.15)',
          color: status === 'OPTIMAL' ? 'var(--text-emerald)' : status === 'WARN' ? 'var(--accent-amber)' : 'var(--text-cyan)',
          padding: '1px 5px',
          borderRadius: 3,
          fontWeight: 700
        }}>
          {status}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 2 }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '6px 8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>TIME COMPLEXITY</div>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-code)', color: 'var(--text-cyan)', fontWeight: 700, marginTop: 2 }}>
            {timeComp}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {algorithm}
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '6px 8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>SPACE FOOTPRINT</div>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-code)', color: 'var(--text-violet)', fontWeight: 700, marginTop: 2 }}>
            {spaceComp}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Activity size={10} color="var(--accent-emerald)" />
            <span>AST Live Tokens: {astTokens.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
