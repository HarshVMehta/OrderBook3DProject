'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Color } from 'three';
import { Text } from '@react-three/drei';
import { PressureZone } from '@/types/orderbook';
import { PressureZoneAnalysis } from '@/services/pressureZoneAnalyzer';
import { useTheme3D } from '@/hooks/useTheme3D';

interface Enhanced3DPressureZonesProps {
  analysis: PressureZoneAnalysis;
  currentPrice?: number;
  priceRange?: { min: number; max: number };
  autoRotate?: boolean;
  showLabels?: boolean;
  showIntensityWaves?: boolean;
  showRiskIndicators?: boolean;
}

export const Enhanced3DPressureZones: React.FC<Enhanced3DPressureZonesProps> = ({
  analysis,
  currentPrice = 0,
  priceRange,
  autoRotate = true,
  showLabels = true,
  showIntensityWaves = true,
  showRiskIndicators = true
}) => {
  const groupRef = useRef<Group>(null);
  const themeColors = useTheme3D();

  // Early return if no analysis data
  if (!analysis || !analysis.zones) {
    return null;
  }

  // Calculate price range if not provided
  const effectivePriceRange = useMemo(() => {
    if (priceRange) return priceRange;
    
    const allPrices = analysis.zones.map(zone => zone.centerPrice).filter(price => 
      typeof price === 'number' && isFinite(price)
    );
    if (currentPrice > 0) allPrices.push(currentPrice);
    
    if (allPrices.length === 0) return { min: 0, max: 100 };
    
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    
    if (min === max) return { min: min - 1, max: max + 1 };
    
    const padding = (max - min) * 0.1;
    
    return {
      min: Math.max(0, min - padding),
      max: max + padding
    };
  }, [priceRange, analysis.zones, currentPrice]);

  // Animate rotation and pulsing effects
  useFrame((state) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  // Process zones for 3D visualization
  const processedZones = useMemo(() => {
    if (!analysis.zones || analysis.zones.length === 0) return [];
    
    return analysis.zones.map((zone) => {
      // Validate zone data
      if (!zone || typeof zone.centerPrice !== 'number' || 
          typeof zone.intensity !== 'number' || typeof zone.volume !== 'number') {
        return null;
      }

      // Ensure price range is valid
      const priceSpan = effectivePriceRange.max - effectivePriceRange.min;
      if (priceSpan <= 0) return null;

      const normalizedPrice = (zone.centerPrice - effectivePriceRange.min) / priceSpan;
      
      // Validate calculated values and prevent NaN
      if (!isFinite(normalizedPrice)) return null;
      
      const x = (normalizedPrice - 0.5) * 20; // Spread across 20 units
      
      // Height based on intensity and volume with validation
      const intensityHeight = isFinite(zone.intensity) ? zone.intensity * 8 : 1;
      const volumeHeight = isFinite(zone.volume) && zone.volume > 0 ? (zone.volume / 1000) * 2 : 0;
      const height = Math.max(0.5, intensityHeight + volumeHeight);
      
      // Width based on price range with validation
      const priceRangeWidth = zone.maxPrice && zone.minPrice && isFinite(zone.maxPrice) && isFinite(zone.minPrice) 
        ? (zone.maxPrice - zone.minPrice) 
        : effectivePriceRange.min * 0.001;
      const width = Math.max(0.3, Math.min(5, priceRangeWidth / effectivePriceRange.min * 100));
      
      // Validate final position values
      if (!isFinite(x) || !isFinite(height) || !isFinite(width)) return null;
      
      // Color based on zone type and intensity
      let color: string;
      if (zone.pressureType === 'support') {
        color = zone.intensity > 0.7 ? themeColors.bidColor : themeColors.pressureColors.low;
      } else {
        color = zone.intensity > 0.7 ? themeColors.askColor : themeColors.pressureColors.high;
      }

      // Risk level color override
      if (showRiskIndicators) {
        if (zone.intensity > 0.9) color = '#ff0000'; // Critical
        else if (zone.intensity > 0.7) color = '#ff6600'; // High
        else if (zone.intensity > 0.5) color = '#ffaa00'; // Medium
      }

      return {
        ...zone,
        position: [x, height / 2, 0] as [number, number, number],
        dimensions: [width, height, width * 0.6] as [number, number, number],
        color: new Color(color),
        emissiveColor: new Color(color).multiplyScalar(0.2),
        opacity: Math.min(0.9, Math.max(0.3, zone.intensity))
      };
    }).filter((zone): zone is NonNullable<typeof zone> => zone !== null);
  }, [analysis.zones, effectivePriceRange, themeColors, showRiskIndicators]);

  // Generate gradient overlay zones
  const gradientZones = useMemo(() => {
    if (!analysis.gradientOverlay) return [];
    
    return analysis.gradientOverlay.map((overlay, index) => {
      // Validate overlay data
      if (!overlay || typeof overlay.startPrice !== 'number' || typeof overlay.endPrice !== 'number') {
        return null;
      }

      const priceSpan = effectivePriceRange.max - effectivePriceRange.min;
      if (priceSpan <= 0) return null;

      const startX = ((overlay.startPrice - effectivePriceRange.min) / priceSpan - 0.5) * 20;
      const endX = ((overlay.endPrice - effectivePriceRange.min) / priceSpan - 0.5) * 20;
      
      // Validate calculated values
      if (!isFinite(startX) || !isFinite(endX)) return null;
      
      const width = Math.abs(endX - startX);
      const centerX = (startX + endX) / 2;
      
      return {
        id: `gradient-${index}`,
        position: [centerX, -1, 0] as [number, number, number],
        dimensions: [width, 0.1, 2] as [number, number, number],
        color: new Color(overlay.color),
        opacity: overlay.opacity * 0.5,
        type: overlay.type
      };
    }).filter((gradient): gradient is NonNullable<typeof gradient> => gradient !== null);
  }, [analysis.gradientOverlay, effectivePriceRange]);

  // Generate intensity wave effects
  const intensityWaves = useMemo(() => {
    if (!showIntensityWaves) return [];
    
    return analysis.zones
      .filter(zone => zone && zone.intensity > 0.6)
      .map((zone, index) => {
        // Validate zone data
        if (!zone || typeof zone.centerPrice !== 'number' || typeof zone.intensity !== 'number') {
          return null;
        }

        const priceSpan = effectivePriceRange.max - effectivePriceRange.min;
        if (priceSpan <= 0) return null;

        const normalizedPrice = (zone.centerPrice - effectivePriceRange.min) / priceSpan;
        if (!isFinite(normalizedPrice)) return null;
        
        const x = (normalizedPrice - 0.5) * 20;
        
        // Validate final values
        if (!isFinite(x)) return null;
        
        return {
          id: `wave-${zone.id}`,
          position: [x, zone.intensity * 8, 0] as [number, number, number],
          radius: zone.intensity * 3,
          color: zone.pressureType === 'support' ? themeColors.bidColor : themeColors.askColor,
          intensity: zone.intensity
        };
      }).filter((wave): wave is NonNullable<typeof wave> => wave !== null);
  }, [analysis.zones, effectivePriceRange, showIntensityWaves, themeColors]);

  return (
    <group ref={groupRef}>
      {/* Main pressure zone volumes */}
      {processedZones.map((zone) => (
        <group key={zone.id}>
          {/* Main zone volume */}
          <mesh position={zone.position}>
            <boxGeometry args={zone.dimensions} />
            <meshPhongMaterial
              color={zone.color}
              emissive={zone.emissiveColor}
              emissiveIntensity={0.2}
              transparent
              opacity={zone.opacity}
            />
          </mesh>

          {/* Intensity indicator rings */}
          {zone.intensity > 0.7 && (
            <mesh position={[zone.position[0], zone.position[1] + zone.dimensions[1] / 2 + 0.5, zone.position[2]]}>
              <torusGeometry args={[zone.dimensions[0] * 0.8, 0.1, 8, 16]} />
              <meshBasicMaterial
                color={zone.color}
                transparent
                opacity={0.6}
              />
            </mesh>
          )}

          {/* Zone labels */}
          {showLabels && (
            <Text
              position={[zone.position[0], zone.position[1] + zone.dimensions[1] / 2 + 1, zone.position[2]]}
              fontSize={0.3}
              color={themeColors.text}
              anchorX="center"
              anchorY="bottom"
            >
              {zone.pressureType.toUpperCase()}
              {'\n'}${zone.centerPrice.toFixed(2)}
              {'\n'}{(zone.intensity * 100).toFixed(0)}%
            </Text>
          )}

          {/* Risk indicators */}
          {showRiskIndicators && zone.intensity > 0.8 && (
            <mesh position={[zone.position[0], zone.position[1] + zone.dimensions[1] + 1, zone.position[2]]}>
              <sphereGeometry args={[0.2, 8, 6]} />
              <meshPhongMaterial
                color={zone.intensity > 0.9 ? '#ff0000' : '#ff6600'}
                emissive={zone.intensity > 0.9 ? '#ff0000' : '#ff6600'}
                emissiveIntensity={0.5}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* Gradient overlay planes */}
      {gradientZones.map((gradient) => (
        <mesh key={gradient.id} position={gradient.position}>
          <boxGeometry args={gradient.dimensions} />
          <meshBasicMaterial
            color={gradient.color}
            transparent
            opacity={gradient.opacity}
          />
        </mesh>
      ))}

      {/* Intensity wave effects */}
      {intensityWaves.map((wave) => (
        <group key={wave.id}>
          <mesh position={wave.position}>
            <sphereGeometry args={[wave.radius, 16, 12]} />
            <meshBasicMaterial
              color={wave.color}
              transparent
              opacity={0.1}
              wireframe
            />
          </mesh>
          <mesh position={wave.position}>
            <ringGeometry args={[wave.radius * 0.8, wave.radius * 1.2, 16]} />
            <meshBasicMaterial
              color={wave.color}
              transparent
              opacity={wave.intensity * 0.3}
              side={2} // DoubleSide
            />
          </mesh>
        </group>
      ))}

      {/* Critical pressure level indicators */}
      {analysis.statistics.criticalLevels
        .filter(price => typeof price === 'number' && isFinite(price))
        .map((price, index) => {
        const priceSpan = effectivePriceRange.max - effectivePriceRange.min;
        if (priceSpan <= 0) return null;
        
        const normalizedPrice = (price - effectivePriceRange.min) / priceSpan;
        if (!isFinite(normalizedPrice)) return null;
        
        const x = (normalizedPrice - 0.5) * 20;
        if (!isFinite(x)) return null;
        
        return (
          <group key={`critical-${index}`}>
            <mesh position={[x, 10, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 20]} />
              <meshPhongMaterial
                color="#ff0000"
                emissive="#ff0000"
                emissiveIntensity={0.3}
                transparent
                opacity={0.7}
              />
            </mesh>
            <Text
              position={[x, 11, 0]}
              fontSize={0.4}
              color="#ff0000"
              anchorX="center"
              anchorY="bottom"
            >
              CRITICAL
              {'\n'}${price.toFixed(2)}
            </Text>
          </group>
        );
      })}

      {/* Alert indicators */}
      {analysis.alerts
        .filter(alert => alert.severity === 'critical' || alert.severity === 'high')
        .slice(0, 3)
        .map((alert, index) => {
          if (!alert.zone || typeof alert.zone.centerPrice !== 'number') return null;
          
          const priceSpan = effectivePriceRange.max - effectivePriceRange.min;
          if (priceSpan <= 0) return null;
          
          const normalizedPrice = (alert.zone.centerPrice - effectivePriceRange.min) / priceSpan;
          if (!isFinite(normalizedPrice)) return null;
          
          const x = (normalizedPrice - 0.5) * 20;
          if (!isFinite(x)) return null;
          
          return (
            <group key={`alert-${alert.id}`}>
              <mesh position={[x, 12 + index * 2, 0]}>
                <octahedronGeometry args={[0.5]} />
                <meshPhongMaterial
                  color={alert.severity === 'critical' ? '#ff0000' : '#ff6600'}
                  emissive={alert.severity === 'critical' ? '#ff0000' : '#ff6600'}
                  emissiveIntensity={0.5}
                />
              </mesh>
              <Text
                position={[x, 13 + index * 2, 0]}
                fontSize={0.3}
                color={alert.severity === 'critical' ? '#ff0000' : '#ff6600'}
                anchorX="center"
                anchorY="bottom"
              >
                {alert.type.toUpperCase().replace('_', ' ')}
                {alert.confidence && `\n${(alert.confidence * 100).toFixed(0)}%`}
              </Text>
            </group>
          );
        })}
    </group>
  );
};
