'use client';

import React, { useMemo } from 'react';
import { PressureZone, ProcessedOrderbookData } from '@/types/orderbook';
import { PressureZoneAnalysis } from '@/services/pressureZoneAnalyzer';
import { useTheme3D } from '@/hooks/useTheme3D';

interface EnhancedPressureHeatmapProps {
  analysis: PressureZoneAnalysis;
  orderbookData: ProcessedOrderbookData;
  currentPrice?: number;
  width?: number;
  height?: number;
  showGradients?: boolean;
  showAlerts?: boolean;
}

export const EnhancedPressureHeatmap: React.FC<EnhancedPressureHeatmapProps> = ({
  analysis,
  orderbookData,
  currentPrice = 0,
  width = 400,
  height = 300,
  showGradients = true,
  showAlerts = true
}) => {
  const themeColors = useTheme3D();

  // Generate heatmap visualization data
  const heatmapLayers = useMemo(() => {
    if (!analysis.heatmapData || analysis.heatmapData.length === 0) {
      // Generate fallback heatmap data if none exists
      const fallbackData = [];
      const priceRange = orderbookData.priceRange;
      const priceSpan = priceRange.max - priceRange.min;
      const resolution = 20;
      
      for (let i = 0; i < resolution; i++) {
        const price = priceRange.min + (i / resolution) * priceSpan;
        const x = (i / resolution) * width;
        const intensity = Math.random() * 0.5 + 0.1; // Random intensity for demo
        const y = height - (intensity * height);
        
        fallbackData.push({
          x,
          y,
          color: intensity > 0.4 ? '#ef4444' : intensity > 0.3 ? '#f59e0b' : '#10b981',
          opacity: intensity,
          intensity,
          density: intensity * 0.5,
          gradient: 0,
          price,
          volume: Math.random() * 1000,
          riskLevel: intensity > 0.4 ? 'high' : intensity > 0.3 ? 'medium' : 'low'
        });
      }
      
      return fallbackData;
    }

    const priceRange = orderbookData.priceRange;
    const priceSpan = priceRange.max - priceRange.min;
    
    return analysis.heatmapData.map((point, index) => {
      const x = ((point.price - priceRange.min) / priceSpan) * width;
      const y = height - (point.intensity * height);
      const intensity = point.intensity;
      const density = point.density || 0;
      const gradient = point.gradient || 0;
      
      // Color based on risk level and intensity
      let color: string;
      switch (point.riskLevel) {
        case 'critical':
          color = themeColors.pressureColors.high;
          break;
        case 'high':
          color = '#f59e0b'; // Orange
          break;
        case 'medium':
          color = themeColors.pressureColors.medium;
          break;
        default:
          color = themeColors.pressureColors.low;
      }

      const opacity = Math.min(0.9, Math.max(0.1, intensity + density * 0.3));

      return {
        x,
        y,
        color,
        opacity,
        intensity,
        density,
        gradient,
        price: point.price,
        volume: point.volume,
        riskLevel: point.riskLevel
      };
    });
  }, [analysis.heatmapData, orderbookData.priceRange, width, height, themeColors]);

  // Generate gradient overlays
  const gradientOverlays = useMemo(() => {
    if (!showGradients || !analysis.gradientOverlay) return [];

    const priceRange = orderbookData.priceRange;
    const priceSpan = priceRange.max - priceRange.min;

    return analysis.gradientOverlay.map((overlay, index) => {
      const startX = ((overlay.startPrice - priceRange.min) / priceSpan) * width;
      const endX = ((overlay.endPrice - priceRange.min) / priceSpan) * width;
      const overlayWidth = endX - startX;

      return {
        id: `gradient-${index}`,
        x: startX,
        width: overlayWidth,
        height: height,
        color: overlay.color,
        opacity: overlay.opacity,
        type: overlay.type,
        intensity: overlay.intensity
      };
    });
  }, [analysis.gradientOverlay, orderbookData.priceRange, width, height, showGradients]);

  return (
    <div className="relative bg-card border border-border rounded-lg p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">Pressure Zone Heatmap</h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>Critical Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500"></div>
            <span>High Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>Low Risk</span>
          </div>
        </div>
      </div>

      {/* SVG Heatmap Visualization */}
      <div className="border-2 border-blue-500 rounded-lg p-2 bg-gray-900/50">
        <div className="text-center text-sm font-medium text-white mb-2">
          Pressure Zone Heatmap ({heatmapLayers.length} zones)
        </div>
        <svg width={width} height={height} className="border border-gray-400 rounded bg-black/30">
          <defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#1e3a8a', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#000000', stopOpacity: 0.8 }} />
            </linearGradient>
          </defs>
          
          {/* Background with gradient */}
          <rect width="100%" height="100%" fill="url(#bgGradient)" />
          
          {/* Background gradient overlays */}
          {gradientOverlays.map((overlay) => (
            <g key={overlay.id}>
              <rect
                x={overlay.x}
                y={0}
                width={overlay.width}
                height={overlay.height}
                fill={overlay.color}
                opacity={overlay.opacity * 0.3}
              />
              <text
                x={overlay.x + overlay.width / 2}
                y={20}
                textAnchor="middle"
                className="text-xs fill-white"
                opacity={0.8}
              >
                {overlay.type}
              </text>
            </g>
          ))}

          {/* Heatmap points with enhanced visibility */}
          {heatmapLayers.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r={Math.max(3, point.intensity * 10 + point.density * 6)}
                fill={point.color}
                opacity={Math.max(0.4, point.opacity)}
                className="transition-all duration-200"
                stroke="white"
                strokeWidth="0.5"
              />
              {point.intensity > 0.5 && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={point.intensity * 15}
                  fill="none"
                  stroke={point.color}
                  strokeWidth="2"
                  opacity={0.6}
                  className="animate-pulse"
                />
              )}
            </g>
          ))}

          {/* Price axis labels */}
          <g>
            <text x={10} y={height - 10} className="text-xs fill-white font-mono">
              ${orderbookData.priceRange.min.toFixed(0)}
            </text>
            <text x={width - 60} y={height - 10} className="text-xs fill-white font-mono">
              ${orderbookData.priceRange.max.toFixed(0)}
            </text>
            <text x={width / 2} y={height - 10} className="text-xs fill-white font-mono" textAnchor="middle">
              Price Range
            </text>
          </g>

          {/* Intensity axis labels */}
          <g>
            <text x={10} y={15} className="text-xs fill-red-400 font-bold">
              High Risk
            </text>
            <text x={10} y={height - 30} className="text-xs fill-green-400 font-bold">
              Low Risk
            </text>
          </g>
        </svg>
      </div>

      {/* Statistics Panel */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-muted p-3 rounded">
          <div className="text-muted-foreground">Total Zones</div>
          <div className="text-lg font-bold text-foreground">{analysis.statistics.totalZones}</div>
        </div>
        <div className="bg-muted p-3 rounded">
          <div className="text-muted-foreground">Avg Intensity</div>
          <div className="text-lg font-bold text-foreground">{(analysis.statistics.averageIntensity * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-muted p-3 rounded">
          <div className="text-muted-foreground">Volume Spikes</div>
          <div className="text-lg font-bold text-foreground">{analysis.statistics.volumeDistribution.volumeSpikes}</div>
        </div>
        <div className="bg-muted p-3 rounded">
          <div className="text-muted-foreground">Price Clusters</div>
          <div className="text-lg font-bold text-foreground">{analysis.statistics.priceClusters.totalClusters}</div>
        </div>
      </div>

      {/* Active Alerts */}
      {showAlerts && analysis.alerts.length > 0 && (
        <div className="mt-4">
          <h4 className="text-md font-semibold text-foreground mb-2">Active Alerts</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {analysis.alerts.slice(0, 5).map((alert) => (
              <div 
                key={alert.id}
                className={`p-2 rounded text-sm border-l-4 ${
                  alert.severity === 'critical' ? 'bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:text-red-200' :
                  alert.severity === 'high' ? 'bg-orange-50 border-orange-500 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200' :
                  alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' :
                  'bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{alert.type.replace('_', ' ')}</span>
                  <span className="text-xs opacity-75">{alert.severity}</span>
                </div>
                <div className="text-xs mt-1 opacity-90">{alert.message}</div>
                {alert.confidence && (
                  <div className="text-xs mt-1">
                    Confidence: {(alert.confidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
