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
    if (!analysis.heatmapData || analysis.heatmapData.length === 0) return [];

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
      <svg width={width} height={height} className="border border-border rounded">
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
              className="text-xs fill-current text-foreground"
              opacity={0.8}
            >
              {overlay.type}
            </text>
          </g>
        ))}

        {/* Heatmap points */}
        {heatmapLayers.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r={Math.max(2, point.intensity * 8 + point.density * 4)}
              fill={point.color}
              opacity={point.opacity}
              className="transition-all duration-200"
            />
            {point.intensity > 0.7 && (
              <circle
                cx={point.x}
                cy={point.y}
                r={point.intensity * 12}
                fill="none"
                stroke={point.color}
                strokeWidth="1"
                opacity={0.5}
                className="animate-pulse"
              />
            )}
          </g>
        ))}

        {/* Price axis labels */}
        <g>
          <text x={10} y={height - 10} className="text-xs fill-current text-muted-foreground">
            ${orderbookData.priceRange.min.toFixed(0)}
          </text>
          <text x={width - 60} y={height - 10} className="text-xs fill-current text-muted-foreground">
            ${orderbookData.priceRange.max.toFixed(0)}
          </text>
          <text x={width / 2} y={height - 10} className="text-xs fill-current text-muted-foreground" textAnchor="middle">
            Price
          </text>
        </g>

        {/* Intensity axis labels */}
        <g>
          <text x={10} y={15} className="text-xs fill-current text-muted-foreground">
            High
          </text>
          <text x={10} y={height - 30} className="text-xs fill-current text-muted-foreground">
            Low
          </text>
        </g>
      </svg>

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
