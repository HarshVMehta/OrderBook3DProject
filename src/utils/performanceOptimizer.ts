'use client';

import { ProcessedOrderbookData, OrderbookEntry } from '@/types/orderbook';

export interface PerformanceMetrics {
  frameRate: number;
  renderTime: number;
  memoryUsage: number;
  triangleCount: number;
  drawCalls: number;
  deviceTier: 'low' | 'medium' | 'high';
}

export interface LODConfig {
  highDetail: number;     // Distance threshold for high detail
  mediumDetail: number;   // Distance threshold for medium detail
  lowDetail: number;      // Distance threshold for low detail
  minBars: number;        // Minimum number of bars to show
  maxBars: number;        // Maximum number of bars to show
}

export class PerformanceOptimizer {
  private frameCount = 0;
  private lastTime = 0;
  private frameRate = 60;
  private renderTimes: number[] = [];
  private isLowEnd = false;
  private lodConfig: LODConfig;

  constructor() {
    this.lodConfig = this.detectDeviceCapabilities();
    this.detectDeviceTier();
  }

  /**
   * Detect device capabilities and set LOD configuration
   */
  private detectDeviceCapabilities(): LODConfig {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      // Fallback for devices without WebGL
      return {
        highDetail: 10,
        mediumDetail: 20,
        lowDetail: 50,
        minBars: 20,
        maxBars: 100
      };
    }

