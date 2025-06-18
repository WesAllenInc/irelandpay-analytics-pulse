'use client'

import { useEffect, useRef, memo } from 'react'
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  ISeriesApi,
  LineStyle,
  CrosshairMode,
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
  color = '#2962FF',
  showVolume = false,
  className = ''
}: TradingViewWidgetProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { 
          color: '#1e1e1e',
          style: LineStyle.Solid,
          visible: true,
        },
        horzLines: { 
          color: '#1e1e1e',
          style: LineStyle.Solid,
          visible: true,
        },
      },
      width: chartContainerRef.current.clientWidth,
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
          color: '#758696',
          width: 1,
          style: LineStyle.Solid,
          labelBackgroundColor: '#2a2a2a',
        },
        horzLine: {
          color: '#758696',
          width: 1,
          style: LineStyle.Solid,
          labelBackgroundColor: '#2a2a2a',
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
    const formattedData = data.map(d => ({
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
    if (showVolume && data.some(d => d.volume !== undefined)) {
      // @ts-ignore - Type definitions in lightweight-charts may be outdated
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
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
        .filter(d => d.volume !== undefined)
        .map(d => ({
          time: d.time as Time,
          value: d.volume!,
          color: d.value > (data[data.indexOf(d) - 1]?.value ?? 0) 
            ? '#26a69a' 
            : '#ef5350'
        }))
      
      volumeSeries.setData(volumeData)
      volumeSeriesRef.current = volumeSeries
    }

    chart.timeScale().fitContent()
    
    chartRef.current = chart
    seriesRef.current = series

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data, height, type, color, showVolume])

  return (
    <div className={`bg-gray-950 rounded-lg p-4 border border-gray-800 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  )
}

export const TradingViewWidget = memo(TradingViewWidgetComponent)