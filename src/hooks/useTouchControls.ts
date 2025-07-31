'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Vector3, Euler } from 'three';

export interface TouchGesture {
  type: 'pan' | 'pinch' | 'rotate' | 'tap' | 'doubleTap';
  deltaX?: number;
  deltaY?: number;
  scale?: number;
  rotation?: number;
  center?: { x: number; y: number };
}

export interface TouchControlState {
  isPanning: boolean;
  isPinching: boolean;
  isRotating: boolean;
  lastTouchCount: number;
  gestureStartDistance: number;
  gestureStartAngle: number;
  accumulatedRotation: number;
}

/**
 * Hook for handling touch gestures on mobile devices
 */
export function useTouchControls(onGesture?: (gesture: TouchGesture) => void) {
  const [touchState, setTouchState] = useState<TouchControlState>({
    isPanning: false,
    isPinching: false,
    isRotating: false,
    lastTouchCount: 0,
    gestureStartDistance: 0,
    gestureStartAngle: 0,
    accumulatedRotation: 0
  });

  const lastTouchesRef = useRef<TouchList | null>(null);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTime = useRef(0);
  const gestureThresholds = {
    panThreshold: 10,
    pinchThreshold: 20,
    rotateThreshold: 0.1,
    doubleTapDelay: 300
  };

  // Calculate distance between two touches
  const getTouchDistance = useCallback((touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  // Calculate angle between two touches
  const getTouchAngle = useCallback((touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.atan2(
      touch2.clientY - touch1.clientY,
      touch2.clientX - touch1.clientX
    );
  }, []);

  // Get center point of touches
  const getTouchCenter = useCallback((touches: TouchList): { x: number; y: number } => {
    let centerX = 0;
    let centerY = 0;
    for (let i = 0; i < touches.length; i++) {
      centerX += touches[i].clientX;
      centerY += touches[i].clientY;
    }
    return {
      x: centerX / touches.length,
      y: centerY / touches.length
    };
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    event.preventDefault();
    const touches = event.touches;
    
    setTouchState(prev => {
      const newState = {
        ...prev,
        lastTouchCount: touches.length,
        gestureStartDistance: getTouchDistance(touches),
        gestureStartAngle: getTouchAngle(touches),
        isPanning: touches.length === 1,
        isPinching: touches.length === 2,
        isRotating: touches.length === 2
      };
      
      return newState;
    });

    lastTouchesRef.current = touches;

    // Handle tap detection
    if (touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTime.current < gestureThresholds.doubleTapDelay) {
        // Double tap detected
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }
        onGesture?.({
          type: 'doubleTap',
          center: { x: touches[0].clientX, y: touches[0].clientY }
        });
        lastTapTime.current = 0;
      } else {
        // Single tap - wait to see if it becomes double tap
        tapTimeoutRef.current = setTimeout(() => {
          onGesture?.({
            type: 'tap',
            center: { x: touches[0].clientX, y: touches[0].clientY }
          });
          tapTimeoutRef.current = null;
        }, gestureThresholds.doubleTapDelay);
        lastTapTime.current = now;
      }
    }
  }, [getTouchDistance, getTouchAngle, onGesture]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    event.preventDefault();
    const touches = event.touches;
    
    if (!lastTouchesRef.current) return;

    const lastTouches = lastTouchesRef.current;
    
    // Single finger pan
    if (touches.length === 1 && lastTouches.length === 1 && touchState.isPanning) {
      const deltaX = touches[0].clientX - lastTouches[0].clientX;
      const deltaY = touches[0].clientY - lastTouches[0].clientY;
      
      if (Math.abs(deltaX) > gestureThresholds.panThreshold || 
          Math.abs(deltaY) > gestureThresholds.panThreshold) {
        onGesture?.({
          type: 'pan',
          deltaX,
          deltaY,
          center: getTouchCenter(touches)
        });
      }
    }

    // Two finger gestures
    if (touches.length === 2 && lastTouches.length === 2) {
      const currentDistance = getTouchDistance(touches);
      const currentAngle = getTouchAngle(touches);
      
      // Pinch to zoom
      if (touchState.isPinching && touchState.gestureStartDistance > 0) {
        const scale = currentDistance / touchState.gestureStartDistance;
        
        if (Math.abs(scale - 1) > 0.05) { // 5% threshold
          onGesture?.({
            type: 'pinch',
            scale,
            center: getTouchCenter(touches)
          });
        }
      }

      // Rotation gesture
      if (touchState.isRotating) {
        const angleDelta = currentAngle - touchState.gestureStartAngle;
        
        // Normalize angle to -π to π
        let normalizedAngle = angleDelta;
        while (normalizedAngle > Math.PI) normalizedAngle -= 2 * Math.PI;
        while (normalizedAngle < -Math.PI) normalizedAngle += 2 * Math.PI;
        
        if (Math.abs(normalizedAngle) > gestureThresholds.rotateThreshold) {
          onGesture?.({
            type: 'rotate',
            rotation: normalizedAngle,
            center: getTouchCenter(touches)
          });
          
          setTouchState(prev => ({
            ...prev,
            gestureStartAngle: currentAngle,
            accumulatedRotation: prev.accumulatedRotation + normalizedAngle
          }));
        }
      }
    }

    lastTouchesRef.current = touches;
  }, [touchState, getTouchDistance, getTouchAngle, getTouchCenter, onGesture]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    event.preventDefault();
    
    setTouchState(prev => ({
      ...prev,
      isPanning: false,
      isPinching: false,
      isRotating: false,
      lastTouchCount: event.touches.length
    }));

    lastTouchesRef.current = event.touches.length > 0 ? event.touches : null;
  }, []);

  // Return touch event handlers
  const touchHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchEnd
  };

  return {
    touchState,
    touchHandlers,
    isTouchDevice: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  };
}

