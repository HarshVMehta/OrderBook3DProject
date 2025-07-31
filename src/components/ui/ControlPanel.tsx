'use client';

import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Eye, 
  EyeOff,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { VisualizationSettings } from '@/types/orderbook';

interface ControlPanelProps {
  settings: VisualizationSettings;
  onSettingsChange: (settings: Partial<VisualizationSettings>) => void;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error' | 'demo';
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  settings,
  onSettingsChange,
  isConnected,
  onConnect,
  onDisconnect,
  connectionStatus
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleSymbolChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({ symbol: event.target.value });
  };

  const handleDepthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ depth: parseInt(event.target.value) });
  };

  const handleUpdateIntervalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ updateInterval: parseInt(event.target.value) });
  };

  const togglePressureZones = () => {
    onSettingsChange({ showPressureZones: !settings.showPressureZones });
  };

  const toggleAutoRotate = () => {
    onSettingsChange({ autoRotate: !settings.autoRotate });
  };

  const toggleTheme = () => {
    onSettingsChange({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'demo': return 'text-blue-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live Data';
      case 'demo': return 'Demo Mode';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  return (
    <div className="fixed top-4 left-4 z-10">
      {/* Main Control Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-gray-800 text-white p-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors mb-2"
      >
        <Settings className="w-6 h-6" />
      </button>

      {/* Expanded Control Panel */}
      {isExpanded && (
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-xl max-w-sm">
          <h3 className="text-lg font-bold mb-4">Orderbook Controls</h3>
          
          {/* Connection Status */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Connection:</span>
              <span className={`text-sm ${getConnectionStatusColor()}`}>
                {getConnectionStatusText()}
              </span>
            </div>
            
            <div className="flex gap-2">
              {!isConnected ? (
                <button
                  onClick={onConnect}
                  disabled={connectionStatus === 'connecting'}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-3 py-1 rounded text-sm transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Connect
                </button>
              ) : (
                <button
                  onClick={onDisconnect}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Symbol Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Trading Pair
            </label>
            <select
              value={settings.symbol}
              onChange={handleSymbolChange}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
            >
              <option value="BTCUSDT">BTC/USDT</option>
              <option value="ETHUSDT">ETH/USDT</option>
              <option value="ADAUSDT">ADA/USDT</option>
              <option value="DOTUSDT">DOT/USDT</option>
              <option value="LINKUSDT">LINK/USDT</option>
              <option value="BNBUSDT">BNB/USDT</option>
              <option value="SOLUSDT">SOL/USDT</option>
            </select>
          </div>

          {/* Depth Setting */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Order Depth: {settings.depth}
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="10"
              value={settings.depth}
              onChange={handleDepthChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>10</span>
              <span>100</span>
            </div>
          </div>

          {/* Update Interval */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Update Rate: {settings.updateInterval}ms
            </label>
            <input
              type="range"
              min="100"
              max="1000"
              step="100"
              value={settings.updateInterval}
              onChange={handleUpdateIntervalChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>100ms</span>
              <span>1000ms</span>
            </div>
          </div>

          {/* Toggle Controls */}
          <div className="space-y-3">
            <button
              onClick={togglePressureZones}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-colors ${
                settings.showPressureZones 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {settings.showPressureZones ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              Pressure Zones
            </button>

            <button
              onClick={toggleAutoRotate}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-colors ${
                settings.autoRotate 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              Auto Rotate
            </button>

            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm bg-gray-600 hover:bg-gray-700 transition-colors"
            >
              <Zap className="w-4 h-4" />
              {settings.theme === 'dark' ? 'Light' : 'Dark'} Theme
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface DataStatsProps {
  data: {
    symbol: string;
    bidCount: number;
    askCount: number;
    spread: number;
    midPrice: number;
    totalVolume: number;
    lastUpdate: number;
  } | null;
}

export const DataStats: React.FC<DataStatsProps> = ({ data }) => {
  if (!data) return null;

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return formatNumber(vol);
  };

  return (
    <div className="fixed bottom-4 left-4 bg-gray-800 text-white p-4 rounded-lg shadow-xl">
      <h3 className="text-lg font-bold mb-3">{data.symbol} Stats</h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="flex items-center gap-2 text-green-400">
            <TrendingUp className="w-4 h-4" />
            <span>Bids: {data.bidCount}</span>
          </div>
          <div className="flex items-center gap-2 text-red-400 mt-1">
            <TrendingDown className="w-4 h-4" />
            <span>Asks: {data.askCount}</span>
          </div>
        </div>
        
        <div>
          <div className="text-gray-300">
            Mid Price: ${formatNumber(data.midPrice)}
          </div>
          <div className="text-gray-300 mt-1">
            Spread: ${formatNumber(data.spread, 4)}
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-600">
        <div className="text-xs text-gray-400">
          Volume: {formatVolume(data.totalVolume)}
        </div>
        <div className="text-xs text-gray-400">
          Updated: {new Date(data.lastUpdate).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
