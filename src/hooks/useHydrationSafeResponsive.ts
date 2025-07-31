'use client';

import { useState, useEffect } from 'react';
import { useResponsiveDesign } from './useResponsiveDesign';

/**
 * Hydration-safe responsive design hook
 * Prevents hydration mismatches by only returning device info after mount
 */
export function useHydrationSafeResponsive() {
  const [isMounted, setIsMounted] = useState(false);
  const responsiveHooks = useResponsiveDesign();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Return safe defaults during SSR
  if (!isMounted) {
    return {
      deviceInfo: {
        type: 'desktop' as const,
        isTouchDevice: false,
        orientation: 'landscape' as const,
        screenSize: { width: 1920, height: 1080 },
        pixelRatio: 1,
        isLowEnd: false
      },
      getCurrentSettings: () => ({
        maxOrdersToRender: 1000,
        animationQuality: 'high' as const,
        enableShadows: true,
        enableAntialiasing: true,
        cameraDistance: 15,
        uiScale: 1.0
      }),
      getUILayout: () => ({
        scale: 1.0,
        panelWidth: '400px',
        panelHeight: '60vh',
        showSidePanels: true,
        compactMode: false,
        showFullscreenButton: false,
        gridColumns: 3
      }),
      toggleFullscreen: () => {},
      supportsFullscreen: () => false,
      isFullscreen: false,
      isMounted: false
    };
  }

  return {
    ...responsiveHooks,
    isMounted: true
  };
}
