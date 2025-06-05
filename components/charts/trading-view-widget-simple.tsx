'use client'

import { useEffect, useRef, memo } from 'react'
import dynamic from 'next/dynamic'

// Only import types for TypeScript
import type { Time } from 'lightweight-charts'

// We'll use direct dynamic import in the useEffect hook instead of dynamic component

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
    
    // Create chart with dynamic import
    const initChart = async () => {
      try {
        // Import the library
        const LightweightChartsModule = await import('lightweight-charts')
        
        // Create chart instance
        chart = LightweightChartsModule.createChart(chartContainerRef.current!, {
          width: chartContainerRef.current!.clientWidth,
          height: height,
          layout: {
            background: { type: LightweightChartsModule.ColorType.Solid, color: '#0a0a0a' },
            textColor: '#d1d4dc',
          },
          grid: {
            vertLines: { color: '#1e1e1e' },
            horzLines: { color: '#1e1e1e' },
          },
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
          },
        })
        
        // Create series based on type
        if (type === 'area') {
          series = chart.addAreaSeries({
            lineColor: color,
            topColor: color,
            bottomColor: `${color}28`,
          })
        } else if (type === 'line') {
          series = chart.addLineSeries({
            color: color,
          })
        } else {
          // Default to area
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
        if (series) {
          series.setData(formattedData)
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
        
        return () => {
          window.removeEventListener('resize', handleResize)
          if (chart) {
            chart.remove()
          }
        }
      } catch (error) {
        console.error('Error initializing chart:', error)
      }
    }
    
    initChart()
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
