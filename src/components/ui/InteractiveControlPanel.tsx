'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SimpleThemeToggle } from './ThemeToggle';

export interface FilterSettings {
  priceRange: {
    min: number;
    max: number;
    enabled: boolean;
  };
  quantityThreshold: {
    min: number;
    max: number;
    enabled: boolean;
  };
  venues: string[];
  timeRange: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | 'live';
  visualizationMode: 'realtime' | 'historical' | 'pressure-zones' | 'heatmap' | 'depth';
  searchQuery: string;
  showBids: boolean;
  showAsks: boolean;
  showPressureZones: boolean;
  showHeatmap: boolean;
  showDepthSurface: boolean;
  autoRotate: boolean;
  showAxisLabels: boolean;
  showGrid: boolean;
  showStatistics: boolean;
}

interface InteractiveControlPanelProps {
  settings: FilterSettings;
  onSettingsChange: (settings: FilterSettings) => void;
  availableVenues: string[];
  currentPrice?: number;
  className?: string;
}

const InteractiveControlPanel: React.FC<InteractiveControlPanelProps> = ({
  settings,
  onSettingsChange,
  availableVenues,
  currentPrice,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'visualization' | 'search' | 'advanced'>('filters');
  const [searchResults, setSearchResults] = useState<Array<{ price: number; quantity: number; venue: string }>>([]);

  const updateSettings = useCallback((updates: Partial<FilterSettings>) => {
    onSettingsChange({ ...settings, ...updates });
  }, [settings, onSettingsChange]);

  const handlePriceRangeChange = (field: 'min' | 'max', value: number) => {
    updateSettings({
      priceRange: {
        ...settings.priceRange,
        [field]: value
      }
    });
  };

  const handleQuantityThresholdChange = (field: 'min' | 'max', value: number) => {
    updateSettings({
      quantityThreshold: {
        ...settings.quantityThreshold,
        [field]: value
      }
    });
  };

  const handleVenueToggle = (venue: string) => {
    const newVenues = settings.venues.includes(venue)
      ? settings.venues.filter(v => v !== venue)
      : [...settings.venues, venue];
    updateSettings({ venues: newVenues });
  };

  const handleTimeRangeChange = (timeRange: FilterSettings['timeRange']) => {
    updateSettings({ timeRange });
  };

  const handleVisualizationModeChange = (mode: FilterSettings['visualizationMode']) => {
    updateSettings({ visualizationMode: mode });
  };

  const handleSearch = (query: string) => {
    updateSettings({ searchQuery: query });
    // Simulate search results - in real implementation, this would search actual data
    if (query.length > 0) {
      const mockResults = [
        { price: 50000, quantity: 1.5, venue: 'Binance' },
        { price: 50100, quantity: 2.1, venue: 'Coinbase' },
        { price: 50200, quantity: 0.8, venue: 'Kraken' }
      ].filter(result => 
        result.price.toString().includes(query) || 
        result.venue.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(mockResults);
    } else {
      setSearchResults([]);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  const formatQuantity = (quantity: number) => {
    return quantity.toFixed(4);
  };

  return (
    <div className={`bg-gray-800 bg-opacity-95 backdrop-blur-sm rounded-lg border border-gray-700 shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Interactive Controls</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-4">
            {[
              { id: 'filters', label: 'Filters', icon: '🔍' },
              { id: 'visualization', label: 'Visualization', icon: '🎨' },
              { id: 'search', label: 'Search', icon: '🔎' },
              { id: 'advanced', label: 'Advanced', icon: '⚙️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters Tab */}
          {activeTab === 'filters' && (
            <div className="space-y-4">
              {/* Price Range Filter */}
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Price Range</label>
                  <input
                    type="checkbox"
                    checked={settings.priceRange.enabled}
                    onChange={(e) => updateSettings({
                      priceRange: { ...settings.priceRange, enabled: e.target.checked }
                    })}
                    className="rounded"
                  />
                </div>
                {settings.priceRange.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400">Min Price</label>
                      <input
                        type="number"
                        value={settings.priceRange.min}
                        onChange={(e) => handlePriceRangeChange('min', parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-600 text-white text-sm rounded px-2 py-1 mt-1"
                        placeholder="Min price"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Max Price</label>
                      <input
                        type="number"
                        value={settings.priceRange.max}
                        onChange={(e) => handlePriceRangeChange('max', parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-600 text-white text-sm rounded px-2 py-1 mt-1"
                        placeholder="Max price"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity Threshold Filter */}
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Quantity Threshold</label>
                  <input
                    type="checkbox"
                    checked={settings.quantityThreshold.enabled}
                    onChange={(e) => updateSettings({
                      quantityThreshold: { ...settings.quantityThreshold, enabled: e.target.checked }
                    })}
                    className="rounded"
                  />
                </div>
                {settings.quantityThreshold.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400">Min Quantity</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={settings.quantityThreshold.min}
                        onChange={(e) => handleQuantityThresholdChange('min', parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-600 text-white text-sm rounded px-2 py-1 mt-1"
                        placeholder="Min quantity"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Max Quantity</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={settings.quantityThreshold.max}
                        onChange={(e) => handleQuantityThresholdChange('max', parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-600 text-white text-sm rounded px-2 py-1 mt-1"
                        placeholder="Max quantity"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Venue Filter */}
              <div className="bg-gray-700 rounded-lg p-3">
                <label className="text-sm font-medium text-white mb-2 block">Venues</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableVenues.map(venue => (
                    <label key={venue} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={settings.venues.includes(venue)}
                        onChange={() => handleVenueToggle(venue)}
                        className="rounded"
                      />
                      <span className="text-gray-300">{venue}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Order Type Filter */}
              <div className="bg-gray-700 rounded-lg p-3">
                <label className="text-sm font-medium text-white mb-2 block">Order Types</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.showBids}
                      onChange={(e) => updateSettings({ showBids: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-green-400">Bids (Buy Orders)</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.showAsks}
                      onChange={(e) => updateSettings({ showAsks: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-red-400">Asks (Sell Orders)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Visualization Tab */}
          {activeTab === 'visualization' && (
            <div className="space-y-4">
              {/* Time Range Selector */}
              <div className="bg-gray-700 rounded-lg p-3">
                <label className="text-sm font-medium text-white mb-2 block">Time Range</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'live', label: 'Live' },
                    { value: '1m', label: '1m' },
                    { value: '5m', label: '5m' },
                    { value: '15m', label: '15m' },
                    { value: '1h', label: '1h' },
                    { value: '4h', label: '4h' },
                    { value: '1d', label: '1d' }
                  ].map(range => (
                    <button
                      key={range.value}
                      onClick={() => handleTimeRangeChange(range.value as any)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        settings.timeRange === range.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Options */}
              <div className="bg-gray-700 rounded-lg p-3">
                <label className="text-sm font-medium text-white mb-2 block">Display Options</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.showPressureZones}
                      onChange={(e) => updateSettings({ showPressureZones: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-gray-300">Pressure Zones</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.showHeatmap}
                      onChange={(e) => updateSettings({ showHeatmap: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-gray-300">Heatmap</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.showDepthSurface}
                      onChange={(e) => updateSettings({ showDepthSurface: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-gray-300">Depth Surface</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.showAxisLabels}
                      onChange={(e) => updateSettings({ showAxisLabels: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-gray-300">Axis Labels</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.showGrid}
                      onChange={(e) => updateSettings({ showGrid: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-gray-300">Grid</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.showStatistics}
                      onChange={(e) => updateSettings({ showStatistics: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-gray-300">Statistics</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              {/* Search Input */}
              <div className="bg-gray-700 rounded-lg p-3">
                <label className="text-sm font-medium text-white mb-2 block">Search Orders</label>
                <input
                  type="text"
                  value={settings.searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by price, quantity, or venue..."
                  className="w-full bg-gray-600 text-white text-sm rounded px-3 py-2"
                />
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-3">
                  <label className="text-sm font-medium text-white mb-2 block">Search Results</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <div key={index} className="flex justify-between items-center text-xs bg-gray-600 rounded px-2 py-1">
                        <div>
                          <div className="text-white">{formatPrice(result.price)}</div>
                          <div className="text-gray-400">{result.venue}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400">{formatQuantity(result.quantity)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Search Buttons */}
              <div className="bg-gray-700 rounded-lg p-3">
                <label className="text-sm font-medium text-white mb-2 block">Quick Search</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'High Volume', query: 'volume>1000' },
                    { label: 'Large Orders', query: 'quantity>5' },
                    { label: 'Price Gaps', query: 'gap>100' },
                    { label: 'Recent Activity', query: 'time<5m' }
                  ].map(quickSearch => (
                    <button
                      key={quickSearch.label}
                      onClick={() => handleSearch(quickSearch.query)}
                      className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded hover:bg-gray-500 transition-colors"
                    >
                      {quickSearch.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              {/* Theme Controls */}
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Theme</label>
                  <SimpleThemeToggle />
                </div>
                <p className="text-xs text-gray-400">Toggle between light and dark modes</p>
              </div>

              {/* Current Price Display */}
              {currentPrice && (
                <div className="bg-gray-700 rounded-lg p-3">
                  <label className="text-sm font-medium text-white mb-2 block">Current Price</label>
                  <div className="text-2xl font-bold text-green-400">
                    {formatPrice(currentPrice)}
                  </div>
                </div>
              )}

              {/* Reset Filters */}
              <div className="bg-gray-700 rounded-lg p-3">
                <button
                  onClick={() => {
                    updateSettings({
                      priceRange: { min: 0, max: 100000, enabled: false },
                      quantityThreshold: { min: 0, max: 1000, enabled: false },
                      venues: availableVenues,
                      searchQuery: '',
                      showBids: true,
                      showAsks: true
                    });
                  }}
                  className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InteractiveControlPanel; 