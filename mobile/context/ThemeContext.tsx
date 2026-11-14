import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AppearanceMode = 'System' | 'Light' | 'Dark';

interface Theme {
  background: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  pillContainer: string;
  pillActive: string;
  pillText: string;
  pillTextActive: string;
  separator: string;
  primary: string;
  tabBar: string;
  tabBarInactive: string;
}

interface ThemeContextType {
  appearance: AppearanceMode;
  setAppearance: (mode: AppearanceMode) => void;
  isDarkMode: boolean;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType>({
  appearance: 'Light',
  setAppearance: () => {},
  isDarkMode: false,
  theme: {
    background: '#faf9fe',
    card: '#ffffff',
    border: '#ede9f6',
    text: '#1e1e2e',
    textSecondary: '#7c7c8a',
    pillContainer: '#f4f1fa',
    pillActive: '#6C48C5',
    pillText: '#7c7c8a',
    pillTextActive: '#ffffff',
    separator: '#f4f1fa',
    primary: '#6C48C5',
    tabBar: '#ffffff',
    tabBarInactive: '#9ca3af',
  },
});

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const deviceColorScheme = useDeviceColorScheme();
  const [appearance, setAppearanceState] = useState<AppearanceMode>('Light');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('appAppearance').then((saved) => {
      if (saved === 'System' || saved === 'Light' || saved === 'Dark') {
        setAppearanceState(saved as AppearanceMode);
      }
      setIsLoaded(true);
    });
  }, []);

  const setAppearance = (mode: AppearanceMode) => {
    setAppearanceState(mode);
    AsyncStorage.setItem('appAppearance', mode);
  };

  const isDarkMode = appearance === 'System' ? deviceColorScheme === 'dark' : appearance === 'Dark';

  const theme: Theme = {
    background: isDarkMode ? '#0f0f13' : '#faf9fe',
    card: isDarkMode ? '#1e1e26' : '#ffffff',
    border: isDarkMode ? '#2d2d38' : '#ede9f6',
    text: isDarkMode ? '#ffffff' : '#1e1e2e',
    textSecondary: isDarkMode ? '#a1a1aa' : '#7c7c8a',
    pillContainer: isDarkMode ? '#2d2d38' : '#f4f1fa',
    pillActive: isDarkMode ? '#9333ea' : '#6C48C5',
    pillText: isDarkMode ? '#a1a1aa' : '#7c7c8a',
    pillTextActive: '#ffffff',
    separator: isDarkMode ? '#2d2d38' : '#f4f1fa',
    primary: isDarkMode ? '#9333ea' : '#6C48C5',
    tabBar: isDarkMode ? '#1e1e26' : '#ffffff',
    tabBarInactive: isDarkMode ? '#71717a' : '#9ca3af',
  };

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ appearance, setAppearance, isDarkMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
