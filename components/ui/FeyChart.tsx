import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, LineStyle, CrosshairMode, Time } from 'lightweight-charts';

export interface FeyChartProps {
  data: Array<{ time: string; value: number }>;
  type?: 'area' | 'line';
}

export function FeyChart({ data, type = 'area' }: FeyChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chartOptions = {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#a89984', // Gruvbox fg4/muted
      },
      grid: {
        vertLines: { color: '#504945' }, // Gruvbox bg2 (border)
        horzLines: { color: '#504945' }, // Gruvbox bg2 (border)
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#928374', style: LineStyle.Dotted }, // Gruvbox fg2/subtle
        horzLine: { color: '#928374', style: LineStyle.Dotted }, // Gruvbox fg2/subtle
      },
      timeScale: { borderColor: '#504945', timeVisible: true }, // Gruvbox bg2 (border)
      rightPriceScale: { borderColor: '#504945' }, // Gruvbox bg2 (border)
    };

    const chart = createChart(chartContainerRef.current, chartOptions);
    const series =
      type === 'area'
        ? chart.addAreaSeries({
            lineColor: '#98971a', // Gruvbox green/success
            topColor: 'rgba(152, 151, 26, 0.4)', // Gruvbox green with opacity
            bottomColor: 'rgba(152, 151, 26, 0)', // Gruvbox green fully transparent
            lineWidth: 2,
          })
        : chart.addLineSeries({
            color: '#98971a', // Gruvbox green/success
            lineWidth: 2,
          });

    // Format data to match the expected Time type
    const formattedData = data.map(item => ({
      time: item.time as Time,
      value: item.value
    }));
    
    series.setData(formattedData);

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
