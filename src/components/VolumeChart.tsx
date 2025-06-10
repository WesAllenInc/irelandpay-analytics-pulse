
import React from 'react';
import EnhancedChart from './ui/EnhancedChart';

interface VolumeData {
  time: string;
  value: number;
}

interface VolumeChartProps {
  data: VolumeData[];
  title?: string;
  loading?: boolean;
}

export function VolumeChart({ data, title = "Volume Chart", loading = false }: VolumeChartProps) {
  return (
    <EnhancedChart data={data} title={title} loading={loading} />
  );
}
