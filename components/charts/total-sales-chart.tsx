'use client'

import { useState } from 'react'
import { 
  BarChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  TooltipProps
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

export interface SalesDayData {
  date: string
  actualVolume: number
  projectedVolume?: number
}

export interface TotalSalesChartProps {
  data: SalesDayData[]
  mtdTotal: number
  eomEstimate: number
  daysElapsed: number
  totalDaysInMonth: number
  className?: string
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const actualVolume = payload[0]?.value || 0
    const projectedVolume = payload[1]?.value

    return (
      <div className="bg-gray-900 border border-gray-800 p-3 rounded-md shadow-lg">
        <p className="text-gray-400 text-xs">{label}</p>
        <p className="text-white font-medium">
          <span className="text-blue-400">Actual:</span> {formatCurrency(actualVolume)}
        </p>
        {projectedVolume !== undefined && (
          <p className="text-white font-medium">
            <span className="text-amber-400">Projected:</span> {formatCurrency(projectedVolume)}
          </p>
        )}
      </div>
    )
  }

  return null
}

export function TotalSalesChart({ 
  data, 
  mtdTotal, 
  eomEstimate, 
  daysElapsed,
  totalDaysInMonth,
  className = '' 
}: TotalSalesChartProps) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null)
  
  // Calculate percentage of projection reached
  const percentTowardProjection = mtdTotal > 0 && eomEstimate > 0 
    ? Math.round((mtdTotal / eomEstimate) * 100) 
    : 0

  return (
    <Card className={`bg-gray-950 border-gray-800 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white text-xl">Total Sales Volume (MTD)</CardTitle>
            <CardDescription className="text-gray-400">
              Month-to-date sales + end-of-month projection
            </CardDescription>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-gray-400 text-sm">MTD: {formatCurrency(mtdTotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <span className="text-gray-400 text-sm">EOM Est: {formatCurrency(eomEstimate)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {daysElapsed} of {totalDaysInMonth} days • {percentTowardProjection}% of projection
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              onMouseMove={(e) => {
                if (e.activeTooltipIndex !== undefined) {
                  setHoveredBar(data[e.activeTooltipIndex]?.date || null)
                }
              }}
              onMouseLeave={() => setHoveredBar(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#9ca3af' }} 
                axisLine={{ stroke: '#333' }}
                tickLine={{ stroke: '#333' }}
              />
              <YAxis 
                tick={{ fill: '#9ca3af' }} 
                axisLine={{ stroke: '#333' }}
                tickLine={{ stroke: '#333' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => <span className="text-gray-400">{value}</span>}
              />
              <ReferenceLine 
                y={eomEstimate / totalDaysInMonth} 
                stroke="#f59e0b" 
                strokeDasharray="3 3"
                label={{ 
                  value: 'Daily Target', 
                  position: 'right', 
                  fill: '#f59e0b',
                  fontSize: 12
                }} 
              />
              <Bar 
                dataKey="actualVolume" 
                name="Actual Volume" 
                fill={hoveredBar ? "#3b82f6" : "#2563eb"} 
                radius={[4, 4, 0, 0]}
              />
              <Line 
                dataKey="projectedVolume" 
                name="Projected" 
                stroke="#f59e0b" 
                strokeWidth={2} 
                strokeDasharray="5 5" 
                dot={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
