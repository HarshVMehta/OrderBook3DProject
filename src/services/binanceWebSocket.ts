import { OrderbookSnapshot, OrderbookUpdate, WebSocketMessage } from '@/types/orderbook';

export class BinanceWebSocketService {
  private ws: WebSocket | null = null;
  private symbol: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private onDataCallback?: (data: OrderbookUpdate) => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(symbol: string = 'BTCUSDT') {
    this.symbol = symbol.toLowerCase();
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Use the standard Binance WebSocket URL format for depth updates
        const wsUrl = `wss://stream.binance.com:9443/ws/${this.symbol}@depth`;
        console.log('Connecting to WebSocket:', wsUrl);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log(`Connected to Binance WebSocket for ${this.symbol}`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Received WebSocket data:', data);
            
            // Handle Binance depth stream format
            if (data.e === 'depthUpdate') {
              // This is a depth update event
              const update: OrderbookUpdate = {
                eventType: data.e,
                eventTime: data.E,
                symbol: data.s,
                firstUpdateId: data.U,
                finalUpdateId: data.u,
                bids: data.b || [],
                asks: data.a || []
              };
              
              if (this.onDataCallback) {
                this.onDataCallback(update);
              }
            } else if (data.stream && data.data) {
              // Stream wrapper format
              if (data.data.e === 'depthUpdate' && this.onDataCallback) {
                const update: OrderbookUpdate = {
                  eventType: data.data.e,
                  eventTime: data.data.E,
                  symbol: data.data.s,
                  firstUpdateId: data.data.U,
                  finalUpdateId: data.data.u,
                  bids: data.data.b || [],
                  asks: data.data.a || []
                };
                this.onDataCallback(update);
              }
            } else {
              console.log('Unknown message format:', data);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            if (this.onErrorCallback) {
              this.onErrorCallback(new Error('Failed to parse WebSocket message'));
            }
          }
        };

        this.ws.onerror = (event) => {
          console.error('WebSocket error event:', event);
          const errorMessage = `WebSocket connection failed for ${this.symbol}. Please check your internet connection.`;
          console.error(errorMessage);
          if (this.onErrorCallback) {
            this.onErrorCallback(new Error(errorMessage));
          }
          reject(new Error(errorMessage));
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.isConnected = false;
          
          // Only attempt reconnection if it wasn't a clean close
          if (event.code !== 1000) {
            this.handleReconnect();
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  public onData(callback: (data: OrderbookUpdate) => void): void {
    this.onDataCallback = callback;
  }

  public onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  public setSymbol(symbol: string): void {
    if (symbol !== this.symbol) {
      this.symbol = symbol.toLowerCase();
      if (this.isConnected) {
        this.disconnect();
        this.connect();
      }
    }
  }

  public isConnectedToServer(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error('Failed to reconnect after maximum attempts'));
      }
    }
  }

  // Static method to get orderbook snapshot
  public static async getOrderbookSnapshot(symbol: string, limit: number = 100): Promise<OrderbookSnapshot> {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        bids: data.bids.map(([price, quantity]: [string, string]) => ({ price, quantity })),
        asks: data.asks.map(([price, quantity]: [string, string]) => ({ price, quantity })),
        lastUpdateId: data.lastUpdateId,
        symbol: symbol.toUpperCase(),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching orderbook snapshot:', error);
      throw error;
    }
  }
}
