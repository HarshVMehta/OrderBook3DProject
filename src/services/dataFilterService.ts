import { ProcessedOrderbookData, OrderbookEntry } from '@/types/orderbook';
import { FilterSettings } from '@/components/ui/InteractiveControlPanel';

export interface FilteredOrderbookData {
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  maxQuantity: number;
  priceRange: {
    min: number;
    max: number;
  };
  filteredStats: {
    originalBidCount: number;
    originalAskCount: number;
    filteredBidCount: number;
    filteredAskCount: number;
    totalFiltered: number;
    filterPercentage: number;
  };
}

export class DataFilterService {
  /**
   * Filter orderbook data based on the provided settings
   */
  public filterOrderbookData(
    data: ProcessedOrderbookData,
    settings: FilterSettings
  ): FilteredOrderbookData {
    let filteredBids = [...data.bids];
    let filteredAsks = [...data.asks];

    const originalBidCount = filteredBids.length;
    const originalAskCount = filteredAsks.length;

    // Apply price range filter
    if (settings.priceRange.enabled) {
      filteredBids = filteredBids.filter(order => 
        order.price >= settings.priceRange.min && order.price <= settings.priceRange.max
      );
      filteredAsks = filteredAsks.filter(order => 
        order.price >= settings.priceRange.min && order.price <= settings.priceRange.max
      );
    }

    // Apply quantity threshold filter
    if (settings.quantityThreshold.enabled) {
      filteredBids = filteredBids.filter(order => 
        order.quantity >= settings.quantityThreshold.min && order.quantity <= settings.quantityThreshold.max
      );
      filteredAsks = filteredAsks.filter(order => 
        order.quantity >= settings.quantityThreshold.min && order.quantity <= settings.quantityThreshold.max
      );
    }

    // Apply venue filter (if venue data is available)
    if (settings.venues.length > 0 && settings.venues.length < this.getAvailableVenues(data).length) {
      // This would filter by venue if venue data is available in the orderbook entries
      // For now, we'll skip this as the current data structure doesn't include venue information
    }

    // Apply order type filter
    if (!settings.showBids) {
      filteredBids = [];
    }
    if (!settings.showAsks) {
      filteredAsks = [];
    }

    // Apply search filter
    if (settings.searchQuery.trim()) {
      const searchTerm = settings.searchQuery.toLowerCase();
      filteredBids = filteredBids.filter(order => 
        this.matchesSearch(order, searchTerm)
      );
      filteredAsks = filteredAsks.filter(order => 
        this.matchesSearch(order, searchTerm)
      );
    }

    // Calculate new max quantity from filtered data
    const allFilteredOrders = [...filteredBids, ...filteredAsks];
    const maxQuantity = allFilteredOrders.length > 0 
      ? Math.max(...allFilteredOrders.map(order => order.quantity))
      : 0;

    // Calculate price range from filtered data
    const allPrices = allFilteredOrders.map(order => order.price);
    const priceRange = {
      min: allPrices.length > 0 ? Math.min(...allPrices) : 0,
      max: allPrices.length > 0 ? Math.max(...allPrices) : 0
    };

    const filteredBidCount = filteredBids.length;
    const filteredAskCount = filteredAsks.length;
    const totalFiltered = filteredBidCount + filteredAskCount;
    const totalOriginal = originalBidCount + originalAskCount;
    const filterPercentage = totalOriginal > 0 ? (totalFiltered / totalOriginal) * 100 : 0;

    return {
      bids: filteredBids,
      asks: filteredAsks,
      maxQuantity,
      priceRange,
      filteredStats: {
        originalBidCount,
        originalAskCount,
        filteredBidCount,
        filteredAskCount,
        totalFiltered,
        filterPercentage
      }
    };
  }

  /**
   * Check if an order matches the search query
   */
  private matchesSearch(order: OrderbookEntry, searchTerm: string): boolean {
    return (
      order.price.toString().includes(searchTerm) ||
      order.quantity.toString().includes(searchTerm) ||
      order.timestamp.toString().includes(searchTerm)
    );
  }

  /**
   * Get available venues from the data (placeholder for future implementation)
   */
  private getAvailableVenues(data: ProcessedOrderbookData): string[] {
    // This would extract venue information from the data
    // For now, return default venues
    return ['Binance', 'Coinbase', 'Kraken', 'Bitfinex'];
  }

