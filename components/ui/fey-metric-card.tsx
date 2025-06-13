import React from "react";
import { FeyCard } from "./fey-card";

export function FeyMetricCard({
  title,
  value,
  change,
  trend,
  sparkline
}: {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  sparkline?: number[];
}) {
  return (
    <FeyCard className="p-6 group cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[#666666] text-xs uppercase tracking-wider font-medium">
          {title}
        </span>
        <span className={`text-xs font-medium ${trend === 'up' ? 'text-[#00CC66]' : 'text-[#FF4444]'}`}>
          {trend === 'up' ? '↑' : '↓'} {change}
        </span>
      </div>
      <div className="text-3xl font-bold text-white mb-4">
        {value}
      </div>
      {sparkline && (
        <div className="h-12 opacity-40 group-hover:opacity-60 transition-opacity">
          {/* Render mini sparkline visualization */}
          <svg className="w-full h-full">
            {sparkline.length > 1 && (
              <path
                d={generateSparklinePath(sparkline, 100, 48)}
                fill="none"
                stroke={trend === 'up' ? '#00CC66' : '#FF4444'}
                strokeWidth={2}
              />
            )}
          </svg>
        </div>
      )}
    </FeyCard>
  );
}

// Helper function to generate sparkline SVG path
function generateSparklinePath(data: number[], width: number, height: number): string {
  if (data.length < 2) return '';
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  // Scale points to fit within the SVG dimensions
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });
  
  return `M${points.join(' L')}`;
}
