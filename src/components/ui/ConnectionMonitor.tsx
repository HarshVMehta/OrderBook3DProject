'use client';

import React, { useState, useEffect } from 'react';
import { ConnectionState } from '@/types/orderbook';

interface ConnectionMonitorProps {
  connectionState: ConnectionState;
  isRealTime: boolean;
  error: string | null;
  connectionStats: {
    totalConnections: number;
    reconnections: number;
    dataUpdates: number;
    lastUpdateTime: number;
    averageLatency: number;
    status: ConnectionState;
  } | null;
  dataGapInfo?: {
    detected: boolean;
    lastUpdateTime: number;
    gapDuration: number;
    reconnecting: boolean;
  };
}

export const ConnectionMonitor: React.FC<ConnectionMonitorProps> = ({
  connectionState,
  isRealTime,
  error,
  connectionStats,
  dataGapInfo
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState(0);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate time since last update
  useEffect(() => {
    if (connectionStats?.lastUpdateTime) {
      setTimeSinceLastUpdate(currentTime - connectionStats.lastUpdateTime);
    }
  }, [currentTime, connectionStats?.lastUpdateTime]);

  const getConnectionQuality = () => {
    if (!isRealTime || connectionState !== 'connected') return 'N/A';
    
    if (connectionStats) {
      const { averageLatency, reconnections } = connectionStats;
      
      if (averageLatency < 50 && reconnections === 0) return 'Excellent';
      if (averageLatency < 100 && reconnections < 2) return 'Good';
      if (averageLatency < 200 && reconnections < 5) return 'Fair';
      return 'Poor';
    }
    
    return 'Unknown';
  };

  const getConnectionQualityColor = () => {
    const quality = getConnectionQuality();
    switch (quality) {
      case 'Excellent': return 'text-green-400';
      case 'Good': return 'text-blue-400';
      case 'Fair': return 'text-yellow-400';
      case 'Poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return isRealTime ? '🟢' : '🔵';
      case 'connecting':
        return '🟡';
      case 'error':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <div className="bg-gray-800 bg-opacity-95 rounded-lg p-4 text-white shadow-lg border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <span>{getStatusIcon()}</span>
          <span>Connection Monitor</span>
        </h3>
        {dataGapInfo?.detected && (
          <div className="bg-orange-600 text-white text-xs px-2 py-1 rounded animate-pulse">
            DATA GAP
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Connection Info */}
        <div className="space-y-2">
          <div className="text-gray-300 font-medium">Connection</div>
          <div>
            <span className="text-gray-400">Status:</span>{' '}
            <span className={connectionState === 'connected' ? 'text-green-400' : 'text-yellow-400'}>
              {connectionState}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Mode:</span>{' '}
            <span className={isRealTime ? 'text-green-400' : 'text-blue-400'}>
              {isRealTime ? 'Real-time' : 'Demo'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Quality:</span>{' '}
            <span className={getConnectionQualityColor()}>
              {getConnectionQuality()}
            </span>
          </div>
        </div>

        {/* Statistics */}
        <div className="space-y-2">
          <div className="text-gray-300 font-medium">Statistics</div>
          {connectionStats && (
            <>
              <div>
                <span className="text-gray-400">Updates:</span>{' '}
                <span className="text-cyan-400">{connectionStats.dataUpdates.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-400">Reconnects:</span>{' '}
                <span className="text-orange-400">{connectionStats.reconnections}</span>
              </div>
              <div>
                <span className="text-gray-400">Latency:</span>{' '}
                <span className="text-purple-400">{connectionStats.averageLatency.toFixed(1)}ms</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Data Freshness */}
      {connectionStats?.lastUpdateTime && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Last Update:</span>
            <span className={timeSinceLastUpdate > 5000 ? 'text-yellow-400' : 'text-green-400'}>
              {formatDuration(timeSinceLastUpdate)} ago
            </span>
          </div>
          
          {/* Data freshness indicator */}
          <div className="mt-2">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  timeSinceLastUpdate < 2000 ? 'bg-green-500' :
                  timeSinceLastUpdate < 5000 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ 
                  width: `${Math.max(0, Math.min(100, (10000 - timeSinceLastUpdate) / 100))}%` 
                }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">Data Freshness</div>
          </div>
        </div>
      )}

      {/* Data Gap Info */}
      {dataGapInfo?.detected && (
        <div className="mt-3 pt-3 border-t border-orange-600">
          <div className="text-orange-400 text-sm">
            <div className="font-medium">Data Gap Detected</div>
            <div className="text-xs text-gray-400 mt-1">
              Gap Duration: {formatDuration(dataGapInfo.gapDuration)}
            </div>
            {dataGapInfo.reconnecting && (
              <div className="text-yellow-400 text-xs animate-pulse">
                Attempting reconnection...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Info */}
      {error && (
        <div className="mt-3 pt-3 border-t border-red-600">
          <div className="text-red-400 text-sm">
            <div className="font-medium">Connection Error</div>
            <div className="text-xs text-gray-400 mt-1 break-words">
              {error}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface DataQualityIndicatorProps {
  data: any;
  isConnected: boolean;
  updateRate?: number;
}

export const DataQualityIndicator: React.FC<DataQualityIndicatorProps> = ({
  data,
  isConnected,
  updateRate = 0
}) => {
  const [lastDataHash, setLastDataHash] = useState<string>('');
  const [updateCount, setUpdateCount] = useState(0);
  const [updateFrequency, setUpdateFrequency] = useState(0);

  // Track data changes
  useEffect(() => {
    if (data) {
      const dataString = JSON.stringify(data);
      const hash = dataString.length.toString(); // Simple hash
      
      if (hash !== lastDataHash) {
        setLastDataHash(hash);
        setUpdateCount(prev => prev + 1);
      }
    }
  }, [data, lastDataHash]);

  // Calculate update frequency
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateFrequency(updateRate);
    }, 1000);

    return () => clearInterval(interval);
  }, [updateRate]);

  const getQualityScore = () => {
    if (!isConnected || !data) return 0;
    
    let score = 50; // Base score
    
    // Bonus for having data
    if (data.bids?.length > 0 && data.asks?.length > 0) score += 20;
    
    // Bonus for frequent updates
    if (updateFrequency > 0.5) score += 15;
    if (updateFrequency > 1) score += 10;
    
    // Bonus for data completeness
    if (data.bids?.length >= 10 && data.asks?.length >= 10) score += 5;
    
    return Math.min(100, score);
  };

  const qualityScore = getQualityScore();

  return (
    <div className="bg-gray-800 bg-opacity-95 rounded-lg p-3 text-white shadow-lg border border-gray-700">
      <div className="text-sm font-medium mb-2">Data Quality</div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Score:</span>
          <span className={
            qualityScore >= 80 ? 'text-green-400' :
            qualityScore >= 60 ? 'text-yellow-400' :
            'text-red-400'
          }>
            {qualityScore}/100
          </span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              qualityScore >= 80 ? 'bg-green-500' :
              qualityScore >= 60 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${qualityScore}%` }}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
          <div>Updates: {updateCount}</div>
          <div>Rate: {updateFrequency.toFixed(1)}/s</div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionMonitor;
