# Real-Time 3D Orderbook Visualizer

A sophisticated 3D visualization tool for cryptocurrency orderbook data, built with Next.js, Three.js, and React Three Fiber. This application provides real-time orderbook visualization with interactive 3D graphics, multiple viewing modes, and comprehensive data export capabilities.

## 🚀 Features

### Core Functionality
- **Real-time Orderbook Data**: Live cryptocurrency orderbook visualization using WebSocket connections
- **3D Visualization**: Interactive 3D representation of bid/ask orders with depth and volume
- **Multiple View Modes**: Switch between different visualization perspectives and layouts
- **Data Export**: Export orderbook data, analysis, and high-quality screenshots
- **Responsive Design**: Optimized for both desktop and mobile devices

### Advanced Features
- **Pressure Zones**: Visual representation of high-volume trading areas
- **Smooth Transitions**: Animated updates for orderbook changes
- **Interactive Controls**: Full camera controls with rotation, zoom, and pan
- **Historical Data**: View historical orderbook states and changes over time
- **Filtering Options**: Filter orderbook data by price range, volume, and time
- **Theme Support**: Dark and light theme compatibility

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **3D Graphics**: Three.js, React Three Fiber, @react-three/drei
- **Styling**: Tailwind CSS, CSS Custom Properties
- **Data Management**: React Context, Custom Hooks
- **WebSocket**: Real-time data streaming
- **Build Tool**: Webpack, Turbopack
- **Package Manager**: npm/yarn

## 📋 Prerequisites

Before running this project, ensure you have:

- **Node.js** (version 18.0 or higher)
- **npm** (version 8.0 or higher) or **yarn** (version 1.22 or higher)
- **Git** for cloning the repository
- Modern web browser with WebGL support

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <your-github-repo-url>
cd OrderBook3D-main
```

### 2. Install Dependencies
```bash
# Using npm
npm install

# Or using yarn
yarn install
```

### 3. Environment Setup (Optional)
Create a `.env.local` file for any environment variables:
```bash
# Example environment variables
NEXT_PUBLIC_API_URL=your_api_url_here
NEXT_PUBLIC_WS_URL=your_websocket_url_here
```

### 4. Run Development Server
```bash
# Using npm
npm run dev

# Or using yarn
yarn dev
```

### 5. Open in Browser
Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── enhanced-3d/       # Main 3D visualizer page
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── 3d/               # Three.js/R3F components
│   │   ├── SmoothTransitionOrderbook.tsx
│   │   ├── PressureHeatmap.tsx
│   │   └── Visualization3D.tsx
│   └── ui/               # UI components
│       ├── InteractiveControlPanel.tsx
│       ├── ExportControlPanel.tsx
│       └── ThemeToggle.tsx
├── contexts/             # React contexts
│   └── ThemeContext.tsx
├── hooks/               # Custom React hooks
│   ├── useOrderbook.ts
│   ├── useTheme3D.ts
│   └── useWebSocket.ts
├── services/            # Service layers
│   ├── exportService.ts
│   └── websocketService.ts
├── types/              # TypeScript type definitions
│   └── orderbook.ts
└── utils/              # Utility functions
    └── helpers.ts
```

## 🎯 Key Components

### 3D Visualization Components
- **SmoothTransitionOrderbook**: Main 3D orderbook visualization with smooth transitions
- **PressureHeatmap**: Heatmap overlay for pressure zone visualization
- **Visualization3D**: Core 3D scene setup and management

### UI Components
- **InteractiveControlPanel**: Main control interface for visualization settings
- **ExportControlPanel**: Data export and screenshot functionality
- **ThemeToggle**: Theme switching between light/dark modes

### Services
- **exportService**: Handles data export and screenshot generation
- **websocketService**: Manages real-time data connections

## 🔗 APIs Used

### External APIs
- **Binance WebSocket API**: Real-time orderbook data streaming
- **Browser APIs**: 
  - WebGL for 3D rendering
  - Canvas API for screenshot export
  - localStorage for settings persistence
  - matchMedia for theme detection

### Internal APIs
- Custom WebSocket service for data management
- Export service for data and image generation
- Theme context for UI state management

## 🎨 Technical Decisions

### Architecture Decisions
1. **Next.js App Router**: Chosen for better performance and modern React features
2. **React Three Fiber**: Declarative approach to Three.js for better component composition
3. **TypeScript**: Enhanced type safety and developer experience
4. **Context API**: State management for theme and orderbook data
5. **Custom Hooks**: Reusable logic for WebSocket connections and 3D interactions

### Performance Optimizations
1. **Smooth Transitions**: Implemented custom transition system for orderbook updates
2. **Efficient Rendering**: Optimized Three.js geometry updates and material reuse
3. **Responsive Design**: Mobile-optimized controls and layouts
4. **Lazy Loading**: Components loaded on demand for better initial load times

### Design Patterns
1. **Component Composition**: Modular 3D components for reusability
2. **Service Layer**: Separated business logic from UI components
3. **Custom Hooks**: Encapsulated complex state logic
4. **Context Providers**: Centralized state management for themes and data

## 🔧 Configuration

### Tailwind CSS
The project uses Tailwind CSS with custom configuration for:
- Custom color schemes for orderbook visualization
- Responsive design breakpoints
- Dark/light theme variables

### Three.js Setup
- Custom camera controls for 3D navigation
- Optimized rendering settings for performance
- WebGL compatibility checks

## 🐛 Troubleshooting

### Common Issues

1. **White/Empty Screenshots**
   - Ensure WebGL context is preserved
   - Check browser WebGL support
   - Verify canvas timing for capture

2. **Theme Toggle Not Working**
   - Check localStorage permissions
   - Verify CSS custom properties are loaded
   - Ensure theme context is properly wrapped

3. **3D Scene Not Loading**
   - Verify WebGL support in browser
   - Check for JavaScript errors in console
   - Ensure Three.js dependencies are loaded

### Performance Issues
- Reduce orderbook data points for slower devices
- Disable smooth transitions on mobile
- Use lower quality settings for pressure zones

## 📊 Features Demonstration

### Video Recording Checklist
When recording your demonstration video, showcase:

1. **Initial Load**: Application startup and data loading
2. **3D Interaction**: Camera controls, rotation, zoom, pan
3. **Real-time Updates**: Live orderbook data changes
4. **Control Panels**: Interactive controls and settings
5. **Export Functionality**: Data export and screenshot capture
6. **Responsive Design**: Mobile/desktop layouts
7. **Visual Features**: Pressure zones, heatmaps, transitions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Three.js community for excellent 3D graphics library
- React Three Fiber team for declarative Three.js
- Next.js team for the amazing framework
- Binance for providing real-time market data APIs

---

**Note**: This project is a demonstration of 3D data visualization capabilities and should not be used for actual trading decisions.