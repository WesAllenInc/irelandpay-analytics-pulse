'use client'

import { useEffect, useRef, memo } from 'react'
import dynamic from 'next/dynamic'

// Create a dynamic version of the chart component to avoid SSR issues
const TradingViewChart = dynamic(
  () => import('./trading-view-chart'),
  { ssr: false }
)

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
  // Use client-side only rendering with the dynamic component
  return (
    <div className={`bg-gray-950 rounded-lg p-4 border border-gray-800 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>
      <TradingViewChart 
        data={data}
        height={height}
        type={type}
        color={color}
        showVolume={showVolume}
      />
    </div>
  )
}

export const TradingViewWidget = memo(TradingViewWidgetComponent)
