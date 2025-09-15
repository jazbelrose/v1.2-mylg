import React from 'react';
import { Squircle } from '@/shared/ui/squircle';

/**
 * Simple example component to demonstrate Squircle usage
 */
export const SquircleExample: React.FC = () => {
  return (
    <div style={{ padding: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
      <h3>Squircle Examples</h3>
      
      {/* Basic squircle */}
      <Squircle
        style={{
          width: 100,
          height: 100,
          backgroundColor: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        Default
      </Squircle>
      
      {/* Custom radius */}
      <Squircle
        radius={30}
        style={{
          width: 100,
          height: 100,
          backgroundColor: '#10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        r=30
      </Squircle>
      
      {/* Different smoothing */}
      <Squircle
        radius={20}
        smoothing={0.3}
        style={{
          width: 100,
          height: 100,
          backgroundColor: '#f59e0b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        Sharp
      </Squircle>
      
      <Squircle
        radius={20}
        smoothing={0.9}
        style={{
          width: 100,
          height: 100,
          backgroundColor: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        Smooth
      </Squircle>
      
      {/* CSS class example */}
      <div
        className="squircle"
        style={{
          width: 100,
          height: 100,
          backgroundColor: '#8b5cf6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          '--shape-radius': '25px',
        } as React.CSSProperties}
      >
        CSS Class
      </div>
      
      {/* Rectangular shape */}
      <Squircle
        radius={16}
        style={{
          width: 120,
          height: 60,
          backgroundColor: '#06b6d4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        Rectangle
      </Squircle>
    </div>
  );
};