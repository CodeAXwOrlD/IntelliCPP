import React, { createContext, useContext, useState, useEffect } from 'react';
import { themes } from './themes';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    const theme = themes[themeName];
    Object.keys(theme).forEach(key => {
      if (key.startsWith('--')) {
        document.documentElement.style.setProperty(key, theme[key]);
      }
    });
    localStorage.setItem('theme', themeName);
  }, [themeName]);

  const toggleTheme = () => {
    setThemeName(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme: themes[themeName], themeName, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
