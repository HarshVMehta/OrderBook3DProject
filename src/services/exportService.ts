import { ProcessedOrderbookData, OrderbookEntry } from '@/types/orderbook';
import { PressureZoneAnalysis } from './pressureZoneAnalyzer';

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'excel';
  includeMetadata: boolean;
  includePressureZones: boolean;
  includeTimestamp: boolean;
  compressionLevel?: 'none' | 'low' | 'high';
}

export interface OrderbookSnapshot {
  timestamp: string;
  symbol: string;
  data: ProcessedOrderbookData;
  metadata: {
    exportTime: string;
    totalBids: number;
    totalAsks: number;
    spread: number;
    totalVolume: number;
    priceRange: {
      min: number;
      max: number;
      spread: number;
    };
  };
  pressureZoneAnalysis?: PressureZoneAnalysis;
}

export interface AnalysisReport {
  timestamp: string;
  symbol: string;
  summary: {
    totalOrders: number;
    totalVolume: number;
    averageOrderSize: number;
    priceSpread: number;
    marketDepth: number;
  };
  pressureZones: {
    count: number;
    strongestZone: any;
    averageStrength: number;
    distribution: string[];
  };
  marketIndicators: {
    liquidityScore: number;
    volatilityIndicator: number;
    marketDirection: 'bullish' | 'bearish' | 'neutral';
    supportLevels: number[];
    resistanceLevels: number[];
  };
  recommendations: string[];
}

export class OrderbookExportService {
  private static instance: OrderbookExportService;

  public static getInstance(): OrderbookExportService {
    if (!OrderbookExportService.instance) {
      OrderbookExportService.instance = new OrderbookExportService();
    }
    return OrderbookExportService.instance;
  }

  /**
   * Create a snapshot of current orderbook data
   */
  public createSnapshot(
    data: ProcessedOrderbookData,
    symbol: string = 'BTCUSDT',
    pressureZoneAnalysis?: PressureZoneAnalysis
  ): OrderbookSnapshot {
    const timestamp = new Date().toISOString();
    const spread = data.asks.length > 0 && data.bids.length > 0 
      ? data.asks[0].price - data.bids[0].price 
      : 0;

    const totalVolume = [...data.bids, ...data.asks]
      .reduce((sum, order) => sum + order.quantity, 0);

    return {
      timestamp,
      symbol,
      data,
      metadata: {
        exportTime: timestamp,
        totalBids: data.bids.length,
        totalAsks: data.asks.length,
        spread,
        totalVolume,
        priceRange: {
          min: data.priceRange.min,
          max: data.priceRange.max,
          spread: data.priceRange.max - data.priceRange.min,
        },
      },
      pressureZoneAnalysis,
    };
  }

  /**
   * Generate comprehensive analysis report
   */
  public generateAnalysisReport(
    data: ProcessedOrderbookData,
    pressureZoneAnalysis: PressureZoneAnalysis,
    symbol: string = 'BTCUSDT'
  ): AnalysisReport {
    const allOrders = [...data.bids, ...data.asks];
    const totalVolume = allOrders.reduce((sum, order) => sum + order.quantity, 0);
    const averageOrderSize = totalVolume / allOrders.length;
    const spread = data.asks.length > 0 && data.bids.length > 0 
      ? data.asks[0].price - data.bids[0].price 
      : 0;

    // Calculate market indicators
    const liquidityScore = this.calculateLiquidityScore(data);
    const volatilityIndicator = this.calculateVolatilityIndicator(data);
    const marketDirection = this.determineMarketDirection(data, pressureZoneAnalysis);
    const supportLevels = this.findSupportLevels(data.bids);
    const resistanceLevels = this.findResistanceLevels(data.asks);

    // Generate recommendations
    const recommendations = this.generateRecommendations(data, pressureZoneAnalysis);

    return {
      timestamp: new Date().toISOString(),
      symbol,
      summary: {
        totalOrders: allOrders.length,
        totalVolume,
        averageOrderSize,
        priceSpread: spread,
        marketDepth: data.maxQuantity,
      },
      pressureZones: {
        count: pressureZoneAnalysis.zones.length,
        strongestZone: pressureZoneAnalysis.zones[0] || null,
        averageStrength: pressureZoneAnalysis.zones.reduce((sum, zone) => sum + zone.strength, 0) / pressureZoneAnalysis.zones.length,
        distribution: pressureZoneAnalysis.zones.map(zone => `${zone.type} at $${zone.centerPrice.toFixed(2)}`),
      },
      marketIndicators: {
        liquidityScore,
        volatilityIndicator,
        marketDirection,
        supportLevels,
        resistanceLevels,
      },
      recommendations,
    };
  }

  /**
   * Export snapshot as JSON
   */
  public exportAsJSON(snapshot: OrderbookSnapshot, filename?: string): void {
    const data = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    this.downloadFile(blob, filename || `orderbook-snapshot-${snapshot.timestamp}.json`);
  }

  /**
   * Export data as CSV
   */
  public exportAsCSV(data: ProcessedOrderbookData, filename?: string): void {
    const csvContent = this.convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    this.downloadFile(blob, filename || `orderbook-data-${new Date().toISOString()}.csv`);
  }