  /**
   * Apply time range filtering (for historical data)
   */
  public filterByTimeRange(
    data: ProcessedOrderbookData,
    timeRange: FilterSettings['timeRange']
  ): ProcessedOrderbookData {
    if (timeRange === 'live') {
      return data; // Return all data for live mode
    }

    const now = Date.now();
    let timeWindow: number;

    switch (timeRange) {
      case '1m':
        timeWindow = 60 * 1000; // 1 minute
        break;
      case '5m':
        timeWindow = 5 * 60 * 1000; // 5 minutes
        break;
      case '15m':
        timeWindow = 15 * 60 * 1000; // 15 minutes
        break;
      case '1h':
        timeWindow = 60 * 60 * 1000; // 1 hour
        break;
      case '4h':
        timeWindow = 4 * 60 * 60 * 1000; // 4 hours
        break;
      case '1d':
        timeWindow = 24 * 60 * 60 * 1000; // 1 day
        break;
      default:
        return data;
    }

    const cutoffTime = now - timeWindow;

    return {
      ...data,
      bids: data.bids.filter(order => order.timestamp >= cutoffTime),
      asks: data.asks.filter(order => order.timestamp >= cutoffTime)
    };
  }

  /**
   * Get statistics about the filtering
   */
  public getFilterStatistics(
    originalData: ProcessedOrderbookData,
    filteredData: FilteredOrderbookData
  ) {
    const totalOriginal = originalData.bids.length + originalData.asks.length;
    const totalFiltered = filteredData.bids.length + filteredData.asks.length;
    const reductionPercentage = totalOriginal > 0 
      ? ((totalOriginal - totalFiltered) / totalOriginal) * 100 
      : 0;

    return {
      totalOriginal,
      totalFiltered,
      reductionPercentage,
      averagePrice: this.calculateAveragePrice(filteredData),
      totalVolume: this.calculateTotalVolume(filteredData),
      priceSpread: this.calculatePriceSpread(filteredData)
    };
  }

  /**
   * Calculate average price from filtered data
   */
  private calculateAveragePrice(data: FilteredOrderbookData): number {
    const allPrices = [...data.bids, ...data.asks].map(order => order.price);
    return allPrices.length > 0 
      ? allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length 
      : 0;
  }

  /**
   * Calculate total volume from filtered data
   */
  private calculateTotalVolume(data: FilteredOrderbookData): number {
    return [...data.bids, ...data.asks].reduce((sum, order) => sum + order.quantity, 0);
  }

  /**
   * Calculate price spread from filtered data
   */
  private calculatePriceSpread(data: FilteredOrderbookData): number {
    if (data.bids.length === 0 || data.asks.length === 0) {
      return 0;
    }

    const bestBid = Math.max(...data.bids.map(order => order.price));
    const bestAsk = Math.min(...data.asks.map(order => order.price));
    
    return bestAsk - bestBid;
  }

  /**
   * Create a summary of applied filters
   */
  public getFilterSummary(settings: FilterSettings): string[] {
    const summary: string[] = [];

    if (settings.priceRange.enabled) {
      summary.push(`Price: $${settings.priceRange.min.toLocaleString()} - $${settings.priceRange.max.toLocaleString()}`);
    }

    if (settings.quantityThreshold.enabled) {
      summary.push(`Quantity: ${settings.quantityThreshold.min} - ${settings.quantityThreshold.max}`);
    }

    if (settings.venues.length > 0) {
      summary.push(`Venues: ${settings.venues.join(', ')}`);
    }

    if (!settings.showBids || !settings.showAsks) {
      const types = [];
      if (settings.showBids) types.push('Bids');
      if (settings.showAsks) types.push('Asks');
      summary.push(`Orders: ${types.join(', ')}`);
    }

    if (settings.searchQuery.trim()) {
      summary.push(`Search: "${settings.searchQuery}"`);
    }

    if (settings.timeRange !== 'live') {
      summary.push(`Time: ${settings.timeRange}`);
    }

    return summary;
  }

  /**
   * Validate filter settings
   */
  public validateSettings(settings: FilterSettings): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.priceRange.enabled) {
      if (settings.priceRange.min < 0) {
        errors.push('Minimum price cannot be negative');
      }
      if (settings.priceRange.max <= settings.priceRange.min) {
        errors.push('Maximum price must be greater than minimum price');
      }
    }

    if (settings.quantityThreshold.enabled) {
      if (settings.quantityThreshold.min < 0) {
        errors.push('Minimum quantity cannot be negative');
      }
      if (settings.quantityThreshold.max <= settings.quantityThreshold.min) {
        errors.push('Maximum quantity must be greater than minimum quantity');
      }
    }

    if (settings.venues.length === 0) {
      errors.push('At least one venue must be selected');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 