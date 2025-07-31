'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, BufferGeometry, BufferAttribute, Group, Vector3 } from 'three';
import { Text, Line } from '@react-three/drei';
import { ChartPoint, MeshData, ProcessedOrderbookData } from '@/types/orderbook';

interface OrderbookMeshProps {
  meshData: MeshData;
  opacity?: number;
}

export const OrderbookMesh: React.FC<OrderbookMeshProps> = ({ 
  meshData, 
  opacity = 0.8 
}) => {
  const meshRef = useRef<Mesh>(null);

  const geometry = useMemo(() => {
    const geom = new BufferGeometry();
    geom.setAttribute('position', new BufferAttribute(meshData.positions, 3));
    geom.setAttribute('color', new BufferAttribute(meshData.colors, 3));
    geom.setIndex(Array.from(meshData.indices));
    geom.computeVertexNormals();
    return geom;
  }, [meshData]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhongMaterial
        vertexColors
        transparent
        opacity={opacity}
        shininess={100}
      />
    </mesh>
  );
};

interface Enhanced3DOrderbookProps {
  data: ProcessedOrderbookData;
  autoRotate: boolean;
  timeDepth: number;
  showDepthSurface?: boolean;
  showCumulativeDepth?: boolean;
}

export const Enhanced3DOrderbook: React.FC<Enhanced3DOrderbookProps> = ({ 
  data, 
  autoRotate, 
  timeDepth = 10,
  showDepthSurface = true,
  showCumulativeDepth = true
}) => {
  const groupRef = useRef<Group>(null);
  
  // Auto-rotation around Z-axis
  useFrame((state) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.z += 0.005; // Smooth rotation around Z-axis (time)
    }
  });

  const { bidBars, askBars, maxQuantity, priceRange, cumulativeBids, cumulativeAsks } = useMemo(() => {
    if (!data || !data.bids.length || !data.asks.length) {
      return { 
        bidBars: [], 
        askBars: [], 
        maxQuantity: 1, 
        priceRange: { min: 0, max: 1 },
        cumulativeBids: [],
        cumulativeAsks: []
      };
    }

    // Sort orders for proper cumulative calculation
    const sortedBids = [...data.bids].sort((a, b) => b.price - a.price); // Descending
    const sortedAsks = [...data.asks].sort((a, b) => a.price - b.price); // Ascending

    // Calculate cumulative quantities
    let cumBidQty = 0;
    const cumBids = sortedBids.map(bid => {
      cumBidQty += bid.quantity;
      return { ...bid, cumulativeQuantity: cumBidQty };
    });

    let cumAskQty = 0;
    const cumAsks = sortedAsks.map(ask => {
      cumAskQty += ask.quantity;
      return { ...ask, cumulativeQuantity: cumAskQty };
    });

    const maxQty = Math.max(
      Math.max(...data.bids.map(b => b.quantity)),
      Math.max(...data.asks.map(a => a.quantity))
    );

    const range = {
      min: Math.min(...data.bids.map(b => b.price), ...data.asks.map(a => a.price)),
      max: Math.max(...data.bids.map(b => b.price), ...data.asks.map(a => a.price))
    };

    return { 
      bidBars: sortedBids, 
      askBars: sortedAsks, 
      maxQuantity: maxQty, 
      priceRange: range,
      cumulativeBids: cumBids,
      cumulativeAsks: cumAsks
    };
  }, [data]);

  // Normalize coordinates for 3D space with better scaling
  const normalizePrice = (price: number) => {
    return ((price - priceRange.min) / (priceRange.max - priceRange.min)) * 20 - 10; // X-axis: -10 to +10
  };

  const normalizeQuantity = (quantity: number) => {
    return (quantity / maxQuantity) * 8; // Y-axis: 0 to 8 (reduced for better proportion)
  };

  const normalizeCumulativeQuantity = (cumQuantity: number) => {
    const maxCumulative = Math.max(
      cumulativeBids[cumulativeBids.length - 1]?.cumulativeQuantity || 0,
      cumulativeAsks[cumulativeAsks.length - 1]?.cumulativeQuantity || 0
    );
    return (cumQuantity / maxCumulative) * 12; // Y-axis: 0 to 12 for cumulative
  };

  // Generate price tick marks
  const generatePriceTicks = () => {
    const tickCount = 10;
    const step = (priceRange.max - priceRange.min) / tickCount;
    return Array.from({ length: tickCount + 1 }, (_, i) => ({
      price: priceRange.min + i * step,
      position: normalizePrice(priceRange.min + i * step)
    }));
  };

  const priceTicks = generatePriceTicks();

  return (
    <group ref={groupRef}>
      {/* Enhanced 3D Axes */}
      <AxesHelper size={12} />
      
      {/* Price Tick Marks and Labels */}
      {priceTicks.map((tick, index) => (
        <group key={`tick-${index}`}>
          {/* Tick mark line */}
          <mesh position={[tick.position, -0.5, 0]}>
            <boxGeometry args={[0.05, 1, 0.05]} />
            <meshBasicMaterial color="#666666" />
          </mesh>
          
          {/* Price label */}
          <Text
            position={[tick.position, -2, 0]}
            fontSize={0.4}
            color="#cccccc"
            anchorX="center"
            anchorY="top"
          >
            ${tick.price.toFixed(0)}
          </Text>
        </group>
      ))}
      
      {/* Axis Labels */}
      <Text
        position={[12, 0, 0]}
        fontSize={0.8}
        color="#ffffff"
        anchorX="left"
        anchorY="middle"
      >
        Price ($)
      </Text>
      
      <Text
        position={[0, 12, 0]}
        fontSize={0.8}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
      >
        Quantity
      </Text>
      
      <Text
        position={[0, 0, 12]}
        fontSize={0.8}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Time / Depth
      </Text>

      {/* Individual Order Bars */}
      {bidBars.map((bid, index) => {
        const x = normalizePrice(bid.price);
        const y = normalizeQuantity(bid.quantity) / 2;
        const z = (index / bidBars.length) * timeDepth - timeDepth / 2;
        
        return (
          <mesh key={`bid-bar-${index}`} position={[x, y, z]}>
            <boxGeometry args={[0.4, normalizeQuantity(bid.quantity), 0.4]} />
            <meshPhongMaterial 
              color="#22c55e" 
              transparent 
              opacity={0.9}
              emissive="#166534"
              emissiveIntensity={0.1}
            />
          </mesh>
        );
      })}

      {askBars.map((ask, index) => {
        const x = normalizePrice(ask.price);
        const y = normalizeQuantity(ask.quantity) / 2;
        const z = (index / askBars.length) * timeDepth - timeDepth / 2;
        
        return (
          <mesh key={`ask-bar-${index}`} position={[x, y, z]}>
            <boxGeometry args={[0.4, normalizeQuantity(ask.quantity), 0.4]} />
            <meshPhongMaterial 
              color="#ef4444" 
              transparent 
              opacity={0.9}
              emissive="#991b1b"
              emissiveIntensity={0.1}
            />
          </mesh>
        );
      })}

      {/* Cumulative Depth Visualization */}
      {showCumulativeDepth && (
        <>
          {/* Cumulative Bid Surface */}
          {cumulativeBids.map((bid, index) => {
            const x = normalizePrice(bid.price);
            const y = normalizeCumulativeQuantity(bid.cumulativeQuantity) / 2;
            const z = timeDepth / 2 + 2; // Behind the individual bars
            
            return (
              <mesh key={`cum-bid-${index}`} position={[x, y, z]}>
                <boxGeometry args={[0.3, normalizeCumulativeQuantity(bid.cumulativeQuantity), 0.8]} />
                <meshPhongMaterial 
                  color="#4ade80" 
                  transparent 
                  opacity={0.6}
                  emissive="#166534"
                  emissiveIntensity={0.05}
                />
              </mesh>
            );
          })}

          {/* Cumulative Ask Surface */}
          {cumulativeAsks.map((ask, index) => {
            const x = normalizePrice(ask.price);
            const y = normalizeCumulativeQuantity(ask.cumulativeQuantity) / 2;
            const z = timeDepth / 2 + 2; // Behind the individual bars
            
            return (
              <mesh key={`cum-ask-${index}`} position={[x, y, z]}>
                <boxGeometry args={[0.3, normalizeCumulativeQuantity(ask.cumulativeQuantity), 0.8]} />
                <meshPhongMaterial 
                  color="#f87171" 
                  transparent 
                  opacity={0.6}
                  emissive="#991b1b"
                  emissiveIntensity={0.05}
                />
              </mesh>
            );
          })}
        </>
      )}

      {/* Depth Surface Visualization */}
      {showDepthSurface && (
        <DepthSurface 
          bidData={cumulativeBids}
          askData={cumulativeAsks}
          priceRange={priceRange}
          maxQuantity={maxQuantity}
          timeDepth={timeDepth}
        />
      )}

      {/* Grid on XY plane for reference */}
      <GridHelper size={24} divisions={24} />
      
      {/* Price level indicators */}
      <PriceLevelIndicators 
        bidPrice={bidBars[0]?.price || 0}
        askPrice={askBars[0]?.price || 0}
        priceRange={priceRange}
      />
    </group>
  );
};

