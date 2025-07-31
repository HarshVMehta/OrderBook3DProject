'use client';

import React, { useState } from 'react';
import { ResponsiveLayout } from '@/components/ui/ResponsiveLayout';
import { OptimizedOrderbookScene } from '@/components/3d/OptimizedOrderbookScene';
import InteractiveControlPanel from '@/components/ui/InteractiveControlPanel';
import PressureZoneStats from '@/components/ui/PressureZoneStats';
import { ConnectionMonitor } from '@/components/ui/ConnectionMonitor';
import { useResponsiveDesign } from '@/hooks/useResponsiveDesign';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { Settings, Monitor, Smartphone, Tablet, Computer } from 'lucide-react';

// Sample orderbook data for demonstration
const generateSampleOrderbookData = () => {
  const basePrice = 50000;
  const bids = [];
  const asks = [];
  
  // Generate bid orders (below current price)
  for (let i = 0; i < 50; i++) {
    const price = basePrice - (i * 10) - Math.random() * 10;
    const size = Math.random() * 5 + 0.1;
    bids.push({
      price,
      size,
      total: size * (i + 1)
    });
  }
  
  // Generate ask orders (above current price)
  for (let i = 0; i < 50; i++) {
    const price = basePrice + (i * 10) + Math.random() * 10;
    const size = Math.random() * 5 + 0.1;
    asks.push({
      price,
      size,
      total: size * (i + 1)
    });
  }
  
  return {
    bids,
    asks,
    currentPrice: basePrice,
    timestamp: Date.now(),
    spread: asks[0]?.price - bids[0]?.price || 0
  };
};

