import { OrderbookSnapshot, OrderbookUpdate, OrderbookLevel, PressureZone } from '@/types/orderbook';

export class OrderbookSimulator {
  private symbol: string;
  private basePrice: number;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private onDataCallback?: (data: OrderbookUpdate) => void;
  private updateId: number = 1000;
  private pressureZones: PressureZone[] = [];
  private orderHistory: { price: number; quantity: number; timestamp: number; side: 'bid' | 'ask' }[] = [];

  constructor(symbol: string = 'BTCUSDT') {
    this.symbol = symbol.toUpperCase();
    // Set realistic base prices for different symbols
    switch (this.symbol) {
      case 'BTCUSDT':
        this.basePrice = 65000;
        break;
      case 'ETHUSDT':
        this.basePrice = 3500;
        break;
      case 'ADAUSDT':
        this.basePrice = 0.45;
        break;
      default:
        this.basePrice = 100;
    }
  }

  public generateSnapshot(depth: number = 50): OrderbookSnapshot {
    const bids: OrderbookLevel[] = [];
    const asks: OrderbookLevel[] = [];

    // Generate pressure zones first
    this.generatePressureZones();

    // Generate bid levels (below base price)
    for (let i = 0; i < depth; i++) {
      const priceOffset = (i + 1) * (this.basePrice * 0.001); // 0.1% steps
      const price = this.basePrice - priceOffset;
      let quantity = this.generateQuantity();
      
      // Amplify quantity if in pressure zone
      quantity = this.amplifyQuantityInPressureZone(price, quantity, 'bid');
      
      bids.push({
        price: price.toFixed(8),
        quantity: quantity.toFixed(8)
      });
    }

    // Generate ask levels (above base price)
    for (let i = 0; i < depth; i++) {
      const priceOffset = (i + 1) * (this.basePrice * 0.001); // 0.1% steps
      const price = this.basePrice + priceOffset;
      let quantity = this.generateQuantity();
      
      // Amplify quantity if in pressure zone
      quantity = this.amplifyQuantityInPressureZone(price, quantity, 'ask');
      
      asks.push({
        price: price.toFixed(8),
        quantity: quantity.toFixed(8)
      });
    }

    return {
      bids,
      asks,
      lastUpdateId: this.updateId++,
      symbol: this.symbol,
      timestamp: Date.now()
    };
  }

