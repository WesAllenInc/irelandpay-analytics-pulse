import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

export interface FeyChartProps {
  data: Array<{ time: number | string; value: number }>;
  type?: 'area' | 'line';
}

export function FeyChart({ data, type = 'area' }: FeyChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chartOptions = {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'hsl(var(--foreground-muted))',
      },
      grid: {
        vertLines: { color: 'hsl(var(--card-border))' },
        horzLines: { color: 'hsl(var(--card-border))' },
      },
      crosshair: {
        mode: 1,
        vertLine: { width: 1, color: 'hsl(var(--foreground-subtle))', style: 3 },
        horzLine: { width: 1, color: 'hsl(var(--foreground-subtle))', style: 3 },
      },
      timeScale: { borderColor: 'hsl(var(--card-border))', timeVisible: true },
      rightPriceScale: { borderColor: 'hsl(var(--card-border))' },
    };

    const chart = createChart(chartContainerRef.current, chartOptions);
    const series =
      type === 'area'
        ? chart.addAreaSeries({
            lineColor: 'hsl(var(--success))',
            topColor: 'hsla(var(--success),0.4)',
            bottomColor: 'hsla(var(--success),0)',
            lineWidth: 2,
          })
        : chart.addLineSeries({
            color: 'hsl(var(--success))',
            lineWidth: 2,
          });

    series.setData(data);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: 400,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, type]);

  return (
    <div className="
      bg-card border border-card-border rounded-xl p-6
      hover:border-primary/20 transition-all duration-200
    ">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Performance</h3>
        <div className="flex items-center gap-2">
          {['1D','1W','1M','3M','YTD','1Y','All'].map(period => (
            <button
              key={period}
              className="
                px-3 py-1 text-xs rounded-md
                bg-background hover:bg-card-hover
                text-foreground-muted hover:text-white
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary/50
              "
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full h-[400px]" />
    </div>
  );
}
