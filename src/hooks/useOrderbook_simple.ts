'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ProcessedOrderbookData, ConnectionState, OrderbookUpdate, PressureZone } from '@/types/orderbook';
import { BinanceWebSocketService } from '@/services/binanceWebSocket';
import { OrderbookSimulator } from '@/services/orderbookSimulator';
import { PressureZoneAnalyzer, PressureZoneAnalysis } from '@/services/pressureZoneAnalyzer';

// Enhanced orderbook hook with real-time data integration
export const useOrderbook = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [data, setData] = useState<ProcessedOrderbookData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRealTime, setIsRealTime] = useState<boolean>(false);
  const [pressureZones, setPressureZones] = useState<PressureZone[]>([]);
  const [pressureAnalysis, setPressureAnalysis] = useState<PressureZoneAnalysis | null>(null);
  
  const wsServiceRef = useRef<BinanceWebSocketService | null>(null);
  const simulatorRef = useRef<OrderbookSimulator | null>(null);
  const pressureAnalyzerRef = useRef<PressureZoneAnalyzer>(new PressureZoneAnalyzer());
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store previous data for smooth transitions
  const previousDataRef = useRef<ProcessedOrderbookData | null>(null);
  
  // Real-time data processing with smooth transitions
  const processOrderbookUpdate = useCallback((update: OrderbookUpdate) => {
    if (!data) return;
    
    // Store previous data for transition
    previousDataRef.current = data;
    
    // Create updated orderbook by applying the changes
    const newBids = [...data.bids];
    const newAsks = [...data.asks];
    
    // Apply bid updates
    update.bids.forEach((level) => {
      const priceNum = parseFloat(level.price);
      const quantityNum = parseFloat(level.quantity);
      const bidIndex = newBids.findIndex(bid => bid.price === priceNum);
      
      if (quantityNum === 0) {
        // Remove the bid if quantity is 0
        if (bidIndex !== -1) {
          newBids.splice(bidIndex, 1);
        }
      } else {
        // Update or add the bid
        if (bidIndex !== -1) {
          newBids[bidIndex].quantity = quantityNum;
        } else {
          newBids.push({ price: priceNum, quantity: quantityNum, timestamp: Date.now() });
        }
      }
    });
    
    // Apply ask updates
    update.asks.forEach((level) => {
      const priceNum = parseFloat(level.price);
      const quantityNum = parseFloat(level.quantity);
      const askIndex = newAsks.findIndex(ask => ask.price === priceNum);
      
      if (quantityNum === 0) {
        // Remove the ask if quantity is 0
        if (askIndex !== -1) {
          newAsks.splice(askIndex, 1);
        }
      } else {
        // Update or add the ask
        if (askIndex !== -1) {
          newAsks[askIndex].quantity = quantityNum;
        } else {
          newAsks.push({ price: priceNum, quantity: quantityNum, timestamp: Date.now() });
        }
      }
    });
    
    // Sort and limit the orderbook levels
    newBids.sort((a, b) => b.price - a.price); // Descending for bids
    newAsks.sort((a, b) => a.price - b.price); // Ascending for asks
    
    const maxQty = Math.max(
      Math.max(...newBids.map(b => b.quantity)),
      Math.max(...newAsks.map(a => a.quantity))
    );
    
    const minPrice = Math.min(...newBids.map(b => b.price), ...newAsks.map(a => a.price));
    const maxPrice = Math.max(...newBids.map(b => b.price), ...newAsks.map(a => a.price));
    
    const updatedData: ProcessedOrderbookData = {
      bids: newBids.slice(0, 20), // Keep top 20 levels
      asks: newAsks.slice(0, 20),
      maxQuantity: maxQty,
      priceRange: {
        min: minPrice,
        max: maxPrice
      }
    };
    
    setData(updatedData);
    
    // Analyze pressure zones
    const analysis = pressureAnalyzerRef.current.analyzePressureZones(updatedData);
    setPressureZones(analysis.zones);
    setPressureAnalysis(analysis);
  }, [data]);

  // Initialize real-time connection
  const connectRealTime = useCallback(async (symbol: string = 'BTCUSDT') => {
    try {
      setConnectionState('connecting');
      setError(null);
      setIsRealTime(true);
      
      // Initialize WebSocket service
      wsServiceRef.current = new BinanceWebSocketService(symbol);
      
      // Set up data callback
      wsServiceRef.current.onData(processOrderbookUpdate);
      
      // Set up error callback
      wsServiceRef.current.onError((error) => {
        console.error('WebSocket error:', error);
        setError(error.message);
        // Fall back to demo mode on error
        connectDemo();
      });
      
      // Get initial snapshot
      const snapshot = await BinanceWebSocketService.getOrderbookSnapshot(symbol, 20);
      
      const initialData: ProcessedOrderbookData = {
        bids: snapshot.bids.map(bid => ({
          price: parseFloat(bid.price),
          quantity: parseFloat(bid.quantity),
          timestamp: Date.now()
        })),
        asks: snapshot.asks.map(ask => ({
          price: parseFloat(ask.price),
          quantity: parseFloat(ask.quantity),
          timestamp: Date.now()
        })),
        maxQuantity: 0,
        priceRange: { min: 0, max: 0 }
      };
      
      // Calculate maxQuantity and priceRange
      const allQuantities = [...initialData.bids, ...initialData.asks].map(entry => entry.quantity);
      const allPrices = [...initialData.bids, ...initialData.asks].map(entry => entry.price);
      
      initialData.maxQuantity = Math.max(...allQuantities);
      initialData.priceRange = {
        min: Math.min(...allPrices),
        max: Math.max(...allPrices)
      };
      
      setData(initialData);
      
      // Analyze initial pressure zones
      const analysis = pressureAnalyzerRef.current.analyzePressureZones(initialData);
      setPressureZones(analysis.zones);
      setPressureAnalysis(analysis);
      
      // Connect to real-time stream
      await wsServiceRef.current.connect();
      setConnectionState('connected');
      
    } catch (error) {
      console.error('Real-time connection failed:', error);
      setError('Real-time connection failed. Switching to demo mode.');
      connectDemo();
    }
  }, [processOrderbookUpdate]);

  // Demo mode with simulated real-time updates
  const connectDemo = useCallback(() => {
    console.log('Starting demo mode with simulated updates...');
    setConnectionState('connecting');
    setError(null);
    setIsRealTime(false);

    // Clear any existing timeouts
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
    }
    if (dataUpdateTimeoutRef.current) {
      clearTimeout(dataUpdateTimeoutRef.current);
    }

    // Initialize simulator
    simulatorRef.current = new OrderbookSimulator('BTCUSDT');

    connectTimeoutRef.current = setTimeout(() => {
      setConnectionState('connected');
      
      // Start simulated real-time updates
      const updateData = () => {
        if (simulatorRef.current) {
          const snapshot = simulatorRef.current.generateSnapshot(20);
          
          // Convert snapshot to ProcessedOrderbookData
          const simulatedData: ProcessedOrderbookData = {
            bids: snapshot.bids.map(bid => ({
              price: parseFloat(bid.price),
              quantity: parseFloat(bid.quantity),
              timestamp: Date.now()
            })),
            asks: snapshot.asks.map(ask => ({
              price: parseFloat(ask.price),
              quantity: parseFloat(ask.quantity),
              timestamp: Date.now()
            })),
            maxQuantity: 0,
            priceRange: { min: 0, max: 0 }
          };
          
          // Calculate maxQuantity and priceRange
          const allQuantities = [...simulatedData.bids, ...simulatedData.asks].map(entry => entry.quantity);
          const allPrices = [...simulatedData.bids, ...simulatedData.asks].map(entry => entry.price);
          
          simulatedData.maxQuantity = Math.max(...allQuantities);
          simulatedData.priceRange = {
            min: Math.min(...allPrices),
            max: Math.max(...allPrices)
          };
          
          setData(simulatedData);
          
          // Analyze pressure zones for simulated data
          const analysis = pressureAnalyzerRef.current.analyzePressureZones(simulatedData);
          setPressureZones(analysis.zones);
          setPressureAnalysis(analysis);
          
          // Schedule next update with some variance (500-2000ms)
          const nextUpdate = 500 + Math.random() * 1500;
          dataUpdateTimeoutRef.current = setTimeout(updateData, nextUpdate);
        }
      };
      
      updateData();
    }, 1500);
  }, []);

  // Main connect function - tries real-time first, falls back to demo
  const connect = useCallback((tryRealTime: boolean = true) => {
    if (tryRealTime) {
      connectRealTime();
    } else {
      connectDemo();
    }
  }, [connectRealTime, connectDemo]);

  const disconnect = useCallback(() => {
    console.log('Disconnecting...');
    
    // Clear timeouts
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    if (dataUpdateTimeoutRef.current) {
      clearTimeout(dataUpdateTimeoutRef.current);
      dataUpdateTimeoutRef.current = null;
    }
    
    // Disconnect WebSocket
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
      wsServiceRef.current = null;
    }
    
    // Clear simulator
    simulatorRef.current = null;
    
    setConnectionState('disconnected');
    setData(null);
    setError(null);
    setIsRealTime(false);
    previousDataRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    data,
    error,
    isRealTime,
    pressureZones,
    pressureAnalysis,
    connect,
    disconnect,
    connectRealTime,
    connectDemo
  };
};
