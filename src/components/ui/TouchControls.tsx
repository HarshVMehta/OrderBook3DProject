'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useResponsiveDesign } from '@/hooks/useResponsiveDesign';

interface TouchControlsProps {
  onRotate?: (deltaX: number, deltaY: number) => void;
  onZoom?: (delta: number) => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  className?: string;
}

interface TouchState {
  touches: Touch[];
  lastDistance: number;
  lastRotation: number;
  lastCenter: { x: number; y: number };
  isRotating: boolean;
  isPanning: boolean;
  isZooming: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onRotate,
  onZoom,
  onPan,
  className = ''
}) => {
  const { camera, gl } = useThree();
  const { deviceInfo, getTouchControlsConfig, triggerHapticFeedback } = useResponsiveDesign();
  const touchState = useRef<TouchState>({
    touches: [],
    lastDistance: 0,
    lastRotation: 0,
    lastCenter: { x: 0, y: 0 },
    isRotating: false,
    isPanning: false,
    isZooming: false
  });

  const touchConfig = getTouchControlsConfig();

  // Helper function to calculate distance between two touches
  const getTouchDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Helper function to calculate angle between two touches
  const getTouchAngle = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.atan2(dy, dx);
  }, []);

  // Helper function to calculate center point of touches
  const getTouchCenter = useCallback((touches: Touch[]): { x: number; y: number } => {
    const x = touches.reduce((sum, touch) => sum + touch.clientX, 0) / touches.length;
    const y = touches.reduce((sum, touch) => sum + touch.clientY, 0) / touches.length;
    return { x, y };
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    event.preventDefault();
    
    const touches = Array.from(event.touches);
    touchState.current.touches = touches;

    if (touches.length === 1) {
      // Single touch - prepare for rotation
      touchState.current.isRotating = true;
      touchState.current.lastCenter = { x: touches[0].clientX, y: touches[0].clientY };
      triggerHapticFeedback('light');
    } else if (touches.length === 2) {
      // Two touches - prepare for zoom and rotation
      touchState.current.isZooming = true;
      touchState.current.isRotating = touchConfig.gestures.twoFingerRotate;
      touchState.current.lastDistance = getTouchDistance(touches[0], touches[1]);
      touchState.current.lastRotation = getTouchAngle(touches[0], touches[1]);
      touchState.current.lastCenter = getTouchCenter(touches);
      triggerHapticFeedback('medium');
    } else if (touches.length === 3) {
      // Three touches - prepare for panning
      touchState.current.isPanning = touchConfig.gestures.threeFingerPan;
      touchState.current.lastCenter = getTouchCenter(touches);
      triggerHapticFeedback('heavy');
    }
  }, [getTouchDistance, getTouchAngle, getTouchCenter, touchConfig, triggerHapticFeedback]);

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    event.preventDefault();
    
    const touches = Array.from(event.touches);
    const state = touchState.current;

    if (touches.length === 1 && state.isRotating) {
      // Single finger rotation
      const deltaX = (touches[0].clientX - state.lastCenter.x) * touchConfig.sensitivity.rotation;
      const deltaY = (touches[0].clientY - state.lastCenter.y) * touchConfig.sensitivity.rotation;
      
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        onRotate?.(deltaX * 0.01, deltaY * 0.01);
        state.lastCenter = { x: touches[0].clientX, y: touches[0].clientY };
      }
    } else if (touches.length === 2) {
      const currentDistance = getTouchDistance(touches[0], touches[1]);
      const currentAngle = getTouchAngle(touches[0], touches[1]);
      const currentCenter = getTouchCenter(touches);

      // Pinch to zoom
      if (state.isZooming && touchConfig.gestures.pinchToZoom) {
        const deltaDistance = currentDistance - state.lastDistance;
        if (Math.abs(deltaDistance) > 5) {
          const zoomDelta = deltaDistance * touchConfig.sensitivity.zoom * 0.01;
          onZoom?.(zoomDelta);
          state.lastDistance = currentDistance;
        }
      }

      // Two finger rotation
      if (state.isRotating && touchConfig.gestures.twoFingerRotate) {
        const deltaAngle = currentAngle - state.lastRotation;
        if (Math.abs(deltaAngle) > 0.05) {
          onRotate?.(deltaAngle * touchConfig.sensitivity.rotation, 0);
          state.lastRotation = currentAngle;
        }
      }
    } else if (touches.length === 3 && state.isPanning && touchConfig.gestures.threeFingerPan) {
      // Three finger panning
      const currentCenter = getTouchCenter(touches);
      const deltaX = (currentCenter.x - state.lastCenter.x) * touchConfig.sensitivity.pan;
      const deltaY = (currentCenter.y - state.lastCenter.y) * touchConfig.sensitivity.pan;
      
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        onPan?.(deltaX * 0.01, deltaY * 0.01);
        state.lastCenter = currentCenter;
      }
    }
  }, [getTouchDistance, getTouchAngle, getTouchCenter, touchConfig, onRotate, onZoom, onPan]);

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    const state = touchState.current;
    
    // Reset states
    state.isRotating = false;
    state.isPanning = false;
    state.isZooming = false;
    state.touches = Array.from(event.touches);
    
    // If there are remaining touches, reinitialize for new gesture
    if (event.touches.length > 0) {
      handleTouchStart(event);
    }
  }, [handleTouchStart]);

  // Attach touch event listeners
  useEffect(() => {
    if (!touchConfig.enabled || !deviceInfo.isTouchDevice) return;

    const canvas = gl.domElement;
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [gl.domElement, touchConfig.enabled, deviceInfo.isTouchDevice, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Touch instruction overlay for mobile devices
  if (!deviceInfo.isTouchDevice || !touchConfig.enabled) {
    return null;
  }

  return (
    <div className={`absolute inset-0 pointer-events-none z-10 ${className}`}>
      {/* Touch instructions overlay */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white text-sm px-3 py-2 rounded-lg backdrop-blur-sm">
        <div className="flex flex-col items-center space-y-1">
          <div className="text-xs opacity-80">Touch Controls</div>
          <div className="flex space-x-4 text-xs">
            <span>🖐️ Rotate</span>
            {touchConfig.gestures.pinchToZoom && <span>🤏 Zoom</span>}
            {touchConfig.gestures.threeFingerPan && <span>👆👆👆 Pan</span>}
          </div>
        </div>
      </div>

      {/* Touch gesture indicators */}
      {(touchState.current.isRotating || touchState.current.isZooming || touchState.current.isPanning) && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-500 bg-opacity-20 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
          {touchState.current.isRotating && 'Rotating'}
          {touchState.current.isZooming && 'Zooming'}
          {touchState.current.isPanning && 'Panning'}
        </div>
      )}
    </div>
  );
};

// Hook for integrating touch controls with camera
export const useTouchCameraControls = () => {
  const { camera } = useThree();
  const { deviceInfo, getTouchControlsConfig } = useResponsiveDesign();
  const cameraPosition = useRef(camera.position.clone());
  const cameraRotation = useRef(camera.rotation.clone());
  
  const touchConfig = getTouchControlsConfig();

  const handleRotate = useCallback((deltaX: number, deltaY: number) => {
    if (!touchConfig.enabled) return;

    // Apply rotation based on current camera orientation
    const euler = camera.rotation.clone();
    euler.y -= deltaX;
    euler.x -= deltaY;
    
    // Clamp vertical rotation
    euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
    
    camera.rotation.copy(euler);
    cameraRotation.current.copy(euler);
  }, [camera, touchConfig.enabled]);

  const handleZoom = useCallback((delta: number) => {
    if (!touchConfig.enabled) return;

    // Zoom by moving camera forward/backward
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    direction.multiplyScalar(delta * 5);
    
    camera.position.add(direction);
    
    // Clamp zoom distance
    const distance = camera.position.length();
    if (distance < 5) {
      camera.position.normalize().multiplyScalar(5);
    } else if (distance > 50) {
      camera.position.normalize().multiplyScalar(50);
    }
    
    cameraPosition.current.copy(camera.position);
  }, [camera, touchConfig.enabled]);

  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    if (!touchConfig.enabled) return;

    // Pan by moving camera in local space
    const right = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3(0, 1, 0);
    
    right.applyQuaternion(camera.quaternion);
    up.applyQuaternion(camera.quaternion);
    
    right.multiplyScalar(-deltaX * 2);
    up.multiplyScalar(deltaY * 2);
    
    camera.position.add(right).add(up);
    cameraPosition.current.copy(camera.position);
  }, [camera, touchConfig.enabled]);

  return {
    handleRotate,
    handleZoom,
    handlePan,
    enabled: touchConfig.enabled && deviceInfo.isTouchDevice
  };
};
