'use client';
import React from 'react';

export interface NetChartProps {
  data: { value: number; time: string }[];
  title: string;
}

export function NetChart({ data, title }: NetChartProps) {
  // Generate a text alternative for screen readers
  const getChartSummary = () => {
    if (!data || data.length === 0) return 'No net data available';
    
    const latestData = data[data.length - 1];
    const earliestData = data[0];
    const change = latestData.value - earliestData.value;
    const percentChange = earliestData.value !== 0 ? 
      ((change / earliestData.value) * 100).toFixed(2) : 'undefined';
    
    return `${title} chart showing net trend from ${earliestData.time} to ${latestData.time}. ` +
      `Starting value: $${earliestData.value.toLocaleString()}. ` +
      `Latest value: $${latestData.value.toLocaleString()}. ` +
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
