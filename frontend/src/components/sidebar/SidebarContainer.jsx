import React, { useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import FileExplorer from './FileExplorer';
import SymbolOutline from './SymbolOutline';
import QuickInject from './QuickInject';
import SettingsView from './SettingsView';

export default function SidebarContainer() {
  const { 
    activeDockItem, 
    isSidebarOpen, 
    setIsSidebarOpen, 
    sidebarWidth, 
    setSidebarWidth 
  } = useEditor();

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(sidebarWidth);

  const startResize = useCallback((clientX) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    startXRef.current = clientX;
    startWidthRef.current = sidebarWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const currentX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      if (currentX === undefined) return;
      const deltaX = currentX - startXRef.current;
      const minWidth = 180;
      const maxWidth = Math.min(550, Math.floor(window.innerWidth * 0.5));
      const newWidth = Math.min(Math.max(startWidthRef.current + deltaX, minWidth), maxWidth);
      setSidebarWidth(newWidth);
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
  }, [sidebarWidth, setSidebarWidth]);

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
    // Toggle between default (250px) and wide (380px)
    setSidebarWidth(prev => (prev > 300 ? 250 : 380));
  };

  if (!isSidebarOpen) return null;

  const titles = {
    explorer: 'Explorer',
    symbols: 'AST Symbols',
    inject: 'Quick Injects',
    settings: 'Editor Config'
  };

  return (
    <>
      <div 
        className="drawer-backdrop sidebar-backdrop" 
        onClick={() => setIsSidebarOpen(false)}
        aria-label="Close sidebar overlay"
      />
      <div 
        className={`sidebar-panel ${isDragging ? 'resizing' : ''}`}
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="sidebar-header">
          <span>{titles[activeDockItem] || 'Sidebar'}</span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="sidebar-close-btn"
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
            title="Close Sidebar"
            aria-label="Close Sidebar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="sidebar-content">
          {activeDockItem === 'explorer' && <FileExplorer />}
          {activeDockItem === 'symbols' && <SymbolOutline />}
          {activeDockItem === 'inject' && <QuickInject />}
          {activeDockItem === 'settings' && <SettingsView />}
        </div>

        {/* DRAGGABLE RESIZE HANDLE ON RIGHT EDGE */}
        <div 
          className="sidebar-resizer"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={handleDoubleClick}
          title="Drag left/right to resize sidebar | Double click to cycle width"
          aria-label="Resize sidebar handle"
        >
          <div className="resizer-handle-indicator-v" />
        </div>
      </div>
    </>
  );
}
