'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export function SimpleThemeToggle({ className = '' }: { className?: string }) {
  const [isDark, setIsDark] = useState(true);
  
  // Check the current theme when component mounts and setup theme listener
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Initial theme check
      const savedTheme = localStorage.getItem('orderbook-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Set initial state based on saved preference or system preference
      const initialIsDark = savedTheme 
        ? savedTheme === 'dark' 
        : prefersDark;
      
      setIsDark(initialIsDark);
      
      // Apply the theme immediately on mount
      applyTheme(initialIsDark);
    }
  }, []);
  
  // Apply theme function separated for reuse
  const applyTheme = (dark: boolean) => {
    const root = document.documentElement;
    const body = document.body;
    
    if (dark) {
      // Apply dark theme
      root.classList.remove('light');
      root.classList.add('dark');
      body.classList.remove('light');
      body.classList.add('dark');
      localStorage.setItem('orderbook-theme', 'dark');
      
      // Set CSS variables for dark theme
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
      // Apply light theme
      root.classList.remove('dark');
      root.classList.add('light');
      body.classList.remove('dark');
      body.classList.add('light');
      localStorage.setItem('orderbook-theme', 'light');
      
      // Set CSS variables for light theme
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

  // Toggle theme function to handle clicks
  const handleToggle = () => {
    // Toggle the dark mode state
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    // Apply the new theme
    applyTheme(newIsDark);
  };

  return (
    <button
      onClick={handleToggle}
      className={`
        p-2 rounded-md bg-card hover:bg-accent text-muted-foreground hover:text-accent-foreground
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        ${className}
      `}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
