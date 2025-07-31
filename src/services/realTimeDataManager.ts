'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ProcessedOrderbookData, OrderbookUpdate, ConnectionState } from '@/types/orderbook';
import { BinanceWebSocketService } from '@/services/binanceWebSocket';
import { OrderbookSimulator } from '@/services/orderbookSimulator';

interface DataGapInfo {
  detected: boolean;
  lastUpdateTime: number;
  gapDuration: number;
  reconnecting: boolean;
}

interface ConnectionStats {
  totalConnections: number;
  reconnections: number;
  dataUpdates: number;
  lastUpdateTime: number;
  averageLatency: number;
  status: ConnectionState;
}

export class RealTimeDataManager {
  private wsService: BinanceWebSocketService | null = null;
  private simulator: OrderbookSimulator | null = null;
  private currentData: ProcessedOrderbookData | null = null;
  private isRealTimeMode: boolean = false;
  private connectionStats: ConnectionStats;
  private dataGapInfo: DataGapInfo;
  
  // Callbacks
  private onDataCallback?: (data: ProcessedOrderbookData) => void;
  private onStatusCallback?: (status: ConnectionState, stats: ConnectionStats) => void;
  private onErrorCallback?: (error: string) => void;
  
  // Timeouts and intervals
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private dataGapTimeout: NodeJS.Timeout | null = null;
  private simulatorInterval: NodeJS.Timeout | null = null;
  private latencyCheckInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_BASE_DELAY = 1000;
  private readonly DATA_GAP_THRESHOLD = 10000; // 10 seconds
  private readonly LATENCY_CHECK_INTERVAL = 30000; // 30 seconds
  
  constructor(symbol: string = 'BTCUSDT') {
    this.connectionStats = {
      totalConnections: 0,
      reconnections: 0,
      dataUpdates: 0,
      lastUpdateTime: 0,
      averageLatency: 0,
      status: 'disconnected'
    };
    
    this.dataGapInfo = {
      detected: false,
      lastUpdateTime: 0,
      gapDuration: 0,
      reconnecting: false
    };
    
    this.wsService = new BinanceWebSocketService(symbol);
    this.simulator = new OrderbookSimulator(symbol);
  }
  
  // Public methods
  public async connectRealTime(): Promise<void> {
    try {
      this.setStatus('connecting');
      this.isRealTimeMode = true;
      
      if (!this.wsService) {
        throw new Error('WebSocket service not initialized');
      }
      
      // Set up callbacks
      this.wsService.onData(this.handleRealTimeUpdate.bind(this));
      this.wsService.onError(this.handleConnectionError.bind(this));
      
      // Get initial snapshot
      const snapshot = await BinanceWebSocketService.getOrderbookSnapshot('BTCUSDT', 20);
      this.processSnapshot(snapshot);
      
      // Connect to real-time stream
      await this.wsService.connect();
      
      this.connectionStats.totalConnections++;
      this.setStatus('connected');
      this.startDataGapMonitoring();
      this.startLatencyChecking();
      
    } catch (error) {
      console.error('Real-time connection failed:', error);
      this.handleConnectionError(error as Error);
    }
  }
  
  public connectDemo(): void {
    this.setStatus('connecting');
    this.isRealTimeMode = false;
    this.stopRealTimeServices();
    
    if (!this.simulator) {
      this.simulator = new OrderbookSimulator('BTCUSDT');
    }
    
    // Start simulator with periodic updates
    this.simulatorInterval = setInterval(() => {
      this.generateDemoUpdate();
    }, 1000 + Math.random() * 2000); // 1-3 second intervals
    
    // Initial data
    setTimeout(() => {
      this.generateDemoUpdate();
      this.setStatus('connected');
    }, 500);
  }
  
  public disconnect(): void {
    this.stopRealTimeServices();
    this.stopSimulator();
    this.setStatus('disconnected');
    this.currentData = null;
  }
  
  public switchSymbol(symbol: string): void {
    const wasConnected = this.connectionStats.status === 'connected';
    this.disconnect();
    
    this.wsService = new BinanceWebSocketService(symbol);
    this.simulator = new OrderbookSimulator(symbol);
    
    if (wasConnected) {
      if (this.isRealTimeMode) {
        this.connectRealTime();
      } else {
        this.connectDemo();
      }
    }
  }
  
  // Callback setters
  public onData(callback: (data: ProcessedOrderbookData) => void): void {
    this.onDataCallback = callback;
  }
  
  public onStatus(callback: (status: ConnectionState, stats: ConnectionStats) => void): void {
    this.onStatusCallback = callback;
  }
  
