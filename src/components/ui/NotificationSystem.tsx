'use client';

import React, { useState, useEffect } from 'react';
import { PressureZoneAlert } from '@/services/pressureZoneAnalyzer';

interface NotificationSystemProps {
  alerts: PressureZoneAlert[];
  maxNotifications?: number;
  autoHide?: boolean;
  hideDelay?: number;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  alerts,
  maxNotifications = 5,
  autoHide = true,
  hideDelay = 8000
}) => {
  const [visibleAlerts, setVisibleAlerts] = useState<PressureZoneAlert[]>([]);
  const [hiddenAlerts, setHiddenAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Add new alerts to visible list
    const newAlerts = alerts.filter(alert => !hiddenAlerts.has(alert.id));
    setVisibleAlerts(prev => {
      const combined = [...prev, ...newAlerts];
      return combined.slice(-maxNotifications);
    });
  }, [alerts, hiddenAlerts, maxNotifications]);

  useEffect(() => {
    if (!autoHide) return;

    const timeouts: NodeJS.Timeout[] = [];
    
    visibleAlerts.forEach(alert => {
      const timeout = setTimeout(() => {
        setHiddenAlerts(prev => new Set([...prev, alert.id]));
        setVisibleAlerts(prev => prev.filter(a => a.id !== alert.id));
      }, hideDelay);
      
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [visibleAlerts, autoHide, hideDelay]);

  const getSeverityColor = (severity: PressureZoneAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-900/90 border-red-600 text-red-100';
      case 'high': return 'bg-red-800/80 border-red-500 text-red-200';
      case 'medium': return 'bg-yellow-800/80 border-yellow-500 text-yellow-200';
      case 'low': return 'bg-green-800/80 border-green-500 text-green-200';
      default: return 'bg-gray-800/80 border-gray-500 text-gray-200';
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

  const getAlertTitle = (type: PressureZoneAlert['type']) => {
    switch (type) {
      case 'formation': return 'Zone Formation';
      case 'breach': return 'Level Breach';
      case 'strengthening': return 'Zone Strengthening';
      case 'weakening': return 'Zone Weakening';
      case 'volume_spike': return 'Volume Spike';
      case 'cluster_formation': return 'Cluster Formation';
      default: return 'Alert';
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toFixed(1);
  };

  const handleDismiss = (alertId: string) => {
    setHiddenAlerts(prev => new Set([...prev, alertId]));
    setVisibleAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-4 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 ${getSeverityColor(alert.severity)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="text-2xl">{getAlertIcon(alert.type)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{getAlertTitle(alert.type)}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    alert.severity === 'critical' ? 'bg-red-700/50' :
                    alert.severity === 'high' ? 'bg-red-600/50' :
                    alert.severity === 'medium' ? 'bg-yellow-600/50' : 'bg-green-600/50'
                  }`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm mb-2">{alert.message}</p>
                
                {/* Zone details */}
                <div className="text-xs opacity-80 space-y-1">
                  <div className="flex justify-between">
                    <span>Price:</span>
                    <span className="font-mono">${alert.zone.centerPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Intensity:</span>
                    <span className="font-mono">{(alert.zone.intensity * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Volume:</span>
                    <span className="font-mono">{formatVolume(alert.zone.totalVolume)}</span>
                  </div>
                  {alert.metadata && (
                    <>
                      {alert.metadata.volumeChange && (
                        <div className="flex justify-between">
                          <span>Volume Change:</span>
                          <span className={`font-mono ${alert.metadata.volumeChange > 0 ? 'text-green-300' : 'text-red-300'}`}>
                            {alert.metadata.volumeChange > 0 ? '+' : ''}{formatVolume(alert.metadata.volumeChange)}
                          </span>
                        </div>
                      )}
                      {alert.metadata.clusterSize && (
                        <div className="flex justify-between">
                          <span>Cluster Size:</span>
                          <span className="font-mono">{alert.metadata.clusterSize} orders</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <div className="text-xs opacity-60 mt-2">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => handleDismiss(alert.id)}
              className="text-white/60 hover:text-white/100 transition-colors ml-2"
            >
              ✕
            </button>
          </div>
          
          {/* Progress bar for auto-hide */}
          {autoHide && (
            <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white/40 transition-all duration-100 ease-linear"
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
