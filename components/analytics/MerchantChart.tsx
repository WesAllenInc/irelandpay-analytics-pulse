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
  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow p-4 mb-4">
      <div className="text-base font-semibold mb-2 text-gray-800 dark:text-white">{title}</div>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <LineChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={yKey} stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yKey} fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}; 