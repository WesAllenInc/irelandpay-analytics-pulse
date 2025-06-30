'use client';

import React from 'react';
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

const AgentVolumeChart: React.FC<AgentVolumeChartProps> = ({ data }) => {
  // Format month labels to be more readable (e.g., "2023-01" to "Jan 2023")
  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Using recharts implementation instead of ApexCharts

  return (
    <div className="w-full h-full">
      <Chart data={data} />
    </div>
  );
};

export default AgentVolumeChart;
