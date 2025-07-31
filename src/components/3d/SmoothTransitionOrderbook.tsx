'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { Text } from '@react-three/drei';
import { ProcessedOrderbookData, PressureZone } from '@/types/orderbook';
import PressureZoneVisualization from './PressureZoneVisualization';
import PressureHeatmap from './PressureHeatmap';
import { PressureZoneAnalyzer } from '@/services/pressureZoneAnalyzer';
import { useTheme3D } from '@/hooks/useTheme3D';

interface SmoothTransitionOrderbookProps {
  data: ProcessedOrderbookData;
  autoRotate: boolean;
  timeDepth: number;
  transitionDuration?: number; // Duration in seconds for smooth transitions
  showDepthSurface?: boolean;
  showCumulativeDepth?: boolean;
  showPressureZones?: boolean;
  showHeatmap?: boolean;
  showAxisLabels?: boolean;
  rotationSpeed?: number;
  rotationAxis?: 'x' | 'y' | 'z';
  cameraReset?: number;
}

interface AnimatedBarData {
  price: number;
  targetQuantity: number;
  currentQuantity: number;
  targetPosition: Vector3;
  currentPosition: Vector3;
  type: 'bid' | 'ask';
  isNew: boolean;
  isRemoving: boolean;
}

export const SmoothTransitionOrderbook: React.FC<SmoothTransitionOrderbookProps> = ({ 
  data, 
  autoRotate, 
  timeDepth = 10,
  transitionDuration = 0.5,
  showDepthSurface = true,
  showCumulativeDepth = true,
  showPressureZones = true,
  showHeatmap = true,
  showAxisLabels = true,
  rotationSpeed = 0.5,
  rotationAxis = 'z',
  cameraReset = 0
}) => {
  const groupRef = useRef<Group>(null);
  const [animatedBars, setAnimatedBars] = useState<AnimatedBarData[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pressureZones, setPressureZones] = useState<PressureZone[]>([]);
  const lastDataRef = useRef<ProcessedOrderbookData | null>(null);
  const transitionStartTimeRef = useRef<number>(0);
  const pressureAnalyzerRef = useRef(new PressureZoneAnalyzer());
  
  // Get theme colors for 3D components
  const themeColors = useTheme3D();
  
  // Handle camera reset
  useEffect(() => {
    if (groupRef.current && cameraReset > 0) {
      // Reset all rotations to initial state
      groupRef.current.rotation.set(0, 0, 0);
    }
  }, [cameraReset]);
  
  // Auto-rotation that continues smoothly during data updates
  useFrame((state) => {
    if (groupRef.current) {
      // Only rotate if rotationSpeed > 0 (manual control takes priority over autoRotate)
      if (rotationSpeed > 0) {
        const rotationAmount = rotationSpeed * 0.02; // Increased for more visible rotation
        
        switch (rotationAxis) {
          case 'x':
            groupRef.current.rotation.x += rotationAmount;
            break;
          case 'y':
            groupRef.current.rotation.y += rotationAmount;
            break;
          case 'z':
          default:
            groupRef.current.rotation.z += rotationAmount; // Default Z-axis for temporal dimension
            break;
        }
      }
    }
    
    // Handle smooth transitions
    if (isTransitioning) {
      const elapsed = state.clock.elapsedTime - transitionStartTimeRef.current;
      const progress = Math.min(elapsed / transitionDuration, 1);
      
      // Use easing function for smooth transitions
      const easedProgress = easeInOutCubic(progress);
      
      setAnimatedBars(prevBars => 
        prevBars.map(bar => ({
          ...bar,
          currentQuantity: lerp(bar.currentQuantity, bar.targetQuantity, easedProgress),
          currentPosition: new Vector3().lerpVectors(bar.currentPosition, bar.targetPosition, easedProgress)
        }))
      );
      
      if (progress >= 1) {
        setIsTransitioning(false);
      }
    }
  });

  // Process data changes and initiate smooth transitions
  useEffect(() => {
    if (!data || !data.bids.length || !data.asks.length) return;
    
    const newAnimatedBars: AnimatedBarData[] = [];
    
    // Process bids
    data.bids.forEach((bid, index) => {
      const x = normalizePrice(bid.price, data.priceRange);
      const y = normalizeQuantity(bid.quantity, data.maxQuantity) / 2;
      const z = (index / data.bids.length) * timeDepth - timeDepth / 2;
      
      const targetPosition = new Vector3(x, y, z);
      
      // Check if this bar existed in previous data
      const existingBar = lastDataRef.current?.bids.find(prevBid => prevBid.price === bid.price);
      
      newAnimatedBars.push({
        price: bid.price,
        targetQuantity: bid.quantity,
        currentQuantity: existingBar?.quantity || 0,
        targetPosition,
        currentPosition: existingBar ? targetPosition.clone() : new Vector3(x, 0, z),
        type: 'bid',
        isNew: !existingBar,
        isRemoving: false
      });
    });
    
    // Process asks
    data.asks.forEach((ask, index) => {
      const x = normalizePrice(ask.price, data.priceRange);
      const y = normalizeQuantity(ask.quantity, data.maxQuantity) / 2;
      const z = (index / data.asks.length) * timeDepth - timeDepth / 2;
      
      const targetPosition = new Vector3(x, y, z);
      
      // Check if this bar existed in previous data
      const existingBar = lastDataRef.current?.asks.find(prevAsk => prevAsk.price === ask.price);
      
      newAnimatedBars.push({
        price: ask.price,
        targetQuantity: ask.quantity,
        currentQuantity: existingBar?.quantity || 0,
        targetPosition,
        currentPosition: existingBar ? targetPosition.clone() : new Vector3(x, 0, z),
        type: 'ask',
        isNew: !existingBar,
        isRemoving: false
      });
    });
    
    // Add removing bars (bars that existed before but are no longer in new data)
    if (lastDataRef.current) {
      lastDataRef.current.bids.forEach((prevBid, index) => {
        if (!data.bids.find(bid => bid.price === prevBid.price)) {
          const x = normalizePrice(prevBid.price, data.priceRange);
          const z = (index / lastDataRef.current!.bids.length) * timeDepth - timeDepth / 2;
          
          newAnimatedBars.push({
            price: prevBid.price,
            targetQuantity: 0,
            currentQuantity: prevBid.quantity,
            targetPosition: new Vector3(x, 0, z),
            currentPosition: new Vector3(x, normalizeQuantity(prevBid.quantity, data.maxQuantity) / 2, z),
            type: 'bid',
            isNew: false,
            isRemoving: true
          });
        }
      });
      
      lastDataRef.current.asks.forEach((prevAsk, index) => {
        if (!data.asks.find(ask => ask.price === prevAsk.price)) {
          const x = normalizePrice(prevAsk.price, data.priceRange);
          const z = (index / lastDataRef.current!.asks.length) * timeDepth - timeDepth / 2;
          
          newAnimatedBars.push({
            price: prevAsk.price,
            targetQuantity: 0,
            currentQuantity: prevAsk.quantity,
            targetPosition: new Vector3(x, 0, z),
            currentPosition: new Vector3(x, normalizeQuantity(prevAsk.quantity, data.maxQuantity) / 2, z),
            type: 'ask',
            isNew: false,
            isRemoving: true
          });
        }
      });
    }
    
    setAnimatedBars(newAnimatedBars);
    setIsTransitioning(true);
    transitionStartTimeRef.current = performance.now() / 1000;
    lastDataRef.current = data;
    
    // Analyze pressure zones if enabled
    if (showPressureZones) {
      const analysis = pressureAnalyzerRef.current.analyzePressureZones(data);
      setPressureZones(analysis.zones);
    }
  }, [data, timeDepth, showPressureZones]);

  const { priceRange, maxQuantity } = useMemo(() => {
    if (!data || !data.bids.length || !data.asks.length) {
      return { priceRange: { min: 0, max: 1 }, maxQuantity: 1 };
    }
    return { priceRange: data.priceRange, maxQuantity: data.maxQuantity };
  }, [data]);

  // Normalize coordinates for 3D space
  const normalizePrice = (price: number, range: { min: number; max: number }) => {
    return ((price - range.min) / (range.max - range.min)) * 20 - 10; // X-axis: -10 to +10
  };

  const normalizeQuantity = (quantity: number, maxQty: number) => {
    return (quantity / maxQty) * 8; // Y-axis: 0 to 8
  };

  // Generate price tick marks
  const generatePriceTicks = () => {
    const tickCount = 10;
    const step = (priceRange.max - priceRange.min) / tickCount;
    return Array.from({ length: tickCount + 1 }, (_, i) => ({
      price: priceRange.min + i * step,
      position: normalizePrice(priceRange.min + i * step, priceRange)
    }));
  };

  const priceTicks = generatePriceTicks();

  return (
    <group ref={groupRef}>
      {/* Enhanced 3D Axes */}
      <axesHelper args={[12]} />
      
      {/* Price Tick Marks and Labels */}
      {priceTicks.map((tick, index) => (
        <group key={`tick-${index}`}>
          {/* Tick mark line */}
          <mesh position={[tick.position, -0.5, 0]}>
            <boxGeometry args={[0.05, 1, 0.05]} />
            <meshBasicMaterial color={themeColors.gridColor} />
          </mesh>
          
          {/* Price label */}
          <Text
            position={[tick.position, -2, 0]}
            fontSize={0.4}
            color={themeColors.text}
            anchorX="center"
            anchorY="top"
          >
            ${tick.price.toFixed(0)}
          </Text>
        </group>
      ))}
      
      {/* Axis Labels - Improved and smaller */}
      {showAxisLabels && (
        <>
          <Text
            position={[15, 0, 0]}
            fontSize={0.4}
            color={themeColors.text}
            anchorX="left"
            anchorY="middle"
            rotation={[0, 0, 0]}
          >
            Price ($)
          </Text>
          
          <Text
            position={[0, 15, 0]}
            fontSize={0.4}
            color={themeColors.text}
            anchorX="center"
            anchorY="bottom"
            rotation={[0, 0, 0]}
          >
            Quantity
          </Text>
          
          <Text
            position={[0, 0, 15]}
            fontSize={0.4}
            color={themeColors.text}
            anchorX="center"
            anchorY="middle"
            rotation={[0, -Math.PI / 2, 0]}
          >
            Time / Depth
          </Text>
        </>
      )}

      {/* Animated Order Bars with Smooth Transitions */}
      {animatedBars.filter(bar => bar.currentQuantity > 0).map((bar, index) => {
        const height = normalizeQuantity(bar.currentQuantity, maxQuantity);
        const color = bar.type === 'bid' ? themeColors.bidColor : themeColors.askColor;
        const emissiveColor = bar.type === 'bid' ? 
          (themeColors.bidColor + '40') : // Add some transparency
          (themeColors.askColor + '40');
        const opacity = bar.isRemoving ? 0.3 : (bar.isNew ? 0.7 : 0.9);
        
        return (
          <mesh 
            key={`${bar.type}-${bar.price}-${index}`} 
            position={[bar.currentPosition.x, bar.currentPosition.y, bar.currentPosition.z]}
          >
            <boxGeometry args={[0.4, height, 0.4]} />
            <meshPhongMaterial 
              color={color} 
              transparent 
              opacity={opacity}
              emissive={emissiveColor}
              emissiveIntensity={0.1}
            />
          </mesh>
        );
      })}
      
      {/* Pressure Zone Visualization */}
      {showPressureZones && pressureZones.length > 0 && (
        <PressureZoneVisualization
          pressureZones={pressureZones}
          maxPrice={priceRange.max}
          minPrice={priceRange.min}
          showHeatmap={showHeatmap}
          animate={!isTransitioning}
        />
      )}
      
      {/* Pressure Heatmap Overlay */}
      {showHeatmap && pressureZones.length > 0 && (
        <PressureHeatmap
          pressureZones={pressureZones}
          maxPrice={priceRange.max}
          minPrice={priceRange.min}
          width={24}
          height={24}
          opacity={0.4}
          animate={!isTransitioning}
        />
      )}
      
      {/* Connection Status Indicator */}
      <Text
        position={[-12, 10, 0]}
        fontSize={0.6}
        color={isTransitioning ? themeColors.pressureColors.medium : themeColors.pressureColors.low}
        anchorX="left"
        anchorY="middle"
      >
        {isTransitioning ? "Updating..." : "Live Data"}
      </Text>
      
      {/* Pressure Zone Status */}
      {showPressureZones && (
        <Text
          position={[12, 10, 0]}
          fontSize={0.5}
          color={themeColors.accent}
          anchorX="right"
          anchorY="middle"
        >
          Zones: {pressureZones.length}
        </Text>
      )}
    </group>
  );
};

// Utility functions for smooth animations
function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default SmoothTransitionOrderbook;
