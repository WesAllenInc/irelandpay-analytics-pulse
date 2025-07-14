'use client'

import { useEffect, useRef } from 'react'
import { ChartData } from './trading-view-widget-fixed'

// Only import types from lightweight-charts for TypeScript
import type { 
  IChartApi, 
  ISeriesApi,
  SeriesType
} from 'lightweight-charts'

interface TradingViewChartProps {
  data: ChartData[]
  height?: number
  type?: 'area' | 'line' | 'histogram' | 'candlestick'
  color?: string
  showVolume?: boolean
}

export default function TradingViewChart({ 
  data, 
  height = 400,
  type = 'area',
  color = '#2962FF',
  showVolume = false,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return

    // Dynamically import lightweight-charts to avoid SSR issues
    const initChart = async () => {
      try {
        // Import the library dynamically
        const LightweightCharts = await import('lightweight-charts')
        
        // Create the chart
        const chart = LightweightCharts.createChart(chartContainerRef.current!, {
          layout: {
            background: { type: LightweightCharts.ColorType.Solid, color: '#0a0a0a' },
            textColor: '#d1d4dc',
          },
          grid: {
            vertLines: { 
              color: '#1e1e1e',
              style: LightweightCharts.LineStyle.Solid,
              visible: true,
            },
            horzLines: { 
              color: '#1e1e1e',
              style: LightweightCharts.LineStyle.Solid,
              visible: true,
            },
          },
          width: chartContainerRef.current!.clientWidth,
          height: height,
          timeScale: {
            borderColor: '#2a2a2a',
            timeVisible: true,
            secondsVisible: false,
            tickMarkFormatter: (time: number) => {
              const date = new Date(time * 1000)
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
            mode: LightweightCharts.CrosshairMode.Normal,
            vertLine: {
              color: '#758696',
              width: 1,
              style: LightweightCharts.LineStyle.Solid,
              labelBackgroundColor: '#2a2a2a',
            },
            horzLine: {
              color: '#758696',
              width: 1,
              style: LightweightCharts.LineStyle.Solid,
              labelBackgroundColor: '#2a2a2a',
            },
          },
        })

        // Create main series based on type
        let series: ISeriesApi<SeriesType> | null = null
        
        if (type === 'area') {
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
        } else if (type === 'histogram') {
          series = chart.addHistogramSeries({
            color: color,
            priceFormat: {
              type: 'price',
              precision: 2,
              minMove: 0.01,
            },
          })
        } else if (type === 'candlestick') {
          series = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
          })
        }

        // Set data
        const formattedData = data.map(d => ({
          time: d.time,
          value: d.value
        }))
        
        // Initialize with default series if no valid type was specified
        if (!series) {
          series = chart.addAreaSeries({
            lineColor: color,
            topColor: color,
            bottomColor: `${color}28`,
          })
        }
        
        // At this point, series is guaranteed to be non-null
        series.setData(formattedData)

        // Add volume if requested
        if (showVolume && data.some(d => d.volume !== undefined)) {
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
              time: d.time,
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

        // Return cleanup function
        return () => {
          window.removeEventListener('resize', handleResize)
          chart.remove()
        }
      } catch (error) {
        console.error('Error initializing chart:', error)
      }
    }

    // Initialize the chart
    initChart()
  }, [data, height, type, color, showVolume])

  return <div ref={chartContainerRef} className="w-full" />
}
