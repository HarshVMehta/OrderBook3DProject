'use client';

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { SmoothTransitionOrderbook } from '@/components/3d/SmoothTransitionOrderbook';
import { Enhanced3DPressureZones } from '@/components/3d/Enhanced3DPressureZones';
import { TouchControls, useTouchCameraControls } from '@/components/ui/TouchControls';
import { useResponsiveDesign } from '@/hooks/useResponsiveDesign';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { useTheme3D } from '@/hooks/useTheme3D';
import * as THREE from 'three';

interface OptimizedOrderbookSceneProps {
  orderbookData?: any;
  className?: string;
}

// Loading component for 3D scene
const SceneLoader: React.FC = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <div className="text-gray-400">Loading 3D Orderbook...</div>
      </div>
    </div>
  );
};

// Camera controller component that responds to touch and performance settings
const CameraController: React.FC = () => {
  const { deviceInfo, getCurrentSettings } = useResponsiveDesign();
  const { enabled, handleRotate, handleZoom, handlePan } = useTouchCameraControls();
  const settings = getCurrentSettings();

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[settings.cameraDistance, settings.cameraDistance, settings.cameraDistance]}
        fov={deviceInfo.type === 'mobile' ? 60 : 50}
      />
      
      {/* Orbit controls for desktop/tablet, disabled for mobile with touch controls */}
      <OrbitControls
        enabled={!enabled}
        enablePan={deviceInfo.type !== 'mobile'}
        enableZoom={true}
        enableRotate={true}
        maxDistance={50}
        minDistance={5}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={0}
      />
      
      {/* Touch controls overlay for mobile */}
      {enabled && (
        <TouchControls
          onRotate={handleRotate}
          onZoom={handleZoom}
          onPan={handlePan}
        />
      )}
    </>
  );
};

// Performance monitoring overlay
const PerformanceOverlay: React.FC = () => {
  const { metrics, settings } = usePerformanceOptimization();
  const { deviceInfo } = useResponsiveDesign();

  // Only show on desktop or when debugging
  if (deviceInfo.type === 'mobile') {
    return null;
  }

  return (
    <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white text-xs p-2 rounded backdrop-blur-sm z-10">
      <div>FPS: {Math.round(metrics.fps)}</div>
      <div>Memory: {metrics.memoryUsage.toFixed(1)}MB</div>
      <div>Calls: {metrics.renderCalls}</div>
      {settings.adaptiveQuality && <div className="text-yellow-400">Adaptive</div>}
    </div>
  );
};

// Main 3D scene component
const OptimizedScene: React.FC<{ orderbookData?: any }> = ({ orderbookData }) => {
  const themeColors = useTheme3D();
  const { getCurrentSettings } = useResponsiveDesign();
  const { 
    metrics, 
    settings: performanceSettings,
    getLODLevel
  } = usePerformanceOptimization();

  const settings = getCurrentSettings();
  const lodLevel = getLODLevel(15); // Default camera distance for LOD calculation

  // Filter orderbook data based on performance requirements
  const optimizedOrderbookData = useMemo(() => {
    if (!orderbookData) return null;

    const maxOrders = Math.min(
      settings.maxOrdersToRender,
      performanceSettings.maxOrdersToRender,
      lodLevel === 'high' ? 1000 : 
      lodLevel === 'medium' ? 500 : 200
    );

    return {
      ...orderbookData,
      bids: orderbookData.bids?.slice(0, Math.floor(maxOrders / 2)) || [],
      asks: orderbookData.asks?.slice(0, Math.floor(maxOrders / 2)) || []
    };
  }, [orderbookData, settings.maxOrdersToRender, performanceSettings.maxOrdersToRender, lodLevel]);

  // Scene quality settings based on performance
  const sceneQuality = useMemo(() => ({
    shadows: settings.enableShadows && performanceSettings.shadowsEnabled && lodLevel !== 'low',
    antialias: settings.enableAntialiasing && performanceSettings.antialiasing,
    pixelRatio: Math.min(window.devicePixelRatio, lodLevel === 'high' ? 2 : 1)
  }), [settings, performanceSettings, lodLevel]);

  const shouldRenderPressureZones = metrics.fps > 30 && lodLevel !== 'low';

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        castShadow={sceneQuality.shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-10, -10, -5]} intensity={0.3} />

      {/* 3D Grid */}
      <gridHelper
        args={[50, 50]}
        position={[0, -5, 0]}
        material={new THREE.LineBasicMaterial({ 
          color: themeColors.background || '#333333',
          opacity: 0.3,
          transparent: true 
        })}
      />

      {/* Main Orderbook Visualization */}
      {optimizedOrderbookData && (
        <SmoothTransitionOrderbook
          data={optimizedOrderbookData}
          autoRotate={false}
          timeDepth={10}
          showPressureZones={shouldRenderPressureZones}
        />
      )}

      {/* Pressure Zones (only render if performance allows) */}
      {shouldRenderPressureZones && optimizedOrderbookData && (
        <Enhanced3DPressureZones
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
          currentPrice={optimizedOrderbookData.currentPrice}
          showLabels={lodLevel === 'high'}
          showIntensityWaves={lodLevel !== 'culled'}
        />
      )}

      {/* Camera Controls */}
      <CameraController />
    </>
  );
};

export const OptimizedOrderbookScene: React.FC<OptimizedOrderbookSceneProps> = ({
  orderbookData,
  className = ''
}) => {
  const { deviceInfo } = useResponsiveDesign();

  const canvasProps = useMemo(() => ({
    style: { 
      width: '100%', 
      height: '100%',
      background: 'transparent'
    },
    dpr: Math.min(window.devicePixelRatio, deviceInfo.type === 'mobile' ? 1.5 : 2),
    camera: { fov: 50 },
    shadows: deviceInfo.type !== 'mobile',
    antialias: deviceInfo.type === 'desktop',
    performance: {
      min: 0.5,
      max: 1,
      debounce: 200
    }
  }), [deviceInfo]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas {...canvasProps}>
        <Suspense fallback={null}>
          <OptimizedScene orderbookData={orderbookData} />
        </Suspense>
      </Canvas>
      
      {/* Performance monitoring overlay */}
      <PerformanceOverlay />
      
      {/* Loading fallback */}
      <Suspense fallback={<SceneLoader />}>
        <div />
      </Suspense>
    </div>
  );
};
