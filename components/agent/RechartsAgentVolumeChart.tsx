'use client';

import React, { useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface VolumeData {
  month: string;
  volume: number;
  residual: number;
}

interface RechartsAgentVolumeChartProps {
  data: VolumeData[];
}

const RechartsAgentVolumeChart: React.FC<RechartsAgentVolumeChartProps> = React.memo(({ data }) => {
  // Format month labels to be more readable (e.g., "2023-01" to "Jan 2023")
  // Memoized to prevent recalculation on every render
  const formattedData = useMemo(() => data.map(item => {
    const [year, month] = item.month.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    return {
      ...item,
      formattedMonth: formattedDate
    };
  }), [data]);

  // Custom tooltip formatter
  // Memoized to prevent recreation on every render
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 text-white p-3 rounded border border-gray-700 shadow-lg">
          <p className="text-gray-300 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p 
              key={`item-${index}`}
              className={`font-semibold ${
                entry.name === 'Processing Volume' ? 'text-blue-400' : 'text-emerald-400'
              } mb-1`}
            >
              {entry.name}: {' '}
              <span className="text-white">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 2
                }).format(entry.value)}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  }, []);

  // Format for y-axis labels
  // Memoized to prevent recreation on every render
  const formatYAxis = useCallback((value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  }, []);

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={formattedData}
          margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis 
            dataKey="formattedMonth" 
            tick={{ fontSize: 12 }}
            height={50}
          />
          <YAxis 
            yAxisId="left"
            orientation="left"
            tickFormatter={formatYAxis}
            label={{ 
              value: 'Processing Volume', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: 12, fill: '#64748b' }
            }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tickFormatter={formatYAxis}
            label={{ 
              value: 'Residual Earnings', 
              angle: 90, 
              position: 'insideRight',
              style: { textAnchor: 'middle', fontSize: 12, fill: '#64748b' }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: 20 }}
            verticalAlign="top"
            align="right"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="volume"
            name="Processing Volume"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="residual"
            name="Residual Earnings"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

export default RechartsAgentVolumeChart;
