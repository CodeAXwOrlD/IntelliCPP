import React, { useState } from 'react';
import { Settings, Palette, Keyboard, Code, Zap } from 'lucide-react';

export default function SettingsPanel({ settings, onSettingsChange }) {
  const [activeSection, setActiveSection] = useState('editor');

  const sections = [
    { id: 'editor', icon: Code, label: 'Editor', component: EditorSettings },
    { id: 'theme', icon: Palette, label: 'Theme', component: ThemeSettings },
    { id: 'shortcuts', icon: Keyboard, label: 'Shortcuts', component: ShortcutsSettings },
    { id: 'performance', icon: Zap, label: 'Performance', component: PerformanceSettings }
  ];

  const ActiveComponent = sections.find(s => s.id === activeSection)?.component;

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h3>SETTINGS</h3>
      </div>

      <div className="settings-content">
        <div className="settings-sidebar">
          {sections.map((section) => {
            const IconComponent = section.icon;
            return (
              <div
                key={section.id}
                className={`settings-section ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <IconComponent size={16} />
                <span>{section.label}</span>
              </div>
            );
          })}
        </div>

        <div className="settings-main">
          {ActiveComponent && <ActiveComponent settings={settings} onSettingsChange={onSettingsChange} />}
        </div>
      </div>
    </div>
  );
}

function EditorSettings({ settings, onSettingsChange }) {
  const updateSetting = (key, value) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="settings-section-content">
      <h4>Editor Settings</h4>

      <div className="setting-group">
        <label>
          <input
            type="checkbox"
            checked={settings.minimap || false}
            onChange={(e) => updateSetting('minimap', e.target.checked)}
          />
          Show Minimap
        </label>
      </div>

      <div className="setting-group">
        <label>
          <input
            type="checkbox"
            checked={settings.wordWrap || false}
            onChange={(e) => updateSetting('wordWrap', e.target.checked)}
          />
          Word Wrap
        </label>
      </div>

      <div className="setting-group">
        <label>
          <input
            type="checkbox"
            checked={settings.lineNumbers || true}
            onChange={(e) => updateSetting('lineNumbers', e.target.checked)}
          />
          Show Line Numbers
        </label>
      </div>

      <div className="setting-group">
        <label>
          Font Size: {settings.fontSize || 14}px
          <input
            type="range"
            min="10"
            max="24"
            value={settings.fontSize || 14}
            onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
          />
        </label>
      </div>

      <div className="setting-group">
        <label>
          <input
            type="checkbox"
            checked={settings.autoSave || false}
            onChange={(e) => updateSetting('autoSave', e.target.checked)}
          />
          Auto Save
        </label>
      </div>
    </div>
  );
}

function ThemeSettings({ settings, onSettingsChange }) {
  const themes = [
    { id: 'vs-dark', name: 'Dark', preview: '🌓' },
    { id: 'vs-light', name: 'Light', preview: '☀️' },
    { id: 'hc-black', name: 'High Contrast', preview: '⚫' }
  ];

  return (
    <div className="settings-section-content">
      <h4>Theme Settings</h4>

      <div className="setting-group">
        <label>Editor Theme:</label>
        <div className="theme-options">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className={`theme-option ${settings.theme === theme.id ? 'active' : ''}`}
              onClick={() => onSettingsChange({ ...settings, theme: theme.id })}
            >
              <span className="theme-preview">{theme.preview}</span>
              <span>{theme.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShortcutsSettings() {
  const shortcuts = [
    { keys: 'Ctrl+S', action: 'Save File' },
    { keys: 'Ctrl+O', action: 'Open File' },
    { keys: 'Ctrl+N', action: 'New File' },
    { keys: 'Ctrl+F', action: 'Find' },
    { keys: 'Ctrl+H', action: 'Replace' },
    { keys: 'F5', action: 'Run Code' },
    { keys: 'F6', action: 'Stop Execution' },
    { keys: 'Ctrl+Shift+P', action: 'Command Palette' }
  ];

  return (
    <div className="settings-section-content">
      <h4>Keyboard Shortcuts</h4>

      <div className="shortcuts-list">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="shortcut-item">
            <kbd className="shortcut-keys">{shortcut.keys}</kbd>
            <span className="shortcut-action">{shortcut.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceSettings({ settings, onSettingsChange }) {
  return (
    <div className="settings-section-content">
      <h4>Performance Settings</h4>

      <div className="setting-group">
        <label>
          <input
            type="checkbox"
            checked={settings.suggestions || true}
            onChange={(e) => onSettingsChange({ ...settings, suggestions: e.target.checked })}
          />
          Enable IntelliSense
        </label>
      </div>

      <div className="setting-group">
        <label>
          <input
            type="checkbox"
            checked={settings.syntaxHighlighting || true}
            onChange={(e) => onSettingsChange({ ...settings, syntaxHighlighting: e.target.checked })}
          />
          Syntax Highlighting
        </label>
      </div>

      <div className="setting-group">
        <label>
          Cache Duration: {settings.cacheDuration || 500}ms
          <input
            type="range"
            min="100"
            max="2000"
            step="100"
            value={settings.cacheDuration || 500}
            onChange={(e) => onSettingsChange({ ...settings, cacheDuration: parseInt(e.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}