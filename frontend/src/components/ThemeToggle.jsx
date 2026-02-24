import React from 'react';
import { useTheme } from '../theme/ThemeContext';

export default function ThemeToggle() {
  const { themeName, toggleTheme } = useTheme();
  
  return (
    <button 
      className="theme-toggle"
      onClick={toggleTheme}
      title={themeName === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
    >
      {themeName === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
