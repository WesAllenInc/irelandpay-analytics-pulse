'use client'

import { useEffect, useRef, memo } from 'react'

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

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return

    let chart: any = null
    let series: any = null
    let volumeSeries: any = null
    let cleanupFunction: (() => void) | undefined = undefined

    // Dynamically import lightweight-charts to avoid SSR issues
    const initChart = async () => {
      try {
        // Import the library dynamically
        const LightweightCharts = await import('lightweight-charts')
        
        // Create chart instance
        chart = LightweightCharts.createChart(chartContainerRef.current!, {
          width: chartContainerRef.current!.clientWidth,
          height: height,
          layout: {
            background: { type: LightweightCharts.ColorType.Solid, color: '#0a0a0a' },
            textColor: '#d1d4dc',
          },
          grid: {
            vertLines: { 
              color: '#1e1e1e',
              style: LightweightCharts.LineStyle.Solid,
            },
            horzLines: { 
              color: '#1e1e1e',
              style: LightweightCharts.LineStyle.Solid,
            },
          },
          timeScale: {
            borderColor: '#2a2a2a',
            timeVisible: true,
            secondsVisible: false,
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
          },
        })
        
        // Create series based on type
        if (type === 'area') {
          // @ts-ignore - Type definitions in lightweight-charts may be outdated
          series = chart.addAreaSeries({
            lineColor: color,
            topColor: color,
            bottomColor: `${color}28`,
            lineWidth: 2,
          })
        } else if (type === 'line') {
          // @ts-ignore - Type definitions in lightweight-charts may be outdated
          series = chart.addLineSeries({
            color: color,
            lineWidth: 2,
          })
        } else if (type === 'histogram') {
          // @ts-ignore - Type definitions in lightweight-charts may be outdated
          series = chart.addHistogramSeries({
            color: color,
          })
        } else {
          // Default to area
          // @ts-ignore - Type definitions in lightweight-charts may be outdated
          series = chart.addAreaSeries({
            lineColor: color,
            topColor: color,
            bottomColor: `${color}28`,
          })
        }
        
        // Format data
        const formattedData = data.map(d => ({
          time: d.time,
          value: d.value
        }))
        
        // Set data
        series.setData(formattedData)
        
        // Add volume if requested
        if (showVolume && data.some(d => d.volume !== undefined)) {
          // @ts-ignore - Type definitions in lightweight-charts may be outdated
          volumeSeries = chart.addHistogramSeries({
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
        }
        
        // Fit content
        chart.timeScale().fitContent()
        
        // Handle resize
        const handleResize = () => {
          if (chartContainerRef.current && chart) {
            chart.applyOptions({ 
              width: chartContainerRef.current.clientWidth 
            })
          }
        }
        
        window.addEventListener('resize', handleResize)
        
        // Set cleanup function
        cleanupFunction = () => {
          window.removeEventListener('resize', handleResize)
          if (chart) {
            chart.remove()
          }
        }
      } catch (error) {
        console.error('Error initializing chart:', error)
      }
    }
    
    // Initialize the chart
    initChart()
    
    // Return cleanup function
    return () => {
      if (cleanupFunction) {
        cleanupFunction()
      }
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
