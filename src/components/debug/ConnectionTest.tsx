'use client';

import React, { useState, useEffect } from 'react';

export const ConnectionTest: React.FC = () => {
  const [status, setStatus] = useState('Testing...');
  const [details, setDetails] = useState<string[]>([]);

  useEffect(() => {
    const testConnection = async () => {
      const tests: string[] = [];
      
      // Test 1: Check if fetch works for REST API
      try {
        tests.push('Testing REST API...');
        setDetails([...tests]);
        
        const response = await fetch('https://api.binance.com/api/v3/ping');
        if (response.ok) {
          tests.push('✅ REST API connection successful');
        } else {
          tests.push('❌ REST API connection failed');
        }
      } catch (error) {
        tests.push(`❌ REST API error: ${error}`);
      }

      // Test 2: Check WebSocket capability
      try {
        tests.push('Testing WebSocket capability...');
        setDetails([...tests]);
        
        if (typeof WebSocket !== 'undefined') {
          tests.push('✅ WebSocket supported in browser');
          
          // Test WebSocket connection
          tests.push('Testing WebSocket connection...');
          setDetails([...tests]);
          
          const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@depth20@100ms');
          
          const timeout = setTimeout(() => {
            tests.push('❌ WebSocket connection timeout');
            setDetails([...tests]);
            setStatus('Connection issues detected');
            ws.close();
          }, 10000);
          
          ws.onopen = () => {
            clearTimeout(timeout);
            tests.push('✅ WebSocket connection successful');
            setDetails([...tests]);
            setStatus('All connections working!');
            ws.close();
          };
          
          ws.onerror = (error) => {
            clearTimeout(timeout);
            tests.push(`❌ WebSocket error: ${error}`);
            setDetails([...tests]);
            setStatus('WebSocket connection failed');
          };
          
          ws.onclose = (event) => {
            if (event.code !== 1000) {
              tests.push(`❌ WebSocket closed unexpectedly: ${event.code} - ${event.reason}`);
              setDetails([...tests]);
            }
          };
          
        } else {
          tests.push('❌ WebSocket not supported');
          setStatus('WebSocket not supported');
        }
      } catch (error) {
        tests.push(`❌ WebSocket test error: ${error}`);
        setDetails([...tests]);
        setStatus('Connection test failed');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-xl max-w-sm z-50">
      <h3 className="text-lg font-bold mb-2">Connection Test</h3>
      <div className="text-sm mb-2">Status: {status}</div>
      <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
        {details.map((detail, index) => (
          <div key={index}>{detail}</div>
        ))}
      </div>
    </div>
  );
};
