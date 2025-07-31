'use client';

import React, { useState, useEffect } from 'react';
import { useResponsiveDesign } from '@/hooks/useResponsiveDesign';
import { Maximize, Minimize, Settings, ChevronUp, ChevronDown } from 'lucide-react';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  controlPanel?: React.ReactNode;
  statsPanel?: React.ReactNode;
  settingsPanel?: React.ReactNode;
  className?: string;
}

// Simple button component
const Button: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}> = ({ onClick, children, className = '', variant = 'primary', size = 'md' }) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700'
  };
  const sizeStyles = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8'
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </button>
  );
};

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  controlPanel,
  statsPanel,
  settingsPanel,
  className = ''
}) => {
  const {
    deviceInfo,
    getUILayout,
    toggleFullscreen,
    supportsFullscreen,
    isFullscreen,
    getPerformanceRecommendations
  } = useResponsiveDesign();

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);

  const uiLayout = getUILayout();
  const recommendations = getPerformanceRecommendations();

  // Auto-hide recommendations after 10 seconds
  useEffect(() => {
    if (recommendations.length > 0) {
      const timer = setTimeout(() => setShowRecommendations(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [recommendations]);

  const handleFullscreenToggle = () => {
    toggleFullscreen();
  };

  // Mobile layout (stacked panels)
  if (deviceInfo.type === 'mobile') {
    return (
      <div className={`relative w-full h-screen flex flex-col ${className}`}>
        {/* Performance recommendations banner */}
        {showRecommendations && recommendations.length > 0 && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-yellow-500 bg-opacity-90 text-black text-xs p-2">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                {recommendations[0]}
              </div>
              <button
                onClick={() => setShowRecommendations(false)}
                className="ml-2 text-black hover:text-gray-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Main 3D view */}
        <div className="flex-1 relative">
          {children}
          
          {/* Mobile control buttons */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2 z-30 responsive-layout-controls">
            {supportsFullscreen() && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleFullscreenToggle}
                className="p-2 bg-black bg-opacity-70 hover:bg-opacity-90 backdrop-blur-sm border border-gray-600"
              >
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </Button>
            )}
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-black bg-opacity-70 hover:bg-opacity-90 backdrop-blur-sm border border-gray-600"
            >
              <Settings size={16} />
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="flex items-center space-x-2 px-4 py-2 bg-black bg-opacity-70 hover:bg-opacity-90 backdrop-blur-sm border border-gray-600"
            >
              <span className="text-sm">Controls</span>
              {showMobileMenu ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </Button>
          </div>
        </div>

        {/* Mobile sliding panels */}
        <div
          className={`bg-gray-900 border-t border-gray-700 transition-all duration-300 ${
            showMobileMenu ? 'h-1/2' : 'h-0'
          } overflow-hidden`}
        >
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
              {controlPanel && (
                <div className="bg-gray-800 rounded-lg p-3">
                  <h3 className="text-sm font-semibold mb-2">Controls</h3>
                  {controlPanel}
                </div>
              )}
              
              {statsPanel && (
                <div className="bg-gray-800 rounded-lg p-3">
                  <h3 className="text-sm font-semibold mb-2">Statistics</h3>
                  {statsPanel}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings overlay */}
        {showSettings && settingsPanel && (
          <div className="absolute inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg max-w-sm w-full max-h-96 overflow-y-auto">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold">Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              <div className="p-4">
                {settingsPanel}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tablet layout (adaptive panels)
  if (deviceInfo.type === 'tablet') {
    return (
      <div className={`relative w-full h-screen flex ${className}`}>
        {/* Performance recommendations */}
        {showRecommendations && recommendations.length > 0 && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-yellow-500 bg-opacity-90 text-black text-sm p-3">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                {recommendations.join(' • ')}
              </div>
              <button
                onClick={() => setShowRecommendations(false)}
                className="ml-2 text-black hover:text-gray-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Side panel */}
        <div className={`bg-gray-900 border-r border-gray-700 ${uiLayout.panelWidth} overflow-hidden`}>
          <div className="h-full flex flex-col">
            {/* Panel header */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="font-semibold">Controls</h2>
              <div className="flex space-x-2">
                {supportsFullscreen() && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleFullscreenToggle}
                    className="p-2"
                  >
                    {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </Button>
                )}
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2"
                >
                  <Settings size={16} />
                </Button>
              </div>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {controlPanel && (
                <div className="bg-gray-800 rounded-lg p-3">
                  <h3 className="text-sm font-semibold mb-2">Controls</h3>
                  {controlPanel}
                </div>
              )}
              
              {statsPanel && (
                <div className="bg-gray-800 rounded-lg p-3">
                  <h3 className="text-sm font-semibold mb-2">Statistics</h3>
                  {statsPanel}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main 3D view */}
        <div className="flex-1 relative">
          {children}
        </div>

        {/* Settings modal */}
        {showSettings && settingsPanel && (
          <div className="absolute inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold">Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              <div className="p-4">
                {settingsPanel}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout (traditional with multiple panels)
  return (
    <div className={`relative w-full h-screen flex ${className}`}>
      {/* Performance recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-yellow-500 bg-opacity-90 text-black text-sm p-3">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              {recommendations.join(' • ')}
            </div>
            <button
              onClick={() => setShowRecommendations(false)}
              className="ml-2 text-black hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Left panel */}
      <div className="w-80 bg-gray-900 border-r border-gray-700 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-semibold">Controls</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {controlPanel}
          </div>
        </div>
      </div>

      {/* Main 3D view */}
      <div className="flex-1 relative">
        {children}
        
        {/* Desktop control buttons - positioned to avoid overlap */}
        <div className="absolute top-4 right-4 flex space-x-2 z-30 responsive-layout-controls">
          {supportsFullscreen() && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFullscreenToggle}
              className="p-2 bg-black bg-opacity-70 hover:bg-opacity-90 backdrop-blur-sm border border-gray-600"
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </Button>
          )}
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-black bg-opacity-70 hover:bg-opacity-90 backdrop-blur-sm border border-gray-600"
          >
            <Settings size={16} />
          </Button>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-80 bg-gray-900 border-l border-gray-700 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-semibold">Statistics</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {statsPanel}
          </div>
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && settingsPanel && (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg max-w-lg w-full max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              {settingsPanel}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
