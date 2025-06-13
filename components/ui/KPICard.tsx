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
}

export function KPICard({ title, value, change, trend, sparklineData, icon }: KPICardProps) {
  return (
    <motion.div
      initial="initial"
      whileHover="animate"
      variants={animations.cardHover}
      className="
        bg-card border border-card-border rounded-xl p-6
        hover:bg-card-hover transition-all duration-200
        hover:border-primary/20 group cursor-pointer
      ">
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
        {/* TODO: Render mini sparkline chart using sparklineData */}
      </div>
    </motion.div>
  );
}
