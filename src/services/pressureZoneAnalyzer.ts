import { PressureZone, ProcessedOrderbookData, OrderbookEntry } from '@/types/orderbook';

export interface PressureZoneAnalysis {
  zones: PressureZone[];
  statistics: {
    totalZones: number;
    supportZones: number;
    resistanceZones: number;
    averageIntensity: number;
    strongestZone: PressureZone | null;
    criticalLevels: number[];
    volumeDistribution: {
      totalVolume: number;
      averageVolume: number;
      volumeSpikes: number;
      volumeConcentration: number; // Percentage of volume in top zones
    };
    priceClusters: {
      totalClusters: number;
      averageClusterSize: number;
      largestCluster: number;
      clusterDensity: number;
    };
    temporalAnalysis: {
      formingZones: number;
      strengtheningZones: number;
      weakeningZones: number;
      averageZoneAge: number;
    };
    riskMetrics: {
      marketFragmentation: number; // How scattered the liquidity is
      concentrationRisk: number; // Risk of large zones failing
      volatilityIndicator: number; // Based on zone movement
    };
  };
  alerts: PressureZoneAlert[];
  heatmapData: Array<{ 
    price: number; 
    intensity: number; 
    volume: number; 
    density: number;
    gradient: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  gradientOverlay: Array<{
    startPrice: number;
    endPrice: number;
    intensity: number;
    color: string;
    opacity: number;
    type: 'support' | 'resistance' | 'accumulation' | 'distribution';
  }>;
}

export interface PressureZoneAlert {
  id: string;
  type: 'breach' | 'formation' | 'strengthening' | 'weakening' | 'volume_spike' | 'cluster_formation' | 'liquidity_gap' | 'concentration_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  zone: PressureZone;
  timestamp: number;
  confidence: number; // 0-1 confidence in the alert
  metadata?: {
    volumeChange?: number;
    priceChange?: number;
    clusterSize?: number;
    riskLevel?: number;
    timeToBreakout?: number;
  };
}

export class PressureZoneAnalyzer {
  private previousZones: PressureZone[] = [];
  private priceHistory: Array<{ price: number; timestamp: number; volume: number }> = [];
  private volumeHistory: Array<{ timestamp: number; totalVolume: number }> = [];
  
  // Enhanced thresholds and parameters
  private readonly VOLUME_THRESHOLD = 100;
  private readonly CLUSTERING_DISTANCE = 0.001; // 0.1% price distance
  private readonly MIN_ORDERS_FOR_ZONE = 5;
  private readonly VOLUME_SPIKE_MULTIPLIER = 3; // 3x average volume
  private readonly CLUSTER_MIN_SIZE = 3;
  private readonly MAX_HISTORY_LENGTH = 1000;
  private readonly ALERT_COOLDOWN = 5000; // 5 seconds between similar alerts

  public analyzePressureZones(data: ProcessedOrderbookData): PressureZoneAnalysis {
    // Validate input data
    if (!data || !data.bids || !data.asks || !data.priceRange) {
      return this.getEmptyAnalysis();
    }

    // Validate price range
    if (typeof data.priceRange.min !== 'number' || typeof data.priceRange.max !== 'number' ||
        !isFinite(data.priceRange.min) || !isFinite(data.priceRange.max) ||
        data.priceRange.min >= data.priceRange.max) {
      return this.getEmptyAnalysis();
    }

    // Validate that we have some orders
    if (data.bids.length === 0 && data.asks.length === 0) {
      return this.getEmptyAnalysis();
    }

    const zones = this.detectPressureZones(data);
    const statistics = this.calculateEnhancedStatistics(zones, data);
    const alerts = this.generateEnhancedAlerts(zones, data);
    const heatmapData = this.generateHeatmapData(zones, data);
    const gradientOverlay = this.generateGradientOverlay(zones, data);

    this.previousZones = zones;
    this.updateHistory(data);
    
    return {
      zones,
      statistics,
      alerts,
      heatmapData,
      gradientOverlay
    };
  }

  private getEmptyAnalysis(): PressureZoneAnalysis {
    return {
      zones: [],
      statistics: {
        totalZones: 0,
        supportZones: 0,
        resistanceZones: 0,
        averageIntensity: 0,
        strongestZone: null,
        criticalLevels: [],
        volumeDistribution: {
          totalVolume: 0,
          averageVolume: 0,
          volumeSpikes: 0,
          volumeConcentration: 0
        },
        priceClusters: {
          totalClusters: 0,
          averageClusterSize: 0,
          largestCluster: 0,
          clusterDensity: 0
        },
        temporalAnalysis: {
          formingZones: 0,
          strengtheningZones: 0,
          weakeningZones: 0,
          averageZoneAge: 0
        },
        riskMetrics: {
          marketFragmentation: 0,
          concentrationRisk: 0,
          volatilityIndicator: 0
        }
      },
      alerts: [],
      heatmapData: [],
      gradientOverlay: []
    };
  }

  private detectPressureZones(data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];
    
    // 1. Volume-Weighted Clustering Algorithm
    const volumeBasedZones = this.detectVolumeWeightedClusters(data);
    zones.push(...volumeBasedZones);

    // 2. Price Action Support/Resistance Detection
    const supportResistanceZones = this.detectSupportResistanceZones(data);
    zones.push(...supportResistanceZones);

    // 3. Order Flow Imbalance Analysis
    const imbalanceZones = this.detectOrderFlowImbalance(data);
    zones.push(...imbalanceZones);

    // 4. Liquidity Density Mapping
    const liquidityZones = this.detectLiquidityDensityZones(data);
    zones.push(...liquidityZones);

    // 5. Market Microstructure Analysis
    const microstructureZones = this.detectMicrostructureZones(data);
    zones.push(...microstructureZones);

    // 6. Time-Weighted Volume Profile
    const timeVolumeZones = this.detectTimeWeightedVolumeZones(data);
    zones.push(...timeVolumeZones);

    // Merge and optimize zones using advanced algorithms
    return this.mergeAndOptimizeZones(zones, data);
  }

