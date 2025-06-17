'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, LineStyle, CrosshairMode, Time } from 'lightweight-charts';
import { FeyCard } from '../ui/fey-card';

interface FeyAreaChartProps {
  data: { time: string; value: number }[];
  title?: string;
  color?: string;
}

export function FeyAreaChart({ data, title = 'Performance', color = '#98971a' }: FeyAreaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (containerRef.current && data.length > 0) {
      // Clear any existing chart
      if (chartRef.current) {
        chartRef.current.remove();
      }

      // Create new chart with Fey style
      const chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#a89984', // Gruvbox fg4/muted
        },
        grid: {
          vertLines: { color: '#504945' }, // Gruvbox bg2
          horzLines: { color: '#504945' }, // Gruvbox bg2
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: '#928374', // Gruvbox fg2
            labelBackgroundColor: '#3c3836', // Gruvbox bg1
            style: LineStyle.Dotted,
          },
          horzLine: {
            color: '#928374', // Gruvbox fg2
            labelBackgroundColor: '#3c3836', // Gruvbox bg1
            style: LineStyle.Dotted,
          },
        },
        timeScale: {
          borderColor: '#504945', // Gruvbox bg2
          timeVisible: true,
        },
        rightPriceScale: {
          borderColor: '#504945', // Gruvbox bg2
        },
      });
      
      chartRef.current = chart;
      
      const areaSeries = chart.addAreaSeries({
        lineColor: color,
        topColor: color.startsWith('#') ? `${color}4D` : `${color}30`, // Add 30% opacity for top color
        bottomColor: color.startsWith('#') ? `${color}00` : `${color}00`, // Add 0% opacity for bottom color
        lineWidth: 2,
        // Using a basic price format instead of custom formatter
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      });
      
      // Format data to match the expected Time type
      const formattedData = data.map(item => ({
        time: item.time as Time,
        value: item.value
      }));
      
      areaSeries.setData(formattedData);

      // Handle resize
      const handleResize = () => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ 
            width: containerRef.current.clientWidth 
          });
        }
      };

      window.addEventListener('resize', handleResize);
      
      // Initial sizing
      handleResize();

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
        }
      };
    }
  }, [data]);

  const periods = ['1D', '1W', '1M', '3M', 'YTD', '1Y'];

  return (
    <FeyCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex gap-1">
          {periods.map((period) => (
            <button
              key={period}
              className="px-3 py-1.5 text-xs font-medium text-[#666666] hover:text-white hover:bg-[#1A1A1A] rounded-md transition-all duration-200"
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="h-[400px]" />
    </FeyCard>
  );
}
