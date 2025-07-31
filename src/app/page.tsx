'use client';

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import SmoothTransitionOrderbook from '@/components/3d/SmoothTransitionOrderbook';
import { useRealTimeOrderbook } from '@/services/realTimeDataManager';
import { ConnectionMonitor, DataQualityIndicator } from '@/components/ui/ConnectionMonitor';
import { ConnectionNotificationSystem, ConnectionRecoveryPrompt, DataStalenessIndicator } from '@/components/ui/ConnectionNotificationSystem';
import InteractiveControlPanel, { FilterSettings } from '@/components/ui/InteractiveControlPanel';
import FilterStatistics from '@/components/ui/FilterStatistics';
import PressureZoneStats from '@/components/ui/PressureZoneStats';
import RotationControlPanel from '@/components/ui/RotationControlPanel';
import { Enhanced3DPressureZones } from '@/components/3d/Enhanced3DPressureZones';
import { EnhancedPressureHeatmap } from '@/components/3d/EnhancedPressureHeatmap';
import { MobileTouchControls, MobilePerformanceIndicator } from '@/components/ui/MobileTouchControls';
import { DataFilterService, FilteredOrderbookData } from '@/services/dataFilterService';
import { PressureZoneAnalyzer, PressureZoneAnalysis } from '@/services/pressureZoneAnalyzer';
import ExportControlPanel from '@/components/ui/ExportControlPanel';
import { OrderbookExportService } from '@/services/exportService';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { useHydrationSafeResponsive } from '@/hooks/useHydrationSafeResponsive';
import { useTouch3DControls } from '@/hooks/useTouchControls';

