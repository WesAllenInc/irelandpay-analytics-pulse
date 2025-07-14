import React from "react";
import { FiArrowUpRight, FiArrowDownRight } from "react-icons/fi";
import { createChart, ColorType } from "lightweight-charts";

export interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendDirection?: "up" | "down";
  icon?: React.ReactNode;
  sparklineData?: number[];
  loading?: boolean;
}

export const MetricCardSkeleton = () => (
  <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-5 h-32 w-full flex flex-col gap-2">
    <div className="w-1/3 h-4 bg-gray-300 rounded" />
    <div className="w-1/2 h-8 bg-gray-300 rounded" />
    <div className="w-full h-6 bg-gray-200 rounded mt-auto" />
  </div>
);

export default function MetricCard({
  title,
  value,
  trend,
  trendDirection,
  icon,
  sparklineData = [],
  loading = false,
}: MetricCardProps) {
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!chartRef.current || !sparklineData.length) return;
    chartRef.current.innerHTML = "";
    const chart = createChart(chartRef.current, {
      width: chartRef.current.offsetWidth,
      height: 36,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#169B62' },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
    });
    const series = chart.addLineSeries({ color: '#169B62', lineWidth: 2 });
    series.setData(
      sparklineData.map((val, idx) => ({ time: (idx + 1) as any, value: val }))
    );
    return () => chart.remove();
  }, [sparklineData]);

  if (loading) return <MetricCardSkeleton />;

  return (
    <div className="group bg-white dark:bg-gray-900 rounded-lg p-5 shadow hover:shadow-lg transition-shadow duration-200 flex flex-col gap-2 h-32 relative overflow-hidden cursor-pointer">
      <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
        {icon && <span className="text-primary text-lg">{icon}</span>}
        {title}
      </div>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {typeof trend === "number" && (
          <span className={`flex items-center text-sm font-semibold ${trendDirection === "up" ? "text-success" : "text-danger"}`}>
            {trendDirection === "up" ? <FiArrowUpRight /> : <FiArrowDownRight />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div ref={chartRef} className="w-full h-6 mt-auto" />
      {/* Hover animation */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity bg-primary" />
    </div>
  );
}
