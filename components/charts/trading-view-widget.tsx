'use client'

import { useEffect, useRef, memo } from 'react'
import { createChart, ColorType, LineStyle, CrosshairMode } from 'lightweight-charts'

// Only import types from lightweight-charts for TypeScript
import type { 
  IChartApi, 
  ISeriesApi,
  Time,
  SeriesType
} from 'lightweight-charts'

export interface ChartData {
  time: string
  value: number
  volume?: number
}

interface TradingViewWidgetProps {
  data: ChartData[]
  title: string
  height?: number
  type?: 'area' | 'line' | 'histogram' | 'candlestick'
  color?: string
  showVolume?: boolean
  className?: string
}

function TradingViewWidgetComponent({ 
  data, 
  title, 
  height = 400,
  type = 'area',
  color = '#d79921', // Gruvbox Yellow
  showVolume = false,
  className = ''
}: TradingViewWidgetProps): JSX.Element {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;
    
    // Use directly imported lightweight-charts
    function setupChart() {
      // Already imported at the top of the file
      
      const chart = createChart(chartContainerRef.current!, {
        layout: {
          background: { type: ColorType.Solid, color: '#282828' }, // Gruvbox bg
          textColor: '#ebdbb2', // Gruvbox foreground
        },
        grid: {
          vertLines: { 
            color: '#504945', // Gruvbox bg2
            style: LineStyle.Solid,
            visible: true,
          },
          horzLines: { 
            color: '#504945', // Gruvbox bg2
            style: LineStyle.Solid,
            visible: true,
          },
        },
        width: chartContainerRef.current!.clientWidth,
        height: height,
        timeScale: {
          borderColor: '#2a2a2a',
          timeVisible: true,
          secondsVisible: false,
          tickMarkFormatter: (time: Time) => {
            const date = new Date(time as string)
            return date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })
          },
        },
        rightPriceScale: {
          borderColor: '#2a2a2a',
          scaleMargins: {
            top: 0.1,
            bottom: showVolume ? 0.3 : 0.1,
          },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: '#a89984', // Gruvbox fg4
            width: 1,
            style: LineStyle.Solid,
            labelBackgroundColor: '#3c3836', // Gruvbox bg1
          },
          horzLine: {
            color: '#a89984', // Gruvbox fg4
            width: 1,
            style: LineStyle.Solid,
            labelBackgroundColor: '#3c3836', // Gruvbox bg1
          },
        },
      })

      // Create main series based on type
      let series: ISeriesApi<SeriesType> | null = null
      
      if (type === 'area') {
        // @ts-ignore - Type definitions in lightweight-charts may be outdated
        series = chart.addAreaSeries({
          lineColor: color,
          topColor: color,
          bottomColor: `${color}28`,
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
          crosshairMarkerBorderColor: color,
          crosshairMarkerBackgroundColor: '#ffffff',
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
          },
        })
      } else if (type === 'line') {
        // @ts-ignore - Type definitions in lightweight-charts may be outdated
        series = chart.addLineSeries({
          color: color,
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
          crosshairMarkerBorderColor: color,
          crosshairMarkerBackgroundColor: '#ffffff',
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
          },
        })
      }

      // Set data
      const formattedData = data.map((d: ChartData) => ({
        time: d.time as Time,
        value: d.value
      }))
      
      // Initialize with default series if neither area nor line type was specified
      if (!series) {
        // @ts-ignore - Type definitions in lightweight-charts may be outdated
        series = chart.addAreaSeries({
          lineColor: color,
          topColor: color,
          bottomColor: `${color}28`,
        })
      }
      
      // At this point, series is guaranteed to be non-null
      if (series) {
        series.setData(formattedData)
      }

      // Add volume if requested
      if (showVolume && data.some((d: ChartData) => d.volume !== undefined)) {
        // @ts-ignore - Type definitions in lightweight-charts may be outdated
        const volumeSeries = chart.addHistogramSeries({
          color: '#98971a', // Gruvbox green
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: 'volume',
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        })

        const volumeData = data
          .filter((d: ChartData) => d.volume !== undefined)
          .map((d: ChartData) => ({
            time: d.time as Time,
            value: d.volume!,
            color: d.value > (data[data.indexOf(d) - 1]?.value ?? 0) 
              ? '#b8bb26' // Gruvbox bright green 
              : '#fb4934' // Gruvbox bright red
          }))
        
        volumeSeries.setData(volumeData)
        volumeSeriesRef.current = volumeSeries
      }

      chart.timeScale().fitContent()
      
      chartRef.current = chart
      seriesRef.current = series
    }

    // Handle resize
    function handleResize(): void {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        })
      }
    }

    window.addEventListener('resize', handleResize)
    
    setupChart()
    
    // Return cleanup function
    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
      }
    }
  }, [data, height, type, color, showVolume]);

  return (
    <div className={`bg-gruvbox-bg rounded-lg p-4 border border-gruvbox-bg-2 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gruvbox-fg-1 text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-gruvbox-green-bright rounded-full animate-pulse" />
          <span className="text-xs text-gruvbox-gray">Live</span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  )
}

export const TradingViewWidget = memo(TradingViewWidgetComponent);