// Theme Tokens and Provider for Light and Dark Modes
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  foreground: string;
  foregroundMuted: string;
  card: string;
  cardBorder: string;
  cardOverlay: string;
  border: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  muted: string;
  danger: string;
  success: string;
  dockBackground: string;
  dockBorder: string;
  meshRamp: string[];
}

export const darkTheme: ThemeColors = {
  background: '#090a0f',
  backgroundSecondary: '#12141c',
  foreground: '#f8fafc',
  foregroundMuted: '#94a3b8',
  card: '#141622',
  cardBorder: '#272a3c',
  cardOverlay: 'rgba(9, 10, 15, 0.75)',
  border: '#232636',
  primary: '#e2e8f0',
  primaryForeground: '#090a0f',
  accent: '#6366f1',
  muted: '#1e2235',
  danger: '#ef4444',
  success: '#10b981',
  dockBackground: 'rgba(20, 22, 34, 0.82)',
  dockBorder: 'rgba(255, 255, 255, 0.12)',
  meshRamp: ['#090a0f', '#111320', '#181b2e', '#212640', '#2d3357'],
};

export const lightTheme: ThemeColors = {
  background: '#f4f4f8',
  backgroundSecondary: '#ffffff',
  foreground: '#0f172a',
  foregroundMuted: '#64748b',
  card: '#ffffff',
  cardBorder: '#e2e2ea',
  cardOverlay: 'rgba(255, 255, 255, 0.85)',
  border: '#d0d0dc',
  primary: '#0f172a',
  primaryForeground: '#ffffff',
  accent: '#4f46e5',
  muted: '#f1f1f5',
  danger: '#dc2626',
  success: '#059669',
  dockBackground: 'rgba(255, 255, 255, 0.85)',
  dockBorder: 'rgba(0, 0, 0, 0.08)',
  meshRamp: ['#f4f4f8', '#ffffff', '#e2e2ea', '#d0d0dc', '#c4c4d2'],
};

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: true,
  colors: darkTheme,
  setMode: () => {},
});

const THEME_STORAGE_KEY = '@cultus_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    (AsyncStorage.getItem(THEME_STORAGE_KEY) as Promise<string | null>)
      .then((saved: string | null) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => {});
  };

  const isDark = mode === 'system' ? systemScheme !== 'light' : mode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  return React.createElement(
    ThemeContext.Provider,
    { value: { mode, isDark, colors, setMode } },
    children
  );
};

export const useTheme = () => useContext(ThemeContext);
