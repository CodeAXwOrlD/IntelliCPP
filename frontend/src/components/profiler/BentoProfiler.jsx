import React, { useRef, useState, useCallback } from 'react';
import { Cpu, X } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import TrieVisualizer from './TrieVisualizer';
import MemoryVisualizer from './MemoryVisualizer';
import ComplexityBadge from './ComplexityBadge';

export default function BentoProfiler() {
  const { 
    isProfilerOpen, 
    setIsProfilerOpen, 
    profilerWidth, 
    setProfilerWidth 
  } = useEditor();

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(profilerWidth);

  const startResize = useCallback((clientX) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    startXRef.current = clientX;
    startWidthRef.current = profilerWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const currentX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      if (currentX === undefined) return;
      const deltaX = startXRef.current - currentX;
      const minWidth = 240;
      const maxWidth = Math.min(550, Math.floor(window.innerWidth * 0.5));
      const newWidth = Math.min(Math.max(startWidthRef.current + deltaX, minWidth), maxWidth);
      setProfilerWidth(newWidth);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove, { passive: false });
    window.addEventListener('touchend', onMouseUp);
  }, [profilerWidth, setProfilerWidth]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    startResize(e.clientX);
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      startResize(e.touches[0].clientX);
    }
  };

  const handleDoubleClick = () => {
    setProfilerWidth(prev => (prev > 340 ? 320 : 440));
  };

  if (!isProfilerOpen) return null;

  return (
    <>
      <div 
        className="drawer-backdrop profiler-backdrop" 
        onClick={() => setIsProfilerOpen(false)}
        aria-label="Close profiler overlay"
      />
      <aside 
        className={`profiler-panel ${isDragging ? 'resizing' : ''}`}
        style={{ width: `${profilerWidth}px` }}
      >
        {/* DRAGGABLE RESIZE HANDLE ON LEFT EDGE */}
        <div 
          className="profiler-resizer"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={handleDoubleClick}
          title="Drag left/right to resize profiler | Double click to cycle width"
          aria-label="Resize profiler handle"
        >
          <div className="resizer-handle-indicator-v" />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 6,
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
            className="profiler-close-btn"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-xs)'
            }}
            title="Close Profiler"
            aria-label="Close Profiler"
          >
            <X size={16} />
          </button>
        </div>

        <TrieVisualizer />
        <MemoryVisualizer />
        <ComplexityBadge />
      </aside>
    </>
  );
}
