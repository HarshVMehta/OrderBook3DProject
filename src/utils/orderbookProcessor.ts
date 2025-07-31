import { 
  OrderbookSnapshot, 
  OrderbookUpdate, 
  ProcessedOrderbookData, 
  OrderbookEntry, 
  ChartPoint,
  PressureZone,
  MeshData 
} from '@/types/orderbook';

export class OrderbookDataProcessor {
  private historicalData: Map<number, ProcessedOrderbookData> = new Map();
  private maxHistorySize: number = 100;

  // Helper function to safely parse and validate numbers
  private safeParseFloat(value: string | number): number {
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  }

  public processSnapshot(snapshot: OrderbookSnapshot): ProcessedOrderbookData {
    // Filter and validate bid data
    const bids = snapshot.bids
      .map(level => ({
        price: this.safeParseFloat(level.price),
        quantity: this.safeParseFloat(level.quantity),
        timestamp: snapshot.timestamp
      }))
      .filter(entry => entry.price > 0 && entry.quantity > 0);

    // Filter and validate ask data
    const asks = snapshot.asks
      .map(level => ({
        price: this.safeParseFloat(level.price),
        quantity: this.safeParseFloat(level.quantity),
        timestamp: snapshot.timestamp
      }))
      .filter(entry => entry.price > 0 && entry.quantity > 0);

    const allQuantities = [...bids, ...asks].map(entry => entry.quantity).filter(q => isFinite(q) && q > 0);
    const maxQuantity = allQuantities.length > 0 ? Math.max(...allQuantities) : 1;
    
    const allPrices = [...bids, ...asks].map(entry => entry.price).filter(p => isFinite(p) && p > 0);
    const priceRange = {
      min: allPrices.length > 0 ? Math.min(...allPrices) : 0,
      max: allPrices.length > 0 ? Math.max(...allPrices) : 1
    };

    const processed: ProcessedOrderbookData = {
      bids,
      asks,
      maxQuantity,
      priceRange
    };

    // Store in history
    this.addToHistory(snapshot.timestamp, processed);

    return processed;
  }

  public processUpdate(update: OrderbookUpdate, currentData: ProcessedOrderbookData): ProcessedOrderbookData {
    // Clone current data
    const updatedBids = [...currentData.bids];
    const updatedAsks = [...currentData.asks];

    // Process bid updates
    update.bids.forEach(level => {
      const price = this.safeParseFloat(level.price);
      const quantity = this.safeParseFloat(level.quantity);
      
      // Skip invalid entries
      if (price <= 0 || quantity < 0) {
        return;
      }
      
      const existingIndex = updatedBids.findIndex(bid => bid.price === price);
      
      if (quantity === 0) {
        // Remove the level
        if (existingIndex !== -1) {
          updatedBids.splice(existingIndex, 1);
        }
      } else {
        // Update or add the level
        const newEntry: OrderbookEntry = {
          price,
          quantity,
          timestamp: update.eventTime
        };
        
        if (existingIndex !== -1) {
          updatedBids[existingIndex] = newEntry;
        } else {
          updatedBids.push(newEntry);
          updatedBids.sort((a, b) => b.price - a.price); // Sort bids descending
        }
      }
    });

    // Process ask updates
    update.asks.forEach(level => {
      const price = this.safeParseFloat(level.price);
      const quantity = this.safeParseFloat(level.quantity);
      
      // Skip invalid entries
      if (price <= 0 || quantity < 0) {
        return;
      }
      
      const existingIndex = updatedAsks.findIndex(ask => ask.price === price);
      
      if (quantity === 0) {
        // Remove the level
        if (existingIndex !== -1) {
          updatedAsks.splice(existingIndex, 1);
        }
      } else {
        // Update or add the level
        const newEntry: OrderbookEntry = {
          price,
          quantity,
          timestamp: update.eventTime
        };
        
        if (existingIndex !== -1) {
          updatedAsks[existingIndex] = newEntry;
        } else {
          updatedAsks.push(newEntry);
          updatedAsks.sort((a, b) => a.price - b.price); // Sort asks ascending
        }
      }
    });

    const allQuantities = [...updatedBids, ...updatedAsks].map(entry => entry.quantity).filter(q => isFinite(q) && q > 0);
    const maxQuantity = allQuantities.length > 0 ? Math.max(...allQuantities) : 1;
    
    const allPrices = [...updatedBids, ...updatedAsks].map(entry => entry.price).filter(p => isFinite(p) && p > 0);
    const priceRange = {
      min: allPrices.length > 0 ? Math.min(...allPrices) : 0,
      max: allPrices.length > 0 ? Math.max(...allPrices) : 1
    };

    const processed: ProcessedOrderbookData = {
      bids: updatedBids,
      asks: updatedAsks,
      maxQuantity,
      priceRange
    };

    // Store in history
    this.addToHistory(update.eventTime, processed);

    return processed;
  }

