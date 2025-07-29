'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';

interface MerchantChartProps {
  title: string;
  data: Array<{ x: string | number; y: number }>;
  type: 'line' | 'bar' | 'area';
  highlightIndex?: number; // index of "current month" / "MTD" point
  highlightColor?: string; // e.g. 'red' for current point
}

export const MerchantChart: React.FC<MerchantChartProps> = ({ 
  title, 
  data, 
  type, 
  highlightIndex, 
  highlightColor = '#EF4444' 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full bg-transparent rounded-xl p-3 mb-4">
        <div className="text-sm font-medium mb-2 text-gray-300">{title}</div>
        <div className="w-full h-48 flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-transparent rounded-xl p-3 mb-4">
      <div className="text-sm font-medium mb-2 text-gray-300">{title}</div>
      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="x" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#9CA3AF' }} />
              <Line 
                type="monotone" 
                dataKey="y" 
                stroke="#60A5FA" 
                strokeWidth={2} 
                dot={(props) => {
                  const isHighlighted = highlightIndex !== undefined && props.payload?.index === highlightIndex;
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={isHighlighted ? 4 : 2}
                      fill={isHighlighted ? highlightColor : '#60A5FA'}
                      stroke={isHighlighted ? '#FFFFFF' : 'none'}
                      strokeWidth={isHighlighted ? 2 : 0}
                    />
                  );
                }}
              />
            </LineChart>
          ) : type === 'bar' ? (
            <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="x" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#9CA3AF' }} />
              <Bar dataKey="y" radius={[2, 2, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={highlightIndex !== undefined && index === highlightIndex ? highlightColor : '#60A5FA'}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="x" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#9CA3AF' }} />
              <Area 
                type="monotone" 
                dataKey="y" 
                stroke="#60A5FA" 
                fill="#60A5FA" 
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}; 