import React from 'react';
import { X } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import FileExplorer from './FileExplorer';
import SymbolOutline from './SymbolOutline';
import QuickInject from './QuickInject';
import SettingsView from './SettingsView';

export default function SidebarContainer() {
  const { activeDockItem, isSidebarOpen, setIsSidebarOpen } = useEditor();

  if (!isSidebarOpen) return null;

  const titles = {
    explorer: 'Explorer',
    symbols: 'AST Symbols',
    inject: 'Quick Injects',
    settings: 'Editor Config'
  };

  return (
    <div className="sidebar-panel">
      <div className="sidebar-header">
        <span>{titles[activeDockItem] || 'Sidebar'}</span>
        <button
          onClick={() => setIsSidebarOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 2,
            display: 'flex'
          }}
          title="Close Sidebar"
        >
          <X size={14} />
        </button>
      </div>

      <div className="sidebar-content">
        {activeDockItem === 'explorer' && <FileExplorer />}
        {activeDockItem === 'symbols' && <SymbolOutline />}
        {activeDockItem === 'inject' && <QuickInject />}
        {activeDockItem === 'settings' && <SettingsView />}
      </div>
    </div>
  );
}
