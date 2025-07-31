'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'orderbook-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  // Get system preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Resolve the actual theme to apply
  const getResolvedTheme = (currentTheme: Theme): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      return getSystemTheme();
    }
    return currentTheme;
  };

  // Apply theme to document
  const applyTheme = (themeToApply: 'light' | 'dark') => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(themeToApply);
    
    // Update CSS custom properties for the theme
    if (themeToApply === 'dark') {
      root.style.setProperty('--background', '#0a0a0a');
      root.style.setProperty('--foreground', '#ededed');
      root.style.setProperty('--card', '#1a1a1a');
      root.style.setProperty('--card-foreground', '#ededed');
      root.style.setProperty('--popover', '#1a1a1a');
      root.style.setProperty('--popover-foreground', '#ededed');
      root.style.setProperty('--primary', '#3b82f6');
      root.style.setProperty('--primary-foreground', '#ffffff');
      root.style.setProperty('--secondary', '#374151');
      root.style.setProperty('--secondary-foreground', '#ededed');
      root.style.setProperty('--muted', '#374151');
      root.style.setProperty('--muted-foreground', '#9ca3af');
      root.style.setProperty('--accent', '#374151');
      root.style.setProperty('--accent-foreground', '#ededed');
      root.style.setProperty('--destructive', '#ef4444');
      root.style.setProperty('--destructive-foreground', '#ffffff');
      root.style.setProperty('--border', '#374151');
      root.style.setProperty('--input', '#374151');
      root.style.setProperty('--ring', '#3b82f6');
      root.style.setProperty('--orderbook-bid', '#10b981');
      root.style.setProperty('--orderbook-ask', '#ef4444');
      root.style.setProperty('--orderbook-surface', '#1f2937');
      root.style.setProperty('--orderbook-grid', '#374151');
    } else {
      root.style.setProperty('--background', '#ffffff');
      root.style.setProperty('--foreground', '#171717');
      root.style.setProperty('--card', '#ffffff');
      root.style.setProperty('--card-foreground', '#171717');
      root.style.setProperty('--popover', '#ffffff');
      root.style.setProperty('--popover-foreground', '#171717');
      root.style.setProperty('--primary', '#2563eb');
      root.style.setProperty('--primary-foreground', '#ffffff');
      root.style.setProperty('--secondary', '#f3f4f6');
      root.style.setProperty('--secondary-foreground', '#171717');
      root.style.setProperty('--muted', '#f3f4f6');
      root.style.setProperty('--muted-foreground', '#6b7280');
      root.style.setProperty('--accent', '#f3f4f6');
      root.style.setProperty('--accent-foreground', '#171717');
      root.style.setProperty('--destructive', '#dc2626');
      root.style.setProperty('--destructive-foreground', '#ffffff');
      root.style.setProperty('--border', '#e5e7eb');
      root.style.setProperty('--input', '#e5e7eb');
      root.style.setProperty('--ring', '#2563eb');
      root.style.setProperty('--orderbook-bid', '#059669');
      root.style.setProperty('--orderbook-ask', '#dc2626');
      root.style.setProperty('--orderbook-surface', '#f9fafb');
      root.style.setProperty('--orderbook-grid', '#e5e7eb');
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch (e) {
        // Handle localStorage errors silently
        console.warn('Failed to save theme preference:', e);
      }
    }
  };

  const toggleTheme = () => {
    const currentResolved = getResolvedTheme(theme);
    setTheme(currentResolved === 'dark' ? 'light' : 'dark');
  };

  // Initialize theme from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey) as Theme;
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setThemeState(stored);
      }
    } catch (e) {
      console.warn('Failed to load theme preference:', e);
    }
  }, [storageKey]);

  // Update resolved theme when theme or system preference changes
  useEffect(() => {
    const resolved = getResolvedTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const newResolved = getResolvedTheme('system');
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
