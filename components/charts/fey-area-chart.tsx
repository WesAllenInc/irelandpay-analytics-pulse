'use client';

import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { FeyCard } from '../ui/fey-card';

interface FeyAreaChartProps {
  data: { time: string; value: number }[];
  title?: string;
}

export function FeyAreaChart({ data, title = 'Performance' }: FeyAreaChartProps) {
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
          background: { color: 'transparent' },
          textColor: '#666666',
        },
        grid: {
          vertLines: { color: '#1A1A1A' },
          horzLines: { color: '#1A1A1A' },
        },
        crosshair: {
          vertLine: {
            color: '#3A3A3A',
            labelBackgroundColor: '#1A1A1A',
          },
          horzLine: {
            color: '#3A3A3A',
            labelBackgroundColor: '#1A1A1A',
          },
        },
        timeScale: {
          borderColor: '#1A1A1A',
          timeVisible: true,
        },
        rightPriceScale: {
          borderColor: '#1A1A1A',
        },
      });
      
      chartRef.current = chart;
      
      const areaSeries = chart.addAreaSeries({
        lineColor: '#00CC66',
        topColor: 'rgba(0, 204, 102, 0.3)',
        bottomColor: 'rgba(0, 204, 102, 0.0)',
        lineWidth: 2,
        // Using a basic price format instead of custom formatter
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      });
      
      areaSeries.setData(data);

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
