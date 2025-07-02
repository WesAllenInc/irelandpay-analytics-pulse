'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion'
import { animations } from '@/lib/animations'
import type { ReactNode } from 'react';
import { accessibleColors, accessibleText, getFocusStyles } from '@/lib/accessibility';

export interface KPICardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  sparklineData: Array<{ time: number | string; value: number }>;
  icon: ReactNode;
  className?: string;
}

export const KPICard = memo(function KPICard({ title, value, change, trend, sparklineData, icon, className = '' }: KPICardProps) {
  // Generate an accessible description of the sparkline trend for screen readers
  // Memoized to avoid recalculation on every render
  const sparklineTrend = useMemo(() => {
    if (sparklineData.length < 2) return 'No trend data available';
    
    const firstValue = sparklineData[0].value;
    const lastValue = sparklineData[sparklineData.length - 1].value;
    const change = lastValue - firstValue;
    const percentChange = firstValue !== 0 ? 
      ((change / firstValue) * 100).toFixed(1) : '0';
      
    return `Trend: ${trend === 'up' ? 'Increasing' : 'Decreasing'} by ${Math.abs(change).toFixed(2)} (${percentChange}%) from ${sparklineData[0].time} to ${sparklineData[sparklineData.length - 1].time}`;
  }, [trend, sparklineData, change]);
  
  return (
    <motion.div
      initial="initial"
      whileHover="animate"
      variants={animations.cardHover}
      className={`
        bg-card border border-card-border rounded-xl p-6
        hover:bg-card-hover transition-all duration-200
        hover:border-primary/20 group cursor-pointer
        ${getFocusStyles('inset')} 
        ${className}
      `}
      tabIndex={0}
      role="region"
      aria-label={`${title} metrics: ${value}, ${trend === 'up' ? 'up' : 'down'} ${change}`}
      onKeyDown={useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Handle click action (if any)
        }
      }, [])}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-200 text-xs uppercase tracking-wider font-medium">
          {title}
        </span>
        <div 
          className="
            w-8 h-8 rounded-lg bg-primary/10 
            flex items-center justify-center
            group-hover:bg-primary/20 transition-colors
          "
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <span className="text-3xl font-bold text-white">
          {value}
        </span>
        <span 
          className={
            `text-sm font-medium flex items-center 
            ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`
          }
          aria-live="polite"
        >
          {trend === 'up' ? '↑' : '↓'} {change}
          {accessibleText(trend === 'up' ? 'Increase' : 'Decrease')}
        </span>
      </div>

      <div className="h-10 opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden="true">
        {sparklineData.length > 1 && (
          <svg 
            className="w-full h-full" 
            role="img"
            aria-label={`${title} trend chart`}
          >
            <title>{title} trend visualization</title>
            <desc>{sparklineTrend}</desc>
            <path
              d={generateSparklinePath(sparklineData, 100, 40)}
              fill="none"
              stroke={trend === 'up' ? '#00CC66' : '#FF4444'}
              strokeWidth={2}
            />
          </svg>
        )}
      </div>
      
      {/* Visually hidden trend description for screen readers */}
      <div className="sr-only">
        {sparklineTrend}
      </div>
    </motion.div>
  );
});

// Moved outside component to prevent recreation on each render
function generateSparklinePath(
  data: Array<{ time: number | string; value: number }>,
  width: number,
  height: number
) {
  if (data.length < 2) return '';

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((d.value - min) / range) * height;
    return `${x},${y}`;
  });

  return `M${points.join(' L')}`;
}
