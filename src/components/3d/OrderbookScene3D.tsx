'use client';

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import Enhanced3DOrderbook from './Enhanced3DOrderbook';
import { PerformanceMonitor } from './PerformanceMonitor';
import { ProcessedOrderbookData, PressureZone, CameraSettings } from '@/types/orderbook';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { useResponsiveDesign } from '@/hooks/useResponsiveDesign';
import { useTouch3DControls } from '@/hooks/useTouchControls';
import { MobileTouchControls, MobilePerformanceIndicator } from '@/components/ui/MobileTouchControls';

interface OrderbookScene3DProps {
  data: ProcessedOrderbookData | null;
  pressureZones: PressureZone[];
  showPressureZones: boolean;
  autoRotate: boolean;
  rotationSpeed?: number;
  rotationAxis?: 'x' | 'y' | 'z';
  cameraReset?: number;
  cameraSettings: CameraSettings;
  theme: 'dark' | 'light';
}

export const OrderbookScene3D: React.FC<OrderbookScene3DProps> = ({
  data,
  pressureZones,
  showPressureZones,
  autoRotate,
  rotationSpeed = 0.5,
  rotationAxis = 'z',
  cameraReset = 0,
  cameraSettings,
  theme
}) => {
  // Performance and responsive design hooks
  const { 
    settings: performanceSettings, 
    metrics,
    updateMetrics,
    optimizeOrderData,
    getLODLevel,
    shouldRenderObject 
  } = usePerformanceOptimization();
  
  const { 
    deviceInfo, 
    getCurrentSettings,
    getCanvasSize,
    getTouchControlsConfig,
    getUILayout 
  } = useResponsiveDesign();
  
  const { 
    touchHandlers, 
    isTouchDevice,
    resetCamera 
  } = useTouch3DControls();

  // Get responsive settings
  const responsiveSettings = getCurrentSettings();
  const canvasSize = getCanvasSize();
  const uiLayout = getUILayout();
  
  // Optimize data based on device capabilities and performance
  const optimizedData = useMemo(() => {
    if (!data) return null;
    
    const maxOrders = Math.min(
      responsiveSettings.maxOrdersToRender,
      performanceSettings.maxOrdersToRender
    );
    
    return {
      ...data,
      bids: optimizeOrderData(data.bids, Math.floor(maxOrders / 2)),
      asks: optimizeOrderData(data.asks, Math.floor(maxOrders / 2))
    };
  }, [data, responsiveSettings, performanceSettings, optimizeOrderData]);

  const backgroundColor = theme === 'dark' ? '#0f0f23' : '#ffffff';
  const ambientLightIntensity = theme === 'dark' ? 0.4 : 0.8;

  // Adjust lighting based on device performance
  const lightingConfig = useMemo(() => ({
    ambientIntensity: responsiveSettings.enableShadows ? ambientLightIntensity : ambientLightIntensity * 1.5,
    directionalIntensity: responsiveSettings.enableShadows ? 1 : 0.7,
    enableShadows: responsiveSettings.enableShadows
  }), [responsiveSettings, ambientLightIntensity]);

  return (
    <div 
      className="w-full h-full bg-gray-900 relative"
      onTouchStart={isTouchDevice ? (e) => touchHandlers.onTouchStart(e.nativeEvent) : undefined}
      onTouchMove={isTouchDevice ? (e) => touchHandlers.onTouchMove(e.nativeEvent) : undefined}
      onTouchEnd={isTouchDevice ? (e) => touchHandlers.onTouchEnd(e.nativeEvent) : undefined}
      onTouchCancel={isTouchDevice ? (e) => touchHandlers.onTouchCancel(e.nativeEvent) : undefined}
    >
      {/* Mobile Performance Indicator */}
      <MobilePerformanceIndicator 
        fps={metrics.fps}
        quality={responsiveSettings.animationQuality}
      />
      
      {/* Mobile Touch Controls */}
      <MobileTouchControls onCameraReset={resetCamera} />
      
      <Canvas
        style={{ background: backgroundColor }}
        camera={{
          position: cameraSettings.position,
          fov: cameraSettings.fov,
          near: cameraSettings.near,
          far: cameraSettings.far
        }}
        gl={{
          antialias: responsiveSettings.enableAntialiasing,
          powerPreference: deviceInfo.isLowEnd ? 'low-power' : 'high-performance',
          alpha: false, // Better performance
          stencil: false, // Better performance
          depth: true
        }}
        dpr={Math.min(window.devicePixelRatio, deviceInfo.type === 'mobile' ? 2 : 3)}
        resize={{ offsetSize: true }}
      >
        <Suspense fallback={null}>
          {/* Performance monitoring inside Canvas */}
          <PerformanceMonitor onMetricsUpdate={updateMetrics} />
          
          {/* Adaptive Lighting for Performance */}
          <ambientLight intensity={lightingConfig.ambientIntensity} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={lightingConfig.directionalIntensity}
            castShadow={lightingConfig.enableShadows}
            shadow-mapSize-width={lightingConfig.enableShadows ? 2048 : 1024}
            shadow-mapSize-height={lightingConfig.enableShadows ? 2048 : 1024}
          />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />
          <pointLight position={[10, -10, 10]} intensity={0.2} color="#4ade80" />
          <pointLight position={[-10, 10, -10]} intensity={0.2} color="#ef4444" />

          {/* Environment */}
          <Environment preset={theme === 'dark' ? 'night' : 'dawn'} />

          {/* Enhanced 3D Orderbook Visualization with Performance Optimization */}
          {optimizedData && optimizedData.bids.length > 0 && optimizedData.asks.length > 0 && (
            <Enhanced3DOrderbook 
              data={optimizedData}
              pressureZones={pressureZones}
              showPressureZones={showPressureZones}
              showHeatmap={showPressureZones}
              showAxisLabels={false}
              autoRotate={autoRotate}
              timeDepth={deviceInfo.isLowEnd ? 10 : 20}
              interactionEnabled={true}
              volumeScale={responsiveSettings.animationQuality === 'high' ? 1.0 : 0.8}
              timeWindowMs={60000} // 1 minute time window
            />
          )}

          {/* Axis Labels as HTML overlays for better readability */}
          <group>
            {/* Simple colored lines to indicate axes */}
            {/* X-axis (Price) - Red line */}
            <mesh position={[0, -1, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.05, 0.05, 20, 8]} />
              <meshStandardMaterial color="#ff6b6b" />
            </mesh>
            
            {/* Y-axis (Volume) - Green line */}
            <mesh position={[-1, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 20, 8]} />
              <meshStandardMaterial color="#51cf66" />
            </mesh>
            
            {/* Z-axis (Time) - Blue line */}
            <mesh position={[0, -1, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 20, 8]} />
              <meshStandardMaterial color="#339af0" />
            </mesh>
          </group>

          {/* Responsive Interactive Camera Controls */}
          <OrbitControls
            enablePan={!isTouchDevice} // Disable pan on touch devices to avoid conflicts
            enableZoom={true}
            enableRotate={true}
            autoRotate={autoRotate && rotationSpeed > 0}
            autoRotateSpeed={rotationSpeed}
            maxDistance={responsiveSettings.cameraDistance * 2}
            minDistance={responsiveSettings.cameraDistance * 0.3}
            maxPolarAngle={Math.PI * 0.8}
            minPolarAngle={Math.PI * 0.1}
            target={cameraSettings.target}
            enableDamping={true}
            dampingFactor={deviceInfo.type === 'mobile' ? 0.1 : 0.05}
            rotateSpeed={deviceInfo.type === 'mobile' ? 1.5 : 1.0}
            zoomSpeed={deviceInfo.type === 'mobile' ? 1.2 : 1.0}
            panSpeed={deviceInfo.type === 'mobile' ? 1.5 : 1.0}
            key={cameraReset} // Force reset when cameraReset changes
          />

          {/* Custom Camera */}
          <PerspectiveCamera
            makeDefault
            position={cameraSettings.position}
            fov={cameraSettings.fov}
            near={cameraSettings.near}
            far={cameraSettings.far}
          />
        </Suspense>
      </Canvas>
      
      {/* Axis Labels as HTML overlays for better visibility */}
      <div className="absolute inset-0 pointer-events-none">
        {/* X-axis label (Price) */}
        <div className="absolute bottom-16 right-8 bg-red-500 bg-opacity-80 text-white px-2 py-1 rounded text-sm font-semibold">
          ← Price (X-axis) →
        </div>
        
        {/* Y-axis label (Volume) */}
        <div className="absolute top-1/2 left-4 transform -translate-y-1/2 -rotate-90 bg-green-500 bg-opacity-80 text-white px-2 py-1 rounded text-sm font-semibold">
          ↑ Volume (Y-axis) ↑
        </div>
        
        {/* Z-axis label (Time) */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-blue-500 bg-opacity-80 text-white px-2 py-1 rounded text-sm font-semibold">
          ↗ Time (Z-axis) ↖
        </div>
      </div>

      {/* 3D Controls Information */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg backdrop-blur-sm">
        <div className="text-sm font-semibold mb-2">3D Controls</div>
        <div className="space-y-1 text-xs">
          <div>🖱️ <span className="text-blue-400">Left click + drag:</span> Rotate view</div>
          <div>🔄 <span className="text-green-400">Scroll wheel:</span> Zoom in/out</div>
          <div>🖱️ <span className="text-purple-400">Right click + drag:</span> Pan view</div>
          <div>👆 <span className="text-yellow-400">Click bars:</span> View order details</div>
          {showPressureZones && <div>🔵 <span className="text-cyan-400">Blue cylinders:</span> Pressure zones</div>}
        </div>
      </div>

      {/* Performance Stats */}
      <PerformanceStats />

      {/* Loading Overlay */}
      {!data && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80">
          <div className="text-white text-xl">Loading 3D Orderbook Visualization...</div>
        </div>
      )}
    </div>
  );
};

// Performance monitoring component
export const PerformanceStats: React.FC = () => {
  const [fps, setFps] = React.useState(0);
  const frameCountRef = React.useRef(0);
  const lastTimeRef = React.useRef(Date.now());

  React.useEffect(() => {
    const updateFPS = () => {
      frameCountRef.current++;
      const now = Date.now();
      const delta = now - lastTimeRef.current;
      
      if (delta >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / delta));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      requestAnimationFrame(updateFPS);
    };
    
    updateFPS();
  }, []);

  return (
    <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded">
      FPS: {fps}
    </div>
  );
};
