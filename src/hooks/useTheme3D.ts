'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useMemo } from 'react';

export interface Theme3DColors {
  bidColor: string;
  askColor: string;
  surfaceColor: string;
  gridColor: string;
  pressureColors: {
    high: string;
    medium: string;
    low: string;
  };
  background: string;
  text: string;
  accent: string;
}

export function useTheme3D(): Theme3DColors {
  const { resolvedTheme } = useTheme();

  return useMemo(() => {
    if (resolvedTheme === 'dark') {
      return {
        bidColor: '#10b981', // Green for bids
        askColor: '#ef4444', // Red for asks
        surfaceColor: '#1f2937', // Dark gray surface
        gridColor: '#374151', // Lighter dark gray for grid
        pressureColors: {
          high: '#f87171',    // Light red
          medium: '#fbbf24',  // Yellow
          low: '#34d399',     // Light green
        },
        background: '#0a0a0a',
        text: '#ededed',
        accent: '#3b82f6',
      };
    } else {
      return {
        bidColor: '#059669', // Darker green for bids
        askColor: '#dc2626', // Darker red for asks
        surfaceColor: '#f9fafb', // Light gray surface
        gridColor: '#e5e7eb', // Gray for grid
        pressureColors: {
          high: '#ef4444',    // Red
          medium: '#f59e0b',  // Orange
          low: '#10b981',     // Green
        },
        background: '#ffffff',
        text: '#171717',
        accent: '#2563eb',
      };
    }
  }, [resolvedTheme]);
}

export function getThemeColors(theme: 'light' | 'dark'): Theme3DColors {
  if (theme === 'dark') {
    return {
      bidColor: '#10b981',
      askColor: '#ef4444',
      surfaceColor: '#1f2937',
      gridColor: '#374151',
      pressureColors: {
        high: '#f87171',
        medium: '#fbbf24',
        low: '#34d399',
      },
      background: '#0a0a0a',
      text: '#ededed',
      accent: '#3b82f6',
    };
  } else {
    return {
      bidColor: '#059669',
      askColor: '#dc2626',
      surfaceColor: '#f9fafb',
      gridColor: '#e5e7eb',
      pressureColors: {
        high: '#ef4444',
        medium: '#f59e0b',
        low: '#10b981',
      },
      background: '#ffffff',
      text: '#171717',
      accent: '#2563eb',
    };
  }
}
