'use client';

import React, { useState } from 'react';
import styles from './charts.module.css';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  TooltipProps
} from 'recharts';
import { FeyCard } from '../ui/fey-card';

interface FeyAreaChartProps {
  data: { time: string; value: number }[];
  title?: string;
  color?: string;
}

export function RechartsFeyAreaChart({ data, title = 'Performance', color = '#98971a' }: FeyAreaChartProps) {
  // Currently active period button
  const [activePeriod, setActivePeriod] = useState('1M');
  
  // Format the data for display
  const formattedData = data.map(item => {
    // Convert time string to a more readable format
    const date = new Date(item.time);
    const formattedTime = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    return {
      ...item,
      formattedTime
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.tooltipContainer}>
          <p className={styles.tooltipTime}>{label}</p>
          <p className="text-white font-medium">
            <span className={styles.tooltipLabel}>{title}:</span>{' '}
            <span className={styles.tooltipValue}>${(payload[0]?.value as number).toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const periods = ['1D', '1W', '1M', '3M', 'YTD', '1Y'];

  return (
    <FeyCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className={styles.periodButtonGroup}>
          {periods.map((period) => (
            <button
              key={period}
              className={`${styles.periodButton} ${activePeriod === period ? styles.periodButtonActive : ''}`}
              onClick={() => setActivePeriod(period)}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#504945" 
              vertical={false} 
            />
            <XAxis 
              dataKey="formattedTime" 
              tick={{ fill: '#a89984' }}
              axisLine={{ stroke: '#504945' }}
              tickLine={{ stroke: '#504945' }}
            />
            <YAxis 
              tick={{ fill: '#a89984' }}
              axisLine={{ stroke: '#504945' }}
              tickLine={{ stroke: '#504945' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </FeyCard>
  );
}