  public start(updateInterval: number = 500): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      if (this.onDataCallback) {
        const update = this.generateUpdate();
        this.onDataCallback(update);
      }
    }, updateInterval);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public onData(callback: (data: OrderbookUpdate) => void): void {
    this.onDataCallback = callback;
  }

  public setSymbol(symbol: string): void {
    this.symbol = symbol.toUpperCase();
    // Update base price for new symbol
    switch (this.symbol) {
      case 'BTCUSDT':
        this.basePrice = 65000 + (Math.random() - 0.5) * 1000;
        break;
      case 'ETHUSDT':
        this.basePrice = 3500 + (Math.random() - 0.5) * 100;
        break;
      case 'ADAUSDT':
        this.basePrice = 0.45 + (Math.random() - 0.5) * 0.05;
        break;
      default:
        this.basePrice = 100 + (Math.random() - 0.5) * 10;
    }
  }

  private generateUpdate(): OrderbookUpdate {
    const bids: OrderbookLevel[] = [];
    const asks: OrderbookLevel[] = [];

    // Generate 1-3 random bid updates
    const bidCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < bidCount; i++) {
      const priceOffset = Math.random() * (this.basePrice * 0.01); // Up to 1% below base
      const price = this.basePrice - priceOffset;
      const quantity = Math.random() < 0.1 ? 0 : this.generateQuantity(); // 10% chance of removal
      
      bids.push({
        price: price.toFixed(8),
        quantity: quantity.toFixed(8)
      });
    }

    // Generate 1-3 random ask updates
    const askCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < askCount; i++) {
      const priceOffset = Math.random() * (this.basePrice * 0.01); // Up to 1% above base
      const price = this.basePrice + priceOffset;
      const quantity = Math.random() < 0.1 ? 0 : this.generateQuantity(); // 10% chance of removal
      
      asks.push({
        price: price.toFixed(8),
        quantity: quantity.toFixed(8)
      });
    }

    // Add some price movement
    this.basePrice += (Math.random() - 0.5) * (this.basePrice * 0.0001);

    return {
      eventType: 'depthUpdate',
      eventTime: Date.now(),
      symbol: this.symbol,
      firstUpdateId: this.updateId,
      finalUpdateId: this.updateId + 1,
      bids,
      asks
    };
  }

  private generateQuantity(): number {
    // Generate realistic quantities with some large orders and many small ones
    const random = Math.random();
    if (random < 0.1) {
      // 10% chance of large order
      return Math.random() * 50 + 10;
    } else if (random < 0.3) {
      // 20% chance of medium order
      return Math.random() * 10 + 1;
    } else {
      // 70% chance of small order
      return Math.random() * 1 + 0.1;
    }
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  public getPressureZones(): PressureZone[] {
    return this.pressureZones;
  }

  private generatePressureZones(): void {
    this.pressureZones = [];
    
    // Generate 2-4 random pressure zones
    const zoneCount = Math.floor(Math.random() * 3) + 2;
    
    for (let i = 0; i < zoneCount; i++) {
      const side: 'bid' | 'ask' = Math.random() < 0.5 ? 'bid' : 'ask';
      const priceRange = this.basePrice * 0.02; // 2% range
      const centerOffset = (Math.random() - 0.5) * priceRange;
      const centerPrice = side === 'bid' 
        ? this.basePrice - Math.abs(centerOffset) - (this.basePrice * 0.005)
        : this.basePrice + Math.abs(centerOffset) + (this.basePrice * 0.005);
      
      const totalVolume = Math.random() * 1000 + 500;
      const intensity = Math.random() * 0.8 + 0.2; // 0.2 to 1.0
      const pressureType = this.determinePressureType();
      
      const zone: PressureZone = {
        id: `zone_${i}_${Date.now()}`,
        type: side === 'bid' ? 'support' : 'resistance',
        pressureType,
        price: centerPrice,
        centerPrice,
        minPrice: centerPrice - (this.basePrice * 0.002),
        maxPrice: centerPrice + (this.basePrice * 0.002),
        strength: intensity,
        intensity,
        volume: totalVolume,
        totalVolume,
        averageQuantity: Math.random() * 50 + 25,
        orderCount: Math.floor(Math.random() * 20) + 10,
        side,
        timestamp: Date.now(),
        isActive: true
      };
      
      this.pressureZones.push(zone);
    }
  }

  private amplifyQuantityInPressureZone(price: number, baseQuantity: number, side: 'bid' | 'ask'): number {
    for (const zone of this.pressureZones) {
      if (zone.side === side && price >= zone.minPrice && price <= zone.maxPrice) {
        // Amplify quantity based on zone intensity
        const amplification = 1 + (zone.intensity * 3); // 1x to 4x amplification
        return baseQuantity * amplification;
      }
    }
    return baseQuantity;
  }

  private determinePressureType(): 'support' | 'resistance' | 'accumulation' | 'distribution' {
    const types: ('support' | 'resistance' | 'accumulation' | 'distribution')[] = [
      'support', 'resistance', 'accumulation', 'distribution'
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  private updateOrderHistory(price: number, quantity: number, side: 'bid' | 'ask'): void {
    this.orderHistory.push({
      price,
      quantity,
      timestamp: Date.now(),
      side
    });
    
    // Keep only last 1000 orders
    if (this.orderHistory.length > 1000) {
      this.orderHistory = this.orderHistory.slice(-1000);
    }
  }

  private detectPressureZonesFromHistory(): PressureZone[] {
    const zones: PressureZone[] = [];
    const priceGroups = new Map<string, { orders: Array<{ price: number; quantity: number; timestamp: number; side: 'bid' | 'ask' }>, totalVolume: number }>();
    
    // Group orders by price ranges
    for (const order of this.orderHistory) {
      const priceGroup = Math.floor(order.price / (this.basePrice * 0.001)) * (this.basePrice * 0.001);
      const key = `${priceGroup}_${order.side}`;
      
      if (!priceGroups.has(key)) {
        priceGroups.set(key, { orders: [], totalVolume: 0 });
      }
      
      const group = priceGroups.get(key)!;
      group.orders.push(order);
      group.totalVolume += order.quantity;
    }
    
    // Identify high-volume groups as pressure zones
    for (const [key, group] of priceGroups) {
      if (group.totalVolume > 100 && group.orders.length > 5) { // Threshold for pressure zone
        const [priceStr, side] = key.split('_');
        const centerPrice = parseFloat(priceStr);
        
        zones.push({
          id: `detected_${centerPrice}_${side}`,
          type: side === 'bid' ? 'support' : 'resistance',
          pressureType: side === 'bid' ? 'support' : 'resistance',
          price: centerPrice,
          centerPrice,
          minPrice: centerPrice - (this.basePrice * 0.0005),
          maxPrice: centerPrice + (this.basePrice * 0.0005),
          strength: Math.min(group.totalVolume / 500, 1),
          intensity: Math.min(group.totalVolume / 1000, 1), // Normalize intensity
          volume: group.totalVolume,
          totalVolume: group.totalVolume,
          averageQuantity: group.totalVolume / group.orders.length,
          orderCount: group.orders.length,
          side: side as 'bid' | 'ask',
          timestamp: Math.max(...group.orders.map((o: { timestamp: number }) => o.timestamp)),
          isActive: true
        });
      }
    }
    
    return zones;
  }
}
