import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType } from "lightweight-charts";
import { FiImage, FiBarChart2, FiActivity } from "react-icons/fi";

interface ChartData {
  time: string;
  value: number;
}

export interface EnhancedChartProps {
  data: ChartData[];
  title?: string;
  type?: "line" | "bar" | "area";
  loading?: boolean;
  height?: number;
}

export default function EnhancedChart({
  data,
  title = "",
  type = "line",
  loading = false,
  height = 300,
}: EnhancedChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartType, setChartType] = useState(type);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current || loading) return;
    chartContainerRef.current.innerHTML = "";
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "white" },
        textColor: "#222",
      },
      width: chartContainerRef.current.offsetWidth,
      height,
      grid: {
        vertLines: { color: "#e0e0e0" },
        horzLines: { color: "#e0e0e0" },
      },
      rightPriceScale: { borderColor: "#cccccc" },
      timeScale: { borderColor: "#cccccc", timeVisible: true },
      crosshair: { mode: 1 },
    });
    let series;
    if (chartType === "line") {
      series = chart.addLineSeries({ color: "#169B62", lineWidth: 2 });
    } else if (chartType === "bar") {
      series = chart.addBarSeries({ upColor: "#10b981", downColor: "#ef4444" });
    } else {
      series = chart.addAreaSeries({ topColor: "#169B62AA", bottomColor: "#169B6200", lineColor: "#169B62", lineWidth: 2 });
    }
    series.setData(data.map((d) => ({ ...d, time: d.time })));
    chart.timeScale().fitContent();
    // Tooltip
    chart.subscribeCrosshairMove(param => {
      // Implement custom tooltip logic here if needed
    });
    // Responsive
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.offsetWidth });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, chartType, loading, height]);

  const handleExport = () => {
    if (!chartContainerRef.current) return;
    setExporting(true);
    // Use Lightweight Charts API for image export
    const canvas = chartContainerRef.current.querySelector("canvas");
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "chart"}.png`;
      a.click();
    }
    setTimeout(() => setExporting(false), 1000);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex gap-2">
          <button
            className={`p-2 rounded hover:bg-primary/10 ${chartType === "line" ? "bg-primary/10" : ""}`}
            onClick={() => setChartType("line")}
            aria-label="Line chart"
          >
            <FiActivity />
          </button>
          <button
            className={`p-2 rounded hover:bg-primary/10 ${chartType === "bar" ? "bg-primary/10" : ""}`}
            onClick={() => setChartType("bar")}
            aria-label="Bar chart"
          >
            <FiBarChart2 />
          </button>
          <button
            className={`p-2 rounded hover:bg-primary/10 ${chartType === "area" ? "bg-primary/10" : ""}`}
            onClick={() => setChartType("area")}
            aria-label="Area chart"
          >
            <FiBarChart2 />
          </button>
          <button
            className="p-2 rounded hover:bg-success/10"
            onClick={handleExport}
            aria-label="Export chart as image"
            disabled={exporting}
          >
            <FiImage />
          </button>
        </div>
      </div>
      {/* minHeight previously set inline; now handled by Tailwind class */}
      <div ref={chartContainerRef} className={`w-full min-h-[${height}px]`} />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
