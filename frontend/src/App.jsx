import React from 'react';
import { EditorProvider } from './context/EditorContext';
import { EngineProvider } from './context/EngineContext';
import NavbarHUD from './components/layout/NavbarHUD';
import ActivityDock from './components/layout/ActivityDock';
import SidebarContainer from './components/sidebar/SidebarContainer';
import EditorWorkspace from './components/editor/EditorWorkspace';
import BentoProfiler from './components/profiler/BentoProfiler';
import StatusBar from './components/layout/StatusBar';
import CommandPalette from './components/modals/CommandPalette';

import './styles/designTokens.css';
import './styles/bentoLayout.css';
import './styles/animations.css';

function IDEWorkspace() {
  return (
    <div className="app-container bg-ambient-grid">
      {/* TOP NAVBAR HUD */}
      <NavbarHUD />

      {/* MAIN BODY: ACTIVITY DOCK + SIDEBAR + EDITOR + PROFILER */}
      <div className="workspace-body">
        <ActivityDock />
        <SidebarContainer />
        <EditorWorkspace />
        <BentoProfiler />
      </div>

      {/* BOTTOM STATUS BAR */}
      <StatusBar />

      {/* MODALS */}
      <CommandPalette />
    </div>
  );
}

export default function App() {
  return (
    <EditorProvider>
      <EngineProvider>
        <IDEWorkspace />
      </EngineProvider>
    </EditorProvider>
  );
}
