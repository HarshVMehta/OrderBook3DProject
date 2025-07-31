'use client';

import React, { useState } from 'react';
import { OrderbookScene3D, PerformanceStats } from '@/components/3d/OrderbookScene3D';
import { ControlPanel, DataStats } from '@/components/ui/ControlPanel';
import PressureZoneStats from '@/components/ui/PressureZoneStats';
import RotationControlPanel from '@/components/ui/RotationControlPanel';
import { useOrderbook } from '@/hooks/useOrderbook_simple';
import { VisualizationSettings, CameraSettings } from '@/types/orderbook';

const defaultSettings: VisualizationSettings = {
  symbol: 'BTCUSDT',
  depth: 50,
  updateInterval: 200,
  showPressureZones: true,
  autoRotate: false,
  theme: 'dark',
  venues: [
    {
      id: 'binance',
      name: 'Binance',
      baseUrl: 'https://api.binance.com',
      wsUrl: 'wss://stream.binance.com:9443',
      enabled: true,
      color: '#f0b90b'
    }
  ]
};

const defaultCameraSettings: CameraSettings = {
  position: [15, 10, 15],
  target: [0, 0, 0],
  fov: 75,
  near: 0.1,
  far: 1000
};

export default function OrderbookVisualizerPage() {
  const [settings, setSettings] = useState<VisualizationSettings>(defaultSettings);
  const [cameraSettings] = useState<CameraSettings>(defaultCameraSettings);
  
  // Rotation control state
  const [rotationSpeed, setRotationSpeed] = useState(0.5);
  const [rotationAxis, setRotationAxis] = useState<'x' | 'y' | 'z'>('z');
  const [cameraReset, setCameraReset] = useState(0);
  const [showRotationControls, setShowRotationControls] = useState(true);

  // Rotation control handlers
  const handleResetCamera = () => {
    setCameraReset(prev => prev + 1);
  };

  const handleRotationToggle = () => {
    setRotationSpeed(prev => prev > 0 ? 0 : 0.5);
  };

  const handleRotationSpeedChange = (speed: number) => {
    setRotationSpeed(speed);
  };

  const handleRotationAxisChange = (axis: 'x' | 'y' | 'z') => {
    setRotationAxis(axis);
  };

  const {
    data,
    connectionState,
    error,
    pressureZones,
    pressureAnalysis,
    connect,
    disconnect
  } = useOrderbook();

  // Create derived values to match the old interface
  const isConnected = connectionState === 'connected';
  const connectionStatus = connectionState;
  const stats = null; // No stats in the new interface

  const handleSettingsChange = (newSettings: Partial<VisualizationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleConnect = () => {
    connect(); // Call without parameters
  };

  return (
    <div className="w-screen h-screen relative overflow-hidden">
      {/* Page Title */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <h1 className="text-2xl font-bold text-white bg-gray-800 bg-opacity-80 px-4 py-2 rounded-lg shadow-lg">
          Orderbook Depth 3D Visualizer
        </h1>
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Error: {error}
        </div>
      )}

      {/* Control Panel */}
      <ControlPanel
        settings={settings}
        onSettingsChange={handleSettingsChange}
        isConnected={isConnected}
        onConnect={connect}
        onDisconnect={disconnect}
        connectionStatus={connectionStatus}
      />

      {/* Data Statistics */}
      <DataStats data={stats} />

      {/* Performance Monitor */}
      <PerformanceStats />

      {/* Pressure Zone Analysis */}
      <PressureZoneStats 
        analysis={pressureAnalysis}
        className="absolute top-4 right-4 w-80 max-h-96 overflow-y-auto z-10"
      />

      {/* Rotation Control Toggle Button */}
      <div className="absolute bottom-4 right-4 z-10">
        <button
          onClick={() => setShowRotationControls(!showRotationControls)}
          className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors border border-gray-600"
        >
          🔄 Rotation Controls
        </button>
      </div>

      {/* Rotation Control Panel */}
      {showRotationControls && (
        <div className="absolute bottom-16 right-4 z-10 w-80">
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

      {/* Main 3D Scene */}
      <OrderbookScene3D
        data={data}
        pressureZones={pressureZones}
        showPressureZones={settings.showPressureZones}
        autoRotate={settings.autoRotate}
        cameraSettings={cameraSettings}
        theme={settings.theme}
        rotationSpeed={rotationSpeed}
        rotationAxis={rotationAxis}
        cameraReset={cameraReset}
      />

      {/* Instructions Overlay */}
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 z-30">
          <div className="bg-gray-800 text-white p-8 rounded-lg shadow-xl max-w-md text-center">
            <h2 className="text-xl font-bold mb-4">Welcome to Orderbook 3D</h2>
            <p className="mb-4 text-gray-300">
              This application visualizes cryptocurrency orderbook data in real-time 3D.
            </p>
            <ul className="text-left text-sm text-gray-400 mb-6 space-y-2">
              <li>• <strong>X-axis:</strong> Price levels</li>
              <li>• <strong>Y-axis:</strong> Order quantities</li>
              <li>• <strong>Z-axis:</strong> Time depth</li>
              <li>• <strong>Green:</strong> Bid orders (buy)</li>
              <li>• <strong>Red:</strong> Ask orders (sell)</li>
            </ul>
            <p className="text-sm text-gray-300 mb-4">
              Click the settings icon in the top-left to configure the visualization and connect to live data.
            </p>
            <button
              onClick={handleConnect}
              disabled={connectionStatus === 'connecting'}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Get Started'}
            </button>
          </div>
        </div>
      )}

      {/* Connection Status Indicator */}
      <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
        connectionStatus === 'connected' ? 'bg-green-500' :
        connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
        connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
      }`} />
    </div>
  );
}
