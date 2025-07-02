'use client';

import React, { useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import RechartsAgentVolumeChart to avoid SSR issues
const Chart = dynamic(() => import('./RechartsAgentVolumeChart'), { ssr: false });

interface VolumeData {
  month: string;
  volume: number;
  residual: number;
}

interface AgentVolumeChartProps {
  data: VolumeData[];
}

const AgentVolumeChart: React.FC<AgentVolumeChartProps> = React.memo(({ data }) => {
  // Format month labels to be more readable (e.g., "2023-01" to "Jan 2023")
  // Memoized to avoid recreation on every render
  const formatMonthLabel = useCallback((monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, []);

  // Using recharts implementation instead of ApexCharts

  // Generate a text alternative for screen readers summarizing the volume and residual data
  // Memoized to prevent recalculation on every render
  const chartSummary = useMemo(() => {
    if (!data || data.length === 0) return 'No agent volume data available';
    
    const latestMonth = data[data.length - 1];
    const earliestMonth = data[0];
    
    const volumeChange = latestMonth.volume - earliestMonth.volume;
    const volumePercentChange = earliestMonth.volume !== 0 ?
      ((volumeChange / earliestMonth.volume) * 100).toFixed(2) : 'undefined';
    
    const residualChange = latestMonth.residual - earliestMonth.residual;
    const residualPercentChange = earliestMonth.residual !== 0 ?
      ((residualChange / earliestMonth.residual) * 100).toFixed(2) : 'undefined';
    
    return `Agent volume chart showing data from ${formatMonthLabel(earliestMonth.month)} to ${formatMonthLabel(latestMonth.month)}. ` +
      `Volume trend: started at $${earliestMonth.volume.toLocaleString()}, ended at $${latestMonth.volume.toLocaleString()}, ` +
      `${volumeChange >= 0 ? 'increased' : 'decreased'} by $${Math.abs(volumeChange).toLocaleString()} ` +
      `(${volumePercentChange}%). ` +
      `Residual trend: started at $${earliestMonth.residual.toLocaleString()}, ended at $${latestMonth.residual.toLocaleString()}, ` +
      `${residualChange >= 0 ? 'increased' : 'decreased'} by $${Math.abs(residualChange).toLocaleString()} ` +
      `(${residualPercentChange}%).`;
  }, [data, formatMonthLabel]);

  return (
    <div 
      className="w-full h-full" 
      aria-label="Agent volume and residual chart"
      role="img"
    >
      <Chart data={data} />
      
      {/* Visually hidden text description for screen readers */}
      <div className="sr-only">
        {chartSummary}
      </div>
    </div>
  );
});

export default AgentVolumeChart;
