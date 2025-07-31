'use client';

import React from 'react';
import { FilterSettings } from './InteractiveControlPanel';
import { FilteredOrderbookData } from '@/services/dataFilterService';

interface FilterStatisticsProps {
  originalData: any;
  filteredData: FilteredOrderbookData;
  settings: FilterSettings;
  className?: string;
}

const FilterStatistics: React.FC<FilterStatisticsProps> = ({
  originalData,
  filteredData,
  settings,
  className = ''
}) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
    return volume.toFixed(2);
  };

  const getFilterSummary = () => {
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
  };

  const totalOriginal = filteredData.filteredStats.originalBidCount + filteredData.filteredStats.originalAskCount;
  const totalFiltered = filteredData.filteredStats.filteredBidCount + filteredData.filteredStats.filteredAskCount;
  const reductionPercentage = totalOriginal > 0 
    ? ((totalOriginal - totalFiltered) / totalOriginal) * 100 
    : 0;

  const averagePrice = filteredData.bids.length > 0 || filteredData.asks.length > 0
    ? [...filteredData.bids, ...filteredData.asks].reduce((sum, order) => sum + order.price, 0) / 
      (filteredData.bids.length + filteredData.asks.length)
    : 0;

  const totalVolume = [...filteredData.bids, ...filteredData.asks].reduce((sum, order) => sum + order.quantity, 0);

  const priceSpread = filteredData.bids.length > 0 && filteredData.asks.length > 0
    ? Math.min(...filteredData.asks.map(order => order.price)) - Math.max(...filteredData.bids.map(order => order.price))
    : 0;

  return (
    <div className={`bg-gray-800 bg-opacity-95 backdrop-blur-sm rounded-lg border border-gray-700 shadow-xl ${className}`}>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Filter Statistics</h3>
        
        {/* Filter Summary */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Active Filters</h4>
          <div className="space-y-1">
            {getFilterSummary().length > 0 ? (
              getFilterSummary().map((filter, index) => (
                <div key={index} className="text-xs text-gray-400 bg-gray-700 rounded px-2 py-1">
                  {filter}
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-500 italic">No filters applied</div>
            )}
          </div>
        </div>

        {/* Data Statistics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-700 rounded p-3">
            <div className="text-xs text-gray-400">Total Orders</div>
            <div className="text-lg font-bold text-white">
              {formatNumber(totalFiltered)}
              <span className="text-xs text-gray-400 ml-1">
                / {formatNumber(totalOriginal)}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {formatPercentage(filteredData.filteredStats.filterPercentage)} shown
            </div>
          </div>

          <div className="bg-gray-700 rounded p-3">
            <div className="text-xs text-gray-400">Reduction</div>
            <div className="text-lg font-bold text-orange-400">
              {formatPercentage(reductionPercentage)}
            </div>
            <div className="text-xs text-gray-400">
              {formatNumber(totalOriginal - totalFiltered)} filtered out
            </div>
          </div>
        </div>

        {/* Order Type Breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-green-900/20 rounded p-3 border border-green-700/30">
            <div className="text-xs text-green-400">Bids</div>
            <div className="text-lg font-bold text-green-300">
              {formatNumber(filteredData.filteredStats.filteredBidCount)}
            </div>
            <div className="text-xs text-gray-400">
              {formatPercentage(
                filteredData.filteredStats.originalBidCount > 0 
                  ? (filteredData.filteredStats.filteredBidCount / filteredData.filteredStats.originalBidCount) * 100
                  : 0
              )}
            </div>
          </div>

          <div className="bg-red-900/20 rounded p-3 border border-red-700/30">
            <div className="text-xs text-red-400">Asks</div>
            <div className="text-lg font-bold text-red-300">
              {formatNumber(filteredData.filteredStats.filteredAskCount)}
            </div>
            <div className="text-xs text-gray-400">
              {formatPercentage(
                filteredData.filteredStats.originalAskCount > 0 
                  ? (filteredData.filteredStats.filteredAskCount / filteredData.filteredStats.originalAskCount) * 100
                  : 0
              )}
            </div>
          </div>
        </div>

        {/* Market Metrics */}
        <div className="space-y-3">
          <div className="bg-gray-700 rounded p-3">
            <div className="text-xs text-gray-400">Average Price</div>
            <div className="text-lg font-bold text-white">
              {formatPrice(averagePrice)}
            </div>
          </div>

          <div className="bg-gray-700 rounded p-3">
            <div className="text-xs text-gray-400">Total Volume</div>
            <div className="text-lg font-bold text-blue-400">
              {formatVolume(totalVolume)}
            </div>
          </div>

          <div className="bg-gray-700 rounded p-3">
            <div className="text-xs text-gray-400">Price Spread</div>
            <div className="text-lg font-bold text-yellow-400">
              {formatPrice(priceSpread)}
            </div>
          </div>

          <div className="bg-gray-700 rounded p-3">
            <div className="text-xs text-gray-400">Price Range</div>
            <div className="text-sm text-white">
              {formatPrice(filteredData.priceRange.min)} - {formatPrice(filteredData.priceRange.max)}
            </div>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Filter Performance</span>
            <span className={`font-medium ${
              reductionPercentage > 50 ? 'text-green-400' :
              reductionPercentage > 20 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {reductionPercentage > 50 ? 'High' : reductionPercentage > 20 ? 'Medium' : 'Low'} Impact
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(reductionPercentage, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterStatistics; 