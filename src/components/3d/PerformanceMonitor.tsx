'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerformanceMetrics } from '@/hooks/usePerformanceOptimization';

interface PerformanceMonitorProps {
  onMetricsUpdate: (metrics: PerformanceMetrics) => void;
}

/**
 * Component that runs inside Canvas to monitor 3D performance
 * Uses useFrame to track FPS and render metrics
 */
export function PerformanceMonitor({ onMetricsUpdate }: PerformanceMonitorProps) {
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const { gl } = useThree();

  useFrame((state, delta) => {
    frameCountRef.current++;
    const now = Date.now();
    
    // Calculate FPS every second
    if (now - lastTimeRef.current >= 1000) {
      const fps = frameCountRef.current;
      const frameTime = 1000 / fps;
      
      onMetricsUpdate({
        fps,
        frameTime,
        memoryUsage: (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0, // Convert to MB
        renderCalls: gl.info.render.calls || 0,
        triangles: gl.info.render.triangles || 0
      });
      
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
  });

  // This component doesn't render anything visible
  return null;
}
