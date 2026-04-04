import React from 'react';
import { FileText, Play, Search, Settings } from 'lucide-react';

export default function WelcomeScreen({ onNewFile, onOpenFile, onPanelChange }) {
  const quickActions = [
    {
      icon: FileText,
      title: 'New File',
      description: 'Create a new C++ file',
      action: onNewFile
    },
    {
      icon: Play,
      title: 'Run Code',
      description: 'Execute your C++ code',
      action: () => onPanelChange('run')
    },
    {
      icon: Search,
      title: 'Search',
      description: 'Find and replace in code',
      action: () => onPanelChange('search')
    },
    {
      icon: Settings,
      title: 'Settings',
      description: 'Customize your editor',
      action: () => onPanelChange('settings')
    }
  ];

  return (
    <div className="welcome-screen">
      <div className="welcome-header">
        <h1>Welcome to IntelliCPP</h1>
        <p>Your intelligent C++ development environment</p>
      </div>

      <div className="welcome-content">
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <div
                  key={index}
                  className="action-card"
                  onClick={action.action}
                >
                  <IconComponent size={24} />
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="getting-started">
          <h2>Getting Started</h2>
          <div className="tips-list">
            <div className="tip">
              <strong>💡 Tip:</strong> Use <kbd>Ctrl+N</kbd> to create a new file quickly
            </div>
            <div className="tip">
              <strong>🚀 Run:</strong> Press <kbd>F5</kbd> to compile and run your code
            </div>
            <div className="tip">
              <strong>🔍 Search:</strong> Use <kbd>Ctrl+F</kbd> to find text in your code
            </div>
            <div className="tip">
              <strong>💻 IntelliSense:</strong> Type <code>vector&lt;int&gt; v;</code> then <code>v.</code> to see suggestions
            </div>
          </div>
        </div>

        <div className="features">
          <h2>Features</h2>
          <ul className="features-list">
            <li>✨ Intelligent C++ autocompletion</li>
            <li>🎨 Modern dark theme with glassmorphism</li>
            <li>⚡ Fast compilation and execution</li>
            <li>🔍 Advanced search and replace</li>
            <li>📁 File explorer and management</li>
            <li>🎛️ Customizable editor settings</li>
            <li>📋 Code templates and snippets</li>
            <li>⌨️ Keyboard shortcuts support</li>
          </ul>
        </div>
      </div>
    </div>
  );
}