'use client';

import React, { useState, useEffect } from 'react';
import { getTouchControlInstructions } from '@/hooks/useTouchControls';

/**
 * Mobile-optimized control panel component
 */
export function MobileTouchControls({ 
  onCameraReset,
  className = ""
}: {
  onCameraReset?: () => void;
  className?: string;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const { isTouchDevice: touchSupported } = getTouchControlInstructions();
    setIsTouchDevice(touchSupported);
  }, []);

  // Don't render anything until mounted to avoid hydration mismatch
  if (!isMounted || !isTouchDevice) return null;

  const instructions = getTouchControlInstructions().instructions;

  return (
    <div className={`fixed bottom-4 left-4 z-50 ${className}`}>
      <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-lg p-3">
        <div className="flex flex-col space-y-2 text-white text-sm">
          <div className="text-xs opacity-75 mb-2">Touch Controls:</div>
          <div className="text-xs space-y-1">
            {instructions.map((instruction, index) => (
              <div key={index}>• {instruction}</div>
            ))}
          </div>
          {onCameraReset && (
            <button
              onClick={onCameraReset}
              className="mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs"
            >
              Reset View
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Performance indicator for mobile devices
 */
export function MobilePerformanceIndicator({
  fps,
  quality,
  className = ""
}: {
  fps: number;
  quality: 'low' | 'medium' | 'high';
  className?: string;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const { isTouchDevice: touchSupported } = getTouchControlInstructions();
    setIsTouchDevice(touchSupported);
  }, []);

  // Don't render anything until mounted to avoid hydration mismatch
  if (!isMounted || !isTouchDevice) return null;

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getFpsColor = (fps: number) => {
    if (fps >= 50) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-lg p-2">
        <div className="flex space-x-3 text-xs text-white">
          <div className="flex items-center space-x-1">
            <span className="opacity-75">FPS:</span>
            <span className={getFpsColor(fps)}>{Math.round(fps)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="opacity-75">Quality:</span>
            <span className={getQualityColor(quality)}>{quality.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile-specific notification system
 */
export function MobileNotificationOverlay({
  message,
  type = 'info',
  onDismiss,
  autoHide = true,
  className = ""
}: {
  message: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  onDismiss?: () => void;
  autoHide?: boolean;
  className?: string;
}) {
  const [isVisible, setIsVisible] = React.useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const { isTouchDevice: touchSupported } = getTouchControlInstructions();
    setIsTouchDevice(touchSupported);
  }, []);

  React.useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [autoHide, onDismiss]);

  // Don't render anything until mounted to avoid hydration mismatch
  if (!isMounted || !isTouchDevice || !isVisible) return null;

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-600 border-green-500';
      case 'warning': return 'bg-yellow-600 border-yellow-500';
      case 'error': return 'bg-red-600 border-red-500';
      default: return 'bg-blue-600 border-blue-500';
    }
  };

  return (
    <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 ${className}`}>
      <div className={`${getTypeStyles(type)} border rounded-lg p-4 max-w-sm mx-4`}>
        <div className="flex items-center justify-between">
          <span className="text-white text-sm">{message}</span>
          {onDismiss && (
            <button
              onClick={() => {
                setIsVisible(false);
                onDismiss();
              }}
              className="ml-3 text-white hover:text-gray-200"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
