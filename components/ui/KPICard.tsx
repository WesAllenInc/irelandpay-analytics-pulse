'use client';

import React from 'react';
import { motion } from 'framer-motion'
import { animations } from '@/lib/animations'
import type { ReactNode } from 'react';

export interface KPICardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  sparklineData: Array<{ time: number | string; value: number }>;
  icon: ReactNode;
  className?: string;
}

export function KPICard({ title, value, change, trend, sparklineData, icon, className = '' }: KPICardProps) {
  return (
    <motion.div
      initial="initial"
      whileHover="animate"
      variants={animations.cardHover}
      className={`
        bg-card border border-card-border rounded-xl p-6
        hover:bg-card-hover transition-all duration-200
        hover:border-primary/20 group cursor-pointer
        ${className}
      `}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-foreground-muted text-xs uppercase tracking-wider">
          {title}
        </span>
        <div className="
          w-8 h-8 rounded-lg bg-primary/10 
          flex items-center justify-center
          group-hover:bg-primary/20 transition-colors
        ">
          {icon}
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <span className="text-3xl font-bold text-white">
          {value}
        </span>
        <span className={
          `text-sm font-medium flex items-center 
          ${trend === 'up' ? 'text-success' : 'text-danger'}`
        }>
          {trend === 'up' ? '↑' : '↓'} {change}
        </span>
      </div>

      <div className="h-10 opacity-60 group-hover:opacity-100 transition-opacity">
        {sparklineData.length > 1 && (
          <svg className="w-full h-full">
            <path
              d={generateSparklinePath(sparklineData, 100, 40)}
              fill="none"
              stroke={trend === 'up' ? '#00CC66' : '#FF4444'}
              strokeWidth={2}
            />
          </svg>
        )}
      </div>
    </motion.div>
  );
}

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
