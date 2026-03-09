import React, { useState } from 'react';
import { Folder, Search, Play, Puzzle, Settings } from 'lucide-react';

export default function Sidebar() {
  const [activeItem, setActiveItem] = useState('files');

  const activities = [
    { id: 'files', icon: Folder, label: 'Files' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'run', icon: Play, label: 'Run' },
    { id: 'extensions', icon: Puzzle, label: 'Extensions' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="activity-bar">
      {activities.map((activity) => {
        const IconComponent = activity.icon;
        const isActive = activeItem === activity.id;
        
        return (
          <div 
            key={activity.id} 
            className={`activity-item ${isActive ? 'active' : ''}`}
            title={activity.label}
            onClick={() => setActiveItem(activity.id)}
          >
            <IconComponent size={20} />
          </div>
        );
      })}
    </div>
  );
}