  public onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }
  
  // Getters
  public getCurrentData(): ProcessedOrderbookData | null {
    return this.currentData;
  }
  
  public getConnectionStats(): ConnectionStats {
    return { ...this.connectionStats };
  }
  
  public getDataGapInfo(): DataGapInfo {
    return { ...this.dataGapInfo };
  }
  
  public isConnected(): boolean {
    return this.connectionStats.status === 'connected';
  }
  
  // Private methods
  private handleRealTimeUpdate(update: OrderbookUpdate): void {
    try {
      if (!this.currentData) return;
      
      const updateStartTime = performance.now();
      
      // Apply updates to current data
      const updatedData = this.applyOrderbookUpdate(this.currentData, update);
      this.currentData = updatedData;
      
      // Update statistics
      this.connectionStats.dataUpdates++;
      this.connectionStats.lastUpdateTime = Date.now();
      this.dataGapInfo.lastUpdateTime = Date.now();
      
      // Calculate latency
      const latency = performance.now() - updateStartTime;
      this.updateAverageLatency(latency);
      
      // Notify callback
      if (this.onDataCallback) {
        this.onDataCallback(updatedData);
      }
      
      // Reset data gap detection
      this.dataGapInfo.detected = false;
      if (this.dataGapTimeout) {
        clearTimeout(this.dataGapTimeout);
      }
      this.startDataGapMonitoring();
      
    } catch (error) {
      console.error('Error processing real-time update:', error);
      this.handleConnectionError(new Error('Failed to process real-time update'));
    }
  }
  
  private handleConnectionError(error: Error): void {
    console.error('Connection error:', error);
    
    if (this.onErrorCallback) {
      this.onErrorCallback(error.message);
    }
    
    if (this.isRealTimeMode && this.connectionStats.reconnections < this.MAX_RECONNECT_ATTEMPTS) {
      this.attemptReconnection();
    } else {
      // Fallback to demo mode
      console.log('Falling back to demo mode...');
      this.connectDemo();
    }
  }
  
  private attemptReconnection(): void {
    if (this.dataGapInfo.reconnecting) return;
    
    this.dataGapInfo.reconnecting = true;
    this.connectionStats.reconnections++;
    this.setStatus('connecting');
    
    const delay = this.RECONNECT_BASE_DELAY * Math.pow(2, this.connectionStats.reconnections);
    
    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connectRealTime();
        this.dataGapInfo.reconnecting = false;
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.dataGapInfo.reconnecting = false;
        this.handleConnectionError(error as Error);
      }
    }, delay);
  }
  
  private generateDemoUpdate(): void {
    if (!this.simulator) return;
    
    try {
      const snapshot = this.simulator.generateSnapshot(20);
      this.processSnapshot(snapshot);
      
      this.connectionStats.dataUpdates++;
      this.connectionStats.lastUpdateTime = Date.now();
      
    } catch (error) {
      console.error('Error generating demo update:', error);
    }
  }
  
  private processSnapshot(snapshot: any): void {
    const processedData: ProcessedOrderbookData = {
      bids: snapshot.bids.map((bid: any) => ({
        price: parseFloat(bid.price),
        quantity: parseFloat(bid.quantity),
        timestamp: Date.now()
      })),
      asks: snapshot.asks.map((ask: any) => ({
        price: parseFloat(ask.price),
        quantity: parseFloat(ask.quantity),
        timestamp: Date.now()
      })),
      maxQuantity: 0,
      priceRange: { min: 0, max: 0 }
    };
    
    // Calculate derived fields
    const allQuantities = [...processedData.bids, ...processedData.asks].map(entry => entry.quantity);
    const allPrices = [...processedData.bids, ...processedData.asks].map(entry => entry.price);
    
    processedData.maxQuantity = Math.max(...allQuantities);
    processedData.priceRange = {
      min: Math.min(...allPrices),
      max: Math.max(...allPrices)
    };
    
    this.currentData = processedData;
    
    if (this.onDataCallback) {
      this.onDataCallback(processedData);
    }
  }
  
  private applyOrderbookUpdate(currentData: ProcessedOrderbookData, update: OrderbookUpdate): ProcessedOrderbookData {
    const newBids = [...currentData.bids];
    const newAsks = [...currentData.asks];
    
    // Apply bid updates
    update.bids.forEach(level => {
      const price = parseFloat(level.price);
      const quantity = parseFloat(level.quantity);
      const index = newBids.findIndex(bid => bid.price === price);
      
      if (quantity === 0) {
        if (index !== -1) newBids.splice(index, 1);
      } else {
        if (index !== -1) {
          newBids[index].quantity = quantity;
          newBids[index].timestamp = Date.now();
        } else {
          newBids.push({ price, quantity, timestamp: Date.now() });
        }
      }
    });
    
    // Apply ask updates
    update.asks.forEach(level => {
      const price = parseFloat(level.price);
      const quantity = parseFloat(level.quantity);
      const index = newAsks.findIndex(ask => ask.price === price);
      
      if (quantity === 0) {
        if (index !== -1) newAsks.splice(index, 1);
      } else {
        if (index !== -1) {
          newAsks[index].quantity = quantity;
          newAsks[index].timestamp = Date.now();
        } else {
          newAsks.push({ price, quantity, timestamp: Date.now() });
        }
      }
    });
    
    // Sort and limit
    newBids.sort((a, b) => b.price - a.price);
    newAsks.sort((a, b) => a.price - b.price);
    
    // Recalculate derived fields
    const limitedBids = newBids.slice(0, 20);
    const limitedAsks = newAsks.slice(0, 20);
    const allQuantities = [...limitedBids, ...limitedAsks].map(entry => entry.quantity);
    const allPrices = [...limitedBids, ...limitedAsks].map(entry => entry.price);
    
    return {
      bids: limitedBids,
      asks: limitedAsks,
      maxQuantity: Math.max(...allQuantities),
      priceRange: {
        min: Math.min(...allPrices),
        max: Math.max(...allPrices)
      }
    };
  }
  
  private startDataGapMonitoring(): void {
    this.dataGapTimeout = setTimeout(() => {
      if (!this.dataGapInfo.detected) {
        this.dataGapInfo.detected = true;
        this.dataGapInfo.gapDuration = Date.now() - this.dataGapInfo.lastUpdateTime;
        
        console.warn(`Data gap detected: ${this.dataGapInfo.gapDuration}ms`);
        
        if (this.isRealTimeMode) {
          this.handleConnectionError(new Error('Data gap detected - no updates received'));
        }
      }
    }, this.DATA_GAP_THRESHOLD);
  }
  
  private startLatencyChecking(): void {
    this.latencyCheckInterval = setInterval(() => {
      // Ping-style latency check could be implemented here
      // For now, we'll just log the current stats
      console.log('Connection stats:', this.connectionStats);
    }, this.LATENCY_CHECK_INTERVAL);
  }
  
  private updateAverageLatency(newLatency: number): void {
    const alpha = 0.1; // Exponential moving average factor
    this.connectionStats.averageLatency = 
      this.connectionStats.averageLatency * (1 - alpha) + newLatency * alpha;
  }
  
  private setStatus(status: ConnectionState): void {
    this.connectionStats.status = status;
    if (this.onStatusCallback) {
      this.onStatusCallback(status, this.connectionStats);
    }
  }
  
  private stopRealTimeServices(): void {
    if (this.wsService) {
      this.wsService.disconnect();
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.dataGapTimeout) {
      clearTimeout(this.dataGapTimeout);
      this.dataGapTimeout = null;
    }
    
    if (this.latencyCheckInterval) {
      clearInterval(this.latencyCheckInterval);
      this.latencyCheckInterval = null;
    }
  }
  
  private stopSimulator(): void {
    if (this.simulatorInterval) {
      clearInterval(this.simulatorInterval);
      this.simulatorInterval = null;
    }
  }
}

