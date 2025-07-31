'use client';

import React, { useState, useEffect } from 'react';

interface ConnectionNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: number;
  duration?: number;
}

interface ConnectionNotificationSystemProps {
  connectionState: string;
  isRealTime: boolean;
  error: string | null;
  dataGapDetected: boolean;
}

export const ConnectionNotificationSystem: React.FC<ConnectionNotificationSystemProps> = ({
  connectionState,
  isRealTime,
  error,
  dataGapDetected
}) => {
  const [notifications, setNotifications] = useState<ConnectionNotification[]>([]);

  // Add notification function
  const addNotification = (notification: Omit<ConnectionNotification, 'id' | 'timestamp'>) => {
    const newNotification: ConnectionNotification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      duration: notification.duration || 5000
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration
    if (newNotification.duration) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, newNotification.duration);
    }
  };

  // Remove notification function
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // Monitor connection state changes
  useEffect(() => {
    if (connectionState === 'connected') {
      addNotification({
        type: 'success',
        title: 'Connected',
        message: isRealTime ? 'Real-time data stream active' : 'Demo mode activated',
        duration: 3000
      });
    } else if (connectionState === 'error') {
      addNotification({
        type: 'error',
        title: 'Connection Failed',
        message: 'Unable to establish connection',
        duration: 8000
      });
    }
  }, [connectionState, isRealTime]);

  // Monitor errors
  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        title: 'Connection Error',
        message: error,
        duration: 10000
      });
    }
  }, [error]);

  // Monitor data gaps
  useEffect(() => {
    if (dataGapDetected) {
      addNotification({
        type: 'warning',
        title: 'Data Gap Detected',
        message: 'No updates received for extended period',
        duration: 6000
      });
    }
  }, [dataGapDetected]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-600 border-green-500';
      case 'warning': return 'bg-yellow-600 border-yellow-500';
      case 'error': return 'bg-red-600 border-red-500';
      case 'info': return 'bg-blue-600 border-blue-500';
      default: return 'bg-gray-600 border-gray-500';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            ${getNotificationColor(notification.type)}
            text-white p-4 rounded-lg shadow-lg border-l-4
            transform transition-all duration-300 ease-in-out
            hover:scale-105
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <span className="text-lg">
                {getNotificationIcon(notification.type)}
              </span>
              <div className="flex-1">
                <div className="font-semibold text-sm">
                  {notification.title}
                </div>
                <div className="text-xs opacity-90 mt-1">
                  {notification.message}
                </div>
                <div className="text-xs opacity-70 mt-2">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-white hover:text-gray-300 ml-2"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

interface ConnectionRecoveryPromptProps {
  show: boolean;
  onRetry: () => void;
  onSwitchToDemo: () => void;
  attempts: number;
}

export const ConnectionRecoveryPrompt: React.FC<ConnectionRecoveryPromptProps> = ({
  show,
  onRetry,
  onSwitchToDemo,
  attempts
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🔌</div>
          <h2 className="text-xl font-bold mb-2">Connection Issues</h2>
          <p className="text-gray-300 text-sm">
            Unable to establish real-time connection after {attempts} attempts.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
          >
            Retry Connection
          </button>
          
          <button
            onClick={onSwitchToDemo}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
          >
            Continue with Demo Mode
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-400 text-center">
          Demo mode provides simulated data for visualization purposes
        </div>
      </div>
    </div>
  );
};

interface DataStalenessIndicatorProps {
  lastUpdateTime: number;
  isConnected: boolean;
}

export const DataStalenessIndicator: React.FC<DataStalenessIndicatorProps> = ({
  lastUpdateTime,
  isConnected
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isConnected || !lastUpdateTime) return null;

  const timeSinceUpdate = currentTime - lastUpdateTime;
  const seconds = Math.floor(timeSinceUpdate / 1000);

  if (seconds < 10) return null; // Don't show if data is fresh

  const getIndicatorColor = () => {
    if (seconds < 30) return 'bg-yellow-500';
    if (seconds < 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <div className={`
      fixed bottom-20 right-4 z-40 
      ${getIndicatorColor()} 
      text-white px-3 py-2 rounded-lg shadow-lg 
      flex items-center space-x-2 text-sm
      animate-pulse
    `}>
      <span>⏰</span>
      <span>Data is {formatTime(seconds)} old</span>
    </div>
  );
}; 