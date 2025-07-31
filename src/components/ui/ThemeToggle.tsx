'use client';

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'button' | 'dropdown';
}

export function ThemeToggle({ 
  className = '', 
  showLabel = false, 
  variant = 'button' 
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  if (variant === 'dropdown') {
    return (
      <div className={`relative inline-block ${className}`}>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as any)}
          className="bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground appearance-none pr-8"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
          {theme === 'light' && <Sun className="h-4 w-4" />}
          {theme === 'dark' && <Moon className="h-4 w-4" />}
          {theme === 'system' && <Monitor className="h-4 w-4" />}
        </div>
      </div>
    );
  }

  const icons = [
    { theme: 'light', icon: Sun, label: 'Light' },
    { theme: 'dark', icon: Moon, label: 'Dark' },
    { theme: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {icons.map(({ theme: themeOption, icon: Icon, label }) => (
        <button
          key={themeOption}
          onClick={() => setTheme(themeOption as any)}
          className={`
            relative p-2 rounded-md transition-all duration-200 group
            ${theme === themeOption 
              ? 'bg-primary text-primary-foreground shadow-md' 
              : 'bg-card hover:bg-accent text-muted-foreground hover:text-accent-foreground'
            }
            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
          `}
          title={`Switch to ${label.toLowerCase()} theme`}
        >
          <Icon className="h-4 w-4" />
          {showLabel && (
            <span className="ml-2 text-xs font-medium">{label}</span>
          )}
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover border border-border rounded text-xs text-popover-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            {label} theme
          </div>
        </button>
      ))}
    </div>
  );
}

export function SimpleThemeToggle({ className = '' }: { className?: string }) {
  const { toggleTheme, resolvedTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        p-2 rounded-md bg-card hover:bg-accent text-muted-foreground hover:text-accent-foreground
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        ${className}
      `}
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
