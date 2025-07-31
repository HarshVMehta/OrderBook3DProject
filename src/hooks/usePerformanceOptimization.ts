'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  renderCalls: number;
  triangles: number;
}

export interface LODSettings {
  enabled: boolean;
  maxDistance: number;
  minDistance: number;
  highDetailThreshold: number;
  mediumDetailThreshold: number;
  lowDetailThreshold: number;
}

export interface PerformanceSettings {
  targetFPS: number;
  adaptiveQuality: boolean;
  maxOrdersToRender: number;
  animationQuality: 'low' | 'medium' | 'high';
  shadowsEnabled: boolean;
  antialiasing: boolean;
  lod: LODSettings;
}

const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = {
  targetFPS: 60,
  adaptiveQuality: true,
  maxOrdersToRender: 1000,
  animationQuality: 'high',
  shadowsEnabled: true,
  antialiasing: true,
  lod: {
    enabled: true,
    maxDistance: 50,
    minDistance: 5,
    highDetailThreshold: 15,
    mediumDetailThreshold: 30,
    lowDetailThreshold: 45
  }
};

export const usePerformanceOptimization = () => {
  const [settings, setSettings] = useState<PerformanceSettings>(DEFAULT_PERFORMANCE_SETTINGS);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    renderCalls: 0,
    triangles: 0
  });
  
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const performanceHistoryRef = useRef<number[]>([]);
  const adaptiveQualityRef = useRef(true);
  
  // Manual FPS monitoring without useFrame (will be updated from Canvas component)
  const updateMetrics = useCallback((newMetrics: Partial<PerformanceMetrics>) => {
    setMetrics(prev => ({ ...prev, ...newMetrics }));
    
    if (newMetrics.fps) {
      // Store performance history for trend analysis
      performanceHistoryRef.current.push(newMetrics.fps);
      if (performanceHistoryRef.current.length > 30) {
        performanceHistoryRef.current.shift();
      }
      
      // Adaptive quality adjustment
      if (settings.adaptiveQuality && adaptiveQualityRef.current) {
        adjustQualityBasedOnPerformance(newMetrics.fps);
      }
    }
  }, [settings.adaptiveQuality]);

  const adjustQualityBasedOnPerformance = useCallback((fps: number) => {
    const targetFPS = settings.targetFPS;
    const performanceRatio = fps / targetFPS;
    
    setSettings(prev => {
      let newSettings = { ...prev };
      
      // If performance is below 80% of target, reduce quality
      if (performanceRatio < 0.8) {
        // Reduce max orders to render
        if (newSettings.maxOrdersToRender > 200) {
          newSettings.maxOrdersToRender = Math.max(200, newSettings.maxOrdersToRender * 0.8);
        }
        
        // Reduce animation quality
        if (newSettings.animationQuality === 'high') {
          newSettings.animationQuality = 'medium';
        } else if (newSettings.animationQuality === 'medium') {
          newSettings.animationQuality = 'low';
        }
        
        // Disable shadows if performance is really poor
        if (performanceRatio < 0.6) {
          newSettings.shadowsEnabled = false;
          newSettings.antialiasing = false;
        }
        
        // Adjust LOD thresholds to be more aggressive
        newSettings.lod.highDetailThreshold = Math.max(10, newSettings.lod.highDetailThreshold * 0.8);
        newSettings.lod.mediumDetailThreshold = Math.max(20, newSettings.lod.mediumDetailThreshold * 0.8);
      }
      
      // If performance is good (above 95% of target), we can increase quality
      else if (performanceRatio > 0.95 && fps > targetFPS * 0.9) {
        // Increase max orders if we're not at the limit
        if (newSettings.maxOrdersToRender < 2000) {
          newSettings.maxOrdersToRender = Math.min(2000, newSettings.maxOrdersToRender * 1.1);
        }
        
        // Improve animation quality
        if (newSettings.animationQuality === 'low') {
          newSettings.animationQuality = 'medium';
        } else if (newSettings.animationQuality === 'medium' && performanceRatio > 1.1) {
          newSettings.animationQuality = 'high';
        }
        
        // Re-enable features if performance allows
        if (performanceRatio > 1.2) {
          newSettings.shadowsEnabled = true;
          newSettings.antialiasing = true;
        }
      }
      
      return newSettings;
    });
  }, [settings.targetFPS]);

  const getLODLevel = useCallback((distance: number): 'high' | 'medium' | 'low' | 'culled' => {
    if (!settings.lod.enabled) return 'high';
    
    if (distance > settings.lod.maxDistance) return 'culled';
    if (distance <= settings.lod.highDetailThreshold) return 'high';
    if (distance <= settings.lod.mediumDetailThreshold) return 'medium';
    if (distance <= settings.lod.lowDetailThreshold) return 'low';
    return 'culled';
  }, [settings.lod]);

  const getGeometryComplexity = useCallback((lodLevel: 'high' | 'medium' | 'low'): {
    segments: number;
    quality: number;
    maxInstances: number;
  } => {
    switch (lodLevel) {
      case 'high':
        return { segments: 32, quality: 1.0, maxInstances: 500 };
      case 'medium':
        return { segments: 16, quality: 0.7, maxInstances: 1000 };
      case 'low':
        return { segments: 8, quality: 0.4, maxInstances: 2000 };
      default:
        return { segments: 8, quality: 0.4, maxInstances: 2000 };
    }
  }, []);

  const shouldRenderObject = useCallback((distance: number, importance: number = 1): boolean => {
    const lodLevel = getLODLevel(distance);
    if (lodLevel === 'culled') return false;
    
    // Importance-based culling for better performance
    const importanceThreshold = settings.animationQuality === 'low' ? 0.7 : 
                               settings.animationQuality === 'medium' ? 0.5 : 0.3;
    
    return importance >= importanceThreshold;
  }, [getLODLevel, settings.animationQuality]);

  const getAnimationSettings = useCallback(() => {
    return {
      enableSmoothing: settings.animationQuality !== 'low',
      transitionDuration: settings.animationQuality === 'high' ? 300 : 
                         settings.animationQuality === 'medium' ? 200 : 100,
      interpolationSteps: settings.animationQuality === 'high' ? 60 : 
                         settings.animationQuality === 'medium' ? 30 : 15,
      enableParticles: settings.animationQuality === 'high',
      enableTrails: settings.animationQuality !== 'low'
    };
  }, [settings.animationQuality]);

  const optimizeOrderData = useCallback((orders: any[], maxOrders?: number) => {
    const limit = maxOrders || settings.maxOrdersToRender;
    
    if (orders.length <= limit) return orders;
    
    // Sort by volume/importance and take the most significant orders
    const sortedOrders = [...orders].sort((a, b) => 
      (b.quantity || b.volume || 0) - (a.quantity || a.volume || 0)
    );
    
    return sortedOrders.slice(0, limit);
  }, [settings.maxOrdersToRender]);

  const getMemoryUsage = useCallback((): {
    used: number;
    limit: number;
    percentage: number;
  } => {
    if (typeof performance === 'undefined') return { used: 0, limit: 0, percentage: 0 };
    
    const memory = (performance as any).memory;
    if (!memory) return { used: 0, limit: 0, percentage: 0 };
    
    return {
      used: memory.usedJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
  }, []);

  const forceGarbageCollection = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_PERFORMANCE_SETTINGS);
    adaptiveQualityRef.current = true;
  }, []);

  const updateSettings = useCallback((updates: Partial<PerformanceSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const getPerformanceReport = useCallback(() => {
    const avgFPS = performanceHistoryRef.current.length > 0 
      ? performanceHistoryRef.current.reduce((a, b) => a + b) / performanceHistoryRef.current.length
      : metrics.fps;
    
    const memoryInfo = getMemoryUsage();
    
    return {
      current: metrics,
      average: { ...metrics, fps: avgFPS },
      memory: memoryInfo,
      settings: settings,
      recommendations: generatePerformanceRecommendations(avgFPS, memoryInfo.percentage)
    };
  }, [metrics, settings, getMemoryUsage]);

  const generatePerformanceRecommendations = (avgFPS: number, memoryUsage: number): string[] => {
    const recommendations: string[] = [];
    
    if (avgFPS < 30) {
      recommendations.push("Consider reducing animation quality to improve FPS");
      recommendations.push("Enable adaptive quality for automatic optimization");
    }
    
    if (memoryUsage > 80) {
      recommendations.push("High memory usage detected - consider reducing max orders");
      recommendations.push("Enable LOD system to reduce memory footprint");
    }
    
    if (metrics.renderCalls > 1000) {
      recommendations.push("High render calls - consider object instancing");
    }
    
    if (!settings.lod.enabled) {
      recommendations.push("Enable LOD system for better performance with large datasets");
    }
    
    return recommendations;
  };

  return {
    settings,
    metrics,
    updateSettings,
    updateMetrics,
    resetToDefaults,
    getLODLevel,
    getGeometryComplexity,
    shouldRenderObject,
    getAnimationSettings,
    optimizeOrderData,
    getMemoryUsage,
    forceGarbageCollection,
    getPerformanceReport
  };
};
