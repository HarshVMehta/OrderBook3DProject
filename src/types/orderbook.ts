// Types for orderbook data structures

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface OrderbookEntry {
  price: number;
  quantity: number;
  timestamp: number;
}

export interface OrderbookLevel {
  price: string;
  quantity: string;
}

export interface OrderbookSnapshot {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  lastUpdateId: number;
  symbol: string;
  timestamp: number;
}

export interface OrderbookUpdate {
  eventType: string;
  eventTime: number;
  symbol: string;
  firstUpdateId: number;
  finalUpdateId: number;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
}

export interface ProcessedOrderbookData {
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  maxQuantity: number;
  priceRange: {
    min: number;
    max: number;
  };
}

export interface VenueConfig {
  id: string;
  name: string;
  baseUrl: string;
  wsUrl: string;
  enabled: boolean;
  color: string;
}

export interface PressureZone {
  id: string;
  type: 'support' | 'resistance';
  pressureType: 'support' | 'resistance' | 'accumulation' | 'distribution';
  price: number;
  centerPrice: number;
  minPrice: number;
  maxPrice: number;
  strength: number;
  intensity: number; // 0-1 scale
  volume: number;
  totalVolume: number;
  averageQuantity: number;
  orderCount: number;
  side: 'bid' | 'ask';
  timestamp: number;
  isActive: boolean;
}

export interface VisualizationSettings {
  symbol: string;
  depth: number;
  updateInterval: number;
  showPressureZones: boolean;
  autoRotate: boolean;
  theme: 'dark' | 'light';
  venues: VenueConfig[];
}

export interface CameraSettings {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  near: number;
  far: number;
}

// WebSocket message types
export interface WebSocketMessage {
  stream: string;
  data: OrderbookUpdate;
}

// Chart data for 3D visualization
export interface ChartPoint {
  x: number; // price
  y: number; // quantity
  z: number; // time
  type: 'bid' | 'ask';
  intensity: number;
}

export interface MeshData {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint16Array;
  count: number;
}
