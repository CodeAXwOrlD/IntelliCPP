import React from 'react';
import { ChevronRight, FileCode } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import EditorTabs from './EditorTabs';
import MonacoContainer from './MonacoContainer';
import NeonTerminal from '../terminal/NeonTerminal';

export default function EditorWorkspace() {
  const { activeFile, activeLanguage, cursorPos, isTerminalOpen } = useEditor();

  return (
    <main className="editor-workspace">
      {/* TABS BAR */}
      <EditorTabs />

      {/* BREADCRUMBS HUD */}
      <div className="breadcrumbs-bar">
        <span style={{ color: 'var(--text-cyan)', fontWeight: 600 }}>IntelliCPP</span>
        <ChevronRight size={12} color="var(--text-dim)" />
        <span>src</span>
        <ChevronRight size={12} color="var(--text-dim)" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
          <FileCode size={12} color={activeLanguage.iconColor} />
          <span>{activeFile?.name || 'untitled'}</span>
        </div>
        <ChevronRight size={12} color="var(--text-dim)" />
        <span style={{ color: 'var(--text-muted)' }}>Ln {cursorPos.line}, Col {cursorPos.column}</span>
      </div>

      {/* MONACO CODE EDITOR */}
      <MonacoContainer />

      {/* BOTTOM NEON TERMINAL */}
      {isTerminalOpen && <NeonTerminal />}
    </main>
  );
}
