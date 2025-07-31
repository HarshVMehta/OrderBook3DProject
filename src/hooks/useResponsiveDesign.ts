'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  isTouchDevice: boolean;
  orientation: 'portrait' | 'landscape';
  screenSize: {
    width: number;
    height: number;
  };
  pixelRatio: number;
  isLowEnd: boolean;
}

export interface ResponsiveSettings {
  mobile: {
    maxOrdersToRender: number;
    animationQuality: 'low' | 'medium' | 'high';
    enableShadows: boolean;
    enableAntialiasing: boolean;
    cameraDistance: number;
    uiScale: number;
  };
  tablet: {
    maxOrdersToRender: number;
    animationQuality: 'low' | 'medium' | 'high';
    enableShadows: boolean;
    enableAntialiasing: boolean;
    cameraDistance: number;
    uiScale: number;
  };
  desktop: {
    maxOrdersToRender: number;
    animationQuality: 'low' | 'medium' | 'high';
    enableShadows: boolean;
    enableAntialiasing: boolean;
    cameraDistance: number;
    uiScale: number;
  };
}

export interface TouchControls {
  enabled: boolean;
  sensitivity: {
    rotation: number;
    zoom: number;
    pan: number;
  };
  gestures: {
    pinchToZoom: boolean;
    twoFingerRotate: boolean;
    threeFingerPan: boolean;
  };
  hapticFeedback: boolean;
}

const DEFAULT_RESPONSIVE_SETTINGS: ResponsiveSettings = {
  mobile: {
    maxOrdersToRender: 200,
    animationQuality: 'low',
    enableShadows: false,
    enableAntialiasing: false,
    cameraDistance: 25,
    uiScale: 1.2
  },
  tablet: {
    maxOrdersToRender: 500,
    animationQuality: 'medium',
    enableShadows: true,
    enableAntialiasing: true,
    cameraDistance: 20,
    uiScale: 1.1
  },
  desktop: {
    maxOrdersToRender: 1000,
    animationQuality: 'high',
    enableShadows: true,
    enableAntialiasing: true,
    cameraDistance: 15,
    uiScale: 1.0
  }
};

const DEFAULT_TOUCH_CONTROLS: TouchControls = {
  enabled: true,
  sensitivity: {
    rotation: 1.0,
    zoom: 1.0,
    pan: 1.0
  },
  gestures: {
    pinchToZoom: true,
    twoFingerRotate: true,
    threeFingerPan: true
  },
  hapticFeedback: true
};

