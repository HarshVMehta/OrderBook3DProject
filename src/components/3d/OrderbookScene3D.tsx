'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import Enhanced3DOrderbook from './Enhanced3DOrderbook';
import { ProcessedOrderbookData, PressureZone, CameraSettings } from '@/types/orderbook';

interface OrderbookScene3DProps {
  data: ProcessedOrderbookData | null;
  pressureZones: PressureZone[];
  showPressureZones: boolean;
  autoRotate: boolean;
  cameraSettings: CameraSettings;
  theme: 'dark' | 'light';
}

export const OrderbookScene3D: React.FC<OrderbookScene3DProps> = ({
  data,
  pressureZones,
  showPressureZones,
  autoRotate,
  cameraSettings,
  theme
}) => {
  const backgroundColor = theme === 'dark' ? '#0f0f23' : '#ffffff';
  const ambientLightIntensity = theme === 'dark' ? 0.4 : 0.8;

  return (
    <div className="w-full h-full bg-gray-900 relative">
      <Canvas
        style={{ background: backgroundColor }}
        camera={{
          position: cameraSettings.position,
          fov: cameraSettings.fov,
          near: cameraSettings.near,
          far: cameraSettings.far
        }}
      >
        <Suspense fallback={null}>
          {/* Enhanced Lighting for 3D Orderbook */}
          <ambientLight intensity={ambientLightIntensity} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={0.8}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />
          <pointLight position={[10, -10, 10]} intensity={0.2} color="#4ade80" />
          <pointLight position={[-10, 10, -10]} intensity={0.2} color="#ef4444" />

          {/* Environment */}
          <Environment preset={theme === 'dark' ? 'night' : 'dawn'} />

          {/* Enhanced 3D Orderbook Visualization with Price-Quantity-Time axes */}
          {data && data.bids.length > 0 && data.asks.length > 0 && (
            <Enhanced3DOrderbook 
              data={data}
              pressureZones={pressureZones}
              showPressureZones={showPressureZones}
              showHeatmap={showPressureZones}
              showAxisLabels={true}
              autoRotate={autoRotate}
              timeDepth={20}
              interactionEnabled={true}
              volumeScale={1.0}
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

          {/* Interactive Camera Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={autoRotate}
            autoRotateSpeed={0.5}
            maxDistance={50}
            minDistance={5}
            maxPolarAngle={Math.PI * 0.8}
            minPolarAngle={Math.PI * 0.1}
            target={cameraSettings.target}
            enableDamping={true}
            dampingFactor={0.05}
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
        
        {/* Axis Legend */}
        <div className="absolute top-16 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg backdrop-blur-sm">
          <h3 className="text-sm font-semibold mb-2">3D Coordinate System</h3>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-1 bg-red-500"></div>
              <span>X-axis: Price (Low ← → High)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1 h-3 bg-green-500"></div>
              <span>Y-axis: Volume (Height)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-1 bg-blue-500 transform rotate-45"></div>
              <span>Z-axis: Time (Recent ↗ Older)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Axis Information Overlay */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg backdrop-blur-sm">
        <h3 className="text-sm font-semibold mb-2">3D Orderbook Axes</h3>
        <div className="space-y-1 text-xs">
          <div><span className="text-blue-400">X-axis:</span> Price (Bid ← → Ask)</div>
          <div><span className="text-green-400">Y-axis:</span> Volume/Quantity ↑</div>
          <div><span className="text-purple-400">Z-axis:</span> Time (Past ← → Present)</div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-300">
            <div>🟢 Green bars = Bid orders</div>
            <div>🔴 Red bars = Ask orders</div>
            {showPressureZones && <div>🔵 Cylinders = Pressure zones</div>}
          </div>
        </div>
      </div>

      {/* Controls Information */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg backdrop-blur-sm">
        <h3 className="text-sm font-semibold mb-2">3D Controls</h3>
        <div className="space-y-1 text-xs">
          <div>🖱️ <span className="text-blue-400">Left click + drag:</span> Rotate view</div>
          <div>🔄 <span className="text-green-400">Scroll wheel:</span> Zoom in/out</div>
          <div>🖱️ <span className="text-purple-400">Right click + drag:</span> Pan view</div>
          <div>👆 <span className="text-yellow-400">Click bars:</span> View order details</div>
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
