import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Check localStorage first, otherwise default to false (light mode)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('liblog-dark-mode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    return false; // Default to light mode
  });

  useEffect(() => {
    // Save to localStorage whenever it changes
    localStorage.setItem('liblog-dark-mode', JSON.stringify(isDarkMode));
    
    // Toggle the 'dark' class on the root html element
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
