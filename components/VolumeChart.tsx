'use client';
import React from 'react';

export interface VolumeChartProps {
  data: { value: number; time: string }[];
  title: string;
}

export function VolumeChart({ data, title }: VolumeChartProps) {
  // Generate a text alternative for screen readers
  const getChartSummary = () => {
    if (!data || data.length === 0) return 'No volume data available';
    
    const latestData = data[data.length - 1];
    const earliestData = data[0];
    const change = latestData.value - earliestData.value;
    const percentChange = earliestData.value !== 0 ? 
      ((change / earliestData.value) * 100).toFixed(2) : 'undefined';
    
    return `${title} chart showing volume trend from ${earliestData.time} to ${latestData.time}. ` +
      `Starting volume: $${earliestData.value.toLocaleString()}. ` +
      `Latest volume: $${latestData.value.toLocaleString()}. ` +
      `${change >= 0 ? 'Increase' : 'Decrease'} of $${Math.abs(change).toLocaleString()} ` +
      `(${percentChange}% ${change >= 0 ? 'increase' : 'decrease'}).`;
  };

  // Stub component - would render actual chart here
  return (
    <div aria-label={getChartSummary()} role="img">
      {/* Actual chart would be rendered here */}
      
      {/* Visually hidden text description for screen readers */}
      <div className="sr-only">
        {getChartSummary()}
      </div>
    </div>
  );
}
