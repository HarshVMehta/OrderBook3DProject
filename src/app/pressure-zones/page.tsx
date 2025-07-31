'use client';

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import SmoothTransitionOrderbook from '@/components/3d/SmoothTransitionOrderbook';
import PressureZoneStats from '@/components/ui/PressureZoneStats';
import NotificationSystem from '@/components/ui/NotificationSystem';
import { useOrderbook } from '@/hooks/useOrderbook_simple';
import { OrderbookSimulator } from '@/services/orderbookSimulator';
import { PressureZoneAlert } from '@/services/pressureZoneAnalyzer';

export default function PressureZoneDemoPage() {
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showZoneStats, setShowZoneStats] = useState(true);
  const [showNotifications, setShowNotifications] = useState(true);
  const [showAxisLabels, setShowAxisLabels] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [simulatorRef] = useState(() => new OrderbookSimulator('BTCUSDT'));
  
  const {
    data,
    connectionState,
    error,
    pressureZones,
    pressureAnalysis,
    connectDemo,
    connectRealTime,
    disconnect
  } = useOrderbook();

  // Auto-connect in demo mode on component mount
  useEffect(() => {
    if (isDemoMode) {
      connectDemo();
    }
    
    return () => {
      disconnect();
    };
  }, [isDemoMode, connectDemo, disconnect]);

  const handleToggleMode = () => {
    disconnect();
    if (isDemoMode) {
      connectRealTime();
    } else {
      connectDemo();
    }
    setIsDemoMode(!isDemoMode);
  };

  const criticalZones = pressureZones.filter(zone => zone.intensity > 0.7);
  const supportZones = pressureZones.filter(zone => zone.type === 'support');
  const resistanceZones = pressureZones.filter(zone => zone.type === 'resistance');
  const accumulationZones = pressureZones.filter(zone => zone.pressureType === 'accumulation');
  const distributionZones = pressureZones.filter(zone => zone.pressureType === 'distribution');

  // Get alerts from pressure analysis
  const alerts: PressureZoneAlert[] = pressureAnalysis?.alerts || [];

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gray-800 bg-opacity-90 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              🔥 Advanced Pressure Zone Analysis
            </h1>
            
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionState === 'connected' ? 'bg-green-500' : 
                  connectionState === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-300">
                  {connectionState === 'connected' ? (isDemoMode ? 'Demo Mode' : 'Live Data') : 'Disconnected'}
                </span>
              </div>

              {/* Mode Toggle */}
              <button
                onClick={handleToggleMode}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                disabled={connectionState === 'connecting'}
              >
                {isDemoMode ? 'Switch to Live' : 'Switch to Demo'}
              </button>
            </div>
          </div>

          {/* Enhanced Quick Stats */}
          <div className="mt-3 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Zones:</span>
              <span className="text-white font-semibold">{pressureZones.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Critical:</span>
              <span className="text-red-400 font-semibold">{criticalZones.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">Support:</span>
              <span className="text-green-400 font-semibold">{supportZones.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400">Resistance:</span>
              <span className="text-red-400 font-semibold">{resistanceZones.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">Accumulation:</span>
              <span className="text-blue-400 font-semibold">{accumulationZones.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-400">Distribution:</span>
              <span className="text-purple-400 font-semibold">{distributionZones.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-30 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>Error: {error}</span>
          </div>
        </div>
      )}

      {/* Enhanced Control Panel */}
      <div className="absolute top-28 left-4 z-20 bg-gray-800 bg-opacity-90 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold mb-3">Visualization Controls</h3>
        
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show Heatmap</span>
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showZoneStats}
              onChange={(e) => setShowZoneStats(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show Zone Statistics</span>
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showNotifications}
              onChange={(e) => setShowNotifications(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show Notifications</span>
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAxisLabels}
              onChange={(e) => setShowAxisLabels(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show Axis Labels</span>
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(e) => setAutoRotate(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Auto Rotate</span>
          </label>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-600">
          <h4 className="text-sm font-semibold mb-2 text-gray-300">Zone Types</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Support Zones</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Resistance Zones</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Accumulation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Distribution</span>
            </div>
          </div>
        </div>

        {/* Analysis Features */}
        <div className="mt-4 pt-3 border-t border-gray-600">
          <h4 className="text-sm font-semibold mb-2 text-gray-300">Analysis Features</h4>
          <div className="space-y-1 text-xs text-gray-400">
            <div>• Volume Spike Detection</div>
            <div>• Price Level Clustering</div>
            <div>• Accumulation/Distribution</div>
            <div>• Real-time Alerts</div>
            <div>• Heatmap Visualization</div>
          </div>
        </div>
      </div>

      {/* Enhanced Pressure Zone Statistics */}
      {showZoneStats && (
        <PressureZoneStats 
          analysis={pressureAnalysis}
          className="absolute top-28 right-4 w-80 max-h-[calc(100vh-8rem)] overflow-y-auto z-20"
        />
      )}

      {/* Enhanced Notifications */}
      {showNotifications && (
        <NotificationSystem 
          alerts={alerts}
          maxNotifications={5}
          autoHide={true}
          hideDelay={8000}
        />
      )}

      {/* Main 3D Scene */}
      <div className="w-full h-screen">
        <Canvas
          style={{ background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)' }}
          camera={{
            position: [20, 15, 20],
            fov: 60,
            near: 0.1,
            far: 1000
          }}
        >
          {/* Enhanced Lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={0.8}
            castShadow
          />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />
          <pointLight position={[10, -10, 10]} intensity={0.2} color="#4ade80" />
          <pointLight position={[-10, 10, -10]} intensity={0.2} color="#ef4444" />
          <pointLight position={[0, 15, 0]} intensity={0.1} color="#a855f7" />

          {/* Environment */}
          <Environment preset="night" />

          {/* Enhanced 3D Orderbook with Pressure Zones */}
          {data && data.bids.length > 0 && data.asks.length > 0 && (
            <SmoothTransitionOrderbook 
              data={data}
              autoRotate={autoRotate}
              timeDepth={20}
              showPressureZones={true}
              showHeatmap={showHeatmap}
              showAxisLabels={showAxisLabels}
              transitionDuration={0.4}
              showDepthSurface={true}
              showCumulativeDepth={true}
              heatmapData={pressureAnalysis?.heatmapData}
            />
          )}

          {/* Interactive Camera Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={false}
            maxDistance={60}
            minDistance={8}
            maxPolarAngle={Math.PI}
            minPolarAngle={0}
            target={[0, 0, 0]}
            enableDamping={true}
            dampingFactor={0.05}
          />

          <PerspectiveCamera
            makeDefault
            position={[20, 15, 20]}
            fov={60}
            near={0.1}
            far={1000}
          />
        </Canvas>

        {/* Loading Overlay */}
        {(!data || connectionState === 'connecting') && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <div className="text-white text-xl mb-2">
                {connectionState === 'connecting' ? 'Connecting...' : 'Loading Advanced Pressure Analysis...'}
              </div>
              <div className="text-gray-400 text-sm">
                Initializing enhanced orderbook visualization with pressure zone detection
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Footer Info */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-center text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span>🎯 Advanced pressure zone detection</span>
          <span>📊 Volume spike analysis</span>
          <span>🔄 Real-time clustering</span>
          <span>💥 Accumulation/Distribution</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Enhanced with</span>
          <span className="text-red-400">♥</span>
          <span>for professional trading</span>
        </div>
      </div>

      {/* Analysis Status Indicator */}
      {pressureAnalysis && (
        <div className="absolute bottom-16 right-4 z-20 bg-gray-800 bg-opacity-90 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
          <div className="text-xs text-gray-300 mb-1">Analysis Status</div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-white">
              {pressureAnalysis.statistics.totalZones} zones detected
            </span>
          </div>
          {pressureAnalysis.statistics.strongestZone && (
            <div className="text-xs text-gray-400 mt-1">
              Strongest: {pressureAnalysis.statistics.strongestZone.pressureType} at ${pressureAnalysis.statistics.strongestZone.centerPrice.toFixed(2)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