interface DepthSurfaceProps {
  bidData: Array<{ price: number; quantity: number; cumulativeQuantity: number }>;
  askData: Array<{ price: number; quantity: number; cumulativeQuantity: number }>;
  priceRange: { min: number; max: number };
  maxQuantity: number;
  timeDepth: number;
}

const DepthSurface: React.FC<DepthSurfaceProps> = ({
  bidData,
  askData,
  priceRange,
  maxQuantity,
  timeDepth
}) => {
  const bidSurfaceRef = useRef<Mesh>(null);
  const askSurfaceRef = useRef<Mesh>(null);

  const { bidGeometry, askGeometry } = useMemo(() => {
    const normalizePrice = (price: number) => {
      return ((price - priceRange.min) / (priceRange.max - priceRange.min)) * 20 - 10;
    };

    const normalizeQuantity = (quantity: number) => {
      return (quantity / maxQuantity) * 8;
    };

    // Create surface geometry for bids
    const bidVertices: number[] = [];
    const bidIndices: number[] = [];
    
    bidData.forEach((bid, i) => {
      const x = normalizePrice(bid.price);
      const y1 = 0; // Base
      const y2 = normalizeQuantity(bid.quantity); // Individual quantity
      const z = (i / bidData.length) * timeDepth - timeDepth / 2;
      
      // Add vertices for this price level (creating a strip)
      bidVertices.push(x, y1, z); // Bottom vertex
      bidVertices.push(x, y2, z); // Top vertex
    });

    // Create surface geometry for asks
    const askVertices: number[] = [];
    const askIndices: number[] = [];
    
    askData.forEach((ask, i) => {
      const x = normalizePrice(ask.price);
      const y1 = 0; // Base
      const y2 = normalizeQuantity(ask.quantity); // Individual quantity
      const z = (i / askData.length) * timeDepth - timeDepth / 2;
      
      askVertices.push(x, y1, z);
      askVertices.push(x, y2, z);
    });

    // Create BufferGeometry
    const bidGeom = new BufferGeometry();
    bidGeom.setAttribute('position', new BufferAttribute(new Float32Array(bidVertices), 3));
    
    const askGeom = new BufferGeometry();
    askGeom.setAttribute('position', new BufferAttribute(new Float32Array(askVertices), 3));

    return { bidGeometry: bidGeom, askGeometry: askGeom };
  }, [bidData, askData, priceRange, maxQuantity, timeDepth]);

  return (
    <group>
      {/* Bid depth surface */}
      <points ref={bidSurfaceRef} geometry={bidGeometry}>
        <pointsMaterial 
          color="#22c55e" 
          size={0.1} 
          transparent 
          opacity={0.7}
        />
      </points>

      {/* Ask depth surface */}
      <points ref={askSurfaceRef} geometry={askGeometry}>
        <pointsMaterial 
          color="#ef4444" 
          size={0.1} 
          transparent 
          opacity={0.7}
        />
      </points>
    </group>
  );
};

