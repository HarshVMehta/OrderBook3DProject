# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview

This is a Next.js TypeScript application for visualizing cryptocurrency orderbook data in 3D. The project uses:

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Three.js** via React Three Fiber for 3D graphics
- **Tailwind CSS** for styling
- **WebSocket** for real-time data streaming
- **Binance API** for orderbook data

## Architecture Guidelines

### 3D Visualization
- Use React Three Fiber for declarative 3D scenes
- Implement orderbook data as 3D mesh objects with price (X), quantity (Y), and time (Z) axes
- Use Three.js materials and geometries for performance optimization
- Implement camera controls for rotation, zoom, and pan

### Real-time Data
- Use WebSocket connections to Binance for real-time orderbook streams
- Implement proper connection management with reconnection logic
- Use React hooks for state management of orderbook data
- Optimize rendering performance for high-frequency updates

### Component Structure
- Create reusable 3D components for bid/ask visualizations
- Implement venue filtering controls
- Add pressure zone analysis with visual indicators
- Use TypeScript interfaces for orderbook data structures

### Performance Considerations
- Implement data throttling for WebSocket streams
- Use React.memo for expensive 3D components
- Optimize Three.js scene updates with useFrame hook
- Consider using Web Workers for data processing

### Styling
- Use Tailwind for UI components and controls
- Implement dark theme optimized for data visualization
- Create responsive layouts that work across devices
- Use consistent color schemes for bid/ask data

## Code Quality
- Maintain strict TypeScript types
- Follow Next.js best practices for App Router
- Implement proper error handling for WebSocket connections
- Add loading states and user feedback
- Use meaningful component and function names related to trading terminology
