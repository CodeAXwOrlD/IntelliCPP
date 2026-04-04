import React, { useState } from 'react';
import { Folder, Search, Play, Puzzle, Settings, FileText, Save, Upload } from 'lucide-react';

export default function Sidebar({ activePanel, onPanelChange, onNewFile, onSaveFile, onOpenFile }) {
  const [activeItem, setActiveItem] = useState(activePanel || 'files');

  const activities = [
    { id: 'files', icon: Folder, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'run', icon: Play, label: 'Run & Debug' },
    { id: 'extensions', icon: Puzzle, label: 'Extensions' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  const handleActivityClick = (activityId) => {
    setActiveItem(activityId);
    if (onPanelChange) {
      onPanelChange(activityId);
    }
  };

  return (
    <div className="activity-bar">
      <div className="activity-actions">
        <div
          className={`activity-item ${activeItem === 'new' ? 'active' : ''}`}
          title="New File"
          onClick={onNewFile}
        >
          <FileText size={18} />
        </div>
        <div
          className={`activity-item ${activeItem === 'save' ? 'active' : ''}`}
          title="Save File"
          onClick={onSaveFile}
        >
          <Save size={18} />
        </div>
        <div
          className={`activity-item ${activeItem === 'open' ? 'active' : ''}`}
          title="Open File"
          onClick={onOpenFile}
        >
          <Upload size={18} />
        </div>
      </div>

      <div className="activity-separator"></div>

      {activities.map((activity) => {
        const IconComponent = activity.icon;
        const isActive = activeItem === activity.id;

        return (
          <div
            key={activity.id}
            className={`activity-item ${isActive ? 'active' : ''}`}
            title={activity.label}
            onClick={() => handleActivityClick(activity.id)}
          >
            <IconComponent size={20} />
          </div>
        );
      })}
    </div>
  );
}