  public generateChartPoints(data: ProcessedOrderbookData, timeSlice: number = 50): ChartPoint[] {
    const points: ChartPoint[] = [];
    const currentTime = Date.now();

    // Generate points for bids
    data.bids.slice(0, timeSlice).forEach((bid, index) => {
      points.push({
        x: bid.price,
        y: bid.quantity,
        z: currentTime - (index * 100), // Simulate time depth
        type: 'bid',
        intensity: bid.quantity / data.maxQuantity
      });
    });

    // Generate points for asks
    data.asks.slice(0, timeSlice).forEach((ask, index) => {
      points.push({
        x: ask.price,
        y: ask.quantity,
        z: currentTime - (index * 100), // Simulate time depth
        type: 'ask',
        intensity: ask.quantity / data.maxQuantity
      });
    });

    return points;
  }

  public generateMeshData(points: ChartPoint[]): { bids: MeshData; asks: MeshData } {
    const bidPoints = points.filter(p => p.type === 'bid');
    const askPoints = points.filter(p => p.type === 'ask');

    return {
      bids: this.createMeshData(bidPoints, [0.2, 0.8, 0.2]), // Green for bids
      asks: this.createMeshData(askPoints, [0.8, 0.2, 0.2])  // Red for asks
    };
  }

  private createMeshData(points: ChartPoint[], baseColor: [number, number, number]): MeshData {
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    points.forEach((point, index) => {
      // Create a simple box for each data point
      const height = point.y * 0.1; // Scale quantity for visual appeal
      const width = 0.5;
      const depth = 0.5;

      // Box vertices (8 vertices per box)
      const vertices = [
        // Bottom face
        point.x - width/2, 0, point.z - depth/2,
        point.x + width/2, 0, point.z - depth/2,
        point.x + width/2, 0, point.z + depth/2,
        point.x - width/2, 0, point.z + depth/2,
        // Top face
        point.x - width/2, height, point.z - depth/2,
        point.x + width/2, height, point.z - depth/2,
        point.x + width/2, height, point.z + depth/2,
        point.x - width/2, height, point.z + depth/2,
      ];

      vertices.forEach(v => positions.push(v));

      // Color based on intensity
      const intensity = point.intensity;
      const color = [
        baseColor[0] * intensity,
        baseColor[1] * intensity,
        baseColor[2] * intensity
      ];

      // Add color for each vertex (8 vertices)
      for (let i = 0; i < 8; i++) {
        colors.push(...color);
      }

      // Box face indices
      const baseIndex = index * 8;
      const boxIndices = [
        // Bottom face
        baseIndex, baseIndex + 1, baseIndex + 2,
        baseIndex, baseIndex + 2, baseIndex + 3,
        // Top face
        baseIndex + 4, baseIndex + 6, baseIndex + 5,
        baseIndex + 4, baseIndex + 7, baseIndex + 6,
        // Side faces
        baseIndex, baseIndex + 4, baseIndex + 1,
        baseIndex + 1, baseIndex + 4, baseIndex + 5,
        baseIndex + 1, baseIndex + 5, baseIndex + 2,
        baseIndex + 2, baseIndex + 5, baseIndex + 6,
        baseIndex + 2, baseIndex + 6, baseIndex + 3,
        baseIndex + 3, baseIndex + 6, baseIndex + 7,
        baseIndex + 3, baseIndex + 7, baseIndex + 0,
        baseIndex + 0, baseIndex + 7, baseIndex + 4,
      ];

      indices.push(...boxIndices);
    });

    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      indices: new Uint16Array(indices),
      count: indices.length
    };
  }

  public analyzePressureZones(data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];

    // Analyze bid pressure (support levels)
    const bidClusters = this.findClusters(data.bids);
    bidClusters.forEach((cluster, index) => {
      zones.push({
        id: `support_${cluster.price}_${Date.now()}_${index}`,
        type: 'support',
        pressureType: 'support',
        price: cluster.price,
        centerPrice: cluster.price,
        minPrice: cluster.price - (cluster.price * 0.001), // 0.1% range
        maxPrice: cluster.price + (cluster.price * 0.001),
        strength: cluster.strength,
        intensity: Math.min(cluster.strength, 1),
        volume: cluster.volume,
        totalVolume: cluster.volume,
        averageQuantity: cluster.volume / cluster.orderCount,
        orderCount: cluster.orderCount,
        side: 'bid',
        timestamp: Date.now(),
        isActive: true
      });
    });

    // Analyze ask pressure (resistance levels)
    const askClusters = this.findClusters(data.asks);
    askClusters.forEach((cluster, index) => {
      zones.push({
        id: `resistance_${cluster.price}_${Date.now()}_${index}`,
        type: 'resistance',
        pressureType: 'resistance',
        price: cluster.price,
        centerPrice: cluster.price,
        minPrice: cluster.price - (cluster.price * 0.001), // 0.1% range
        maxPrice: cluster.price + (cluster.price * 0.001),
        strength: cluster.strength,
        intensity: Math.min(cluster.strength, 1),
        volume: cluster.volume,
        totalVolume: cluster.volume,
        averageQuantity: cluster.volume / cluster.orderCount,
        orderCount: cluster.orderCount,
        side: 'ask',
        timestamp: Date.now(),
        isActive: true
      });
    });

    // Add volume spike detection
    const volumeSpikes = this.detectVolumeSpikes(data);
    zones.push(...volumeSpikes);

    return zones.sort((a, b) => b.strength - a.strength);
  }

  private detectVolumeSpikes(data: ProcessedOrderbookData): PressureZone[] {
    const spikes: PressureZone[] = [];
    const allOrders = [...data.bids, ...data.asks];
    
    // Calculate average volume
    const totalVolume = allOrders.reduce((sum, order) => sum + order.quantity, 0);
    const averageVolume = totalVolume / allOrders.length;
    const spikeThreshold = averageVolume * 2.5; // 2.5x average is considered a spike

    // Check bids for spikes
    data.bids.forEach((bid, index) => {
      if (bid.quantity > spikeThreshold) {
        spikes.push({
          id: `spike_bid_${bid.price}_${Date.now()}_${index}`,
          type: 'support',
          pressureType: 'accumulation',
          price: bid.price,
          centerPrice: bid.price,
          minPrice: bid.price - (bid.price * 0.0005),
          maxPrice: bid.price + (bid.price * 0.0005),
          strength: Math.min(bid.quantity / spikeThreshold, 1),
          intensity: Math.min(bid.quantity / (spikeThreshold * 2), 1),
          volume: bid.quantity,
          totalVolume: bid.quantity,
          averageQuantity: bid.quantity,
          orderCount: 1,
          side: 'bid',
          timestamp: bid.timestamp,
          isActive: true
        });
      }
    });

    // Check asks for spikes
    data.asks.forEach((ask, index) => {
      if (ask.quantity > spikeThreshold) {
        spikes.push({
          id: `spike_ask_${ask.price}_${Date.now()}_${index}`,
          type: 'resistance',
          pressureType: 'distribution',
          price: ask.price,
          centerPrice: ask.price,
          minPrice: ask.price - (ask.price * 0.0005),
          maxPrice: ask.price + (ask.price * 0.0005),
          strength: Math.min(ask.quantity / spikeThreshold, 1),
          intensity: Math.min(ask.quantity / (spikeThreshold * 2), 1),
          volume: ask.quantity,
          totalVolume: ask.quantity,
          averageQuantity: ask.quantity,
          orderCount: 1,
          side: 'ask',
          timestamp: ask.timestamp,
          isActive: true
        });
      }
    });

    return spikes;
  }

  private findClusters(orders: OrderbookEntry[]): Array<{price: number, strength: number, volume: number, orderCount: number}> {
    const clusters: Array<{price: number, strength: number, volume: number, orderCount: number}> = [];
    const priceRange = 0.01; // 1% price clustering

    orders.forEach(order => {
      const existingCluster = clusters.find(cluster => 
        Math.abs(cluster.price - order.price) / order.price < priceRange
      );

      if (existingCluster) {
        existingCluster.volume += order.quantity;
        existingCluster.orderCount += 1;
        existingCluster.strength = existingCluster.volume / orders.length;
        // Update price to weighted average
        existingCluster.price = (existingCluster.price + order.price) / 2;
      } else {
        clusters.push({
          price: order.price,
          strength: order.quantity / orders.length,
          volume: order.quantity,
          orderCount: 1
        });
      }
    });

    return clusters.filter(cluster => cluster.strength > 0.1); // Only significant clusters
  }

  private addToHistory(timestamp: number, data: ProcessedOrderbookData): void {
    this.historicalData.set(timestamp, data);

    // Limit history size
    if (this.historicalData.size > this.maxHistorySize) {
      const oldestKey = Math.min(...this.historicalData.keys());
      this.historicalData.delete(oldestKey);
    }
  }

  public getHistoricalData(): Map<number, ProcessedOrderbookData> {
    return this.historicalData;
  }

  public clearHistory(): void {
    this.historicalData.clear();
  }
}
