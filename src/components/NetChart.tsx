
import React from 'react';
import EnhancedChart from './ui/EnhancedChart';

interface NetData {
  time: string;
  value: number;
}

interface NetChartProps {
  data: NetData[];
  title?: string;
  loading?: boolean;
}

export function NetChart({ data, title = "Net Profit Chart", loading = false }: NetChartProps) {
  return (
    <EnhancedChart data={data} title={title} loading={loading} />
  );
}
