import React from 'react';

export default function Sidebar() {
  const activities = [
    { icon: '📄', label: 'Explorer' },
    { icon: '🔍', label: 'Search' },
    { icon: '🌿', label: 'Git' },
    { icon: '🛠️', label: 'Debug' },
    { icon: '🧩', label: 'Extensions' }
  ];

  return (
    <div className="activity-bar">
      {activities.map(activity => (
        <div key={activity.label} className="activity-item" title={activity.label}>
          {activity.icon}
        </div>
      ))}
    </div>
  );
}
