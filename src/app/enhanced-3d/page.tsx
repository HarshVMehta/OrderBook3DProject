'use client';

import React, { useState, useEffect } from 'react';
import { OrderbookScene3D } from '@/components/3d/OrderbookScene3D';
import PressureZoneStats from '@/components/ui/PressureZoneStats';
import ExportControlPanel from '@/components/ui/ExportControlPanel';
import RotationControlPanel from '@/components/ui/RotationControlPanel';
import { useOrderbook } from '@/hooks/useOrderbook_simple';
import { PressureZoneAnalyzer } from '@/services/pressureZoneAnalyzer';
import { OrderbookExportService } from '@/services/exportService';

export default function Enhanced3DVisualizationPage() {
  const [showPressureStats, setShowPressureStats] = useState(true);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showRotationControls, setShowRotationControls] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(0.5);
  const [rotationAxis, setRotationAxis] = useState<'x' | 'y' | 'z'>('z');
  const [cameraReset, setCameraReset] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  
  const { 
    data,
    connectionState,
    error,
    pressureZones
  } = useOrderbook();

  const [pressureZoneAnalysis, setPressureZoneAnalysis] = useState<any>(null);
  const pressureAnalyzer = React.useRef(new PressureZoneAnalyzer());

  // Camera settings for optimal 3D viewing
  const cameraSettings = {
    position: [15, 10, 15] as [number, number, number],
    target: [0, 0, 0] as [number, number, number],
    fov: 60,
    near: 0.1,
    far: 1000
  };

  // Analyze pressure zones when data changes
  useEffect(() => {
    if (data) {
      const analysis = pressureAnalyzer.current.analyzePressureZones(data);
      setPressureZoneAnalysis(analysis);
    }
  }, [data]);

  // Handle client-side mounting and time updates
  useEffect(() => {
    setIsMounted(true);
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };
    
    updateTime(); // Set initial time
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleThemeToggle = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleResetCamera = () => {
    setCameraReset(prev => prev + 1); // Trigger camera reset
  };

  const handleRotationToggle = () => {
    setAutoRotate(!autoRotate);
  };

  const handleRotationSpeedChange = (speed: number) => {
    setRotationSpeed(speed);
  };

  const handleRotationAxisChange = (axis: 'x' | 'y' | 'z') => {
    setRotationAxis(axis);
  };

  // Calculate current price from data
  const currentPrice = data ? 
    (data.bids.length > 0 && data.asks.length > 0) ? 
      (data.bids[0].price + data.asks[0].price) / 2 : 0 
    : 0;

  const isConnected = connectionState === 'connected';

  // Don't render time-dependent content until mounted
  if (!isMounted) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading Enhanced 3D Visualization...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-white">
            Enhanced 3D Orderbook Visualization
          </h1>
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
            <span className="text-sm text-gray-300">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Quick Export Button */}
          <button
            onClick={() => {
              if (data) {
                const exportService = OrderbookExportService.getInstance();
                const snapshot = exportService.createSnapshot(data, 'BTCUSDT', pressureZoneAnalysis);
                exportService.exportAsJSON(snapshot);
              }
            }}
            disabled={!data}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white rounded-lg transition-colors"
            title="Quick export current snapshot as JSON"
          >
            📥 Quick Export
          </button>
          
          {/* Theme Toggle */}
          <button
            onClick={handleThemeToggle}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {theme === 'dark' ? '☀️' : '🌙'} {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          
          {/* Auto Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-2 rounded-lg transition-colors ${
              autoRotate 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            🔄 Auto Rotate
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* 3D Visualization */}
        <div className="absolute inset-0">
          <OrderbookScene3D
            data={data}
            pressureZones={pressureZoneAnalysis?.zones || []}
            showPressureZones={showPressureStats}
            autoRotate={autoRotate}
            rotationSpeed={rotationSpeed}
            rotationAxis={rotationAxis}
            cameraReset={cameraReset}
            cameraSettings={cameraSettings}
            theme={theme}
          />
        </div>

        {/* Control Buttons */}
        <div className="absolute top-4 right-16 z-10 flex gap-2">
          <button
            onClick={() => setShowPressureStats(!showPressureStats)}
            className="bg-card hover:bg-accent text-foreground px-3 py-2 rounded-lg text-sm transition-colors border border-border"
          >
            {showPressureStats ? 'Hide Zones' : 'Pressure Zones'}
          </button>
          
          <button
            onClick={() => setShowExportPanel(!showExportPanel)}
            className="bg-card hover:bg-accent text-foreground px-3 py-2 rounded-lg text-sm transition-colors border border-border"
          >
            📥 Export
          </button>
          
          <button
            onClick={() => setShowRotationControls(!showRotationControls)}
            className="bg-card hover:bg-accent text-foreground px-3 py-2 rounded-lg text-sm transition-colors border border-border"
          >
            🔄 Rotation
          </button>
        </div>

        {/* Pressure Zone Statistics */}
        {showPressureStats && pressureZoneAnalysis && (
          <div className="absolute bottom-4 right-4 z-10 w-96">
            <PressureZoneStats 
              analysis={pressureZoneAnalysis}
              className="max-h-96 overflow-y-auto"
            />
          </div>
        )}

        {/* Export Control Panel */}
        {showExportPanel && (
          <div className="absolute top-48 right-4 z-10 w-80">
            <ExportControlPanel
              data={data}
              pressureZoneAnalysis={pressureZoneAnalysis}
              symbol="BTCUSDT"
              className="max-h-96 overflow-y-auto"
            />
          </div>
        )}

        {/* Rotation Control Panel */}
        {showRotationControls && (
          <div className="absolute top-64 left-4 z-10 w-80">
            <RotationControlPanel
              rotationSpeed={rotationSpeed}
              rotationAxis={rotationAxis}
              onRotationSpeedChange={handleRotationSpeedChange}
              onRotationAxisChange={handleRotationAxisChange}
              onResetCamera={handleResetCamera}
              onToggleRotation={handleRotationToggle}
              isRotating={rotationSpeed > 0}
            />
          </div>
        )}

        {/* Market Data Summary */}
        <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-70 text-white p-3 rounded-lg backdrop-blur-sm">
          <h3 className="text-sm font-semibold mb-2">Market Data</h3>
          {currentPrice > 0 && (
            <div className="space-y-1 text-xs">
              <div>Current Price: <span className="text-yellow-400 font-mono">${currentPrice.toFixed(2)}</span></div>
              <div>Symbol: <span className="text-blue-400">BTCUSDT</span></div>
              {data && (
                <>
                  <div>Bid Orders: <span className="text-green-400">{data.bids.length}</span></div>
                  <div>Ask Orders: <span className="text-red-400">{data.asks.length}</span></div>
                  <div>Max Volume: <span className="text-purple-400">{data.maxQuantity.toFixed(2)}</span></div>
                  <div>Price Range: <span className="text-gray-300">
                    ${data.priceRange.min.toFixed(2)} - ${data.priceRange.max.toFixed(2)}
                  </span></div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 3D Navigation Help */}
        <div className="absolute bottom-4 left-4 z-10 bg-black bg-opacity-70 text-white p-3 rounded-lg backdrop-blur-sm">
          <h3 className="text-sm font-semibold mb-2">3D Navigation Guide</h3>
          <div className="space-y-1 text-xs">
            <div>🎯 <span className="text-green-400">Volume bars:</span> Higher bars = more volume at that price</div>
            <div>📈 <span className="text-red-400">Price (X-axis):</span> Left = lower prices, Right = higher prices</div>
            <div>📊 <span className="text-green-400">Volume (Y-axis):</span> Height shows order quantity/volume</div>
            <div>⏰ <span className="text-blue-400">Time (Z-axis):</span> Front = recent orders, Back = older orders</div>
            <div>🔍 <span className="text-yellow-400">Controls:</span> Drag to rotate, scroll to zoom, right-click to pan</div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="bg-red-600 text-white p-4 rounded-lg shadow-lg">
              <h3 className="font-semibold mb-2">Connection Error</h3>
              <p className="text-sm">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 bg-red-700 hover:bg-red-800 rounded transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between p-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex items-center space-x-4">
          <span>Last Update: {currentTime}</span>
          {pressureZoneAnalysis && (
            <>
              <span>|</span>
              <span>Pressure Zones: {pressureZoneAnalysis.zones.length}</span>
              <span>|</span>
              <span>Alerts: {pressureZoneAnalysis.alerts.length}</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>Enhanced 3D Orderbook v2.0</span>
          <span>|</span>
          <span>Price × Volume × Time Visualization</span>
          <span>|</span>
          <span>📥 Export Available: JSON, CSV, TXT</span>
        </div>
      </div>
    </div>
  );
}
