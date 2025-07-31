'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, PlaneGeometry, ShaderMaterial, Color, Vector2, DataTexture } from 'three';
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
  opacity = 0.6,
  animate = true,
  heatmapData
}) => {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  // Create enhanced heatmap data texture
  const heatmapDataTexture = useMemo(() => {
    const resolution = 256; // Higher resolution for better quality
    const data = new Float32Array(resolution * resolution * 4);
    
    // Generate heatmap based on pressure zones and volume data
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const price = minPrice + ((maxPrice - minPrice) * x / resolution);
        const depth = y / resolution; // Normalized depth
        
        let intensity = 0;
        let volumeIntensity = 0;
        let colorR = 0, colorG = 0, colorB = 0;
        
        // Calculate intensity from nearby pressure zones with enhanced falloff
        for (const zone of pressureZones) {
          if (price >= zone.minPrice && price <= zone.maxPrice) {
            const distanceFromCenter = Math.abs(price - zone.centerPrice);
            const maxDistance = (zone.maxPrice - zone.minPrice) / 2;
            const distanceFactor = Math.max(0, 1 - Math.pow(distanceFromCenter / maxDistance, 2));
            const zoneIntensity = zone.intensity * distanceFactor;
            
            intensity = Math.max(intensity, zoneIntensity);
            
            // Enhanced color mixing based on zone type and intensity
            switch (zone.pressureType) {
              case 'support':
                colorG += zoneIntensity * 0.8; // Green
                colorB += zoneIntensity * 0.2; // Slight blue tint
                break;
              case 'resistance':
                colorR += zoneIntensity * 0.8; // Red
                colorG += zoneIntensity * 0.1; // Slight green tint
                break;
              case 'accumulation':
                colorB += zoneIntensity * 0.9; // Blue
                colorG += zoneIntensity * 0.3; // Slight green tint
                break;
              case 'distribution':
                colorR += zoneIntensity * 0.6; // Purple
                colorB += zoneIntensity * 0.8;
                break;
            }
          }
        }
        
        // Add volume-based intensity if heatmap data is available
        if (heatmapData) {
          const volumeData = heatmapData.find(d => Math.abs(d.price - price) < (maxPrice - minPrice) / resolution);
          if (volumeData) {
            volumeIntensity = volumeData.volume / 1000; // Normalize volume
            intensity = Math.max(intensity, volumeIntensity * 0.3);
          }
        }
        
        // Add gradient effect based on depth
        const depthFactor = Math.sin(depth * Math.PI) * 0.2;
        intensity += depthFactor;
        
        const index = (y * resolution + x) * 4;
        data[index] = Math.min(colorR, 1);     // R
        data[index + 1] = Math.min(colorG, 1); // G
        data[index + 2] = Math.min(colorB, 1); // B
        data[index + 3] = Math.min(intensity, 1); // A
      }
    }
    
    const texture = new DataTexture(data, resolution, resolution);
    texture.format = 1023; // RGBAFormat
    texture.type = 5126; // FloatType
    texture.needsUpdate = true;
    
    return { texture, resolution };
  }, [pressureZones, maxPrice, minPrice, heatmapData]);

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
        
        // Generate procedural pressure zones
        vec4 generatePressureZones(vec2 uv) {
          vec4 color = vec4(0.0);
          
          // Create multiple pressure zones procedurally
          for (int i = 0; i < 5; i++) {
            float angle = float(i) * 2.0 * 3.14159 / 5.0;
            vec2 center = vec2(0.5 + 0.3 * cos(angle), 0.5 + 0.3 * sin(angle));
            float dist = length(uv - center);
            float radius = 0.1 + 0.05 * sin(time + float(i));
            float intensity = 1.0 - smoothstep3(0.0, radius, dist);
            
            // Different colors for different zone types
            if (i == 0) {
              color.r += intensity * 0.8; // Support (red)
            } else if (i == 1) {
              color.g += intensity * 0.8; // Resistance (green)
            } else if (i == 2) {
              color.b += intensity * 0.8; // Accumulation (blue)
            } else if (i == 3) {
              color.r += intensity * 0.6; // Distribution (purple)
              color.b += intensity * 0.6;
            } else {
              color.g += intensity * 0.6; // Mixed (yellow)
              color.r += intensity * 0.4;
            }
            
            color.a += intensity * 0.2;
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
          
          // Generate procedural pressure zones
          vec4 proceduralColor = generatePressureZones(vUv);
          
          // Blend heatmap and procedural data
          vec4 finalColor = mix(heatmapColor, proceduralColor, 0.3);
          
          // Add animations
          finalColor = addAnimations(finalColor, vUv);
          
          // Apply intensity-based alpha
          finalColor.a *= opacity;
          
          // Add gradient effect from center
          float centerDist = length(vUv - vec2(0.5));
          finalColor.a *= (1.0 - centerDist * 0.3);
          
          // Add edge glow effect
          float edgeGlow = 1.0 - smoothstep3(0.8, 1.0, centerDist);
          finalColor.rgb += edgeGlow * 0.2;
          
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
      {/* Main heatmap overlay */}
      <mesh
        ref={meshRef}
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[width, height]} />
        <shaderMaterial
          ref={materialRef}
          attach="material"
          {...shaderMaterial}
        />
      </mesh>

      {/* Enhanced grid lines for reference */}
      <group position={[0, 0.02, 0]}>
        {/* Vertical grid lines with pressure zone indicators */}
        {Array.from({ length: 11 }, (_, i) => {
          const price = minPrice + ((maxPrice - minPrice) * i / 10);
          const intensity = pressureZones.reduce((max, zone) => {
            if (price >= zone.minPrice && price <= zone.maxPrice) {
              return Math.max(max, zone.intensity);
            }
            return max;
          }, 0);
          
          return (
            <mesh key={`v-${i}`} position={[width * (i / 10 - 0.5), 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.05, height]} />
              <meshBasicMaterial 
                color={intensity > 0.5 ? "#ff6b6b" : intensity > 0.2 ? "#ffd93d" : "#333333"} 
                transparent 
                opacity={0.3 + intensity * 0.4} 
              />
            </mesh>
          );
        })}
        
        {/* Horizontal grid lines */}
        {Array.from({ length: 11 }, (_, i) => (
          <mesh key={`h-${i}`} position={[0, 0, height * (i / 10 - 0.5)]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width, 0.05]} />
            <meshBasicMaterial color="#333333" transparent opacity={0.3} />
          </mesh>
        ))}
      </group>

      {/* Enhanced pressure zone indicators */}
      {pressureZones.map((zone) => {
        const normalizedX = ((zone.centerPrice - minPrice) / (maxPrice - minPrice)) * width - width / 2;
        const side = zone.side === 'bid' ? -height / 4 : height / 4;
        const zoneColor = 
          zone.pressureType === 'support' ? '#22c55e' :
          zone.pressureType === 'resistance' ? '#ef4444' :
          zone.pressureType === 'accumulation' ? '#3b82f6' : '#a855f7';
        
        return (
          <group key={zone.id} position={[normalizedX, 0.03, side]}>
            {/* Zone marker with enhanced styling */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[zone.intensity * 2, 16]} />
              <meshBasicMaterial
                color={zoneColor}
                transparent
                opacity={0.6 + zone.intensity * 0.2}
              />
            </mesh>
            
            {/* Intensity pulse rings */}
            {[0.5, 0.8, 1.2, 1.6].map((radius, ringIndex) => (
              <mesh key={ringIndex} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[zone.intensity * radius, zone.intensity * (radius + 0.3), 16]} />
                <meshBasicMaterial
                  color={zoneColor}
                  transparent
                  opacity={zone.intensity * 0.2 * (1 - ringIndex * 0.2)}
                />
              </mesh>
            ))}
            
            {/* Volume indicator for high-volume zones */}
            {zone.volume > 500 && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <ringGeometry args={[zone.intensity * 3, zone.intensity * 3.5, 8]} />
                <meshBasicMaterial
                  color="#fbbf24"
                  transparent
                  opacity={0.4}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Volume intensity overlay */}
      {heatmapData && (
        <group position={[0, 0.04, 0]}>
          {heatmapData.filter(d => d.volume > 100).map((data, index) => {
            const normalizedX = ((data.price - minPrice) / (maxPrice - minPrice)) * width - width / 2;
            const volumeIntensity = Math.min(data.volume / 1000, 1);
            
            return (
              <mesh key={`vol-${index}`} position={[normalizedX, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[volumeIntensity * 1.5, 8]} />
                <meshBasicMaterial
                  color="#f59e0b"
                  transparent
                  opacity={volumeIntensity * 0.3}
                />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};

export default PressureHeatmap;