export const useResponsiveDesign = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    type: 'desktop',
    isTouchDevice: false,
    orientation: 'landscape',
    screenSize: { width: 1920, height: 1080 },
    pixelRatio: 1,
    isLowEnd: false
  });

  const [responsiveSettings, setResponsiveSettings] = useState<ResponsiveSettings>(DEFAULT_RESPONSIVE_SETTINGS);
  const [touchControls, setTouchControls] = useState<TouchControls>(DEFAULT_TOUCH_CONTROLS);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const orientationChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect device capabilities and performance
  const detectDeviceInfo = useCallback((): DeviceInfo => {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return {
        type: 'desktop',
        isTouchDevice: false,
        orientation: 'landscape',
        screenSize: { width: 1920, height: 1080 },
        pixelRatio: 1,
        isLowEnd: false
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Device type classification
    let type: 'mobile' | 'tablet' | 'desktop';
    if (width <= 768) {
      type = 'mobile';
    } else if (width <= 1024) {
      type = 'tablet';
    } else {
      type = 'desktop';
    }

    // Orientation detection
    const orientation = width > height ? 'landscape' : 'portrait';

    // Low-end device detection (simplified heuristic)
    const isLowEnd = detectLowEndDevice();

    return {
      type,
      isTouchDevice,
      orientation,
      screenSize: { width, height },
      pixelRatio,
      isLowEnd
    };
  }, []);

  const detectLowEndDevice = useCallback((): boolean => {
    // Check if we're in browser environment
    if (typeof window === 'undefined') return false;
    
    // Check for various indicators of low-end devices
    const navigator = window.navigator;
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const memory = (navigator as any).deviceMemory;
    const connection = (navigator as any).connection;
    
    // Low core count
    if (hardwareConcurrency <= 2) return true;
    
    // Low memory (less than 4GB)
    if (memory && memory < 4) return true;
    
    // Slow connection
    if (connection && (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g')) {
      return true;
    }
    
    // Check for older mobile devices (simplified)
    const userAgent = navigator.userAgent;
    if (/Android [1-6]\./.test(userAgent)) return true;
    if (/iPhone OS [1-9]_/.test(userAgent)) return true;
    
    return false;
  }, []);

  // Update device info on resize and orientation change
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    const updateDeviceInfo = () => {
      setDeviceInfo(detectDeviceInfo());
    };

    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(updateDeviceInfo, 150);
    };

    const handleOrientationChange = () => {
      if (orientationChangeTimeoutRef.current) {
        clearTimeout(orientationChangeTimeoutRef.current);
      }
      orientationChangeTimeoutRef.current = setTimeout(updateDeviceInfo, 300);
    };

    // Initial detection
    updateDeviceInfo();

    // Event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Fullscreen change detection
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      if (orientationChangeTimeoutRef.current) clearTimeout(orientationChangeTimeoutRef.current);
    };
  }, [detectDeviceInfo]);

  // Get current settings based on device type
  const getCurrentSettings = useCallback(() => {
    const baseSettings = responsiveSettings[deviceInfo.type];
    
    // Further optimize for low-end devices
    if (deviceInfo.isLowEnd) {
      return {
        ...baseSettings,
        maxOrdersToRender: Math.min(baseSettings.maxOrdersToRender, 150),
        animationQuality: 'low' as const,
        enableShadows: false,
        enableAntialiasing: false
      };
    }

    return baseSettings;
  }, [deviceInfo, responsiveSettings]);

  // Get optimal canvas size for performance
  const getCanvasSize = useCallback((): { width: number; height: number } => {
    const { width, height } = deviceInfo.screenSize;
    let scale = 1;

    // Reduce resolution on mobile for better performance
    if (deviceInfo.type === 'mobile') {
      scale = deviceInfo.isLowEnd ? 0.6 : 0.8;
    } else if (deviceInfo.type === 'tablet') {
      scale = deviceInfo.isLowEnd ? 0.7 : 0.9;
    }

    // Consider pixel ratio but cap it for performance
    const effectivePixelRatio = Math.min(deviceInfo.pixelRatio, deviceInfo.type === 'mobile' ? 2 : 3);

    return {
      width: Math.floor(width * scale * effectivePixelRatio),
      height: Math.floor(height * scale * effectivePixelRatio)
    };
  }, [deviceInfo]);

  // Touch control configuration
  const getTouchControlsConfig = useCallback(() => {
    if (!deviceInfo.isTouchDevice) {
      return { ...touchControls, enabled: false };
    }

    // Adjust sensitivity based on device type
    let sensitivityMultiplier = 1;
    if (deviceInfo.type === 'mobile') {
      sensitivityMultiplier = 1.2; // More sensitive on mobile
    } else if (deviceInfo.type === 'tablet') {
      sensitivityMultiplier = 1.1;
    }

    return {
      ...touchControls,
      sensitivity: {
        rotation: touchControls.sensitivity.rotation * sensitivityMultiplier,
        zoom: touchControls.sensitivity.zoom * sensitivityMultiplier,
        pan: touchControls.sensitivity.pan * sensitivityMultiplier
      }
    };
  }, [deviceInfo, touchControls]);

  // Responsive UI layout helpers
  const getUILayout = useCallback(() => {
    const currentSettings = getCurrentSettings();
    
    return {
      scale: currentSettings.uiScale,
      panelWidth: deviceInfo.type === 'mobile' ? '100%' : 
                  deviceInfo.type === 'tablet' ? '350px' : '400px',
      panelHeight: deviceInfo.orientation === 'portrait' ? '40vh' : '60vh',
      showSidePanels: deviceInfo.type !== 'mobile' || deviceInfo.orientation === 'landscape',
      compactMode: deviceInfo.type === 'mobile',
      showFullscreenButton: deviceInfo.type !== 'desktop',
      gridColumns: deviceInfo.type === 'mobile' ? 1 : 
                   deviceInfo.type === 'tablet' ? 2 : 3
    };
  }, [deviceInfo, getCurrentSettings]);

  // Performance recommendations based on device
  const getPerformanceRecommendations = useCallback(() => {
    const recommendations: string[] = [];
    
    if (deviceInfo.isLowEnd) {
      recommendations.push('Low-end device detected - optimizing for performance');
      recommendations.push('Consider closing other browser tabs for better performance');
    }
    
    if (deviceInfo.type === 'mobile') {
      recommendations.push('Mobile device detected - using optimized settings');
      if (deviceInfo.orientation === 'portrait') {
        recommendations.push('Landscape orientation recommended for better viewing');
      }
    }
    
    if (deviceInfo.pixelRatio > 2) {
      recommendations.push('High DPI display detected - adjusting resolution');
    }
    
    return recommendations;
  }, [deviceInfo]);

  // Fullscreen API helpers
  const toggleFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen API not supported', error);
    }
  }, []);

  const supportsFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return false;
    return !!(document.documentElement.requestFullscreen);
  }, []);

  // Haptic feedback for touch devices
  const triggerHapticFeedback = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (typeof navigator === 'undefined' || !touchControls.hapticFeedback || !deviceInfo.isTouchDevice) return;
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[intensity]);
    }
  }, [touchControls.hapticFeedback, deviceInfo.isTouchDevice]);

  // Update settings
  const updateResponsiveSettings = useCallback((settings: Partial<ResponsiveSettings>) => {
    setResponsiveSettings(prev => ({ ...prev, ...settings }));
  }, []);

  const updateTouchControls = useCallback((controls: Partial<TouchControls>) => {
    setTouchControls(prev => ({ ...prev, ...controls }));
  }, []);

  return {
    deviceInfo,
    getCurrentSettings,
    getCanvasSize,
    getTouchControlsConfig,
    getUILayout,
    getPerformanceRecommendations,
    toggleFullscreen,
    supportsFullscreen,
    isFullscreen,
    triggerHapticFeedback,
    updateResponsiveSettings,
    updateTouchControls,
    responsiveSettings,
    touchControls
  };
};
