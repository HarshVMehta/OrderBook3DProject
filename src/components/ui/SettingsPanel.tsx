'use client';

import React, { useState } from 'react';
import { Settings, Palette, Monitor, Sun, Moon, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

interface SettingsPanelProps {
  className?: string;
}

export function SettingsPanel({ className = '' }: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, resolvedTheme } = useTheme();

  return (
    <>
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`
          fixed top-4 right-4 z-40 p-3 rounded-full 
          bg-card border border-border shadow-lg
          hover:bg-accent transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-ring
          ${className}
        `}
        title="Open settings"
      >
        <Settings className="h-5 w-5 text-foreground" />
      </button>

      {/* Settings Panel Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="relative bg-card border border-border rounded-lg shadow-xl p-6 m-4 max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Appearance Settings</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Theme Selection */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">Theme</h3>
                <ThemeToggle showLabel={true} variant="button" className="w-full justify-center" />
              </div>

              {/* Current Theme Info */}
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    {resolvedTheme === 'dark' ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4" />
                    )}
                    <span className="font-medium">Current:</span>
                  </div>
                  <span className="capitalize">{resolvedTheme}</span>
                  {theme === 'system' && (
                    <span className="text-muted-foreground">(System)</span>
                  )}
                </div>
              </div>

              {/* Color Preview */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">Color Preview</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <div className="h-8 bg-primary rounded flex items-center justify-center">
                      <span className="text-primary-foreground text-xs font-medium">Primary</span>
                    </div>
                    <div className="h-8 bg-secondary rounded flex items-center justify-center">
                      <span className="text-secondary-foreground text-xs font-medium">Secondary</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-8 rounded flex items-center justify-center border border-border" style={{ backgroundColor: 'var(--orderbook-bid)' }}>
                      <span className="text-white text-xs font-medium">Bid</span>
                    </div>
                    <div className="h-8 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--orderbook-ask)' }}>
                      <span className="text-white text-xs font-medium">Ask</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme Description */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Light:</strong> Optimized for bright environments</p>
                <p><strong>Dark:</strong> Reduces eye strain in low light</p>
                <p><strong>System:</strong> Follows your device preference</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
