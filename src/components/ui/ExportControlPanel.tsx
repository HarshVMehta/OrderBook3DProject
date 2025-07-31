'use client';

import React, { useState } from 'react';
import { ProcessedOrderbookData } from '@/types/orderbook';
import { PressureZoneAnalysis } from '@/services/pressureZoneAnalyzer';
import { OrderbookExportService, ExportOptions } from '@/services/exportService';

interface ExportControlPanelProps {
  data: ProcessedOrderbookData | null;
  pressureZoneAnalysis: PressureZoneAnalysis | null;
  symbol: string;
  className?: string;
}

const ExportControlPanel: React.FC<ExportControlPanelProps> = ({
  data,
  pressureZoneAnalysis,
  symbol,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'txt'>('json');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includePressureZones, setIncludePressureZones] = useState(true);
  const [exportStatus, setExportStatus] = useState<string>('');

  const exportService = OrderbookExportService.getInstance();

  const handleExportSnapshot = async () => {
    try {
      setExportStatus('Finding 3D visualization...');
      
      // Find the Three.js canvas element
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      
      if (!canvas) {
        setExportStatus('No 3D visualization found to capture');
        setTimeout(() => setExportStatus(''), 3000);
        return;
      }

      // Check if canvas has any content
      const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!ctx) {
        setExportStatus('WebGL context not available');
        setTimeout(() => setExportStatus(''), 3000);
        return;
      }

      setExportStatus('Preparing for screenshot capture...');
      
      // Wait a moment to ensure the scene is fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setExportStatus('Capturing screenshot...');

      // Use the basic screenshot method for better compatibility
      await exportService.exportScreenshot(canvas, 
        `orderbook-${symbol}-screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
      );

      setExportStatus('Screenshot captured successfully! 📸');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      setExportStatus(`Screenshot failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setExportStatus(''), 5000);
    }
  };

  const handleExportAnalysisReport = async () => {
    if (!data || !pressureZoneAnalysis) {
      setExportStatus('Analysis data not available');
      return;
    }

    try {
      setExportStatus('Generating analysis report...');
      
      const report = exportService.generateAnalysisReport(data, pressureZoneAnalysis, symbol);
      
      if (exportFormat === 'json') {
        exportService.exportAnalysisReport(report);
      } else {
        exportService.exportAnalysisReportAsText(report);
      }

      setExportStatus('Analysis report exported successfully');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      setExportStatus(`Export failed: ${error}`);
      setTimeout(() => setExportStatus(''), 5000);
    }
  };

  // Direct export functions for quick buttons
  const handleQuickJSONSnapshot = async () => {
    if (!data) return;
    try {
      setExportStatus('Exporting JSON snapshot...');
      const snapshot = exportService.createSnapshot(data, symbol, includePressureZones ? pressureZoneAnalysis || undefined : undefined);
      exportService.exportAsJSON(snapshot);
      setExportStatus('JSON snapshot exported successfully');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      setExportStatus(`Export failed: ${error}`);
      setTimeout(() => setExportStatus(''), 5000);
    }
  };

  const handleQuickCSVData = async () => {
    if (!data) return;
    try {
      setExportStatus('Exporting CSV data...');
      exportService.exportAsCSV(data);
      setExportStatus('CSV data exported successfully');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      setExportStatus(`Export failed: ${error}`);
      setTimeout(() => setExportStatus(''), 5000);
    }
  };

  const handleQuickTextReport = async () => {
    if (!data || !pressureZoneAnalysis) {
      setExportStatus('Analysis data not available for text report');
      return;
    }
    try {
      setExportStatus('Generating text report...');
      const report = exportService.generateAnalysisReport(data, pressureZoneAnalysis, symbol);
      exportService.exportAnalysisReportAsText(report);
      setExportStatus('Text report exported successfully');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      setExportStatus(`Export failed: ${error}`);
      setTimeout(() => setExportStatus(''), 5000);
    }
  };

  const handleQuickJSONReport = async () => {
    if (!data || !pressureZoneAnalysis) {
      setExportStatus('Analysis data not available for JSON report');
      return;
    }
    try {
      setExportStatus('Generating JSON report...');
      const report = exportService.generateAnalysisReport(data, pressureZoneAnalysis, symbol);
      exportService.exportAnalysisReport(report);
      setExportStatus('JSON report exported successfully');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      setExportStatus(`Export failed: ${error}`);
      setTimeout(() => setExportStatus(''), 5000);
    }
  };

  const getExportPreview = () => {
    if (!data) return 'No data available';
    
    const totalOrders = data.bids.length + data.asks.length;
    const totalVolume = [...data.bids, ...data.asks].reduce((sum, order) => sum + order.quantity, 0);
    const pressureZoneCount = pressureZoneAnalysis?.zones.length || 0;
    
    return `${totalOrders} orders, ${totalVolume.toFixed(2)} total volume${pressureZoneCount > 0 ? `, ${pressureZoneCount} pressure zones` : ''}`;
  };

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      {/* Export Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className="p-1 bg-blue-500 rounded">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="font-semibold text-foreground">Export Data</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">
            {getExportPreview()}
          </span>
          <svg 
            className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Export Controls */}
      {isExpanded && (
        <div className="border-t border-border p-4 space-y-4">
          
          {/* Export Format Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Export Format</label>
            <div className="flex space-x-2">
              {(['json', 'csv', 'txt'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setExportFormat(format)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    exportFormat === format
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Options</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-foreground">Include metadata</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includePressureZones}
                  onChange={(e) => setIncludePressureZones(e.target.checked)}
                  className="rounded"
                  disabled={!pressureZoneAnalysis}
                />
                <span className={`text-sm ${!pressureZoneAnalysis ? 'text-muted-foreground' : 'text-foreground'}`}>
                  Include pressure zones {!pressureZoneAnalysis && '(not available)'}
                </span>
              </label>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex space-x-2">
            <button
              onClick={handleExportSnapshot}
              disabled={!data}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
            >
              📸 Export Snapshot
            </button>
            
            <button
              onClick={handleExportAnalysisReport}
              disabled={!data || !pressureZoneAnalysis}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
            >
              📊 Export Analysis
            </button>
          </div>

          {/* Quick Export Buttons */}
          <div className="border-t border-border pt-3">
            <label className="block text-sm font-medium text-foreground mb-2">Quick Export</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleQuickJSONSnapshot}
                disabled={!data}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                📄 JSON Snapshot
              </button>
              
              <button
                onClick={handleQuickCSVData}
                disabled={!data}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                📈 CSV Data
              </button>
              
              <button
                onClick={handleQuickTextReport}
                disabled={!data || !pressureZoneAnalysis}
                className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                📋 Text Report
              </button>
              
              <button
                onClick={handleQuickJSONReport}
                disabled={!data || !pressureZoneAnalysis}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                📋 JSON Report
              </button>
            </div>
          </div>

          {/* Export Status */}
          {exportStatus && (
            <div className={`p-3 rounded-lg text-sm ${
              exportStatus.includes('failed') || exportStatus.includes('error')
                ? 'bg-red-100 text-red-800 border border-red-200'
                : exportStatus.includes('Successfully') || exportStatus.includes('exported')
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              {exportStatus}
            </div>
          )}

          {/* Export Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div><strong>JSON:</strong> Complete data with metadata and structure</div>
            <div><strong>CSV:</strong> Spreadsheet-compatible bid/ask data</div>
            <div><strong>TXT:</strong> Human-readable analysis report</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportControlPanel;
