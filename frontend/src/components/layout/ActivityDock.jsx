import React from 'react';
import { 
  FolderTree, 
  Binary, 
  Zap, 
  Settings, 
  FilePlus, 
  Save 
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

export default function ActivityDock() {
  const { 
    activeDockItem, 
    setActiveDockItem, 
    isSidebarOpen, 
    setIsSidebarOpen, 
    createNewFile, 
    saveActiveFile,
    activeLanguage 
  } = useEditor();

  const handleDockClick = (id) => {
    if (activeDockItem === id && isSidebarOpen) {
      setIsSidebarOpen(false);
    } else {
      setActiveDockItem(id);
      setIsSidebarOpen(true);
    }
  };

  return (
    <aside className="activity-dock">
      <div className="dock-group">
        {/* QUICK ACTIONS */}
        <div 
          className="dock-item"
          title="New File"
          aria-label="New File"
          role="button"
          tabIndex={0}
          onClick={() => createNewFile(null, activeLanguage.id)}
        >
          <FilePlus size={18} />
        </div>
        <div 
          className="dock-item"
          title="Save Active File (⌘S)"
          aria-label="Save Active File"
          role="button"
          tabIndex={0}
          onClick={saveActiveFile}
        >
          <Save size={18} />
        </div>

        <div style={{ width: '60%', height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

        {/* SIDEBAR VIEWS */}
        <div 
          className={`dock-item ${activeDockItem === 'explorer' && isSidebarOpen ? 'active' : ''}`}
          title="File Explorer"
          aria-label="File Explorer"
          role="button"
          tabIndex={0}
          onClick={() => handleDockClick('explorer')}
        >
          <FolderTree size={19} />
        </div>

        <div 
          className={`dock-item ${activeDockItem === 'symbols' && isSidebarOpen ? 'active' : ''}`}
          title="AST Symbol Outline"
          aria-label="AST Symbol Outline"
          role="button"
          tabIndex={0}
          onClick={() => handleDockClick('symbols')}
        >
          <Binary size={19} />
        </div>

        <div 
          className={`dock-item ${activeDockItem === 'inject' && isSidebarOpen ? 'active' : ''}`}
          title="Quick Header & Library Injector"
          aria-label="Quick Header & Library Injector"
          role="button"
          tabIndex={0}
          onClick={() => handleDockClick('inject')}
        >
          <Zap size={19} />
        </div>
      </div>

      <div className="dock-group">
        <div 
          className="dock-item"
          title="Settings"
          aria-label="Editor Settings"
          role="button"
          tabIndex={0}
          onClick={() => handleDockClick('settings')}
        >
          <Settings size={18} />
        </div>
      </div>
    </aside>
  );
}
