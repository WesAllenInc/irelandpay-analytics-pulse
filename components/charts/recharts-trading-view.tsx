'use client'

import { useEffect, useRef, useState } from 'react'
import { 
  ResponsiveContainer,
  AreaChart, 
  Area, 
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend,
  ReferenceLine,
  ComposedChart
} from 'recharts'
import { ChartData } from './trading-view-widget-fixed'

interface RechartsViewProps {
  data: ChartData[]
  height?: number
  type?: 'area' | 'line' | 'histogram' | 'candlestick'
  color?: string
  showVolume?: boolean
}

export default function RechartsViewChart({ 
  data, 
  height = 400,
  type = 'area',
  color = '#2962FF',
  showVolume = false,
}: RechartsViewProps) {
  const [formattedData, setFormattedData] = useState<any[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Format data for recharts
  useEffect(() => {
    if (data.length === 0) return

    // Prepare data for recharts
    const formatted = data.map(item => {
      const date = new Date(item.time)
      return {
        time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: item.value,
        volume: item.volume || 0,
        rawTime: item.time
      }
    })
    
    setFormattedData(formatted)
  }, [data])

  // Format value for tooltip
  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  // Format volume for tooltip
  const formatVolume = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 text-white p-3 rounded border border-gray-700 shadow-lg">
          <p className="text-gray-300 mb-1">{label}</p>
          <p className="font-semibold text-blue-400">
            Value: <span className="text-white">{formatValue(payload[0].value)}</span>
          </p>
          {showVolume && payload.length > 1 && (
            <p className="font-semibold text-green-400">
              Volume: <span className="text-white">{formatVolume(payload[1]?.value || 0)}</span>
            </p>
          )}
        </div>
      )
    }
    return null
  }

  // Render the appropriate chart type
  const renderChart = () => {
    if (formattedData.length === 0) {
      return <div className="flex items-center justify-center h-full">Loading chart data...</div>
    }

    // For candlestick we use LineChart as a fallback (recharts doesn't have built-in candlestick)
    if (type === 'candlestick') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis 
              dataKey="time" 
              tick={{ fill: '#d1d4dc' }} 
              stroke="#2a2a2a" 
            />
            <YAxis 
              tick={{ fill: '#d1d4dc' }} 
              stroke="#2a2a2a"
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              dot={false} 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (showVolume) {
      // For charts with volume, use ComposedChart
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis 
              dataKey="time" 
              tick={{ fill: '#d1d4dc' }} 
              stroke="#2a2a2a" 
            />
            <YAxis 
              yAxisId="left"
              tick={{ fill: '#d1d4dc' }} 
              stroke="#2a2a2a"
              domain={['auto', 'auto']}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#d1d4dc' }} 
              stroke="#2a2a2a"
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            {type === 'area' && (
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                fill={`${color}28`} 
                strokeWidth={2}
              />
            )}
            {type === 'line' && (
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                dot={false} 
                strokeWidth={2}
              />
            )}
            {type === 'histogram' && (
              <Bar 
                yAxisId="left"
                dataKey="value" 
                fill={color} 
                barSize={20}
              />
            )}
            <Bar 
              yAxisId="right"
              dataKey="volume" 
              fill="#26a69a" 
              barSize={20}
              opacity={0.5}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )
    }

    // Simple chart based on type
    if (type === 'area') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis 
              dataKey="time" 
              tick={{ fill: '#d1d4dc' }} 
              stroke="#2a2a2a" 
            />
            <YAxis 
              tick={{ fill: '#d1d4dc' }} 
              stroke="#2a2a2a"
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              fill={`${color}28`} 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )
    } else if (type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis 
              dataKey="time" 
              tick={{ fill: '#d1d4dc' }} 
              stroke="#2a2a2a" 
            />
            <YAxis 
              tick={{ fill: '#d1d4dc' }} 
              stroke="#2a2a2a"
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              dot={false} 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      )
    } else if (type === 'histogram') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis 
              dataKey="time" 
              tick={{ fill: '#d1d4dc' }} 
              stroke="#2a2a2a" 
            />
            <YAxis 
              tick={{ fill: '#d1d4dc' }} 
              stroke="#2a2a2a"
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="value" 
              fill={color} 
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      )
    }
  }

  return (
    <div ref={containerRef} className="w-full bg-gray-950">
      {renderChart()}
    </div>
  )
}