    const renderer = gl.getParameter(gl.RENDERER);
    const vendor = gl.getParameter(gl.VENDOR);
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);

    // Detect mobile devices
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const isTablet = /Tablet|iPad/i.test(navigator.userAgent);
    
    // Performance-based LOD configuration
    if (isMobile) {
      return {
        highDetail: 15,
        mediumDetail: 30,
        lowDetail: 60,
        minBars: 15,
        maxBars: 150
      };
    } else if (isTablet) {
      return {
        highDetail: 12,
        mediumDetail: 25,
        lowDetail: 50,
        minBars: 25,
        maxBars: 200
      };
    } else {
      // Desktop
      return {
        highDetail: 8,
        mediumDetail: 20,
        lowDetail: 40,
        minBars: 50,
        maxBars: 500
      };
    }
  }

  /**
   * Detect device performance tier
   */
  private detectDeviceTier(): void {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      this.isLowEnd = true;
      return;
    }

    // Memory and capability checks
    const memoryInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
    const cores = navigator.hardwareConcurrency || 2;
    const memory = (navigator as any).deviceMemory || 2;

    // Simple heuristic for device classification
    this.isLowEnd = cores < 4 || memory < 4;
  }

  /**
   * Update performance metrics
   */
  updateMetrics(renderTime: number): PerformanceMetrics {
    const now = performance.now();
    
    if (this.lastTime > 0) {
      const deltaTime = now - this.lastTime;
      this.frameRate = 1000 / deltaTime;
    }
    
    this.lastTime = now;
    this.frameCount++;
    
    // Track render times for averaging
    this.renderTimes.push(renderTime);
    if (this.renderTimes.length > 60) {
      this.renderTimes.shift();
    }

    const avgRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;

    return {
      frameRate: this.frameRate,
      renderTime: avgRenderTime,
      memoryUsage: this.getMemoryUsage(),
      triangleCount: 0, // Will be updated by renderer
      drawCalls: 0,     // Will be updated by renderer
      deviceTier: this.getDeviceTier()
    };
  }

  /**
   * Get memory usage estimation
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  /**
   * Get device performance tier
   */
  getDeviceTier(): 'low' | 'medium' | 'high' {
    if (this.isLowEnd || this.frameRate < 30) return 'low';
    if (this.frameRate < 50) return 'medium';
    return 'high';
  }

  /**
   * Optimize orderbook data based on performance and distance
   */
  optimizeOrderbookData(
    data: ProcessedOrderbookData,
    cameraDistance: number,
    targetFps = 60
  ): ProcessedOrderbookData {
    const currentFps = this.frameRate;
    const deviceTier = this.getDeviceTier();
    
    // Determine detail level based on camera distance and performance
    let detailLevel: 'high' | 'medium' | 'low';
    
    if (cameraDistance < this.lodConfig.highDetail && currentFps > 50 && deviceTier === 'high') {
      detailLevel = 'high';
    } else if (cameraDistance < this.lodConfig.mediumDetail && currentFps > 30) {
      detailLevel = 'medium';
    } else {
      detailLevel = 'low';
    }

    // Calculate target number of bars based on detail level and performance
    let targetBars: number;
    switch (detailLevel) {
      case 'high':
        targetBars = Math.min(this.lodConfig.maxBars, data.bids.length + data.asks.length);
        break;
      case 'medium':
        targetBars = Math.min(this.lodConfig.maxBars * 0.6, data.bids.length + data.asks.length);
        break;
      case 'low':
        targetBars = Math.min(this.lodConfig.maxBars * 0.3, data.bids.length + data.asks.length);
        break;
    }

    targetBars = Math.max(this.lodConfig.minBars, targetBars);

    // Optimize bids and asks
    const optimizedBids = this.optimizeOrderEntries(data.bids, Math.floor(targetBars * 0.5), detailLevel);
    const optimizedAsks = this.optimizeOrderEntries(data.asks, Math.floor(targetBars * 0.5), detailLevel);

    return {
      ...data,
      bids: optimizedBids,
      asks: optimizedAsks
    };
  }

  /**
   * Optimize individual order entries
   */
  private optimizeOrderEntries(
    entries: OrderbookEntry[],
    targetCount: number,
    detailLevel: 'high' | 'medium' | 'low'
  ): OrderbookEntry[] {
    if (entries.length <= targetCount) {
      return entries;
    }

    // Different optimization strategies based on detail level
    switch (detailLevel) {
      case 'high':
        return this.intelligentSampling(entries, targetCount);
      case 'medium':
        return this.volumeWeightedSampling(entries, targetCount);
      case 'low':
        return this.uniformSampling(entries, targetCount);
    }
  }

  /**
   * Intelligent sampling preserving important price levels
   */
  private intelligentSampling(entries: OrderbookEntry[], targetCount: number): OrderbookEntry[] {
    if (entries.length <= targetCount) return entries;

    const sorted = [...entries].sort((a, b) => b.quantity - a.quantity);
    const step = entries.length / targetCount;
    const result: OrderbookEntry[] = [];

    // Always include top volume orders
    const topVolumeCount = Math.min(targetCount * 0.3, 10);
    result.push(...sorted.slice(0, topVolumeCount));

    // Sample remaining with uniform distribution
    const remaining = targetCount - result.length;
    for (let i = 0; i < remaining; i++) {
      const index = Math.floor(i * step);
      if (index < entries.length && !result.some(r => r.price === entries[index].price)) {
        result.push(entries[index]);
      }
    }

    return result.slice(0, targetCount);
  }

  /**
   * Volume-weighted sampling
   */
  private volumeWeightedSampling(entries: OrderbookEntry[], targetCount: number): OrderbookEntry[] {
    if (entries.length <= targetCount) return entries;

    const totalVolume = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const targetVolumePerEntry = totalVolume / targetCount;
    const result: OrderbookEntry[] = [];
    let currentVolume = 0;
    let currentEntry: OrderbookEntry | null = null;

    for (const entry of entries) {
      if (!currentEntry) {
        currentEntry = { ...entry };
        currentVolume = entry.quantity;
      } else {
        currentVolume += entry.quantity;
        // Merge entries by updating price to volume-weighted average
        const totalVol = currentEntry.quantity + entry.quantity;
        currentEntry.price = (currentEntry.price * currentEntry.quantity + entry.price * entry.quantity) / totalVol;
        currentEntry.quantity = totalVol;
      }

      if (currentVolume >= targetVolumePerEntry || result.length >= targetCount - 1) {
        result.push(currentEntry);
        currentEntry = null;
        currentVolume = 0;
      }
    }

    // Add remaining entry if exists
    if (currentEntry && result.length < targetCount) {
      result.push(currentEntry);
    }

    return result;
  }

  /**
   * Simple uniform sampling
   */
  private uniformSampling(entries: OrderbookEntry[], targetCount: number): OrderbookEntry[] {
    if (entries.length <= targetCount) return entries;

    const step = entries.length / targetCount;
    const result: OrderbookEntry[] = [];

    for (let i = 0; i < targetCount; i++) {
      const index = Math.floor(i * step);
      result.push(entries[index]);
    }

    return result;
  }

  /**
   * Get LOD configuration
   */
  getLODConfig(): LODConfig {
    return { ...this.lodConfig };
  }

  /**
   * Update LOD configuration based on current performance
   */
  updateLODConfig(metrics: PerformanceMetrics): void {
    if (metrics.frameRate < 30) {
      // Reduce detail levels for better performance
      this.lodConfig.maxBars = Math.max(50, this.lodConfig.maxBars * 0.8);
      this.lodConfig.highDetail *= 1.2;
      this.lodConfig.mediumDetail *= 1.2;
    } else if (metrics.frameRate > 55) {
      // Increase detail levels if performance allows
      this.lodConfig.maxBars = Math.min(500, this.lodConfig.maxBars * 1.1);
      this.lodConfig.highDetail *= 0.9;
      this.lodConfig.mediumDetail *= 0.9;
    }
  }

  /**
   * Check if current device/browser supports high performance features
   */
  supportsHighPerformance(): boolean {
    return !this.isLowEnd && this.frameRate > 45;
  }

  /**
   * Get recommended settings based on device capabilities
   */
  getRecommendedSettings() {
    const deviceTier = this.getDeviceTier();
    
    return {
      shadows: deviceTier === 'high',
      antialiasing: deviceTier !== 'low',
      particleEffects: deviceTier === 'high',
      complexShaders: deviceTier !== 'low',
      highResolutionTextures: deviceTier === 'high',
      animationQuality: deviceTier === 'low' ? 'reduced' : 'full',
      targetFrameRate: deviceTier === 'low' ? 30 : 60
    };
  }
}

// Singleton instance
export const performanceOptimizer = new PerformanceOptimizer();