  /**
   * Merge overlapping zones and optimize the final result
   */
  private mergeAndOptimizeZones(zones: PressureZone[], data: ProcessedOrderbookData): PressureZone[] {
    if (zones.length === 0) return zones;
    
    // Sort zones by center price
    const sortedZones = [...zones].sort((a, b) => a.centerPrice - b.centerPrice);
    const mergedZones: PressureZone[] = [];
    
    for (const zone of sortedZones) {
      let merged = false;
      
      // Try to merge with existing zones
      for (let i = 0; i < mergedZones.length; i++) {
        const existingZone = mergedZones[i];
        
        // Check if zones overlap and are of the same type
        if (zone.type === existingZone.type && this.zonesOverlap(zone, existingZone)) {
          // Merge zones
          mergedZones[i] = this.mergeZones(existingZone, zone);
          merged = true;
          break;
        }
      }
      
      if (!merged) {
        mergedZones.push(zone);
      }
    }
    
    // Sort by strength and return top zones
    return mergedZones
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 20); // Limit to top 20 zones
  }

  /**
   * Check if two zones overlap
   */
  private zonesOverlap(zone1: PressureZone, zone2: PressureZone): boolean {
    return !(zone1.maxPrice < zone2.minPrice || zone2.maxPrice < zone1.minPrice);
  }

  /**
   * Merge two overlapping zones
   */
  private mergeZones(zone1: PressureZone, zone2: PressureZone): PressureZone {
    const totalVolume = zone1.totalVolume + zone2.totalVolume;
    const totalOrderCount = zone1.orderCount + zone2.orderCount;
    
    // Volume-weighted center price
    const centerPrice = (zone1.centerPrice * zone1.totalVolume + zone2.centerPrice * zone2.totalVolume) / totalVolume;
    
    return {
      id: this.generateZoneId(),
      centerPrice,
      minPrice: Math.min(zone1.minPrice, zone2.minPrice),
      maxPrice: Math.max(zone1.maxPrice, zone2.maxPrice),
      intensity: Math.max(zone1.intensity, zone2.intensity),
      strength: (zone1.strength + zone2.strength) / 2,
      totalVolume,
      orderCount: totalOrderCount,
      pressureType: zone1.pressureType,
      type: zone1.type,
      timestamp: Math.max(zone1.timestamp, zone2.timestamp),
      isActive: zone1.isActive && zone2.isActive,
      price: centerPrice,
      volume: totalVolume,
      averageQuantity: totalVolume / totalOrderCount,
      side: zone1.side
    };
  }

  /**
   * Advanced Volume-Weighted Clustering Algorithm
   * Uses DBSCAN-inspired clustering with volume weighting
   */
  private detectVolumeWeightedClusters(data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];
    const allOrders = [...data.bids, ...data.asks];
    
    if (allOrders.length === 0) return zones;

    // Calculate dynamic clustering parameters
    const priceRange = data.priceRange.max - data.priceRange.min;
    const dynamicEpsilon = priceRange * 0.002; // 0.2% of price range
    const minVolumeThreshold = this.calculateDynamicVolumeThreshold(allOrders);

    // Enhanced clustering with volume weighting
    const clusters = this.performVolumeWeightedClustering(allOrders, dynamicEpsilon, minVolumeThreshold);

    for (const cluster of clusters) {
      if (cluster.orders.length >= this.MIN_ORDERS_FOR_ZONE) {
        const zone = this.createPressureZoneFromCluster(cluster, data);
        if (zone) zones.push(zone);
      }
    }

    return zones;
  }

  // ===================== ALGORITHM IMPLEMENTATIONS =====================

  /**
   * Calculate dynamic volume threshold based on order distribution
   */
  private calculateDynamicVolumeThreshold(orders: OrderbookEntry[]): number {
    if (orders.length === 0) return this.VOLUME_THRESHOLD;

    const volumes = orders.map(order => order.quantity).filter(v => v > 0);
    if (volumes.length === 0) return this.VOLUME_THRESHOLD;

    // Calculate percentile-based threshold
    volumes.sort((a, b) => a - b);
    const percentile75 = volumes[Math.floor(volumes.length * 0.75)];
    const median = volumes[Math.floor(volumes.length * 0.5)];
    
    return Math.max(median * 1.5, percentile75 * 0.8, this.VOLUME_THRESHOLD);
  }

  /**
   * Perform volume-weighted clustering using enhanced DBSCAN
   */
  private performVolumeWeightedClustering(
    orders: OrderbookEntry[], 
    epsilon: number, 
    minVolumeThreshold: number
  ): Array<{ orders: OrderbookEntry[], totalVolume: number, centerPrice: number, volumeWeight: number }> {
    const clusters: Array<{ orders: OrderbookEntry[], totalVolume: number, centerPrice: number, volumeWeight: number }> = [];
    const visited = new Set<number>();
    
    for (let i = 0; i < orders.length; i++) {
      if (visited.has(i)) continue;
      
      const cluster = { orders: [] as OrderbookEntry[], totalVolume: 0, centerPrice: 0, volumeWeight: 0 };
      const queue = [i];
      
      while (queue.length > 0) {
        const currentIdx = queue.shift()!;
        if (visited.has(currentIdx)) continue;
        
        visited.add(currentIdx);
        const currentOrder = orders[currentIdx];
        cluster.orders.push(currentOrder);
        cluster.totalVolume += currentOrder.quantity;
        
        // Find neighbors within epsilon distance
        for (let j = 0; j < orders.length; j++) {
          if (!visited.has(j)) {
            const neighbor = orders[j];
            const priceDistance = Math.abs(currentOrder.price - neighbor.price) / currentOrder.price;
            
            if (priceDistance <= epsilon) {
              queue.push(j);
            }
          }
        }
      }
      
      if (cluster.totalVolume >= minVolumeThreshold) {
        // Calculate volume-weighted center price
        let weightedPriceSum = 0;
        let totalWeight = 0;
        
        cluster.orders.forEach(order => {
          const weight = order.quantity;
          weightedPriceSum += order.price * weight;
          totalWeight += weight;
        });
        
        cluster.centerPrice = weightedPriceSum / totalWeight;
        cluster.volumeWeight = totalWeight;
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }

  /**
   * Create pressure zone from cluster analysis
   */
  private createPressureZoneFromCluster(
    cluster: { orders: OrderbookEntry[], totalVolume: number, centerPrice: number, volumeWeight: number },
    data: ProcessedOrderbookData
  ): PressureZone | null {
    if (cluster.orders.length === 0) return null;

    const prices = cluster.orders.map(o => o.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const currentPrice = this.estimateCurrentPrice(data);
    
    // Determine zone type based on position relative to current price
    const pressureType = cluster.centerPrice < currentPrice ? 'support' : 'resistance';
    const zoneType = this.determineZoneType(cluster, currentPrice);
    
    // Calculate advanced metrics
    const intensity = this.calculateZoneIntensity(cluster, data);
    const strength = this.calculateZoneStrength(cluster, data);
    const confidence = this.calculateZoneConfidence(cluster, data);
    
    return {
      id: this.generateZoneId(),
      centerPrice: cluster.centerPrice,
      minPrice,
      maxPrice,
      intensity,
      strength,
      totalVolume: cluster.totalVolume,
      orderCount: cluster.orders.length,
      pressureType,
      type: zoneType,
      timestamp: Date.now(),
      isActive: true,
      price: cluster.centerPrice,
      volume: cluster.totalVolume,
      averageQuantity: cluster.totalVolume / cluster.orders.length,
      side: cluster.centerPrice < currentPrice ? 'bid' : 'ask'
    };
  }

  /**
   * Estimate current market price from orderbook
   */
  private estimateCurrentPrice(data: ProcessedOrderbookData): number {
    const bestBid = data.bids.length > 0 ? Math.max(...data.bids.map(b => b.price)) : 0;
    const bestAsk = data.asks.length > 0 ? Math.min(...data.asks.map(a => a.price)) : 0;
    
    if (bestBid > 0 && bestAsk > 0) {
      return (bestBid + bestAsk) / 2;
    } else if (bestBid > 0) {
      return bestBid;
    } else if (bestAsk > 0) {
      return bestAsk;
    } else {
      return (data.priceRange.min + data.priceRange.max) / 2;
    }
  }

  /**
   * Analyze support levels from bid orders
   */
  private analyzeSupportLevels(bids: OrderbookEntry[], data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];
    const currentPrice = this.estimateCurrentPrice(data);
    
    // Group bids by price proximity
    const priceGroups = this.groupOrdersByPrice(bids, 0.001); // 0.1% grouping
    
    for (const group of priceGroups) {
      if (group.totalVolume > this.VOLUME_THRESHOLD && group.orders.length >= this.MIN_ORDERS_FOR_ZONE) {
        const zone = this.createSupportZone(group, currentPrice);
        if (zone) zones.push(zone);
      }
    }
    
    return zones;
  }

  /**
   * Analyze resistance levels from ask orders
   */
  private analyzeResistanceLevels(asks: OrderbookEntry[], data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];
    const currentPrice = this.estimateCurrentPrice(data);
    
    // Group asks by price proximity
    const priceGroups = this.groupOrdersByPrice(asks, 0.001); // 0.1% grouping
    
    for (const group of priceGroups) {
      if (group.totalVolume > this.VOLUME_THRESHOLD && group.orders.length >= this.MIN_ORDERS_FOR_ZONE) {
        const zone = this.createResistanceZone(group, currentPrice);
        if (zone) zones.push(zone);
      }
    }
    
    return zones;
  }

  /**
   * Calculate order flow imbalance at different price levels
   */
  private calculateOrderFlowImbalance(data: ProcessedOrderbookData, currentPrice: number): Map<number, { bidVolume: number, askVolume: number, ratio: number, imbalance: number }> {
    const imbalanceMap = new Map();
    const priceStep = (data.priceRange.max - data.priceRange.min) / 100; // 100 price levels
    
    for (let price = data.priceRange.min; price <= data.priceRange.max; price += priceStep) {
      const bidVolume = this.getVolumeAtPrice(data.bids, price, priceStep);
      const askVolume = this.getVolumeAtPrice(data.asks, price, priceStep);
      
      const totalVolume = bidVolume + askVolume;
      const ratio = totalVolume > 0 ? bidVolume / askVolume : 0;
      const imbalance = bidVolume - askVolume;
      
      imbalanceMap.set(price, { bidVolume, askVolume, ratio, imbalance });
    }
    
    return imbalanceMap;
  }

  /**
   * Create imbalance-based pressure zone
   */
  private createImbalanceZone(
    priceLevel: number, 
    imbalance: { bidVolume: number, askVolume: number, ratio: number, imbalance: number },
    data: ProcessedOrderbookData
  ): PressureZone | null {
    const totalVolume = imbalance.bidVolume + imbalance.askVolume;
    if (totalVolume < this.VOLUME_THRESHOLD) return null;
    
    const pressureType = imbalance.imbalance > 0 ? 'support' : 'resistance';
    const intensity = Math.min(Math.abs(imbalance.ratio - 1), 2) / 2; // Normalize to 0-1
    const strength = Math.min(totalVolume / 1000, 1); // Normalize volume
    
    return {
      id: this.generateZoneId(),
      centerPrice: priceLevel,
      minPrice: priceLevel * 0.999,
      maxPrice: priceLevel * 1.001,
      intensity,
      strength,
      totalVolume,
      orderCount: Math.round(totalVolume / 10), // Estimate
      pressureType,
      type: pressureType,
      timestamp: Date.now(),
      isActive: true,
      price: priceLevel,
      volume: totalVolume,
      averageQuantity: totalVolume / Math.max(1, Math.round(totalVolume / 10)),
      side: pressureType === 'support' ? 'bid' : 'ask'
    };
  }

  /**
   * Calculate liquidity density across price levels
   */
  private calculateLiquidityDensity(data: ProcessedOrderbookData): Map<number, number> {
    const densityMap = new Map<number, number>();
    const priceStep = (data.priceRange.max - data.priceRange.min) / 200; // 200 price levels
    
    for (let price = data.priceRange.min; price <= data.priceRange.max; price += priceStep) {
      const bidDensity = this.calculateDensityAtPrice(data.bids, price, priceStep);
      const askDensity = this.calculateDensityAtPrice(data.asks, price, priceStep);
      const totalDensity = bidDensity + askDensity;
      
      densityMap.set(price, totalDensity);
    }
    
    return densityMap;
  }

  /**
   * Find high-density liquidity areas
   */
  private findHighDensityAreas(densityMap: Map<number, number>): Array<{ centerPrice: number, density: number, width: number }> {
    const areas: Array<{ centerPrice: number, density: number, width: number }> = [];
    const densityArray = Array.from(densityMap.entries()).sort((a, b) => a[0] - b[0]);
    
    // Find local maxima using gradient analysis
    for (let i = 2; i < densityArray.length - 2; i++) {
      const [price, density] = densityArray[i];
      const leftDensity = densityArray[i - 1][1];
      const rightDensity = densityArray[i + 1][1];
      
      // Check if this is a local maximum
      if (density > leftDensity && density > rightDensity && density > 0) {
        // Calculate area width
        let leftBound = i;
        let rightBound = i;
        
        // Expand left
        while (leftBound > 0 && densityArray[leftBound - 1][1] >= density * 0.5) {
          leftBound--;
        }
        
        // Expand right
        while (rightBound < densityArray.length - 1 && densityArray[rightBound + 1][1] >= density * 0.5) {
          rightBound++;
        }
        
        const width = densityArray[rightBound][0] - densityArray[leftBound][0];
        
        areas.push({ centerPrice: price, density, width });
      }
    }
    
    // Filter significant areas
    return areas.filter(area => area.density > 100 && area.width > 0);
  }

  /**
   * Group orders by price proximity
   */
  private groupOrdersByPrice(orders: OrderbookEntry[], tolerance: number): Array<{ orders: OrderbookEntry[], totalVolume: number, centerPrice: number }> {
    const groups: Array<{ orders: OrderbookEntry[], totalVolume: number, centerPrice: number }> = [];
    const sortedOrders = [...orders].sort((a, b) => a.price - b.price);
    
    for (const order of sortedOrders) {
      let foundGroup = false;
      
      for (const group of groups) {
        const priceDiff = Math.abs(order.price - group.centerPrice) / group.centerPrice;
        if (priceDiff <= tolerance) {
          group.orders.push(order);
          group.totalVolume += order.quantity;
          
          // Recalculate center price
          let weightedSum = 0;
          let totalWeight = 0;
          group.orders.forEach(o => {
            weightedSum += o.price * o.quantity;
            totalWeight += o.quantity;
          });
          group.centerPrice = weightedSum / totalWeight;
          
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        groups.push({
          orders: [order],
          totalVolume: order.quantity,
          centerPrice: order.price
        });
      }
    }
    
    return groups;
  }

  /**
   * Create support zone from price group
   */
  private createSupportZone(group: { orders: OrderbookEntry[], totalVolume: number, centerPrice: number }, currentPrice: number): PressureZone | null {
    if (group.orders.length < this.MIN_ORDERS_FOR_ZONE) return null;
    
    const prices = group.orders.map(o => o.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    const intensity = Math.min(group.totalVolume / 1000, 1);
    const strength = Math.min(group.orders.length / 10, 1);
    
    return {
      id: this.generateZoneId(),
      centerPrice: group.centerPrice,
      minPrice,
      maxPrice,
      intensity,
      strength,
      totalVolume: group.totalVolume,
      orderCount: group.orders.length,
      pressureType: 'support',
      type: 'support',
      timestamp: Date.now(),
      isActive: true,
      price: group.centerPrice,
      volume: group.totalVolume,
      averageQuantity: group.totalVolume / group.orders.length,
      side: 'bid'
    };
  }

  /**
   * Create resistance zone from price group
   */
  private createResistanceZone(group: { orders: OrderbookEntry[], totalVolume: number, centerPrice: number }, currentPrice: number): PressureZone | null {
    if (group.orders.length < this.MIN_ORDERS_FOR_ZONE) return null;
    
    const prices = group.orders.map(o => o.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    const intensity = Math.min(group.totalVolume / 1000, 1);
    const strength = Math.min(group.orders.length / 10, 1);
    
    return {
      id: this.generateZoneId(),
      centerPrice: group.centerPrice,
      minPrice,
      maxPrice,
      intensity,
      strength,
      totalVolume: group.totalVolume,
      orderCount: group.orders.length,
      pressureType: 'resistance',
      type: 'resistance',
      timestamp: Date.now(),
      isActive: true,
      price: group.centerPrice,
      volume: group.totalVolume,
      averageQuantity: group.totalVolume / group.orders.length,
      side: 'ask'
    };
  }

  /**
   * Calculate volume at specific price level
   */
  private getVolumeAtPrice(orders: OrderbookEntry[], targetPrice: number, tolerance: number = 0.001): number {
    return orders
      .filter(order => Math.abs(order.price - targetPrice) / targetPrice <= tolerance)
      .reduce((sum, order) => sum + order.quantity, 0);
  }

  /**
   * Calculate density at specific price level
   */
  private calculateDensityAtPrice(orders: OrderbookEntry[], targetPrice: number, priceStep: number): number {
    const priceRange = priceStep;
    const ordersInRange = orders.filter(order => 
      order.price >= targetPrice - priceRange/2 && 
      order.price <= targetPrice + priceRange/2
    );
    
    return ordersInRange.reduce((sum, order) => sum + order.quantity, 0) / priceRange;
  }

  /**
   * Create liquidity density zone
   */
  private createLiquidityDensityZone(area: { centerPrice: number, density: number, width: number }, data: ProcessedOrderbookData): PressureZone | null {
    const currentPrice = this.estimateCurrentPrice(data);
    const pressureType = area.centerPrice < currentPrice ? 'support' : 'resistance';
    
    const intensity = Math.min(area.density / 1000, 1);
    const strength = Math.min(area.width / 100, 1);
    
    return {
      id: this.generateZoneId(),
      centerPrice: area.centerPrice,
      minPrice: area.centerPrice - area.width / 2,
      maxPrice: area.centerPrice + area.width / 2,
      intensity,
      strength,
      totalVolume: area.density * area.width,
      orderCount: Math.round(area.density),
      pressureType,
      type: pressureType,
      timestamp: Date.now(),
      isActive: true,
      price: area.centerPrice,
      volume: area.density * area.width,
      averageQuantity: area.density,
      side: pressureType === 'support' ? 'bid' : 'ask'
    };
  }

  /**
   * Detect iceberg orders
   */
  private detectIcebergOrders(data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];
    const allOrders = [...data.bids, ...data.asks];
    
    // Look for orders with unusually large volume at single price points
    const priceVolumeMap = new Map<number, number>();
    
    allOrders.forEach(order => {
      const roundedPrice = Math.round(order.price * 100) / 100; // Round to 2 decimals
      priceVolumeMap.set(roundedPrice, (priceVolumeMap.get(roundedPrice) || 0) + order.quantity);
    });
    
    const averageVolume = Array.from(priceVolumeMap.values()).reduce((sum, vol) => sum + vol, 0) / priceVolumeMap.size;
    const icebergThreshold = averageVolume * 5; // 5x average volume
    
    for (const [price, volume] of priceVolumeMap.entries()) {
      if (volume > icebergThreshold) {
        const currentPrice = this.estimateCurrentPrice(data);
        const pressureType = price < currentPrice ? 'support' : 'resistance';
        
        zones.push({
          id: this.generateZoneId(),
          centerPrice: price,
          minPrice: price * 0.999,
          maxPrice: price * 1.001,
          intensity: Math.min(volume / (averageVolume * 10), 1),
          strength: 0.9, // High strength for iceberg orders
          totalVolume: volume,
          orderCount: 1, // Typically one large order
          pressureType,
          type: pressureType,
          timestamp: Date.now(),
          isActive: true,
          price: price,
          volume: volume,
          averageQuantity: volume,
          side: pressureType === 'support' ? 'bid' : 'ask'
        });
      }
    }
    
    return zones;
  }

  /**
   * Detect hidden liquidity patterns
   */
  private detectHiddenLiquidity(data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];
    
    // Analyze order size distribution for anomalies
    const allOrders = [...data.bids, ...data.asks];
    const orderSizes = allOrders.map(o => o.quantity).sort((a, b) => a - b);
    
    if (orderSizes.length === 0) return zones;
    
    const median = orderSizes[Math.floor(orderSizes.length / 2)];
    const q3 = orderSizes[Math.floor(orderSizes.length * 0.75)];
    
    // Look for clusters of medium-sized orders that might indicate hidden liquidity
    const hiddenLiquidityThreshold = median * 2;
    const maxVisibleSize = q3;
    
    const suspiciousOrders = allOrders.filter(order => 
      order.quantity >= hiddenLiquidityThreshold && 
      order.quantity <= maxVisibleSize
    );
    
    // Group suspicious orders by price proximity
    const groups = this.groupOrdersByPrice(suspiciousOrders, 0.002); // 0.2% grouping
    
    for (const group of groups) {
      if (group.orders.length >= 3 && group.totalVolume > this.VOLUME_THRESHOLD) {
        const currentPrice = this.estimateCurrentPrice(data);
        const pressureType = group.centerPrice < currentPrice ? 'support' : 'resistance';
        
        zones.push({
          id: this.generateZoneId(),
          centerPrice: group.centerPrice,
          minPrice: Math.min(...group.orders.map(o => o.price)),
          maxPrice: Math.max(...group.orders.map(o => o.price)),
          intensity: Math.min(group.totalVolume / (median * 100), 1),
          strength: 0.7, // Medium-high strength for hidden liquidity
          totalVolume: group.totalVolume,
          orderCount: group.orders.length,
          pressureType,
          type: pressureType,
          timestamp: Date.now(),
          isActive: true,
          price: group.centerPrice,
          volume: group.totalVolume,
          averageQuantity: group.totalVolume / group.orders.length,
          side: pressureType === 'support' ? 'bid' : 'ask'
        });
      }
    }
    
    return zones;
  }

  /**
   * Generate unique zone ID
   */
  private generateZoneId(): string {
    return `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Determine zone type from cluster analysis
   */
  private determineZoneType(cluster: { orders: OrderbookEntry[], totalVolume: number, centerPrice: number, volumeWeight: number }, currentPrice: number): 'support' | 'resistance' {
    return cluster.centerPrice < currentPrice ? 'support' : 'resistance';
  }

  /**
   * Calculate zone intensity based on volume and order distribution
   */
  private calculateZoneIntensity(cluster: { orders: OrderbookEntry[], totalVolume: number, centerPrice: number, volumeWeight: number }, data: ProcessedOrderbookData): number {
    const totalMarketVolume = [...data.bids, ...data.asks].reduce((sum, order) => sum + order.quantity, 0);
    const relativeVolume = cluster.totalVolume / Math.max(totalMarketVolume, 1);
    return Math.min(relativeVolume * 10, 1); // Normalize to 0-1
  }

  /**
   * Calculate zone strength based on order count and price spread
   */
  private calculateZoneStrength(cluster: { orders: OrderbookEntry[], totalVolume: number, centerPrice: number, volumeWeight: number }, data: ProcessedOrderbookData): number {
    const orderDensity = cluster.orders.length / Math.max(cluster.orders.length, 1);
    const volumeWeight = cluster.volumeWeight / Math.max(cluster.totalVolume, 1);
    return Math.min((orderDensity + volumeWeight) / 2, 1);
  }

  /**
   * Calculate zone confidence based on multiple factors
   */
  private calculateZoneConfidence(cluster: { orders: OrderbookEntry[], totalVolume: number, centerPrice: number, volumeWeight: number }, data: ProcessedOrderbookData): number {
    const orderCount = cluster.orders.length;
    const volumeConsistency = this.calculateVolumeConsistency(cluster.orders);
    const priceSpread = this.calculatePriceSpread(cluster.orders);
    
    // Higher confidence for more orders, consistent volumes, and tight price spread
    const orderConfidence = Math.min(orderCount / 10, 1);
    const volumeConfidence = volumeConsistency;
    const spreadConfidence = 1 - Math.min(priceSpread, 1);
    
    return (orderConfidence + volumeConfidence + spreadConfidence) / 3;
  }

  /**
   * Calculate volume consistency within a cluster
   */
  private calculateVolumeConsistency(orders: OrderbookEntry[]): number {
    if (orders.length <= 1) return 1;
    
    const volumes = orders.map(o => o.quantity);
    const mean = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const variance = volumes.reduce((sum, vol) => sum + Math.pow(vol - mean, 2), 0) / volumes.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation relative to mean indicates higher consistency
    return Math.max(0, 1 - (standardDeviation / Math.max(mean, 1)));
  }

  /**
   * Calculate price spread within a cluster
   */
  private calculatePriceSpread(orders: OrderbookEntry[]): number {
    if (orders.length <= 1) return 0;
    
    const prices = orders.map(o => o.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    return (maxPrice - minPrice) / avgPrice;
  }

  /**
   * Detect algorithmic trading patterns
   */
  private detectAlgorithmicPatterns(data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];
    
    // Detect regular order spacing patterns (algorithmic trading)
    const allOrders = [...data.bids, ...data.asks];
    const priceSpacings = [];
    
    for (let i = 1; i < allOrders.length; i++) {
      const spacing = Math.abs(allOrders[i].price - allOrders[i-1].price);
      if (spacing > 0) priceSpacings.push(spacing);
    }
    
    if (priceSpacings.length === 0) return zones;
    
    // Find repeating patterns
    const spacingMap = new Map<number, number>();
    priceSpacings.forEach(spacing => {
      const roundedSpacing = Math.round(spacing * 10000) / 10000; // Round to 4 decimals
      spacingMap.set(roundedSpacing, (spacingMap.get(roundedSpacing) || 0) + 1);
    });
    
    // Identify significant patterns (appears more than 3 times)
    for (const [spacing, count] of spacingMap.entries()) {
      if (count >= 3) {
        // Create algorithmic pattern zone
        const currentPrice = this.estimateCurrentPrice(data);
        const centerPrice = currentPrice + spacing;
        const pressureType = centerPrice < currentPrice ? 'support' : 'resistance';
        
        zones.push({
          id: this.generateZoneId(),
          centerPrice,
          minPrice: centerPrice - spacing * 0.1,
          maxPrice: centerPrice + spacing * 0.1,
          intensity: Math.min(count / 10, 1),
          strength: 0.6, // Medium strength for algorithmic patterns
          totalVolume: count * 100, // Estimate
          orderCount: count,
          pressureType,
          type: pressureType,
          timestamp: Date.now(),
          isActive: true,
          price: centerPrice,
          volume: count * 100,
          averageQuantity: 100,
          side: pressureType === 'support' ? 'bid' : 'ask'
        });
      }
    }
    
    return zones;
  }

  /**
   * Calculate time-weighted volume profile
   */
  private calculateTimeWeightedVolumeProfile(data: ProcessedOrderbookData): Map<number, { volume: number, timeWeight: number }> {
    const profile = new Map<number, { volume: number, timeWeight: number }>();
    const currentTime = Date.now();
    const allOrders = [...data.bids, ...data.asks];
    
    for (const order of allOrders) {
      const roundedPrice = Math.round(order.price * 100) / 100; // Round to 2 decimals
      const timeWeight = Math.exp(-(currentTime - order.timestamp) / 3600000); // 1 hour decay
      
      const existing = profile.get(roundedPrice) || { volume: 0, timeWeight: 0 };
      profile.set(roundedPrice, {
        volume: existing.volume + order.quantity,
        timeWeight: existing.timeWeight + timeWeight
      });
    }
    
    return profile;
  }

  /**
   * Find significant volume nodes in the profile
   */
  private findVolumeNodes(profile: Map<number, { volume: number, timeWeight: number }>): Array<{ price: number, volume: number, timeWeight: number }> {
    const nodes: Array<{ price: number, volume: number, timeWeight: number }> = [];
    const profileArray = Array.from(profile.entries())
      .map(([price, data]) => ({ price, ...data }))
      .sort((a, b) => a.price - b.price);
    
    if (profileArray.length === 0) return nodes;
    
    // Find local maxima in volume
    for (let i = 1; i < profileArray.length - 1; i++) {
      const current = profileArray[i];
      const left = profileArray[i - 1];
      const right = profileArray[i + 1];
      
      if (current.volume > left.volume && current.volume > right.volume && current.volume > 100) {
        nodes.push(current);
      }
    }
    
    return nodes.sort((a, b) => b.volume - a.volume).slice(0, 10); // Top 10 nodes
  }

  /**
   * Create volume profile zone
   */
  private createVolumeProfileZone(node: { price: number, volume: number, timeWeight: number }, data: ProcessedOrderbookData): PressureZone | null {
    const currentPrice = this.estimateCurrentPrice(data);
    const pressureType = node.price < currentPrice ? 'support' : 'resistance';
    
    const intensity = Math.min(node.volume / 1000, 1);
    const strength = Math.min(node.timeWeight, 1);
    
    return {
      id: this.generateZoneId(),
      centerPrice: node.price,
      minPrice: node.price * 0.999,
      maxPrice: node.price * 1.001,
      intensity,
      strength,
      totalVolume: node.volume,
      orderCount: Math.round(node.volume / 10), // Estimate
      pressureType,
      type: pressureType,
      timestamp: Date.now(),
      isActive: true,
      price: node.price,
      volume: node.volume,
      averageQuantity: node.volume / Math.max(1, Math.round(node.volume / 10)),
      side: pressureType === 'support' ? 'bid' : 'ask'
    };
  }

  /**
   * Support and Resistance Zone Detection using Price Action Analysis
   */
  private detectSupportResistanceZones(data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];
    
    // Analyze bid side for support zones
    const supportZones = this.analyzeSupportLevels(data.bids, data);
    zones.push(...supportZones);
    
    // Analyze ask side for resistance zones
    const resistanceZones = this.analyzeResistanceLevels(data.asks, data);
    zones.push(...resistanceZones);

    return zones;
  }

  /**
   * Order Flow Imbalance Detection Algorithm
   */
  private detectOrderFlowImbalance(data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];
    const currentPrice = this.estimateCurrentPrice(data);

    // Calculate order flow imbalance at different price levels
    const imbalanceMap = this.calculateOrderFlowImbalance(data, currentPrice);

    for (const [priceLevel, imbalance] of imbalanceMap) {
      if (Math.abs(imbalance.ratio) > 2.0) { // Significant imbalance threshold
        const zone = this.createImbalanceZone(priceLevel, imbalance, data);
        if (zone) zones.push(zone);
      }
    }

    return zones;
  }

  /**
   * Liquidity Density Zone Detection
   */
  private detectLiquidityDensityZones(data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];
    const densityMap = this.calculateLiquidityDensity(data);

    // Find high-density areas using gradient analysis
    const highDensityAreas = this.findHighDensityAreas(densityMap);

    for (const area of highDensityAreas) {
      const zone = this.createLiquidityDensityZone(area, data);
      if (zone) zones.push(zone);
    }

    return zones;
  }

  /**
   * Market Microstructure Analysis for Hidden Liquidity
   */
  private detectMicrostructureZones(data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];

    // Detect iceberg orders
    const icebergZones = this.detectIcebergOrders(data);
    zones.push(...icebergZones);

    // Detect hidden liquidity patterns
    const hiddenLiquidityZones = this.detectHiddenLiquidity(data);
    zones.push(...hiddenLiquidityZones);

    // Detect algorithmic trading patterns
    const algoZones = this.detectAlgorithmicPatterns(data);
    zones.push(...algoZones);

    return zones;
  }

  /**
   * Time-Weighted Volume Profile Analysis
   */
  private detectTimeWeightedVolumeZones(data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];

    if (this.priceHistory.length < 10) return zones; // Need sufficient history

    // Calculate time-weighted volume profile
    const volumeProfile = this.calculateTimeWeightedVolumeProfile(data);

    // Find significant volume nodes
    const volumeNodes = this.findVolumeNodes(volumeProfile);

    for (const node of volumeNodes) {
      const zone = this.createVolumeProfileZone(node, data);
      if (zone) zones.push(zone);
    }

    return zones;
  }

  private analyzeOrderSideEnhanced(orders: OrderbookEntry[], side: 'bid' | 'ask'): PressureZone[] {
    const zones: PressureZone[] = [];
    const priceGroups = new Map<string, { 
      orders: OrderbookEntry[], 
      totalVolume: number,
      averagePrice: number,
      priceVariance: number
    }>();

    // Group orders by price ranges with enhanced analysis
    for (const order of orders) {
      const price = order.price;
      const quantity = order.quantity;
      const priceGroup = Math.floor(price / (price * this.CLUSTERING_DISTANCE)) * (price * this.CLUSTERING_DISTANCE);
      const key = priceGroup.toString();

      if (!priceGroups.has(key)) {
        priceGroups.set(key, { 
          orders: [], 
          totalVolume: 0, 
          averagePrice: 0,
          priceVariance: 0
        });
      }

      const group = priceGroups.get(key)!;
      group.orders.push(order);
      group.totalVolume += quantity;
    }

    // Calculate enhanced metrics for each group
    for (const [priceStr, group] of priceGroups) {
      if (group.totalVolume > this.VOLUME_THRESHOLD && group.orders.length >= this.MIN_ORDERS_FOR_ZONE) {
        const centerPrice = parseFloat(priceStr);
        
        // Calculate average price and variance
        const totalPriceVolume = group.orders.reduce((sum, order) => sum + (order.price * order.quantity), 0);
        group.averagePrice = totalPriceVolume / group.totalVolume;
        
        // Calculate price variance
        const variance = group.orders.reduce((sum, order) => {
          const diff = order.price - group.averagePrice;
          return sum + (diff * diff * order.quantity);
        }, 0) / group.totalVolume;
        group.priceVariance = Math.sqrt(variance);

        // Enhanced intensity calculation
        const volumeIntensity = Math.min(group.totalVolume / 1000, 1);
        const orderDensityIntensity = Math.min(group.orders.length / 20, 1);
        const priceConcentrationIntensity = Math.max(0, 1 - (group.priceVariance / centerPrice));
        
        const intensity = (volumeIntensity * 0.5 + orderDensityIntensity * 0.3 + priceConcentrationIntensity * 0.2);
        
        const zone: PressureZone = {
          id: `${side}_${centerPrice}_${Date.now()}`,
          type: side === 'bid' ? 'support' : 'resistance',
          pressureType: side === 'bid' ? 'support' : 'resistance',
          price: centerPrice,
          centerPrice: group.averagePrice,
          minPrice: centerPrice - (centerPrice * this.CLUSTERING_DISTANCE),
          maxPrice: centerPrice + (centerPrice * this.CLUSTERING_DISTANCE),
          strength: intensity,
          intensity,
          volume: group.totalVolume,
          totalVolume: group.totalVolume,
          averageQuantity: group.totalVolume / group.orders.length,
          orderCount: group.orders.length,
          side,
          timestamp: Date.now(),
          isActive: true
        };

        zones.push(zone);
      }
    }

    return zones;
  }

  private detectVolumeSpikesEnhanced(data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];
    const allOrders = [...data.bids, ...data.asks];
    
    if (allOrders.length === 0) return zones;

    // Calculate dynamic volume thresholds
    const volumes = allOrders.map(order => order.quantity);
    const sortedVolumes = volumes.sort((a, b) => a - b);
    const medianVolume = sortedVolumes[Math.floor(sortedVolumes.length / 2)];
    const averageVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    
    // Dynamic threshold based on volume distribution
    const volumeThreshold = Math.max(
      averageVolume * this.VOLUME_SPIKE_MULTIPLIER,
      medianVolume * 2,
      this.VOLUME_THRESHOLD
    );

    // Detect spikes with enhanced analysis
    for (const order of allOrders) {
      const quantity = order.quantity;
      if (quantity > volumeThreshold) {
        const price = order.price;
        const side = data.bids.includes(order) ? 'bid' : 'ask';
        
        // Calculate spike intensity relative to threshold
        const spikeIntensity = Math.min(quantity / (volumeThreshold * 2), 1);
        
        // Determine if this is an accumulation or distribution spike
        const pressureType = this.determineSpikeType(order, data, volumeThreshold);

        const zone: PressureZone = {
          id: `spike_${price}_${Date.now()}`,
          type: side === 'bid' ? 'support' : 'resistance',
          pressureType,
          price,
          centerPrice: price,
          minPrice: price - (price * 0.0005),
          maxPrice: price + (price * 0.0005),
          strength: spikeIntensity,
          intensity: spikeIntensity,
          volume: quantity,
          totalVolume: quantity,
          averageQuantity: quantity,
          orderCount: 1,
          side,
          timestamp: Date.now(),
          isActive: true
        };

        zones.push(zone);
      }
    }

    return zones;
  }

  private determineSpikeType(order: OrderbookEntry, data: ProcessedOrderbookData, threshold: number): 'accumulation' | 'distribution' {
    const side = data.bids.includes(order) ? 'bid' : 'ask';
    const price = order.price;
    
    // Check if this spike is part of a larger pattern
    const nearbyOrders = [...data.bids, ...data.asks].filter(o => 
      Math.abs(o.price - price) / price < 0.001 && o.quantity > threshold * 0.5
    );
    
    if (nearbyOrders.length > 2) {
      // Multiple spikes in the area suggest distribution
      return 'distribution';
    } else {
      // Single large spike suggests accumulation
      return 'accumulation';
    }
  }

  private detectPriceClusteringEnhanced(data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];
    const allPrices = [...data.bids, ...data.asks].map(order => order.price);
    
    if (allPrices.length === 0) return zones;
    
    // Sort prices and look for clusters with enhanced detection
    allPrices.sort((a, b) => a - b);
    
    let clusterStart = 0;
    let clusterOrders: OrderbookEntry[] = [];
    
    for (let i = 1; i < allPrices.length; i++) {
      const currentPrice = allPrices[i];
      const previousPrice = allPrices[i - 1];
      const priceGap = (currentPrice - previousPrice) / previousPrice;
      
      // If gap is larger than clustering distance, end current cluster
      if (priceGap > this.CLUSTERING_DISTANCE) {
        if (clusterOrders.length >= this.CLUSTER_MIN_SIZE) {
          const clusterZone = this.createClusterZone(clusterOrders, clusterStart, i);
          if (clusterZone) zones.push(clusterZone);
        }
        
        clusterStart = i;
        clusterOrders = [];
      }
      
      // Add orders to current cluster
      const ordersAtPrice = [...data.bids, ...data.asks].filter(o => 
        Math.abs(o.price - currentPrice) / currentPrice < 0.0001
      );
      clusterOrders.push(...ordersAtPrice);
    }
    
    // Handle the last cluster
    if (clusterOrders.length >= this.CLUSTER_MIN_SIZE) {
      const clusterZone = this.createClusterZone(clusterOrders, clusterStart, allPrices.length);
      if (clusterZone) zones.push(clusterZone);
    }

    return zones;
  }

  private createClusterZone(orders: OrderbookEntry[], startIndex: number, endIndex: number): PressureZone | null {
    if (orders.length === 0) return null;
    
    const prices = orders.map(o => o.price);
    const centerPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const totalVolume = orders.reduce((sum, o) => sum + o.quantity, 0);
    
    // Determine cluster side based on price position
    const midPrice = (minPrice + maxPrice) / 2;
    const side = centerPrice < midPrice ? 'bid' : 'ask';
    
    // Calculate cluster intensity
    const clusterSize = orders.length;
    const volumeIntensity = Math.min(totalVolume / 500, 1);
    const densityIntensity = Math.min(clusterSize / 10, 1);
    const intensity = (volumeIntensity * 0.6 + densityIntensity * 0.4);

    return {
      id: `cluster_${centerPrice}_${Date.now()}`,
      type: side === 'bid' ? 'support' : 'resistance',
      pressureType: 'distribution',
      price: centerPrice,
      centerPrice,
      minPrice,
      maxPrice,
      strength: intensity,
      intensity,
      volume: totalVolume,
      totalVolume,
      averageQuantity: totalVolume / clusterSize,
      orderCount: clusterSize,
      side,
      timestamp: Date.now(),
      isActive: true
    };
  }

  private detectAccumulationZones(data: ProcessedOrderbookData): PressureZone[] {
    const zones: PressureZone[] = [];
    
    // Look for patterns that suggest accumulation (large orders at support levels)
    const bidOrders = data.bids.sort((a, b) => b.price - a.price); // Highest bids first
    const askOrders = data.asks.sort((a, b) => a.price - b.price); // Lowest asks first
    
    // Check for accumulation patterns in bids (large orders near the top)
    for (let i = 0; i < Math.min(5, bidOrders.length); i++) {
      const order = bidOrders[i];
      if (order.quantity > this.VOLUME_THRESHOLD * 1.5) {
        const zone: PressureZone = {
          id: `accumulation_bid_${order.price}_${Date.now()}`,
          type: 'support',
          pressureType: 'accumulation',
          price: order.price,
          centerPrice: order.price,
          minPrice: order.price - (order.price * 0.0005),
          maxPrice: order.price + (order.price * 0.0005),
          strength: Math.min(order.quantity / 1000, 1),
          intensity: Math.min(order.quantity / 1000, 1),
          volume: order.quantity,
          totalVolume: order.quantity,
          averageQuantity: order.quantity,
          orderCount: 1,
          side: 'bid',
          timestamp: Date.now(),
          isActive: true
        };
        zones.push(zone);
      }
    }
    
    // Check for distribution patterns in asks (large orders near the bottom)
    for (let i = 0; i < Math.min(5, askOrders.length); i++) {
      const order = askOrders[i];
      if (order.quantity > this.VOLUME_THRESHOLD * 1.5) {
        const zone: PressureZone = {
          id: `distribution_ask_${order.price}_${Date.now()}`,
          type: 'resistance',
          pressureType: 'distribution',
          price: order.price,
          centerPrice: order.price,
          minPrice: order.price - (order.price * 0.0005),
          maxPrice: order.price + (order.price * 0.0005),
          strength: Math.min(order.quantity / 1000, 1),
          intensity: Math.min(order.quantity / 1000, 1),
          volume: order.quantity,
          totalVolume: order.quantity,
          averageQuantity: order.quantity,
          orderCount: 1,
          side: 'ask',
          timestamp: Date.now(),
          isActive: true
        };
        zones.push(zone);
      }
    }
    
    return zones;
  }

  private mergeOverlappingZonesEnhanced(zones: PressureZone[]): PressureZone[] {
    const merged: PressureZone[] = [];
    
    for (const zone of zones) {
      let overlapping = false;
      
      for (let i = 0; i < merged.length; i++) {
        const existing = merged[i];
        
        // Enhanced overlap detection
        const priceOverlap = zone.maxPrice >= existing.minPrice && zone.minPrice <= existing.maxPrice;
        const sideMatch = zone.side === existing.side;
        const typeCompatibility = this.areZoneTypesCompatible(zone.pressureType, existing.pressureType);
        
        if (priceOverlap && sideMatch && typeCompatibility) {
          // Merge zones with enhanced logic
          const combinedZone: PressureZone = {
            ...existing,
            id: `merged_${existing.id}_${zone.id}`,
            minPrice: Math.min(existing.minPrice, zone.minPrice),
            maxPrice: Math.max(existing.maxPrice, zone.maxPrice),
            centerPrice: (existing.centerPrice + zone.centerPrice) / 2,
            price: (existing.price + zone.price) / 2,
            totalVolume: existing.totalVolume + zone.totalVolume,
            volume: existing.volume + zone.volume,
            orderCount: existing.orderCount + zone.orderCount,
            averageQuantity: (existing.totalVolume + zone.totalVolume) / (existing.orderCount + zone.orderCount),
            intensity: Math.min((existing.intensity + zone.intensity) / 2, 1),
            strength: Math.min((existing.strength + zone.strength) / 2, 1),
            timestamp: Math.max(existing.timestamp, zone.timestamp)
          };
          
          merged[i] = combinedZone;
          overlapping = true;
          break;
        }
      }
      
      if (!overlapping) {
        merged.push(zone);
      }
    }
    
    return merged;
  }

  private areZoneTypesCompatible(type1: string, type2: string): boolean {
    const compatibleTypes = {
      'support': ['support', 'accumulation'],
      'resistance': ['resistance', 'distribution'],
      'accumulation': ['support', 'accumulation'],
      'distribution': ['resistance', 'distribution']
    };
    
    return compatibleTypes[type1 as keyof typeof compatibleTypes]?.includes(type2) || false;
  }

  private calculateEnhancedStatistics(zones: PressureZone[], data: ProcessedOrderbookData): PressureZoneAnalysis['statistics'] {
    const supportZones = zones.filter(z => z.type === 'support').length;
    const resistanceZones = zones.filter(z => z.type === 'resistance').length;
    const averageIntensity = zones.length > 0 
      ? zones.reduce((sum, z) => sum + z.intensity, 0) / zones.length 
      : 0;
    
    const strongestZone = zones.reduce((strongest, zone) => 
      !strongest || zone.intensity > strongest.intensity ? zone : strongest, null as PressureZone | null
    );

    const criticalLevels = zones
      .filter(z => z.intensity > 0.7)
      .map(z => z.centerPrice)
      .sort((a, b) => a - b);

    // Enhanced volume analysis
    const allVolumes = [...data.bids, ...data.asks].map(o => o.quantity);
    const totalVolume = allVolumes.reduce((sum, vol) => sum + vol, 0);
    const averageVolume = totalVolume / allVolumes.length;
    const volumeSpikes = allVolumes.filter(vol => vol > averageVolume * this.VOLUME_SPIKE_MULTIPLIER).length;
    
    // Calculate volume concentration (percentage of volume in top zones)
    const topZones = zones.filter(z => z.intensity > 0.6);
    const topZonesVolume = topZones.reduce((sum, z) => sum + z.totalVolume, 0);
    const volumeConcentration = totalVolume > 0 ? topZonesVolume / totalVolume : 0;

    // Cluster analysis
    const clusters = zones.filter(z => z.pressureType === 'distribution');
    const totalClusters = clusters.length;
    const averageClusterSize = clusters.length > 0 
      ? clusters.reduce((sum, c) => sum + c.orderCount, 0) / clusters.length 
      : 0;
    const largestCluster = clusters.length > 0 
      ? Math.max(...clusters.map(c => c.orderCount))
      : 0;
    
    // Calculate cluster density
    const priceSpread = data.priceRange.max - data.priceRange.min;
    const clusterDensity = priceSpread > 0 ? totalClusters / priceSpread : 0;

    // Temporal analysis
    const now = Date.now();
    const formingZones = zones.filter(z => now - z.timestamp < 30000).length; // Last 30 seconds
    const strengtheningZones = zones.filter(z => z.intensity > 0.6).length;
    const weakeningZones = zones.filter(z => z.intensity < 0.4).length;
    const averageZoneAge = zones.length > 0 
      ? zones.reduce((sum, z) => sum + (now - z.timestamp), 0) / zones.length / 1000 
      : 0;

    // Risk metrics
    const marketFragmentation = zones.length > 0 ? Math.min(1, zones.length / 10) : 0;
    const concentrationRisk = Math.max(0, volumeConcentration - 0.5) * 2; // Risk increases when >50% volume is concentrated
    const volatilityIndicator = zones.length > 0 
      ? zones.reduce((sum, z) => sum + Math.abs(z.intensity - averageIntensity), 0) / zones.length 
      : 0;

    return {
      totalZones: zones.length,
      supportZones,
      resistanceZones,
      averageIntensity,
      strongestZone,
      criticalLevels,
      volumeDistribution: {
        totalVolume,
        averageVolume,
        volumeSpikes,
        volumeConcentration
      },
      priceClusters: {
        totalClusters,
        averageClusterSize,
        largestCluster,
        clusterDensity
      },
      temporalAnalysis: {
        formingZones,
        strengtheningZones,
        weakeningZones,
        averageZoneAge
      },
      riskMetrics: {
        marketFragmentation,
        concentrationRisk,
        volatilityIndicator
      }
    };
  }

  private generateEnhancedAlerts(zones: PressureZone[], data: ProcessedOrderbookData): PressureZoneAlert[] {
    const alerts: PressureZoneAlert[] = [];

    // Check for new zone formations
    for (const zone of zones) {
      const existingZone = this.previousZones.find(prev => 
        Math.abs(prev.centerPrice - zone.centerPrice) < (zone.centerPrice * 0.001)
      );

      if (!existingZone) {
        alerts.push({
          id: `formation_${zone.id}`,
          type: 'formation',
          severity: zone.intensity > 0.8 ? 'critical' : zone.intensity > 0.6 ? 'high' : zone.intensity > 0.4 ? 'medium' : 'low',
          message: `New ${zone.pressureType} zone formed at $${zone.centerPrice.toFixed(2)} with ${(zone.intensity * 100).toFixed(1)}% intensity`,
          zone,
          timestamp: Date.now(),
          confidence: Math.min(0.9, zone.intensity + 0.1),
          metadata: {
            volumeChange: zone.volume,
            clusterSize: zone.orderCount
          }
        });
      } else if (zone.intensity > existingZone.intensity * 1.3) {
        // Zone strengthening
        alerts.push({
          id: `strengthening_${zone.id}`,
          type: 'strengthening',
          severity: zone.intensity > 0.9 ? 'critical' : zone.intensity > 0.7 ? 'high' : 'medium',
          message: `${zone.pressureType} zone at $${zone.centerPrice.toFixed(2)} strengthening (${(zone.intensity * 100).toFixed(1)}%)`,
          zone,
          timestamp: Date.now(),
          confidence: Math.min(0.9, zone.intensity + 0.2),
          metadata: {
            volumeChange: zone.volume - existingZone.volume
          }
        });
      } else if (zone.intensity < existingZone.intensity * 0.7) {
        // Zone weakening
        alerts.push({
          id: `weakening_${zone.id}`,
          type: 'weakening',
          severity: 'medium',
          message: `${zone.pressureType} zone at $${zone.centerPrice.toFixed(2)} weakening (${(zone.intensity * 100).toFixed(1)}%)`,
          zone,
          timestamp: Date.now(),
          confidence: Math.max(0.3, 1 - zone.intensity),
          metadata: {
            volumeChange: zone.volume - existingZone.volume
          }
        });
      }
    }

    // Volume spike alerts
    const allVolumes = [...data.bids, ...data.asks].map(o => o.quantity);
    const averageVolume = allVolumes.reduce((sum, vol) => sum + vol, 0) / allVolumes.length;
    const volumeSpikes = allVolumes.filter(vol => vol > averageVolume * this.VOLUME_SPIKE_MULTIPLIER);
    
    if (volumeSpikes.length > 0) {
      const maxSpike = Math.max(...volumeSpikes);
      alerts.push({
        id: `volume_spike_${Date.now()}`,
        type: 'volume_spike',
        severity: maxSpike > averageVolume * 5 ? 'critical' : maxSpike > averageVolume * 3 ? 'high' : 'medium',
        message: `Volume spike detected: ${volumeSpikes.length} orders with ${(maxSpike / averageVolume).toFixed(1)}x average volume`,
        zone: zones[0] || this.createDummyZone(),
        timestamp: Date.now(),
        confidence: Math.min(0.95, (maxSpike / averageVolume) * 0.2),
        metadata: {
          volumeChange: maxSpike
        }
      });
    }

    // Cluster formation alerts
    const newClusters = zones.filter(z => z.pressureType === 'distribution' && z.orderCount > 5);
    if (newClusters.length > 0) {
      const largestCluster = newClusters.reduce((largest, cluster) => 
        cluster.orderCount > largest.orderCount ? cluster : largest
      );
      
      alerts.push({
        id: `cluster_formation_${Date.now()}`,
        type: 'cluster_formation',
        severity: largestCluster.orderCount > 10 ? 'high' : 'medium',
        message: `Price cluster detected: ${largestCluster.orderCount} orders at $${largestCluster.centerPrice.toFixed(2)}`,
        zone: largestCluster,
        timestamp: Date.now(),
        confidence: Math.min(0.9, largestCluster.orderCount / 15),
        metadata: {
          clusterSize: largestCluster.orderCount
        }
      });
    }

    return alerts;
  }

  private createDummyZone(): PressureZone {
    return {
      id: 'dummy',
      type: 'support',
      pressureType: 'support',
      price: 0,
      centerPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      strength: 0,
      intensity: 0,
      volume: 0,
      totalVolume: 0,
      averageQuantity: 0,
      orderCount: 0,
      side: 'bid',
      timestamp: Date.now(),
      isActive: false
    };
  }

  private generateHeatmapData(zones: PressureZone[], data: ProcessedOrderbookData): Array<{ 
    price: number; 
    intensity: number; 
    volume: number; 
    density: number;
    gradient: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const heatmap: Array<{ 
      price: number; 
      intensity: number; 
      volume: number; 
      density: number;
      gradient: number;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
    }> = [];
    const priceRange = data.priceRange;
    const resolution = 200;
    const priceStep = (priceRange.max - priceRange.min) / resolution;
    
    for (let i = 0; i <= resolution; i++) {
      const price = priceRange.min + (i * priceStep);
      const intensity = this.getPressureIntensityAtPrice(price, zones);
      const volume = this.getVolumeAtPriceLevel(price, data);
      
      // Calculate density (orders per price unit)
      const ordersNearPrice = this.getOrderCountNearPrice(price, data, priceStep);
      const density = ordersNearPrice / (priceStep * 2);
      
      // Calculate gradient (rate of change)
      const prevPrice = Math.max(priceRange.min, price - priceStep);
      const nextPrice = Math.min(priceRange.max, price + priceStep);
      const prevIntensity = this.getPressureIntensityAtPrice(prevPrice, zones);
      const nextIntensity = this.getPressureIntensityAtPrice(nextPrice, zones);
      const gradient = (nextIntensity - prevIntensity) / (2 * priceStep);
      
      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (intensity > 0.8 && density > 0.5) riskLevel = 'critical';
      else if (intensity > 0.6 || density > 0.3) riskLevel = 'high';
      else if (intensity > 0.4 || density > 0.2) riskLevel = 'medium';
      
      heatmap.push({ price, intensity, volume, density, gradient, riskLevel });
    }
    
    return heatmap;
  }

  private getOrderCountNearPrice(price: number, data: ProcessedOrderbookData, tolerance: number): number {
    const allOrders = [...data.bids, ...data.asks];
    return allOrders.filter(order => 
      Math.abs(order.price - price) <= tolerance
    ).length;
  }

  private generateGradientOverlay(zones: PressureZone[], data: ProcessedOrderbookData): Array<{
    startPrice: number;
    endPrice: number;
    intensity: number;
    color: string;
    opacity: number;
    type: 'support' | 'resistance' | 'accumulation' | 'distribution';
  }> {
    const overlays: Array<{
      startPrice: number;
      endPrice: number;
      intensity: number;
      color: string;
      opacity: number;
      type: 'support' | 'resistance' | 'accumulation' | 'distribution';
    }> = [];

    for (const zone of zones) {
      let color: string;
      let type: 'support' | 'resistance' | 'accumulation' | 'distribution';
      
      // Determine zone type and color
      if (zone.pressureType === 'support') {
        color = zone.intensity > 0.7 ? '#10b981' : '#34d399'; // Green variations
        type = 'support';
      } else if (zone.pressureType === 'resistance') {
        color = zone.intensity > 0.7 ? '#ef4444' : '#f87171'; // Red variations
        type = 'resistance';
      } else if (zone.volume > zone.averageQuantity * 2) {
        color = '#3b82f6'; // Blue for accumulation
        type = 'accumulation';
      } else {
        color = '#f59e0b'; // Orange for distribution
        type = 'distribution';
      }

      const opacity = Math.min(0.8, Math.max(0.2, zone.intensity));

      overlays.push({
        startPrice: zone.minPrice,
        endPrice: zone.maxPrice,
        intensity: zone.intensity,
        color,
        opacity,
        type
      });
    }

    return overlays;
  }

  public getPressureIntensityAtPrice(price: number, zones: PressureZone[]): number {
    let totalIntensity = 0;
    
    for (const zone of zones) {
      if (price >= zone.minPrice && price <= zone.maxPrice) {
        // Calculate distance-based intensity with enhanced falloff
        const distanceFromCenter = Math.abs(price - zone.centerPrice);
        const maxDistance = (zone.maxPrice - zone.minPrice) / 2;
        const distanceFactor = Math.max(0, 1 - Math.pow(distanceFromCenter / maxDistance, 2));
        totalIntensity += zone.intensity * distanceFactor;
      }
    }
    
    return Math.min(totalIntensity, 1);
  }

  private getVolumeAtPriceLevel(price: number, data: ProcessedOrderbookData): number {
    const allOrders = [...data.bids, ...data.asks];
    const ordersAtPrice = allOrders.filter(order => 
      Math.abs(order.price - price) / price < 0.0001
    );
    
    return ordersAtPrice.reduce((sum, order) => sum + order.quantity, 0);
  }

  private updateHistory(data: ProcessedOrderbookData): void {
    const currentPrice = (data.bids[0]?.price || 0 + data.asks[0]?.price || 0) / 2;
    const totalVolume = [...data.bids, ...data.asks].reduce((sum, order) => sum + order.quantity, 0);
    
    this.priceHistory.push({ 
      price: currentPrice, 
      timestamp: Date.now(),
      volume: totalVolume
    });
    
    this.volumeHistory.push({
      timestamp: Date.now(),
      totalVolume
    });
    
    // Maintain history size
    if (this.priceHistory.length > this.MAX_HISTORY_LENGTH) {
      this.priceHistory = this.priceHistory.slice(-this.MAX_HISTORY_LENGTH);
    }
    
    if (this.volumeHistory.length > this.MAX_HISTORY_LENGTH) {
      this.volumeHistory = this.volumeHistory.slice(-this.MAX_HISTORY_LENGTH);
    }
  }

  public getHeatmapData(zones: PressureZone[], priceRange: { min: number; max: number }, resolution: number = 100): Array<{ price: number; intensity: number }> {
    const heatmap: Array<{ price: number; intensity: number }> = [];
    const priceStep = (priceRange.max - priceRange.min) / resolution;
    
    for (let i = 0; i <= resolution; i++) {
      const price = priceRange.min + (i * priceStep);
      const intensity = this.getPressureIntensityAtPrice(price, zones);
      heatmap.push({ price, intensity });
    }
    
    return heatmap;
  }
}
