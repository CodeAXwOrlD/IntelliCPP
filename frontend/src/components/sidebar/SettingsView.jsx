import React from 'react';
import { useEditor } from '../../context/EditorContext';

export default function SettingsView() {
  const { editorSettings, setEditorSettings } = useEditor();

  const toggle = (key) => {
    setEditorSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setFont = (size) => {
    setEditorSettings(prev => ({ ...prev, fontSize: Number(size) }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* FONT SIZE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Editor Font Size ({editorSettings.fontSize}px)</label>
        <input
          type="range"
          min="12"
          max="20"
          value={editorSettings.fontSize}
          onChange={(e) => setFont(e.target.value)}
          style={{ accentColor: 'var(--accent-cyan)' }}
        />
      </div>

      {/* TOGGLES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer' }}>
          <span>Minimap</span>
          <input
            type="checkbox"
            checked={editorSettings.minimap}
            onChange={() => toggle('minimap')}
            style={{ accentColor: 'var(--accent-cyan)' }}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer' }}>
          <span>Word Wrap</span>
          <input
            type="checkbox"
            checked={editorSettings.wordWrap}
            onChange={() => toggle('wordWrap')}
            style={{ accentColor: 'var(--accent-cyan)' }}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer' }}>
          <span>Font Ligatures</span>
          <input
            type="checkbox"
            checked={editorSettings.fontLigatures}
            onChange={() => toggle('fontLigatures')}
            style={{ accentColor: 'var(--accent-cyan)' }}
          />
        </label>
      </div>
    </div>
  );
}
