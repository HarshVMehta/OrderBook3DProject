'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, PlaneGeometry, ShaderMaterial, Color, Vector2, DataTexture, FloatType } from 'three';
import { PressureZone } from '@/types/orderbook';

interface PressureHeatmapProps {
  pressureZones: PressureZone[];
  maxPrice: number;
  minPrice: number;
  width?: number;
  height?: number;
  opacity?: number;
  animate?: boolean;
  heatmapData?: Array<{ price: number; intensity: number; volume: number }>;
}

const PressureHeatmap: React.FC<PressureHeatmapProps> = ({
  pressureZones,
  maxPrice,
  minPrice,
  width = 20,
  height = 20,
  opacity = 0.8,
  animate = true,
  heatmapData
}) => {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  // Early return if no pressure zones data - don't render anything
  if (!pressureZones || pressureZones.length === 0) {
    return null;
  }

  // Validate price range to prevent NaN in calculations
  const validMaxPrice = isFinite(maxPrice) && maxPrice > 0 ? maxPrice : 100000;
  const validMinPrice = isFinite(minPrice) && minPrice >= 0 ? minPrice : 0;
  
  // Ensure we have a valid price range
  if (validMaxPrice <= validMinPrice) {
    console.warn('Invalid price range for heatmap, skipping render');
    return null;
  }

  // Create enhanced heatmap data texture with better visibility
  const heatmapDataTexture = useMemo(() => {
    const resolution = 512; // Even higher resolution for crystal clear heatmap
    const data = new Float32Array(resolution * resolution * 4);
    
    // Generate heatmap based on pressure zones and volume data
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const price = validMinPrice + ((validMaxPrice - validMinPrice) * x / resolution);
        const depth = y / resolution; // Normalized depth
        
        // Validate calculated values
        if (!isFinite(price) || price < 0) continue;
        if (!isFinite(depth) || depth < 0 || depth > 1) continue;
        
        let intensity = 0;
        let volumeIntensity = 0;
        let colorR = 0, colorG = 0, colorB = 0;
        
        // Calculate intensity from nearby pressure zones with enhanced falloff
        for (const zone of pressureZones) {
          // Validate zone data
          if (!zone || !isFinite(zone.minPrice) || !isFinite(zone.maxPrice) || !isFinite(zone.centerPrice) || !isFinite(zone.intensity)) {
            continue;
          }
          
          if (price >= zone.minPrice && price <= zone.maxPrice) {
            const distanceFromCenter = Math.abs(price - zone.centerPrice);
            const maxDistance = (zone.maxPrice - zone.minPrice) / 2;
            
            // Prevent division by zero or invalid calculations
            if (maxDistance <= 0 || !isFinite(distanceFromCenter)) continue;
            
            const distanceFactor = Math.max(0, 1 - Math.pow(distanceFromCenter / maxDistance, 1.5));
            const zoneIntensity = zone.intensity * distanceFactor * 2; // Doubled intensity for better visibility
            
            // Validate intensity before using
            if (!isFinite(zoneIntensity) || zoneIntensity < 0) continue;
            
            intensity = Math.max(intensity, zoneIntensity);
            
            // Enhanced color mixing based on zone type and intensity with stronger colors
            switch (zone.pressureType) {
              case 'support':
                colorG += zoneIntensity * 1.2; // Brighter green
                colorB += zoneIntensity * 0.3; // Slight blue tint
                break;
              case 'resistance':
                colorR += zoneIntensity * 1.2; // Brighter red
                colorG += zoneIntensity * 0.2; // Slight green tint
                break;
              case 'accumulation':
                colorB += zoneIntensity * 1.2; // Brighter blue
                colorG += zoneIntensity * 0.4; // More green tint
                break;
              case 'distribution':
                colorR += zoneIntensity * 0.8; // Purple-ish
                colorB += zoneIntensity * 1.0;
                colorG += zoneIntensity * 0.2;
                break;
            }
          }
        }
        
        // Add volume-based intensity if heatmap data is available
        if (heatmapData && Array.isArray(heatmapData)) {
          const volumeData = heatmapData.find(d => d && isFinite(d.price) && Math.abs(d.price - price) < (validMaxPrice - validMinPrice) / resolution);
          if (volumeData && isFinite(volumeData.volume) && volumeData.volume > 0) {
            volumeIntensity = volumeData.volume / 500; // Increased sensitivity
            if (isFinite(volumeIntensity)) {
              intensity = Math.max(intensity, volumeIntensity * 0.5);
            }
          }
        }
        
        // Add gradient effect based on depth with more variation
        const depthFactor = Math.sin(depth * Math.PI * 2) * 0.3;
        if (isFinite(depthFactor)) {
          intensity += depthFactor;
        }
        
        // Ensure minimum visibility for active areas
        if (intensity > 0.1) {
          intensity = Math.max(intensity, 0.3);
        }
        
        // Final validation before data assignment
        const index = (y * resolution + x) * 4;
        data[index] = isFinite(colorR) ? Math.min(Math.max(colorR, 0), 1) : 0;     // R
        data[index + 1] = isFinite(colorG) ? Math.min(Math.max(colorG, 0), 1) : 0; // G
        data[index + 2] = isFinite(colorB) ? Math.min(Math.max(colorB, 0), 1) : 0; // B
        data[index + 3] = isFinite(intensity) ? Math.min(Math.max(intensity, 0), 1) : 0; // A
      }
    }
    
    const texture = new DataTexture(data, resolution, resolution);
    texture.format = 1023; // RGBAFormat
    texture.type = FloatType; // Use proper FloatType constant
    texture.needsUpdate = true;
    
    return { texture, resolution };
  }, [pressureZones, validMaxPrice, validMinPrice, heatmapData]);

  // Enhanced custom shader for advanced heatmap rendering
  const shaderMaterial = useMemo(() => {
    return new ShaderMaterial({
      transparent: true,
      uniforms: {
        time: { value: 0 },
        opacity: { value: opacity },
        heatmapTexture: { value: heatmapDataTexture.texture },
        resolution: { value: new Vector2(heatmapDataTexture.resolution, heatmapDataTexture.resolution) },
        pressureZones: { value: pressureZones.length },
        maxIntensity: { value: Math.max(...pressureZones.map(z => z.intensity), 1) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        uniform sampler2D heatmapTexture;
        uniform vec2 resolution;
        uniform int pressureZones;
        uniform float maxIntensity;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        // Smooth interpolation function
        float smoothstep3(float edge0, float edge1, float x) {
          float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
          return t * t * (3.0 - 2.0 * t);
        }
        
        // Generate procedural pressure zones only if we have real pressure zone data
        vec4 generatePressureZones(vec2 uv) {
          vec4 color = vec4(0.0);
          
          // Only generate if we have actual pressure zones (not just procedural)
          if (pressureZones > 0) {
            // Create pressure zones based on actual data
            for (int i = 0; i < min(pressureZones, 5); i++) {
              float angle = float(i) * 2.0 * 3.14159 / float(pressureZones);
              vec2 center = vec2(0.5 + 0.2 * cos(angle), 0.5 + 0.2 * sin(angle));
              float dist = length(uv - center);
              float radius = 0.08 + 0.02 * sin(time + float(i));
              float intensity = (1.0 - smoothstep3(0.0, radius, dist)) * (0.5 + 0.3 * sin(time * 0.5 + float(i)));
              
              // Different colors for different zone types
              if (i == 0) {
                color.r += intensity * 0.6; // Support (red)
              } else if (i == 1) {
                color.g += intensity * 0.6; // Resistance (green)
              } else if (i == 2) {
                color.b += intensity * 0.6; // Accumulation (blue)
              } else {
                color.r += intensity * 0.4; // Mixed zones
                color.b += intensity * 0.4;
              }
              
              color.a += intensity * 0.15;
            }
          }
          
          return color;
        }
        
        // Add animated waves and pulses
        vec4 addAnimations(vec4 baseColor, vec2 uv) {
          // Pulsing effect
          float pulse = 1.0 + sin(time * 2.0) * 0.1;
          
          // Wave effect
          float wave = sin(time * 3.0 + uv.x * 10.0) * 0.05;
          
          // Ripple effect from center
          float centerDist = length(uv - vec2(0.5));
          float ripple = sin(time * 4.0 - centerDist * 20.0) * 0.1;
          
          baseColor.a *= (1.0 + wave + ripple) * pulse;
          
          return baseColor;
        }
        
        void main() {
          // Sample heatmap texture
          vec4 heatmapColor = texture2D(heatmapTexture, vUv);
          
          // Only generate procedural zones if we have real pressure zone data
          vec4 proceduralColor = vec4(0.0);
          if (pressureZones > 0) {
            proceduralColor = generatePressureZones(vUv);
          }
          
          // Blend heatmap and procedural data - prioritize real heatmap data
          vec4 finalColor = mix(proceduralColor, heatmapColor, 0.8);
          
          // Add animations only if we have visible content
          if (finalColor.a > 0.01) {
            finalColor = addAnimations(finalColor, vUv);
          }
          
          // Apply intensity-based alpha
          finalColor.a *= opacity;
          
          // Only apply effects if we have sufficient alpha
          if (finalColor.a > 0.05) {
            // Add gradient effect from center
            float centerDist = length(vUv - vec2(0.5));
            finalColor.a *= (1.0 - centerDist * 0.2);
            
            // Add subtle edge glow effect
            float edgeGlow = 1.0 - smoothstep3(0.9, 1.0, centerDist);
            finalColor.rgb += edgeGlow * 0.1;
          }
          
          gl_FragColor = finalColor;
        }
      `
    });
  }, [opacity, heatmapDataTexture, pressureZones]);

  // Animation loop
  useFrame((state) => {
    if (animate && materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.getElapsedTime();
    }
  });

  return (
    <group>
      {/* Main heatmap overlay positioned above the orderbook surface */}
      <mesh
        ref={meshRef}
        position={[0, 0.1, 0]} // Slightly higher to avoid z-fighting
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[width, height, 32, 32]} /> {/* Higher subdivisions for better quality */}
        <shaderMaterial
          ref={materialRef}
          attach="material"
          {...shaderMaterial}
        />
      </mesh>

      {/* Secondary heatmap layer for depth effect */}
      <mesh
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[width * 1.02, height * 1.02]} />
        <shaderMaterial
          attach="material"
          {...shaderMaterial}
          uniforms={{
            ...shaderMaterial.uniforms,
            opacity: { value: opacity * 0.3 } // Dimmer background layer
          }}
        />
      </mesh>

      {/* Enhanced grid lines for reference with better visibility */}
      <group position={[0, 0.12, 0]}>
        {/* Vertical grid lines with pressure zone indicators */}
        {Array.from({ length: 21 }, (_, i) => { // More grid lines for better reference
          const price = validMinPrice + ((validMaxPrice - validMinPrice) * i / 20);
          const position = width * (i / 20 - 0.5);
          
          // Validate calculated values
          if (!isFinite(price) || !isFinite(position)) {
            return null;
          }
          
          const intensity = pressureZones.reduce((max, zone) => {
            if (zone && 
                isFinite(zone.minPrice) && 
                isFinite(zone.maxPrice) && 
                isFinite(zone.intensity) &&
                price >= zone.minPrice && 
                price <= zone.maxPrice) {
              return Math.max(max, zone.intensity);
            }
            return max;
          }, 0);
          
          return (
            <mesh key={`v-${i}`} position={[position, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.03, height]} />
              <meshBasicMaterial 
                color={intensity > 0.7 ? "#ff1744" : intensity > 0.4 ? "#ff9800" : intensity > 0.2 ? "#ffeb3b" : "#424242"} 
                transparent 
                opacity={Math.max(0.4, Math.min(1.0, 0.4 + intensity * 0.6))} 
              />
            </mesh>
          );
        }).filter(Boolean)}
        
        {/* Horizontal grid lines with enhanced styling */}
        {Array.from({ length: 21 }, (_, i) => {
          const position = height * (i / 20 - 0.5);
          
          // Validate position
          if (!isFinite(position)) {
            return null;
          }
          
          return (
            <mesh key={`h-${i}`} position={[0, 0, position]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[width, 0.03]} />
              <meshBasicMaterial color="#616161" transparent opacity={0.4} />
            </mesh>
          );
        }).filter(Boolean)}
      </group>

      {/* Enhanced pressure zone indicators */}
      {pressureZones.filter(zone => {
        // Filter out zones with invalid data that could cause NaN
        return zone && 
               isFinite(zone.centerPrice) && 
               isFinite(zone.intensity) && 
               isFinite(zone.volume) && 
               zone.intensity > 0 &&
               zone.centerPrice >= validMinPrice && 
               zone.centerPrice <= validMaxPrice;
      }).map((zone) => {
        const normalizedX = ((zone.centerPrice - validMinPrice) / (validMaxPrice - validMinPrice)) * width - width / 2;
        const side = zone.side === 'bid' ? -height / 4 : height / 4;
        const zoneColor = 
          zone.pressureType === 'support' ? '#22c55e' :
          zone.pressureType === 'resistance' ? '#ef4444' :
          zone.pressureType === 'accumulation' ? '#3b82f6' : '#a855f7';
        
        // Validate calculated position
        if (!isFinite(normalizedX) || !isFinite(side)) {
          return null;
        }
        
        return (
          <group key={zone.id} position={[normalizedX, 0.03, side]}>
            {/* Zone marker with enhanced styling */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[Math.max(0.1, zone.intensity * 2), 16]} />
              <meshBasicMaterial
                color={zoneColor}
                transparent
                opacity={Math.max(0.1, Math.min(1.0, 0.6 + zone.intensity * 0.2))}
              />
            </mesh>
            
            {/* Intensity pulse rings */}
            {[0.5, 0.8, 1.2, 1.6].map((radius, ringIndex) => {
              const innerRadius = Math.max(0.05, zone.intensity * radius);
              const outerRadius = Math.max(0.1, zone.intensity * (radius + 0.3));
              return (
                <mesh key={ringIndex} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[innerRadius, outerRadius, 16]} />
                  <meshBasicMaterial
                    color={zoneColor}
                    transparent
                    opacity={Math.max(0.05, Math.min(1.0, zone.intensity * 0.2 * (1 - ringIndex * 0.2)))}
                  />
                </mesh>
              );
            })}
            
            {/* Volume indicator for high-volume zones */}
            {zone.volume > 500 && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <ringGeometry args={[Math.max(0.1, zone.intensity * 3), Math.max(0.15, zone.intensity * 3.5), 8]} />
                <meshBasicMaterial
                  color="#fbbf24"
                  transparent
                  opacity={0.4}
                />
              </mesh>
            )}
          </group>
        );
      }).filter(Boolean)}

      {/* Volume intensity overlay */}
      {heatmapData && Array.isArray(heatmapData) && (
        <group position={[0, 0.04, 0]}>
          {heatmapData.filter(d => 
            d && 
            isFinite(d.volume) && 
            isFinite(d.price) && 
            d.volume > 100 &&
            d.price >= validMinPrice && 
            d.price <= validMaxPrice
          ).map((data, index) => {
            const normalizedX = ((data.price - validMinPrice) / (validMaxPrice - validMinPrice)) * width - width / 2;
            const volumeIntensity = Math.min(data.volume / 1000, 1);
            
            // Validate calculated values
            if (!isFinite(normalizedX) || !isFinite(volumeIntensity) || volumeIntensity <= 0) {
              return null;
            }
            
            return (
              <mesh key={`vol-${index}`} position={[normalizedX, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[Math.max(0.1, volumeIntensity * 1.5), 8]} />
                <meshBasicMaterial
                  color="#f59e0b"
                  transparent
                  opacity={Math.max(0.1, Math.min(1.0, volumeIntensity * 0.3))}
                />
              </mesh>
            );
          }).filter(Boolean)}
        </group>
      )}
    </group>
  );
};

export default PressureHeatmap;
