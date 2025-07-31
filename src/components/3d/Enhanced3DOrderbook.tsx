'use client';

import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Vector3, BufferGeometry, Float32BufferAttribute, Mesh, MeshLambertMaterial, Color, Box3 } from 'three';
import { Text, Line, Html } from '@react-three/drei';
import { ProcessedOrderbookData, PressureZone, OrderbookEntry } from '@/types/orderbook';
import { useTheme3D } from '@/hooks/useTheme3D';

interface Enhanced3DOrderbookProps {
  data: ProcessedOrderbookData;
  pressureZones?: PressureZone[];
  showPressureZones?: boolean;
  showHeatmap?: boolean;
  showAxisLabels?: boolean;
  autoRotate?: boolean;
  timeDepth?: number;
  interactionEnabled?: boolean;
  volumeScale?: number;
  priceRange?: { min: number; max: number };
  timeWindowMs?: number;
}

interface TimeSliceData {
  timestamp: number;
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  index: number;
}

interface BarData {
  position: Vector3;
  scale: Vector3;
  color: Color;
  price: number;
  quantity: number;
  timestamp: number;
  type: 'bid' | 'ask';
  opacity: number;
}

export const Enhanced3DOrderbook: React.FC<Enhanced3DOrderbookProps> = ({
  data,
  pressureZones = [],
  showPressureZones = true,
  showHeatmap = false,
  showAxisLabels = true,
  autoRotate = false,
  timeDepth = 20,
  interactionEnabled = true,
  volumeScale = 1.0,
  priceRange,
  timeWindowMs = 60000 // 1 minute time window
}) => {
  const groupRef = useRef<Group>(null);
  const barsRef = useRef<Mesh[]>([]);
  const [hoveredBar, setHoveredBar] = useState<BarData | null>(null);
  const [timeSlices, setTimeSlices] = useState<TimeSliceData[]>([]);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const lastUpdateTime = useRef(Date.now());
  
  const { camera, gl } = useThree();
  const themeColors = useTheme3D();

  // Calculate axis bounds and scaling
  const axisBounds = useMemo(() => {
    if (!data || data.bids.length === 0 || data.asks.length === 0) {
      return { x: [-10, 10], y: [0, 10], z: [-10, 10] };
    }

    const effectivePriceRange = priceRange || data.priceRange;
    const priceSpread = effectivePriceRange.max - effectivePriceRange.min;
    const maxVolume = Math.max(data.maxQuantity, 1);

    return {
      x: [-priceSpread / 2, priceSpread / 2], // Price axis (normalized)
      y: [0, maxVolume * volumeScale], // Quantity axis
      z: [-timeDepth / 2, timeDepth / 2] // Time axis
    };
  }, [data, priceRange, timeDepth, volumeScale]);

  // Generate time slices for historical visualization
  useEffect(() => {
    if (!data) return;

    const now = Date.now();
    const sliceInterval = timeWindowMs / timeDepth;
    const newTimeSlices: TimeSliceData[] = [];

    for (let i = 0; i < timeDepth; i++) {
      const timestamp = now - (timeDepth - i - 1) * sliceInterval;
      
      // For now, we'll simulate historical data by slightly modifying current data
      // In a real implementation, you'd use actual historical orderbook data
      const timeDecay = (timeDepth - i) / timeDepth;
      const modifiedBids = data.bids.map(bid => ({
        ...bid,
        quantity: bid.quantity * (0.7 + timeDecay * 0.3),
        timestamp
      }));
      
      const modifiedAsks = data.asks.map(ask => ({
        ...ask,
        quantity: ask.quantity * (0.7 + timeDecay * 0.3),
        timestamp
      }));

      newTimeSlices.push({
        timestamp,
        bids: modifiedBids,
        asks: modifiedAsks,
        index: i
      });
    }

    setTimeSlices(newTimeSlices);
    lastUpdateTime.current = now;
  }, [data, timeDepth, timeWindowMs]);

  // Generate 3D bar data from time slices
  const barData = useMemo<BarData[]>(() => {
    if (!data || timeSlices.length === 0) return [];

    const bars: BarData[] = [];
    const effectivePriceRange = priceRange || data.priceRange;
    const priceSpread = effectivePriceRange.max - effectivePriceRange.min;
    const centerPrice = (effectivePriceRange.max + effectivePriceRange.min) / 2;

    timeSlices.forEach((slice, timeIndex) => {
      const zPosition = (timeIndex / (timeDepth - 1)) * (axisBounds.z[1] - axisBounds.z[0]) + axisBounds.z[0];
      const timeAlpha = Math.max(0.3, (timeIndex + 1) / timeDepth); // Newer data is more opaque

      // Process bids
      slice.bids.forEach((bid, bidIndex) => {
        const xPosition = ((bid.price - centerPrice) / priceSpread) * (axisBounds.x[1] - axisBounds.x[0]);
        const yPosition = (bid.quantity / data.maxQuantity) * axisBounds.y[1] * volumeScale;

        bars.push({
          position: new Vector3(xPosition, yPosition / 2, zPosition),
          scale: new Vector3(0.5, yPosition, 0.3),
          color: new Color(themeColors.bidColor).multiplyScalar(0.8 + timeAlpha * 0.2),
          price: bid.price,
          quantity: bid.quantity,
          timestamp: slice.timestamp,
          type: 'bid',
          opacity: timeAlpha
        });
      });

      // Process asks
      slice.asks.forEach((ask, askIndex) => {
        const xPosition = ((ask.price - centerPrice) / priceSpread) * (axisBounds.x[1] - axisBounds.x[0]);
        const yPosition = (ask.quantity / data.maxQuantity) * axisBounds.y[1] * volumeScale;

        bars.push({
          position: new Vector3(xPosition, yPosition / 2, zPosition),
          scale: new Vector3(0.5, yPosition, 0.3),
          color: new Color(themeColors.askColor).multiplyScalar(0.8 + timeAlpha * 0.2),
          price: ask.price,
          quantity: ask.quantity,
          timestamp: slice.timestamp,
          type: 'ask',
          opacity: timeAlpha
        });
      });
    });

    return bars;
  }, [data, timeSlices, axisBounds, themeColors, priceRange, volumeScale, timeDepth]);

  // Auto-rotation and time animation
  useFrame((state) => {
    if (groupRef.current) {
      if (autoRotate) {
        groupRef.current.rotation.y += 0.005; // Rotate around Y axis for better viewing
      }

      // Animate through time if desired
      const timeProgress = (Math.sin(state.clock.elapsedTime * 0.5) + 1) / 2;
      setCurrentTimeIndex(Math.floor(timeProgress * Math.max(1, timeDepth - 1)));
    }
  });

  // Handle mouse interactions
  const handleBarClick = useCallback((bar: BarData) => {
    console.log('Bar clicked:', {
      price: bar.price,
      quantity: bar.quantity,
      type: bar.type,
      timestamp: new Date(bar.timestamp).toLocaleTimeString()
    });
  }, []);

  const handleBarHover = useCallback((bar: BarData | null) => {
    setHoveredBar(bar);
  }, []);

  // Render 3D axes with labels
  const renderAxes = () => {
    if (!showAxisLabels) return null;

    const axisColor = themeColors.text;
    const labelOffset = 1.5;

    return (
      <group>
        {/* X-axis (Price) */}
        <Line
          points={[[axisBounds.x[0], 0, 0], [axisBounds.x[1], 0, 0]]}
          color={axisColor}
          lineWidth={2}
        />
        <Text
          position={[0, -labelOffset, axisBounds.z[0] - 2]}
          fontSize={0.8}
          color={axisColor}
          anchorX="center"
          anchorY="middle"
        >
          Price →
        </Text>

        {/* Y-axis (Quantity) */}
        <Line
          points={[[0, 0, 0], [0, axisBounds.y[1], 0]]}
          color={axisColor}
          lineWidth={2}
        />
        <Text
          position={[-labelOffset * 2, axisBounds.y[1] / 2, axisBounds.z[0] - 2]}
          fontSize={0.8}
          color={axisColor}
          anchorX="center"
          anchorY="middle"
          rotation={[0, 0, Math.PI / 2]}
        >
          ↑ Volume
        </Text>

        {/* Z-axis (Time) */}
        <Line
          points={[[0, 0, axisBounds.z[0]], [0, 0, axisBounds.z[1]]]}
          color={axisColor}
          lineWidth={2}
        />
        <Text
          position={[axisBounds.x[0] - 2, 0, 0]}
          fontSize={0.8}
          color={axisColor}
          anchorX="center"
          anchorY="middle"
          rotation={[0, Math.PI / 2, 0]}
        >
          ← Time
        </Text>

        {/* Price range labels */}
        {data && (
          <>
            <Text
              position={[axisBounds.x[0], -0.5, 0]}
              fontSize={0.5}
              color={axisColor}
              anchorX="center"
            >
              ${(priceRange?.min || data.priceRange.min).toFixed(2)}
            </Text>
            <Text
              position={[axisBounds.x[1], -0.5, 0]}
              fontSize={0.5}
              color={axisColor}
              anchorX="center"
            >
              ${(priceRange?.max || data.priceRange.max).toFixed(2)}
            </Text>
          </>
        )}

        {/* Volume scale labels */}
        <Text
          position={[-1, axisBounds.y[1], 0]}
          fontSize={0.5}
          color={axisColor}
          anchorX="center"
        >
          {(data?.maxQuantity || 0).toFixed(0)}
        </Text>

        {/* Time labels */}
        <Text
          position={[0, 0, axisBounds.z[0]]}
          fontSize={0.5}
          color={axisColor}
          anchorX="center"
        >
          -{timeWindowMs / 1000}s
        </Text>
        <Text
          position={[0, 0, axisBounds.z[1]]}
          fontSize={0.5}
          color={axisColor}
          anchorX="center"
        >
          Now
        </Text>
      </group>
    );
  };

  // Render pressure zones as 3D objects
  const renderPressureZones = () => {
    if (!showPressureZones || pressureZones.length === 0) return null;

    return (
      <group>
        {pressureZones.map((zone, index) => {
          const centerPrice = (priceRange?.min || data?.priceRange.min || 0);
          const priceSpread = (priceRange?.max || data?.priceRange.max || 1) - centerPrice;
          
          const xPosition = ((zone.centerPrice - centerPrice) / priceSpread) * (axisBounds.x[1] - axisBounds.x[0]);
          const zoneColor = zone.type === 'support' ? themeColors.pressureColors.low : themeColors.pressureColors.high;
          
          return (
            <mesh
              key={zone.id}
              position={[xPosition, zone.intensity * axisBounds.y[1] / 2, 0]}
            >
              <cylinderGeometry args={[zone.intensity * 2, zone.intensity * 2, axisBounds.z[1] - axisBounds.z[0], 8]} />
              <meshLambertMaterial
                color={zoneColor}
                transparent
                opacity={0.3}
                wireframe={false}
              />
            </mesh>
          );
        })}
      </group>
    );
  };

  // Render individual 3D bars
  const renderBars = () => {
    return (
      <group>
        {barData.map((bar, index) => (
          <mesh
            key={index}
            position={bar.position}
            scale={bar.scale}
            onClick={interactionEnabled ? () => handleBarClick(bar) : undefined}
            onPointerEnter={interactionEnabled ? () => handleBarHover(bar) : undefined}
            onPointerLeave={interactionEnabled ? () => handleBarHover(null) : undefined}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshLambertMaterial
              color={bar.color}
              transparent
              opacity={bar.opacity}
            />
          </mesh>
        ))}
      </group>
    );
  };

  // Render heatmap overlay
  const renderHeatmap = () => {
    if (!showHeatmap || !data) return null;

    // Create a grid-based heatmap on the XY plane for each time slice
    const heatmapPoints: React.ReactElement[] = [];
    const gridResolution = 20;

    for (let x = 0; x < gridResolution; x++) {
      for (let y = 0; y < gridResolution; y++) {
        const xPos = (x / (gridResolution - 1)) * (axisBounds.x[1] - axisBounds.x[0]) + axisBounds.x[0];
        const yPos = (y / (gridResolution - 1)) * axisBounds.y[1];
        
        // Calculate heat intensity at this point
        const intensity = calculateHeatIntensity(xPos, yPos, barData);
        
        if (intensity > 0.1) {
          heatmapPoints.push(
            <mesh key={`heat-${x}-${y}`} position={[xPos, yPos, axisBounds.z[1] + 0.1]}>
              <planeGeometry args={[0.5, 0.5]} />
              <meshBasicMaterial
                color={new Color().setHSL(0.7 - intensity * 0.7, 1, 0.5)}
                transparent
                opacity={intensity * 0.6}
              />
            </mesh>
          );
        }
      }
    }

    return <group>{heatmapPoints}</group>;
  };

  // Calculate heat intensity at a given point
  const calculateHeatIntensity = (x: number, y: number, bars: BarData[]): number => {
    let intensity = 0;
    const radius = 2.0;

    bars.forEach(bar => {
      const distance = Math.sqrt(
        Math.pow(bar.position.x - x, 2) + Math.pow(bar.position.y - y, 2)
      );
      if (distance < radius) {
        intensity += (bar.quantity / (data?.maxQuantity || 1)) * (1 - distance / radius);
      }
    });

    return Math.min(intensity, 1);
  };

  return (
    <group ref={groupRef}>
      {/* Coordinate system axes */}
      {renderAxes()}
      
      {/* 3D bars representing orderbook data */}
      {renderBars()}
      
      {/* Pressure zones visualization */}
      {renderPressureZones()}
      
      {/* Heatmap overlay */}
      {renderHeatmap()}
      
      {/* Interactive tooltip - temporarily disabled to fix HTML element error */}
      {/* {hoveredBar && (
        <Html position={hoveredBar.position}>
          <div className="bg-gray-900 text-white p-2 rounded shadow-lg pointer-events-none">
            <div className="text-sm">
              <div>Price: ${hoveredBar.price.toFixed(4)}</div>
              <div>Volume: {hoveredBar.quantity.toFixed(2)}</div>
              <div>Type: {hoveredBar.type.toUpperCase()}</div>
              <div>Time: {new Date(hoveredBar.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        </Html>
      )} */}
      
      {/* Grid lines for better depth perception */}
      <group>
        {/* Price grid lines */}
        {Array.from({ length: 11 }, (_, i) => {
          const x = (i / 10) * (axisBounds.x[1] - axisBounds.x[0]) + axisBounds.x[0];
          return (
            <Line
              key={`price-grid-${i}`}
              points={[[x, 0, axisBounds.z[0]], [x, 0, axisBounds.z[1]]]}
              color={themeColors.gridColor}
              lineWidth={1}
            />
          );
        })}
        
        {/* Time grid lines */}
        {Array.from({ length: 11 }, (_, i) => {
          const z = (i / 10) * (axisBounds.z[1] - axisBounds.z[0]) + axisBounds.z[0];
          return (
            <Line
              key={`time-grid-${i}`}
              points={[[axisBounds.x[0], 0, z], [axisBounds.x[1], 0, z]]}
              color={themeColors.gridColor}
              lineWidth={1}
            />
          );
        })}
      </group>
    </group>
  );
};

export default Enhanced3DOrderbook;