  /**
   * Export analysis report as JSON
   */
  public exportAnalysisReport(report: AnalysisReport, filename?: string): void {
    const data = JSON.stringify(report, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    this.downloadFile(blob, filename || `analysis-report-${report.timestamp}.json`);
  }

  /**
   * Export analysis report as formatted text
   */
  public exportAnalysisReportAsText(report: AnalysisReport, filename?: string): void {
    const textContent = this.formatAnalysisReportAsText(report);
    const blob = new Blob([textContent], { type: 'text/plain' });
    this.downloadFile(blob, filename || `analysis-report-${report.timestamp}.txt`);
  }

  /**
   * Batch export multiple snapshots
   */
  public exportBatch(snapshots: OrderbookSnapshot[], format: 'json' | 'csv' = 'json'): void {
    if (format === 'json') {
      const batchData = {
        exportTime: new Date().toISOString(),
        count: snapshots.length,
        snapshots,
      };
      const data = JSON.stringify(batchData, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      this.downloadFile(blob, `orderbook-batch-export-${new Date().toISOString()}.json`);
    } else {
      // For CSV, combine all data
      const combinedCSV = snapshots.map(snapshot => 
        this.convertToCSV(snapshot.data, snapshot.timestamp)
      ).join('\n\n');
      const blob = new Blob([combinedCSV], { type: 'text/csv' });
      this.downloadFile(blob, `orderbook-batch-export-${new Date().toISOString()}.csv`);
    }
  }

  // Private helper methods
  private convertToCSV(data: ProcessedOrderbookData, timestamp?: string): string {
    const headers = ['Type', 'Price', 'Quantity', 'Timestamp', 'Total'];
    const rows = [headers.join(',')];

    // Add bid data
    data.bids.forEach(bid => {
      rows.push(`Bid,${bid.price},${bid.quantity},${timestamp || bid.timestamp},${bid.price * bid.quantity}`);
    });

    // Add ask data
    data.asks.forEach(ask => {
      rows.push(`Ask,${ask.price},${ask.quantity},${timestamp || ask.timestamp},${ask.price * ask.quantity}`);
    });

    return rows.join('\n');
  }

  private formatAnalysisReportAsText(report: AnalysisReport): string {
    return `
ORDERBOOK ANALYSIS REPORT
========================
Generated: ${report.timestamp}
Symbol: ${report.symbol}

MARKET SUMMARY
--------------
Total Orders: ${report.summary.totalOrders}
Total Volume: ${report.summary.totalVolume.toFixed(2)}
Average Order Size: ${report.summary.averageOrderSize.toFixed(2)}
Price Spread: $${report.summary.priceSpread.toFixed(2)}
Market Depth: ${report.summary.marketDepth.toFixed(2)}

PRESSURE ZONES
--------------
Zone Count: ${report.pressureZones.count}
Average Strength: ${report.pressureZones.averageStrength.toFixed(2)}
Distribution:
${report.pressureZones.distribution.map(zone => `  - ${zone}`).join('\n')}

MARKET INDICATORS
-----------------
Liquidity Score: ${report.marketIndicators.liquidityScore.toFixed(2)}
Volatility Indicator: ${report.marketIndicators.volatilityIndicator.toFixed(2)}
Market Direction: ${report.marketIndicators.marketDirection.toUpperCase()}

Support Levels: ${report.marketIndicators.supportLevels.map(level => `$${level.toFixed(2)}`).join(', ')}
Resistance Levels: ${report.marketIndicators.resistanceLevels.map(level => `$${level.toFixed(2)}`).join(', ')}

RECOMMENDATIONS
---------------
${report.recommendations.map(rec => `• ${rec}`).join('\n')}

Generated by Enhanced 3D Orderbook Visualization System
    `;
  }

  private calculateLiquidityScore(data: ProcessedOrderbookData): number {
    const totalVolume = [...data.bids, ...data.asks].reduce((sum, order) => sum + order.quantity, 0);
    const orderCount = data.bids.length + data.asks.length;
    return Math.min(100, (totalVolume / 1000) + (orderCount / 10));
  }

  private calculateVolatilityIndicator(data: ProcessedOrderbookData): number {
    if (data.bids.length === 0 || data.asks.length === 0) return 0;
    const spread = data.asks[0].price - data.bids[0].price;
    const midPrice = (data.asks[0].price + data.bids[0].price) / 2;
    return (spread / midPrice) * 100;
  }

  private determineMarketDirection(data: ProcessedOrderbookData, analysis: PressureZoneAnalysis): 'bullish' | 'bearish' | 'neutral' {
    const bidVolume = data.bids.reduce((sum, bid) => sum + bid.quantity, 0);
    const askVolume = data.asks.reduce((sum, ask) => sum + ask.quantity, 0);
    const volumeRatio = bidVolume / (bidVolume + askVolume);
    
    if (volumeRatio > 0.6) return 'bullish';
    if (volumeRatio < 0.4) return 'bearish';
    return 'neutral';
  }

  private findSupportLevels(bids: OrderbookEntry[]): number[] {
    return bids
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3)
      .map(bid => bid.price);
  }

  private findResistanceLevels(asks: OrderbookEntry[]): number[] {
    return asks
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3)
      .map(ask => ask.price);
  }

  private generateRecommendations(data: ProcessedOrderbookData, analysis: PressureZoneAnalysis): string[] {
    const recommendations: string[] = [];
    
    if (analysis.zones.length > 5) {
      recommendations.push('High pressure zone activity detected - consider monitoring for breakout signals');
    }
    
    if (data.bids.length > data.asks.length * 1.5) {
      recommendations.push('Strong bid-side liquidity suggests potential upward price pressure');
    }
    
    if (data.asks.length > data.bids.length * 1.5) {
      recommendations.push('Heavy ask-side liquidity may indicate selling pressure');
    }
    
    const spread = data.asks[0]?.price - data.bids[0]?.price;
    if (spread > (data.bids[0]?.price || 0) * 0.001) {
      recommendations.push('Wide bid-ask spread indicates low liquidity - exercise caution with large orders');
    }
    
    return recommendations.length > 0 ? recommendations : ['Market conditions appear normal - continue monitoring'];
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