// Performance Settings Panel
const PerformanceSettingsPanel: React.FC = () => {
  const { settings, updateSettings, metrics, getPerformanceReport } = usePerformanceOptimization();
  const [showReport, setShowReport] = useState(false);
  
  const report = getPerformanceReport();

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <Monitor className="mr-2" size={20} />
          Performance Settings
        </h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Target FPS</label>
            <input
              type="range"
              min="30"
              max="120"
              value={settings.targetFPS}
              onChange={(e) => updateSettings({ targetFPS: parseInt(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-gray-400">{settings.targetFPS} FPS</span>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Max Orders</label>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={settings.maxOrdersToRender}
              onChange={(e) => updateSettings({ maxOrdersToRender: parseInt(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-gray-400">{settings.maxOrdersToRender} orders</span>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Animation Quality</label>
            <select
              value={settings.animationQuality}
              onChange={(e) => updateSettings({ animationQuality: e.target.value as any })}
              className="w-full bg-gray-700 text-white p-2 rounded"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.adaptiveQuality}
                onChange={(e) => updateSettings({ adaptiveQuality: e.target.checked })}
                className="mr-2"
              />
              Adaptive Quality
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.shadowsEnabled}
                onChange={(e) => updateSettings({ shadowsEnabled: e.target.checked })}
                className="mr-2"
              />
              Shadows
            </label>
          </div>
        </div>
      </div>
      
      {/* Real-time Metrics */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Real-time Metrics</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>FPS: <span className="text-green-400">{Math.round(metrics.fps)}</span></div>
          <div>Memory: <span className="text-blue-400">{metrics.memoryUsage.toFixed(1)}MB</span></div>
          <div>Frame Time: <span className="text-yellow-400">{metrics.frameTime.toFixed(1)}ms</span></div>
          <div>Triangles: <span className="text-purple-400">{metrics.triangles}</span></div>
        </div>
      </div>
      
      {/* Performance Report */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <button
          onClick={() => setShowReport(!showReport)}
          className="w-full text-left font-medium mb-2 flex items-center justify-between"
        >
          Performance Report
          <span>{showReport ? '−' : '+'}</span>
        </button>
        
        {showReport && (
          <div className="space-y-2 text-sm">
            <div>Status: <span className={`${report.average.fps > 50 ? 'text-green-400' : 'text-yellow-400'}`}>
              {report.average.fps > 50 ? 'GOOD' : 'NEEDS OPTIMIZATION'}
            </span></div>
            <div>Recommendations:</div>
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-300">
              {report.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// Device Info Panel
const DeviceInfoPanel: React.FC = () => {
  const { deviceInfo, getPerformanceRecommendations } = useResponsiveDesign();
  const recommendations = getPerformanceRecommendations();

  const DeviceIcon = deviceInfo.type === 'mobile' ? Smartphone :
                    deviceInfo.type === 'tablet' ? Tablet : Computer;

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        <DeviceIcon className="mr-2" size={20} />
        Device Information
      </h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Type:</span>
          <span className="capitalize">{deviceInfo.type}</span>
        </div>
        <div className="flex justify-between">
          <span>Touch Device:</span>
          <span>{deviceInfo.isTouchDevice ? 'Yes' : 'No'}</span>
        </div>
        <div className="flex justify-between">
          <span>Orientation:</span>
          <span className="capitalize">{deviceInfo.orientation}</span>
        </div>
        <div className="flex justify-between">
          <span>Screen Size:</span>
          <span>{deviceInfo.screenSize.width}×{deviceInfo.screenSize.height}</span>
        </div>
        <div className="flex justify-between">
          <span>Pixel Ratio:</span>
          <span>{deviceInfo.pixelRatio}</span>
        </div>
        <div className="flex justify-between">
          <span>Performance:</span>
          <span className={deviceInfo.isLowEnd ? 'text-yellow-400' : 'text-green-400'}>
            {deviceInfo.isLowEnd ? 'Low-end' : 'Standard'}
          </span>
        </div>
      </div>
      
      {recommendations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="font-medium mb-2">Recommendations</h4>
          <ul className="space-y-1 text-xs text-gray-300">
            {recommendations.map((rec, i) => (
              <li key={i}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default function ResponsivePerformancePage() {
  const [orderbookData] = useState(generateSampleOrderbookData);
  const { deviceInfo } = useResponsiveDesign();

  // Control panel content
  const controlPanel = (
    <div className="space-y-4">
      <InteractiveControlPanel 
        settings={{
          priceRange: { min: 45000, max: 55000, enabled: true },
          quantityThreshold: { min: 0.1, max: 10, enabled: true },
          venues: ['binance'],
          timeRange: 'live',
          visualizationMode: 'realtime',
          searchQuery: '',
          showBids: true,
          showAsks: true,
          showPressureZones: true,
          showHeatmap: true,
          showDepthSurface: true,
          autoRotate: false,
          showAxisLabels: true,
          showGrid: true,
          showStatistics: true
        }}
        onSettingsChange={() => {}}
        availableVenues={['binance', 'coinbase']}
        currentPrice={50000}
      />
      <DeviceInfoPanel />
    </div>
  );

  // Stats panel content
  const statsPanel = (
    <div className="space-y-4">
      <PressureZoneStats 
        analysis={{
          zones: [],
          statistics: {
            totalZones: 0,
            supportZones: 0,
            resistanceZones: 0,
            averageIntensity: 0,
            strongestZone: null,
            criticalLevels: [],
            volumeDistribution: {
              totalVolume: 0,
              averageVolume: 0,
              volumeSpikes: 0,
              volumeConcentration: 0
            },
            priceClusters: {
              totalClusters: 0,
              averageClusterSize: 0,
              largestCluster: 0,
              clusterDensity: 0
            },
            temporalAnalysis: {
              formingZones: 0,
              strengtheningZones: 0,
              weakeningZones: 0,
              averageZoneAge: 0
            },
            riskMetrics: {
              marketFragmentation: 0,
              concentrationRisk: 0,
              volatilityIndicator: 0
            }
          },
          alerts: [],
          heatmapData: [],
          gradientOverlay: []
        }}
      />
      <ConnectionMonitor 
        connectionState="connected"
        isRealTime={true}
        error={null}
        connectionStats={{
          totalConnections: 1,
          reconnections: 0,
          dataUpdates: 1250,
          lastUpdateTime: Date.now(),
          averageLatency: 45,
          status: 'connected'
        }}
      />
    </div>
  );

  // Settings panel content
  const settingsPanel = (
    <div className="space-y-4">
      <PerformanceSettingsPanel />
    </div>
  );

  return (
    <div className="w-full h-screen bg-gray-900 text-white overflow-hidden">
      <ResponsiveLayout
        controlPanel={controlPanel}
        statsPanel={statsPanel}
        settingsPanel={settingsPanel}
      >
        <OptimizedOrderbookScene 
          orderbookData={orderbookData}
          className="w-full h-full"
        />
      </ResponsiveLayout>
      
      {/* Touch instructions for mobile */}
      {deviceInfo.isTouchDevice && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-center z-40 pointer-events-none">
          <div className="bg-black bg-opacity-70 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-sm border border-gray-600">
            Touch controls active • 1 finger: rotate • 2 fingers: zoom • 3 fingers: pan
          </div>
        </div>
      )}
    </div>
  );
}
