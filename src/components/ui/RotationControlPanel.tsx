'use client';

import React from 'react';

interface RotationControlPanelProps {
  rotationSpeed: number;
  rotationAxis: 'x' | 'y' | 'z';
  onRotationSpeedChange: (speed: number) => void;
  onRotationAxisChange: (axis: 'x' | 'y' | 'z') => void;
  onResetCamera: () => void;
  onToggleRotation: () => void;
  isRotating: boolean;
}

export const RotationControlPanel: React.FC<RotationControlPanelProps> = ({
  rotationSpeed,
  rotationAxis,
  onRotationSpeedChange,
  onRotationAxisChange,
  onResetCamera,
  onToggleRotation,
  isRotating
}) => {
  return (
    <div className="bg-black bg-opacity-70 text-white p-4 rounded-lg backdrop-blur-sm">
      <h3 className="text-sm font-semibold mb-3">Rotation Controls</h3>
      
      {/* Rotation Toggle */}
      <div className="mb-3">
        <button
          onClick={onToggleRotation}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            isRotating 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isRotating ? '⏸ Stop Rotation' : '▶ Start Rotation'}
        </button>
      </div>

      {/* Speed Control */}
      <div className="mb-3">
        <label className="block text-xs font-medium mb-1">
          Speed: {rotationSpeed.toFixed(1)}
        </label>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          value={rotationSpeed}
          onChange={(e) => onRotationSpeedChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(rotationSpeed / 3) * 100}%, #374151 ${(rotationSpeed / 3) * 100}%, #374151 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0.1</span>
          <span>3.0</span>
        </div>
      </div>

      {/* Axis Selection */}
      <div className="mb-3">
        <label className="block text-xs font-medium mb-2">Rotation Axis:</label>
        <div className="flex space-x-1">
          {(['x', 'y', 'z'] as const).map((axis) => (
            <button
              key={axis}
              onClick={() => onRotationAxisChange(axis)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                rotationAxis === axis
                  ? axis === 'x' ? 'bg-red-500 text-white' 
                    : axis === 'y' ? 'bg-green-500 text-white'
                    : 'bg-blue-500 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              }`}
            >
              {axis.toUpperCase()}-Axis
              {axis === 'x' && ' (Price)'}
              {axis === 'y' && ' (Volume)'}
              {axis === 'z' && ' (Time)'}
            </button>
          ))}
        </div>
      </div>

      {/* Camera Reset */}
      <div className="mb-2">
        <button
          onClick={onResetCamera}
          className="w-full px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm font-medium transition-colors"
        >
          🔄 Reset Camera View
        </button>
      </div>

      {/* Info Text */}
      <div className="text-xs text-gray-400 mt-2">
        <p>• Z-axis rotation showcases temporal dimension</p>
        <p>• Use mouse to manually control view</p>
        <p>• Reset restores default position</p>
      </div>
    </div>
  );
};

export default RotationControlPanel;