export default function OrderbookVisualizerPage() {
  const [isStarted, setIsStarted] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [tryRealTime, setTryRealTime] = useState(true);
  const [showMonitor, setShowMonitor] = useState(false);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [showFilterStats, setShowFilterStats] = useState(false);
  const [showControlPanel, setShowControlPanel] = useState(true);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showRotationControls, setShowRotationControls] = useState(false);
  
  // Rotation control state
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [rotationAxis, setRotationAxis] = useState<'x' | 'y' | 'z'>('z');
  const [cameraReset, setCameraReset] = useState(0);
  
  // Filter settings state
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    priceRange: { min: 0, max: 100000, enabled: false },
    quantityThreshold: { min: 0, max: 1000, enabled: false },
    venues: ['Binance', 'Coinbase', 'Kraken', 'Bitfinex'],
    timeRange: 'live',
    visualizationMode: 'realtime',
    searchQuery: '',
    showBids: true,
    showAsks: true,
    showPressureZones: false,
    showHeatmap: false,
    showDepthSurface: true,
    autoRotate: false,
    showAxisLabels: false,
    showGrid: false,
    showStatistics: true
  });

  // Filtered data state
  const [filteredData, setFilteredData] = useState<FilteredOrderbookData | null>(null);
  const [filterService] = useState(() => new DataFilterService());
  
  // Pressure zone analysis state
  const [pressureZoneAnalysis, setPressureZoneAnalysis] = useState<PressureZoneAnalysis | null>(null);
  const [pressureZoneAnalyzer] = useState(() => new PressureZoneAnalyzer());
  const [showPressureStats, setShowPressureStats] = useState(false);
  
  const {
    data,
    connectionState,
    connectionStats,
    error,
    isRealTime,
    connectRealTime,
    connectDemo,
    disconnect,
    isConnected
  } = useRealTimeOrderbook(symbol);

  // Performance optimization and responsive design hooks
  const { 
    settings: performanceSettings, 
    metrics: performanceMetrics,
    getPerformanceReport,
    optimizeOrderData 
  } = usePerformanceOptimization();
  
  const { 
    deviceInfo, 
    getCurrentSettings,
    getUILayout,
    toggleFullscreen,
    supportsFullscreen,
    isFullscreen,
    isMounted
  } = useHydrationSafeResponsive();
  
  const { 
    touchHandlers, 
    isTouchDevice,
    resetCamera 
  } = useTouch3DControls();

  // Get responsive UI configuration
  const responsiveSettings = getCurrentSettings();
  const uiLayout = getUILayout();

  // Apply filters when data or settings change
  useEffect(() => {
    if (data && filterSettings) {
      const filtered = filterService.filterOrderbookData(data, filterSettings);
      setFilteredData(filtered);
      
      // Analyze pressure zones
      const analysis = pressureZoneAnalyzer.analyzePressureZones(data);
      setPressureZoneAnalysis(analysis);
    }
  }, [data, filterSettings, filterService, pressureZoneAnalyzer]);

  // Update filter settings when autoRotate changes
  useEffect(() => {
    setFilterSettings(prev => ({ ...prev, autoRotate }));
  }, [autoRotate]);

  const handleGetStarted = async () => {
    setIsStarted(true);
    if (tryRealTime) {
      try {
        await connectRealTime();
      } catch (err) {
        console.log('Real-time connection failed, showing recovery prompt');
        setShowRecoveryPrompt(true);
      }
    } else {
      connectDemo();
    }
  };

  const handleToggleConnection = () => {
    if (isConnected) {
      disconnect();
      setIsStarted(false);
    } else {
      handleGetStarted();
    }
  };

  const handleRetryConnection = async () => {
    setShowRecoveryPrompt(false);
    try {
      await connectRealTime();
    } catch (err) {
      setShowRecoveryPrompt(true);
    }
  };

  const handleSwitchToDemo = () => {
    setShowRecoveryPrompt(false);
    connectDemo();
  };

  // Rotation control handlers
  const handleResetCamera = () => {
    setCameraReset(prev => prev + 1);
  };

  const handleRotationToggle = () => {
    const newSpeed = rotationSpeed > 0 ? 0 : 0.5;
    setRotationSpeed(newSpeed);
    // Also update the autoRotate setting in filter settings
    setFilterSettings(prev => ({ ...prev, autoRotate: newSpeed > 0 }));
  };

  const handleRotationSpeedChange = (speed: number) => {
    setRotationSpeed(speed);
  };

  const handleRotationAxisChange = (axis: 'x' | 'y' | 'z') => {
    setRotationAxis(axis);
  };

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return isRealTime ? 'text-green-400' : 'text-blue-400';
      case 'connecting':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const currentPrice = data?.bids[0]?.price || 0;

  return (
    <div 
      className="w-screen h-screen relative overflow-hidden bg-background text-foreground transition-colors duration-300"
      style={{ fontSize: isMounted ? `${uiLayout.scale}rem` : '1rem' }}
    >
      {/* Mobile Performance Indicator - only render after hydration */}
      {isMounted && deviceInfo.type === 'mobile' && (
        <MobilePerformanceIndicator 
          fps={performanceMetrics.fps}
          quality={responsiveSettings.animationQuality}
        />
      )}
      
      {/* Mobile Touch Controls - only render after hydration */}
      {isMounted && isTouchDevice && <MobileTouchControls onCameraReset={resetCamera} />}
      
      {/* Connection Notification System */}
      <ConnectionNotificationSystem
        connectionState={connectionState}
        isRealTime={isRealTime}
        error={error}
        dataGapDetected={false}
      />

      {/* Connection Recovery Prompt */}
      <ConnectionRecoveryPrompt
        show={showRecoveryPrompt}
        onRetry={handleRetryConnection}
        onSwitchToDemo={handleSwitchToDemo}
        attempts={connectionStats?.reconnections || 0}
      />

      {/* Data Staleness Indicator */}
      <DataStalenessIndicator
        lastUpdateTime={connectionStats?.lastUpdateTime || 0}
        isConnected={isConnected}
      />

      {/* Responsive Header */}
      <div className={`absolute top-4 z-10 ${
        isMounted && deviceInfo.type === 'mobile' ? 'left-4 right-4' : 'left-1/2 transform -translate-x-1/2'
      }`}>
        <h1 className={`font-bold text-foreground bg-card bg-opacity-90 px-6 py-3 rounded-lg shadow-lg border border-border ${
          isMounted && deviceInfo.type === 'mobile' ? 'text-lg text-center' : 'text-2xl'
        }`}>
          {isMounted && deviceInfo.type === 'mobile' ? '3D Orderbook' : 'Real-Time 3D Orderbook Visualizer'}
        </h1>
      </div>

      {/* Responsive Status Panel */}
      {isStarted && (
        <div className={`absolute z-10 bg-card bg-opacity-90 rounded-lg p-4 text-foreground shadow-lg border border-border ${
          isMounted && deviceInfo.type === 'mobile' 
            ? 'top-20 left-4 right-4' 
            : 'top-4 left-4'
        }`}>
          <div className={`space-y-2 ${isMounted && deviceInfo.type === 'mobile' ? 'text-xs' : 'text-sm'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionState === 'connected' ? (isRealTime ? 'bg-green-500' : 'bg-blue-500') :
                  connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  connectionState === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
                <span className={getConnectionStatusColor()}>
                  {connectionState === 'connected' ? (isRealTime ? 'Live Data' : 'Demo Mode') :
                   connectionState === 'connecting' ? 'Connecting...' :
                   connectionState === 'error' ? 'Connection Error' : 'Disconnected'}
                </span>
              </div>
              
              <button
                onClick={handleToggleConnection}
                className="px-2 py-1 text-xs bg-primary hover:bg-primary/80 text-primary-foreground rounded transition-colors"
              >
                {isConnected ? 'Disconnect' : 'Reconnect'}
              </button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Symbol: {symbol} | Updates: {connectionStats?.reconnections || 0}
            </div>
            
            {currentPrice > 0 && (
              <div className="text-xs">
                Current Price: <span className="text-orderbook-bid font-mono">${currentPrice.toFixed(2)}</span>
              </div>
            )}
            
            {filteredData && (
              <div className="text-xs text-muted-foreground">
                Filtered: {filteredData.bids.length} bids, {filteredData.asks.length} asks
              </div>
            )}
            
            {/* Quick Export Button */}
            {filteredData && (
              <button
                onClick={() => {
                  const exportService = OrderbookExportService.getInstance();
                  const snapshot = exportService.createSnapshot(filteredData, symbol, pressureZoneAnalysis || undefined);
                  exportService.exportAsJSON(snapshot);
                }}
                className="w-full px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                title="Quick export current snapshot as JSON"
              >
                📥 Quick Export JSON
              </button>
            )}
          </div>
        </div>
      )}

      {/* Responsive Control Panel Toggle */}
      <div className={`absolute z-10 flex gap-2 ${
        isMounted && deviceInfo.type === 'mobile' 
          ? 'bottom-4 left-4 right-4 justify-center flex-wrap' 
          : 'top-4 right-16'
      }`}>
        {(!isMounted || !uiLayout.compactMode) && (
          <button
            onClick={() => setShowPressureStats(!showPressureStats)}
            className="bg-card hover:bg-accent text-foreground px-3 py-2 rounded-lg text-sm transition-colors border border-border"
          >
            {showPressureStats ? 'Hide Zones' : 'Pressure Zones'}
          </button>
        )}
        <button
          onClick={() => setShowRotationControls(!showRotationControls)}
          className="bg-card hover:bg-accent text-foreground px-3 py-2 rounded-lg text-sm transition-colors border border-border"
        >
          🔄 {isMounted && deviceInfo.type === 'mobile' ? '' : 'Rotation'}
        </button>
        {(!isMounted || !uiLayout.compactMode) && (
          <button
            onClick={() => setShowExportPanel(!showExportPanel)}
            className="bg-card hover:bg-accent text-foreground px-3 py-2 rounded-lg text-sm transition-colors border border-border"
          >
            📥 {isMounted && deviceInfo.type === 'mobile' ? '' : 'Export'}
          </button>
        )}
        <button
          onClick={() => setShowControlPanel(!showControlPanel)}
          className="bg-card hover:bg-accent text-foreground px-3 py-2 rounded-lg text-sm transition-colors border border-border"
        >
          {showControlPanel ? 'Hide Controls' : 'Controls'}
        </button>
        {isMounted && deviceInfo.type === 'mobile' && supportsFullscreen() && (
          <button
            onClick={toggleFullscreen}
            className="bg-card hover:bg-accent text-foreground px-3 py-2 rounded-lg text-sm transition-colors border border-border"
          >
            {isFullscreen ? '🔳' : '⛶'}
          </button>
        )}
      </div>

      {/* Responsive Interactive Control Panel */}
      {showControlPanel && (
        <div className={`absolute z-10 max-h-96 overflow-y-auto ${
          isMounted && deviceInfo.type === 'mobile' 
            ? 'top-24 left-4 right-4' 
            : 'top-20 right-4 w-80'
        }`}>
          <InteractiveControlPanel
            settings={filterSettings}
            onSettingsChange={setFilterSettings}
            availableVenues={['Binance', 'Coinbase', 'Kraken', 'Bitfinex']}
            currentPrice={currentPrice}
          />
        </div>
      )}

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
        <div className="absolute top-48 left-4 z-10 w-80">
          <ExportControlPanel
            data={filteredData}
            pressureZoneAnalysis={pressureZoneAnalysis}
            symbol={symbol}
            className="max-h-96 overflow-y-auto"
          />
        </div>
      )}

      {/* Rotation Control Panel */}
      {showRotationControls && (
        <div className="absolute bottom-4 left-4 z-10 w-80">
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

      {/* Filter Statistics */}
      {showFilterStats && filteredData && (
        <div className="absolute bottom-4 left-4 z-10 w-64">
          <FilterStatistics 
            originalData={data}
            filteredData={filteredData}
            settings={filterSettings}
          />
        </div>
      )}

      {/* Responsive 3D Scene */}
      {isStarted && data && (
        <Canvas 
          className="w-full h-full"
          camera={{
            position: [
              responsiveSettings.cameraDistance, 
              responsiveSettings.cameraDistance, 
              responsiveSettings.cameraDistance
            ]
          }}
          gl={{
            antialias: responsiveSettings.enableAntialiasing,
            powerPreference: deviceInfo.isLowEnd ? 'low-power' : 'high-performance',
            alpha: false,
            stencil: false
          }}
          dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, deviceInfo.type === 'mobile' ? 2 : 3) : 1}
        >
          <PerspectiveCamera makeDefault position={[15, 15, 15]} />
          <OrbitControls 
            enablePan={!isTouchDevice}
            enableZoom={true}
            enableRotate={true}
            dampingFactor={deviceInfo.type === 'mobile' ? 0.1 : 0.05}
            screenSpacePanning={false}
            minDistance={2}
            maxDistance={100}
            maxPolarAngle={Math.PI}
            rotateSpeed={deviceInfo.type === 'mobile' ? 1.5 : 1.0}
            zoomSpeed={deviceInfo.type === 'mobile' ? 1.2 : 1.0}
            enableDamping={true}
          />
          
          <ambientLight intensity={responsiveSettings.enableShadows ? 0.4 : 0.6} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={responsiveSettings.enableShadows ? 0.8 : 0.6}
            castShadow={responsiveSettings.enableShadows}
          />
          <pointLight position={[-10, -10, -5]} intensity={0.3} />
          
          <Environment preset="warehouse" />
          
          <SmoothTransitionOrderbook 
            data={filteredData || data}
            autoRotate={filterSettings.autoRotate}
            timeDepth={isMounted && deviceInfo.isLowEnd ? 5 : 10}
            showDepthSurface={filterSettings.showDepthSurface}
            showPressureZones={filterSettings.showPressureZones && (!isMounted || !uiLayout.compactMode)}
            showHeatmap={filterSettings.showHeatmap && (!isMounted || !uiLayout.compactMode)}
            showAxisLabels={filterSettings.showAxisLabels}
            rotationSpeed={rotationSpeed}
            rotationAxis={rotationAxis}
            cameraReset={cameraReset}
          />
          
          {/* Enhanced 3D Pressure Zones */}
          {filterSettings.showPressureZones && pressureZoneAnalysis && (
            <Enhanced3DPressureZones 
              analysis={pressureZoneAnalysis}
              currentPrice={currentPrice}
            />
          )}
          
          {/* Enhanced Pressure Heatmap moved outside Canvas - it's a UI component */}
        </Canvas>
      )}

      {/* Enhanced Pressure Heatmap - UI Component (outside Canvas) */}
      {isStarted && filterSettings.showHeatmap && pressureZoneAnalysis && (filteredData || data) && (
        <div className="absolute top-20 right-4 z-20 w-96 max-h-80">
          <EnhancedPressureHeatmap 
            analysis={pressureZoneAnalysis}
            orderbookData={filteredData || data!}
            currentPrice={currentPrice}
            width={350}
            height={250}
          />
        </div>
      )}

      {/* Welcome Screen */}
      {!isStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="bg-card p-8 rounded-lg shadow-xl max-w-md w-full mx-4 border border-border">
            <h2 className="text-3xl font-bold mb-6 text-orderbook-bid text-center">Real-Time 3D Orderbook</h2>
            
            <div className="space-y-4 mb-6">
              <p className="text-muted-foreground text-center">
                Experience cryptocurrency order books like never before with immersive 3D visualization
              </p>
              
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-semibold mb-2 text-foreground">Features:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Real-time WebSocket data from Binance</li>
                  <li>• Interactive 3D depth visualization</li>
                  <li>• Advanced filtering and search</li>
                  <li>• Pressure zone analysis</li>
                  <li>• Smooth animations and transitions</li>
                  <li>• Dark/Light theme support</li>
                </ul>
              </div>
              
              <label className="flex items-center justify-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={tryRealTime}
                  onChange={(e) => setTryRealTime(e.target.checked)}
                  className="rounded"
                />
                <span>Try real-time connection first (falls back to demo if failed)</span>
              </label>
            </div>
            
            <button
              onClick={handleGetStarted}
              disabled={connectionState === 'connecting'}
              className="w-full bg-gradient-to-r from-orderbook-bid to-primary hover:from-green-500 hover:to-blue-500 hover:shadow-xl hover:scale-105 disabled:from-muted disabled:to-muted disabled:hover:scale-100 disabled:hover:shadow-lg text-primary-foreground px-8 py-3 rounded-lg text-lg font-semibold transition-all duration-300 shadow-lg transform"
            >
              {connectionState === 'connecting' ? 'Connecting...' : 'Launch 3D Visualizer'}
            </button>
            
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Use mouse to rotate, zoom, and explore the 3D orderbook with advanced filtering
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