interface PriceLevelIndicatorsProps {
  bidPrice: number;
  askPrice: number;
  priceRange: { min: number; max: number };
}

const PriceLevelIndicators: React.FC<PriceLevelIndicatorsProps> = ({ 
  bidPrice, 
  askPrice, 
  priceRange 
}) => {
  const normalizePriceForLabel = (price: number) => {
    return ((price - priceRange.min) / (priceRange.max - priceRange.min)) * 20 - 10;
  };

  return (
    <group>
      {/* Best Bid Price Label */}
      {bidPrice > 0 && (
        <Text
          position={[normalizePriceForLabel(bidPrice), -1.5, 0]}
          fontSize={0.5}
          color="#22c55e"
          anchorX="center"
          anchorY="top"
        >
          {`$${bidPrice.toFixed(2)}`}
        </Text>
      )}
      
      {/* Best Ask Price Label */}
      {askPrice > 0 && (
        <Text
          position={[normalizePriceForLabel(askPrice), -1.5, 0]}
          fontSize={0.5}
          color="#ef4444"
          anchorX="center"
          anchorY="top"
        >
          {`$${askPrice.toFixed(2)}`}
        </Text>
      )}
      
      {/* Spread Indicator */}
      {bidPrice > 0 && askPrice > 0 && (
        <mesh 
          position={[
            (normalizePriceForLabel(bidPrice) + normalizePriceForLabel(askPrice)) / 2, 
            0.2, 
            0
          ]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.1, 0.1, Math.abs(normalizePriceForLabel(askPrice) - normalizePriceForLabel(bidPrice)), 8]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
};

interface PressureZoneVisualizerProps {
  zones: Array<{
    type: 'support' | 'resistance';
    price: number;
    strength: number;
    volume: number;
  }>;
  priceRange: { min: number; max: number };
}

export const PressureZoneVisualizer: React.FC<PressureZoneVisualizerProps> = ({ 
  zones, 
  priceRange 
}) => {
  return (
    <group>
      {zones.map((zone, index) => {
        const normalizedPrice = ((zone.price - priceRange.min) / (priceRange.max - priceRange.min)) * 20 - 10;
        const radius = zone.strength * 2;
        const color = zone.type === 'support' ? '#4ade80' : '#f87171';
        
        return (
          <mesh key={index} position={[normalizedPrice, 0, 0]}>
            <cylinderGeometry args={[radius, radius, 0.1, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.3} />
          </mesh>
        );
      })}
    </group>
  );
};

interface GridHelperComponentProps {
  size?: number;
  divisions?: number;
}

export const GridHelper: React.FC<GridHelperComponentProps> = ({ 
  size = 20, 
  divisions = 20 
}) => {
  return (
    <gridHelper args={[size, divisions]} />
  );
};

interface AxesHelperComponentProps {
  size?: number;
}

export const AxesHelper: React.FC<AxesHelperComponentProps> = ({ size = 5 }) => {
  return <axesHelper args={[size]} />;
};

interface DataPointsProps {
  points: ChartPoint[];
  animate?: boolean;
}

export const DataPoints: React.FC<DataPointsProps> = ({ points, animate = true }) => {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    if (animate && groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={groupRef}>
      {points.map((point, index) => {
        const color = point.type === 'bid' ? '#22c55e' : '#ef4444';
        const height = point.y * 0.05; // Scale for visual appeal
        
        return (
          <mesh key={index} position={[point.x * 0.001, height / 2, point.z * 0.0001]}>
            <boxGeometry args={[0.1, height, 0.1]} />
            <meshPhongMaterial 
              color={color} 
              transparent 
              opacity={point.intensity * 0.8 + 0.2} 
            />
          </mesh>
        );
      })}
    </group>
  );
};

interface PriceLabelsProps {
  priceRange: { min: number; max: number };
  steps?: number;
}

export const PriceLabels: React.FC<PriceLabelsProps> = ({ 
  priceRange, 
  steps = 5 
}) => {
  const labels = useMemo(() => {
    const step = (priceRange.max - priceRange.min) / steps;
    return Array.from({ length: steps + 1 }, (_, i) => ({
      price: priceRange.min + i * step,
      position: (i / steps) * 20 - 10
    }));
  }, [priceRange, steps]);

  return (
    <group>
      {labels.map((label, index) => (
        <mesh key={index} position={[label.position, -1, 0]}>
          <planeGeometry args={[2, 0.5]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
};

// Main export
export default Enhanced3DOrderbook;
