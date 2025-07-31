# Orderbook Depth 3D Visualizer

A Next.js application that displays a rotating 3D graph visualization of cryptocurrency orderbook data with real-time updates, venue filtering, and pressure zone analysis.

## Features

### 🎯 Core Functionality
- **Real-time 3D Visualization**: Interactive orderbook depth chart with Three.js
- **Live Data Streaming**: WebSocket connection to Binance API for real-time updates
- **Multiple Trading Pairs**: Support for BTC/USDT, ETH/USDT, ADA/USDT, and more
- **Pressure Zone Analysis**: Automatic detection of support and resistance levels

### 📊 Visualization Details
- **X-axis**: Price levels (bid/ask prices)
- **Y-axis**: Order quantities (volume at each price level)
- **Z-axis**: Time depth (historical orderbook states)
- **Color Coding**: Green for bids (buy orders), Red for asks (sell orders)

### 🎛️ Interactive Controls
- **Camera Controls**: Rotate, zoom, and pan around the 3D scene
- **Auto-rotation**: Optional automatic camera rotation
- **Depth Configuration**: Adjustable orderbook depth (10-100 levels)
- **Update Rate Control**: Configurable data refresh intervals
- **Theme Toggle**: Dark/light theme support
- **Performance Monitor**: Real-time FPS counter

### 📡 Data Features
- **Real-time Statistics**: Live bid/ask counts, spread, mid-price, volume
- **Connection Status**: Visual indicators for WebSocket connection state
- **Error Handling**: Robust error handling with user feedback
- **Data Processing**: Advanced orderbook update processing with conflict resolution

## Technology Stack

- **Frontend**: Next.js 14 with App Router
- **Language**: TypeScript for type safety
- **3D Graphics**: Three.js with React Three Fiber
- **Styling**: Tailwind CSS
- **Data Source**: Binance WebSocket API (free tier)
- **Icons**: Lucide React
- **State Management**: React Hooks

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd orderb_pro
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Usage

1. **Getting Started**: Click the "Get Started" button on the welcome screen
2. **Settings Panel**: Click the settings icon (⚙️) in the top-left to access controls
3. **Connect to Data**: Use the Connect button to start real-time data streaming
4. **Interact with 3D Scene**: 
   - Mouse drag to rotate
   - Mouse wheel to zoom
   - Right-click drag to pan
5. **Configure Visualization**:
   - Change trading pairs
   - Adjust orderbook depth
   - Toggle pressure zones
   - Enable auto-rotation

## Project Structure

```
src/
├── app/
│   └── page.tsx              # Main application page
├── components/
│   ├── 3d/
│   │   ├── OrderbookMesh.tsx # 3D mesh components
│   │   └── OrderbookScene3D.tsx # Main 3D scene
│   └── ui/
│       └── ControlPanel.tsx  # UI controls and stats
├── hooks/
│   └── useOrderbook.ts       # Orderbook data management hook
├── services/
│   └── binanceWebSocket.ts   # WebSocket service for Binance API
├── types/
│   └── orderbook.ts          # TypeScript type definitions
└── utils/
    └── orderbookProcessor.ts # Data processing utilities
```

## API Integration

The application uses the free Binance API endpoints:

- **REST API**: `https://api.binance.com/api/v3/depth` for initial snapshots
- **WebSocket**: `wss://stream.binance.com:9443/ws/{symbol}@depth` for real-time updates

No API key required for the endpoints used.

## Performance Considerations

- **Data Throttling**: Configurable update intervals to manage performance
- **Mesh Optimization**: Efficient Three.js geometry for large datasets
- **Memory Management**: Automatic cleanup of historical data
- **Frame Rate Monitoring**: Built-in FPS counter

## Customization

### Adding New Trading Pairs
Update the symbol selection in `ControlPanel.tsx`:

```typescript
<option value="NEWUSDT">NEW/USDT</option>
```

### Modifying 3D Appearance
Customize colors, materials, and lighting in `OrderbookScene3D.tsx` and `OrderbookMesh.tsx`.

### Extending Data Sources
Implement additional venue support by extending the WebSocket service pattern.

## Troubleshooting

### Common Issues

1. **WebSocket Connection Fails**: Check network connectivity and firewall settings
2. **3D Scene Not Loading**: Ensure WebGL is enabled in your browser
3. **Performance Issues**: Reduce orderbook depth or increase update interval
4. **CORS Errors**: The app uses Binance public APIs which should not have CORS issues

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: WebGL support required

## Development

### Building for Production
```bash
npm run build
npm start
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- **Binance API** for providing free cryptocurrency data
- **Three.js** for 3D graphics capabilities
- **React Three Fiber** for React integration
- **Next.js** for the application framework
