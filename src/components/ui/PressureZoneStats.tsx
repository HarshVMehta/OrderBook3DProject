'use client';

import React from 'react';
import { PressureZoneAnalysis, PressureZoneAlert } from '@/services/pressureZoneAnalyzer';

interface PressureZoneStatsProps {
  analysis: PressureZoneAnalysis | null;
  className?: string;
}

const PressureZoneStats: React.FC<PressureZoneStatsProps> = ({ analysis, className = '' }) => {
  if (!analysis) {
    return (
      <div className={`bg-gray-800 p-4 rounded-lg ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-2">Pressure Zone Analysis</h3>
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }

  const { statistics, alerts } = analysis;

  const getSeverityColor = (severity: PressureZoneAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-300 bg-red-900/30 border-red-700/50';
      case 'high': return 'text-red-400 bg-red-900/20 border-red-700/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30';
      case 'low': return 'text-green-400 bg-green-900/20 border-green-700/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-700/30';
    }
  };

  const getAlertIcon = (type: PressureZoneAlert['type']) => {
    switch (type) {
      case 'formation': return '🆕';
      case 'breach': return '⚠️';
      case 'strengthening': return '📈';
      case 'weakening': return '📉';
      case 'volume_spike': return '💥';
      case 'cluster_formation': return '🎯';
      default: return '📊';
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toFixed(1);
  };

  return (
    <div className={`bg-gray-800 p-4 rounded-lg ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">Pressure Zone Analysis</h3>
      
      {/* Enhanced Statistics Overview */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-sm text-gray-400">Total Zones</div>
          <div className="text-xl font-bold text-white">{statistics.totalZones}</div>
        </div>
        
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-sm text-gray-400">Avg Intensity</div>
          <div className="text-xl font-bold text-white">{(statistics.averageIntensity * 100).toFixed(1)}%</div>
        </div>
        
        <div className="bg-green-900/20 p-3 rounded border border-green-700/30">
          <div className="text-sm text-green-400">Support Zones</div>
          <div className="text-xl font-bold text-green-300">{statistics.supportZones}</div>
        </div>
        
        <div className="bg-red-900/20 p-3 rounded border border-red-700/30">
          <div className="text-sm text-red-400">Resistance Zones</div>
          <div className="text-xl font-bold text-red-300">{statistics.resistanceZones}</div>
        </div>
      </div>

      {/* Volume Distribution Analysis */}
      {statistics.volumeDistribution && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-white mb-3">Volume Analysis</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-900/20 p-3 rounded border border-blue-700/30">
              <div className="text-sm text-blue-400">Total Volume</div>
              <div className="text-lg font-bold text-blue-300">{formatVolume(statistics.volumeDistribution.totalVolume)}</div>
            </div>
            <div className="bg-purple-900/20 p-3 rounded border border-purple-700/30">
              <div className="text-sm text-purple-400">Avg Volume</div>
              <div className="text-lg font-bold text-purple-300">{formatVolume(statistics.volumeDistribution.averageVolume)}</div>
            </div>
            <div className="bg-orange-900/20 p-3 rounded border border-orange-700/30">
              <div className="text-sm text-orange-400">Volume Spikes</div>
              <div className="text-lg font-bold text-orange-300">{statistics.volumeDistribution.volumeSpikes}</div>
            </div>
          </div>
        </div>
      )}

      {/* Cluster Analysis */}
      {statistics.priceClusters && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-white mb-3">Cluster Analysis</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-indigo-900/20 p-3 rounded border border-indigo-700/30">
              <div className="text-sm text-indigo-400">Total Clusters</div>
              <div className="text-lg font-bold text-indigo-300">{statistics.priceClusters.totalClusters}</div>
            </div>
            <div className="bg-teal-900/20 p-3 rounded border border-teal-700/30">
              <div className="text-sm text-teal-400">Avg Cluster Size</div>
              <div className="text-lg font-bold text-teal-300">{statistics.priceClusters.averageClusterSize.toFixed(1)}</div>
            </div>
            <div className="bg-pink-900/20 p-3 rounded border border-pink-700/30">
              <div className="text-sm text-pink-400">Largest Cluster</div>
              <div className="text-lg font-bold text-pink-300">{statistics.priceClusters.largestCluster}</div>
            </div>
          </div>
        </div>
      )}

      {/* Strongest Zone */}
      {statistics.strongestZone && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-white mb-2">Strongest Zone</h4>
          <div className="bg-blue-900/20 p-3 rounded border border-blue-700/30">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-blue-300 font-semibold">
                  {statistics.strongestZone.pressureType.toUpperCase()} - ${statistics.strongestZone.centerPrice.toFixed(2)}
                </div>
                <div className="text-sm text-gray-400">
                  {statistics.strongestZone.type} • {statistics.strongestZone.orderCount} orders
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Volume: {formatVolume(statistics.strongestZone.totalVolume)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-blue-300 font-bold">
                  {(statistics.strongestZone.intensity * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">
                  Strength: {(statistics.strongestZone.strength * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical Levels */}
      {statistics.criticalLevels.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-white mb-2">Critical Levels</h4>
          <div className="grid grid-cols-2 gap-2">
            {statistics.criticalLevels.slice(0, 6).map((level, index) => (
              <div key={index} className="bg-purple-900/20 px-3 py-2 rounded border border-purple-700/30">
                <div className="text-purple-300 font-mono">${level.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Recent Alerts */}
      {alerts.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-white mb-2">Recent Alerts</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded border ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getAlertIcon(alert.type)}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{alert.message}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                      {alert.metadata && (
                        <div className="text-xs text-gray-400 mt-1">
                          {alert.metadata.volumeChange && (
                            <span className="mr-2">Vol: {formatVolume(alert.metadata.volumeChange)}</span>
                          )}
                          {alert.metadata.clusterSize && (
                            <span>Cluster: {alert.metadata.clusterSize} orders</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Zone Type Legend */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Zone Types</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-300">Support</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-300">Resistance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-300">Accumulation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span className="text-gray-300">Distribution</span>
          </div>
        </div>
        
        {/* Alert Severity Legend */}
        <div className="mt-3 pt-3 border-t border-gray-600">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Alert Severity</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded"></div>
              <span className="text-gray-300">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-300">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-gray-300">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-300">Low</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PressureZoneStats;
