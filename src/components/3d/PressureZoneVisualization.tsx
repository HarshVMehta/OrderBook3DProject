'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Color, Vector3 } from 'three';
import { PressureZone } from '@/types/orderbook';

interface PressureZoneVisualizationProps {
  pressureZones: PressureZone[];
  maxPrice: number;
  minPrice: number;
  showHeatmap?: boolean;
  animate?: boolean;
}

const PressureZoneVisualization: React.FC<PressureZoneVisualizationProps> = ({
  pressureZones,
  maxPrice,
  minPrice,
  showHeatmap = true,
  animate = true
}) => {
  const groupRef = useRef<any>(null);

  // Calculate normalized positions for pressure zones
  const zoneData = useMemo(() => {
    return pressureZones.map(zone => {
      const normalizedPrice = ((zone.centerPrice - minPrice) / (maxPrice - minPrice)) * 20 - 10;
      const zoneHeight = zone.intensity * 2; // Scale height based on intensity
      const zoneWidth = ((zone.maxPrice - zone.minPrice) / (maxPrice - minPrice)) * 20;
      
      // Color based on pressure type and side
      let color: Color;
      switch (zone.pressureType) {
        case 'support':
          color = new Color().setHSL(0.33, 0.8, 0.5 + zone.intensity * 0.3); // Green variants
          break;
        case 'resistance':
          color = new Color().setHSL(0.0, 0.8, 0.5 + zone.intensity * 0.3); // Red variants
          break;
        case 'accumulation':
          color = new Color().setHSL(0.58, 0.8, 0.5 + zone.intensity * 0.3); // Blue variants
          break;
        case 'distribution':
          color = new Color().setHSL(0.83, 0.8, 0.5 + zone.intensity * 0.3); // Purple variants
          break;
        default:
          color = new Color().setHSL(0.16, 0.8, 0.5 + zone.intensity * 0.3); // Orange variants
      }

      return {
        ...zone,
        position: new Vector3(normalizedPrice, zoneHeight / 2, zone.side === 'bid' ? -2 : 2),
        scale: new Vector3(Math.max(zoneWidth, 0.5), zoneHeight, 1),
        color,
        opacity: 0.3 + (zone.intensity * 0.4) // More intense zones are more opaque
      };
    });
  }, [pressureZones, maxPrice, minPrice]);

  // Animate pulsing effect for active zones
  useFrame((state) => {
    if (!animate || !groupRef.current) return;
    
    const time = state.clock.getElapsedTime();
    groupRef.current.children.forEach((mesh: Mesh, index: number) => {
      const zone = zoneData[index];
      if (zone?.isActive) {
        const pulse = 1 + Math.sin(time * 2 + index) * 0.1;
        mesh.scale.setY(zone.scale.y * pulse);
        
        // Subtle rotation for distribution zones
        if (zone.pressureType === 'distribution') {
          mesh.rotation.y = Math.sin(time + index) * 0.1;
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      {zoneData.map((zone, index) => (
        <group key={zone.id}>
          {/* Main pressure zone visualization */}
          <mesh
            position={zone.position}
            scale={zone.scale}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshPhongMaterial
              color={zone.color}
              transparent
              opacity={zone.opacity}
              emissive={zone.color}
              emissiveIntensity={zone.intensity * 0.2}
            />
          </mesh>

          {/* Intensity indicator - glowing core */}
          {zone.intensity > 0.7 && (
            <mesh
              position={[zone.position.x, zone.position.y, zone.position.z]}
              scale={[zone.scale.x * 0.3, zone.scale.y * 0.8, zone.scale.z * 0.3]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshPhongMaterial
                color={zone.color}
                transparent
                opacity={0.8}
                emissive={zone.color}
                emissiveIntensity={zone.intensity * 0.5}
              />
            </mesh>
          )}

          {/* Pressure zone boundary lines */}
          <lineSegments
            position={zone.position}
            scale={zone.scale}
          >
            <edgesGeometry attach="geometry">
              <boxGeometry args={[1, 1, 1]} />
            </edgesGeometry>
            <lineBasicMaterial
              color={zone.color}
              transparent
              opacity={0.6}
              linewidth={2}
            />
          </lineSegments>

          {showHeatmap && (
            <>
              {/* Heatmap gradient effect */}
              <mesh
                position={[zone.position.x, 0.1, zone.position.z]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[zone.scale.x * 1.5, zone.scale.z * 1.5, 1]}
              >
                <planeGeometry args={[1, 1]} />
                <meshPhongMaterial
                  color={zone.color}
                  transparent
                  opacity={zone.intensity * 0.3}
                  emissive={zone.color}
                  emissiveIntensity={zone.intensity * 0.1}
                />
              </mesh>

              {/* Pressure intensity rings */}
              {[0.5, 0.8, 1.2].map((radius, ringIndex) => (
                <mesh
                  key={ringIndex}
                  position={[zone.position.x, 0.05 + ringIndex * 0.02, zone.position.z]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  scale={[zone.scale.x * radius, zone.scale.z * radius, 1]}
                >
                  <ringGeometry args={[0.8, 1, 32]} />
                  <meshBasicMaterial
                    color={zone.color}
                    transparent
                    opacity={zone.intensity * 0.2 * (1 - ringIndex * 0.3)}
                  />
                </mesh>
              ))}
            </>
          )}
        </group>
      ))}
    </group>
  );
};

export default PressureZoneVisualization;
