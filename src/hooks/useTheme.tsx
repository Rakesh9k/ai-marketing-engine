'use client';

import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'mitra-theme';

interface ThemeContextType {
  /** What the user chose — including "system". */
  preference: ThemePreference;
  /** What's actually applied right now (system resolved to light/dark). */
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', preference);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    const initial = stored || 'system';
    setPreferenceState(initial);
    setResolvedTheme(initial === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : initial);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      setPreferenceState((current) => {
        if (current === 'system') {
          setResolvedTheme(systemPrefersDark() ? 'dark' : 'light');
        }
        return current;
      });
    };
    media.addEventListener('change', handleSystemChange);
    return () => media.removeEventListener('change', handleSystemChange);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    setResolvedTheme(next === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }, []);

  const toggle = useCallback(() => {
    setPreference(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setPreference]);

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
