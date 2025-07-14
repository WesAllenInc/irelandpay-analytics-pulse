
import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, LineSeriesPartialOptions } from 'lightweight-charts';

interface VolumeData {
  time: string;
  value: number;
}

interface VolumeChartProps {
  data: VolumeData[];
  title?: string;
}

export function VolumeChart({ data, title = "Volume Chart" }: VolumeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'white' },
        textColor: 'black',
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      grid: {
        vertLines: { color: '#e0e0e0' },
        horzLines: { color: '#e0e0e0' },
      },
      rightPriceScale: {
        borderColor: '#cccccc',
      },
      timeScale: {
        borderColor: '#cccccc',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const lineSeries = chart.addLineSeries({
      color: '#2563eb',
      lineWidth: 2,
    } as LineSeriesPartialOptions);

    chartRef.current = chart;
    seriesRef.current = lineSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      const formattedData = data.map(item => ({
        time: item.time,
        value: item.value,
      }));
      seriesRef.current.setData(formattedData);
    }
  }, [data]);

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
