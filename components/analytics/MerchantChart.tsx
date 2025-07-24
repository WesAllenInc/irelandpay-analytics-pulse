'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface MerchantChartProps {
  title: string;
  data: any[];
  type: 'line' | 'bar';
  xKey: string;
  yKey: string;
}

export const MerchantChart: React.FC<MerchantChartProps> = ({ title, data, type, xKey, yKey }) => {
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
              <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#9CA3AF' }} />
              <Line type="monotone" dataKey={yKey} stroke="#60A5FA" strokeWidth={2} dot={{ r: 2, fill: '#60A5FA' }} />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#9CA3AF' }} />
              <Bar dataKey={yKey} fill="#60A5FA" radius={[2, 2, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}; 