/**
 * Hook for converting touch gestures to 3D camera controls
 */
export function useTouch3DControls() {
  const [isMounted, setIsMounted] = useState(false);
  const [cameraPosition, setCameraPosition] = useState(new Vector3(0, 0, 10));
  const [cameraRotation, setCameraRotation] = useState(new Euler(0, 0, 0));
  const [cameraZoom, setCameraZoom] = useState(1);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleGesture = useCallback((gesture: TouchGesture) => {
    switch (gesture.type) {
      case 'pan':
        // Pan moves the camera position
        if (gesture.deltaX && gesture.deltaY) {
          setCameraPosition(prev => new Vector3(
            prev.x - gesture.deltaX! * 0.01,
            prev.y + gesture.deltaY! * 0.01,
            prev.z
          ));
        }
        break;

      case 'pinch':
        // Pinch controls zoom
        if (gesture.scale) {
          setCameraZoom(prev => Math.max(0.1, Math.min(5, prev / gesture.scale!)));
        }
        break;

      case 'rotate':
        // Rotation gesture rotates the camera
        if (gesture.rotation) {
          setCameraRotation(prev => new Euler(
            prev.x,
            prev.y,
            prev.z + gesture.rotation!
          ));
        }
        break;

      case 'doubleTap':
        // Double tap resets view
        setCameraPosition(new Vector3(0, 0, 10));
        setCameraRotation(new Euler(0, 0, 0));
        setCameraZoom(1);
        break;
    }
  }, []);

  const { touchHandlers } = useTouchControls(handleGesture);

  return {
    cameraPosition,
    cameraRotation,
    cameraZoom,
    touchHandlers,
    isTouchDevice: isMounted && (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)),
    resetCamera: () => {
      setCameraPosition(new Vector3(0, 0, 10));
      setCameraRotation(new Euler(0, 0, 0));
      setCameraZoom(1);
    }
  };
}

/**
 * Get touch control instructions for mobile devices
 */
export function getTouchControlInstructions() {
  return {
    instructions: [
      "One finger: Pan view",
      "Two fingers: Pinch to zoom", 
      "Two fingers rotate: Rotate view",
      "Double tap: Reset camera"
    ],
    isTouchDevice: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  };
}