// Custom hook that uses the RealTimeDataManager
export const useRealTimeOrderbook = (symbol: string = 'BTCUSDT') => {
  const [data, setData] = useState<ProcessedOrderbookData | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRealTime, setIsRealTime] = useState<boolean>(false);
  
  const managerRef = useRef<RealTimeDataManager | null>(null);
  
  // Initialize manager
  useEffect(() => {
    managerRef.current = new RealTimeDataManager(symbol);
    
    // Set up callbacks
    managerRef.current.onData(setData);
    managerRef.current.onStatus((status, stats) => {
      setConnectionState(status);
      setConnectionStats(stats);
    });
    managerRef.current.onError(setError);
    
    return () => {
      if (managerRef.current) {
        managerRef.current.disconnect();
      }
    };
  }, [symbol]);
  
  const connectRealTime = useCallback(async () => {
    if (managerRef.current) {
      setIsRealTime(true);
      setError(null);
      await managerRef.current.connectRealTime();
    }
  }, []);
  
  const connectDemo = useCallback(() => {
    if (managerRef.current) {
      setIsRealTime(false);
      setError(null);
      managerRef.current.connectDemo();
    }
  }, []);
  
  const disconnect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.disconnect();
    }
  }, []);
  
  const switchSymbol = useCallback((newSymbol: string) => {
    if (managerRef.current) {
      managerRef.current.switchSymbol(newSymbol);
    }
  }, []);
  
  return {
    data,
    connectionState,
    connectionStats,
    error,
    isRealTime,
    connectRealTime,
    connectDemo,
    disconnect,
    switchSymbol,
    isConnected: connectionState === 'connected'
  };
};
