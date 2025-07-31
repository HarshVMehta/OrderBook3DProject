'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ProcessedOrderbookData, 
  VisualizationSettings, 
  PressureZone,
  OrderbookUpdate 
} from '@/types/orderbook';
import { BinanceWebSocketService } from '@/services/binanceWebSocket';
import { OrderbookSimulator } from '@/services/orderbookSimulator';
import { OrderbookDataProcessor } from '@/utils/orderbookProcessor';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'demo';

interface UseOrderbookReturn {
  data: ProcessedOrderbookData | null;
  pressureZones: PressureZone[];
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  stats: {
    symbol: string;
    bidCount: number;
    askCount: number;
    spread: number;
    midPrice: number;
    totalVolume: number;
    lastUpdate: number;
  } | null;
}

export const useOrderbook = (settings: VisualizationSettings): UseOrderbookReturn => {
  const [data, setData] = useState<ProcessedOrderbookData | null>(null);
  const [pressureZones, setPressureZones] = useState<PressureZone[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UseOrderbookReturn['stats']>(null);

  const wsServiceRef = useRef<BinanceWebSocketService | null>(null);
  const simulatorRef = useRef<OrderbookSimulator | null>(null);
  const processorRef = useRef(new OrderbookDataProcessor());
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isConnected = connectionStatus === 'connected' || connectionStatus === 'demo';

  const calculateStats = useCallback((orderbookData: ProcessedOrderbookData, symbol: string) => {
    const bestBid = orderbookData.bids[0]?.price || 0;
    const bestAsk = orderbookData.asks[0]?.price || 0;
    const midPrice = (bestBid + bestAsk) / 2;
    const spread = bestAsk - bestBid;
    
    const totalBidVolume = orderbookData.bids.reduce((sum: number, bid) => sum + bid.quantity, 0);
    const totalAskVolume = orderbookData.asks.reduce((sum: number, ask) => sum + ask.quantity, 0);
    const totalVolume = totalBidVolume + totalAskVolume;

    return {
      symbol,
      bidCount: orderbookData.bids.length,
      askCount: orderbookData.asks.length,
      spread,
      midPrice,
      totalVolume,
      lastUpdate: Date.now()
    };
  }, []);

  const processOrderbookUpdate = useCallback((update: OrderbookUpdate) => {
    if (!data) {
      console.log('Received update but no initial data, skipping...');
      return;
    }

    try {
      const updatedData = processorRef.current.processUpdate(update, data);
      setData(updatedData);
      setStats(calculateStats(updatedData, settings.symbol));

      // Update pressure zones if enabled
      if (settings.showPressureZones) {
        const zones = processorRef.current.analyzePressureZones(updatedData);
        setPressureZones(zones);
      }
    } catch (err) {
      console.error('Error processing orderbook update:', err);
      setError('Failed to process orderbook update');
    }
  }, [data, settings.showPressureZones, settings.symbol, calculateStats]);

  const connectWithSimulator = useCallback(() => {
    console.log('Starting demo mode with simulated orderbook data...');
    
    // Clean up any existing connections
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
      wsServiceRef.current = null;
    }

    // Initialize simulator
    simulatorRef.current = new OrderbookSimulator(settings.symbol);
    
    // Generate initial snapshot
    const snapshot = simulatorRef.current.generateSnapshot(settings.depth);
    const initialData = processorRef.current.processSnapshot(snapshot);
    setData(initialData);
    setStats(calculateStats(initialData, settings.symbol));

    if (settings.showPressureZones) {
      const zones = processorRef.current.analyzePressureZones(initialData);
      setPressureZones(zones);
    }

    // Start simulator updates
    simulatorRef.current.onData(processOrderbookUpdate);
    simulatorRef.current.start(settings.updateInterval);
    
    setConnectionStatus('demo');
    setError('Demo mode: Using simulated orderbook data');
    console.log('Demo mode activated successfully');
  }, [settings.symbol, settings.depth, settings.showPressureZones, settings.updateInterval, processOrderbookUpdate, calculateStats]);

  const connect = useCallback(async () => {
    if (wsServiceRef.current || simulatorRef.current) {
      disconnect();
    }

    setConnectionStatus('connecting');
    setError(null);

    try {
      // First try to get initial snapshot from REST API
      console.log(`Attempting to fetch initial orderbook snapshot for ${settings.symbol}...`);
      
      try {
        const snapshot = await BinanceWebSocketService.getOrderbookSnapshot(
          settings.symbol, 
          settings.depth
        );

        console.log('Processing initial snapshot...');
        const initialData = processorRef.current.processSnapshot(snapshot);
        setData(initialData);
        setStats(calculateStats(initialData, settings.symbol));

        if (settings.showPressureZones) {
          const zones = processorRef.current.analyzePressureZones(initialData);
          setPressureZones(zones);
        }
      } catch (restError) {
        console.error('REST API failed, using simulated data:', restError);
        // Fall back to simulated data immediately
        connectWithSimulator();
        return;
      }

      // Try WebSocket connection
      console.log('Attempting WebSocket connection...');
      wsServiceRef.current = new BinanceWebSocketService(settings.symbol);
      
      wsServiceRef.current.onData(processOrderbookUpdate);
      wsServiceRef.current.onError((err) => {
        console.error('WebSocket error:', err);
        console.log('Falling back to demo mode with simulated data...');
        connectWithSimulator();
      });

      // Set a timeout for WebSocket connection
      const wsTimeout = setTimeout(() => {
        console.log('WebSocket connection timeout, falling back to demo mode...');
        connectWithSimulator();
      }, 5000);

      try {
        await wsServiceRef.current.connect();
        clearTimeout(wsTimeout);
        setConnectionStatus('connected');
        console.log('Successfully connected to real-time data stream');
      } catch (wsError) {
        clearTimeout(wsTimeout);
        console.error('WebSocket connection failed:', wsError);
        connectWithSimulator();
      }

    } catch (err) {
      console.error('Connection failed completely:', err);
      connectWithSimulator();
    }
  }, [settings.symbol, settings.depth, settings.showPressureZones, processOrderbookUpdate, calculateStats, connectWithSimulator]);

  const disconnect = useCallback(() => {
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
      wsServiceRef.current = null;
    }

    if (simulatorRef.current) {
      simulatorRef.current.stop();
      simulatorRef.current = null;
    }

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    setConnectionStatus('disconnected');
    setError(null);
  }, []);

  // Handle symbol changes
  useEffect(() => {
    if (isConnected) {
      if (wsServiceRef.current) {
        wsServiceRef.current.setSymbol(settings.symbol);
        // Clear existing data and reconnect
        setData(null);
        connect();
      } else if (simulatorRef.current) {
        simulatorRef.current.setSymbol(settings.symbol);
        // Reconnect with new symbol
        connectWithSimulator();
      }
    }
  }, [settings.symbol, isConnected, connect, connectWithSimulator]);

  // Handle pressure zone setting changes
  useEffect(() => {
    if (data && settings.showPressureZones) {
      const zones = processorRef.current.analyzePressureZones(data);
      setPressureZones(zones);
    } else {
      setPressureZones([]);
    }
  }, [data, settings.showPressureZones]);

  // Cleanup on unmount
  useEffect(() => {
    return disconnect;
  }, [disconnect]);

  // Data throttling based on update interval
  useEffect(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }

    if (isConnected && settings.updateInterval > 100) {
      updateIntervalRef.current = setInterval(() => {
        // This could be used for additional processing or UI updates
        // For now, we'll use it to ensure periodic stats updates
        if (data) {
          setStats(calculateStats(data, settings.symbol));
        }
      }, settings.updateInterval);
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [settings.updateInterval, isConnected, data, calculateStats, settings.symbol]);

  return {
    data,
    pressureZones,
    connectionStatus,
    isConnected,
    error,
    connect,
    disconnect,
    stats
  };
};
