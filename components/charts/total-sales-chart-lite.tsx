'use client'

import React from 'react'
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  TooltipProps
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { motion } from 'framer-motion'
import { animations } from '@/lib/animations'

export interface SalesDayData {
  time: string
  actualVolume: number
  projectedVolume?: number
  // For recharts display
  formattedTime?: string
}

export interface TotalSalesChartProps {
  data: SalesDayData[]
  mtdTotal: number
  eomEstimate: number
  daysElapsed: number
  totalDaysInMonth: number
  className?: string
}

// Custom tooltip component for the chart
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const actualVolume = payload.find(p => p.dataKey === 'actualVolume')?.value || 0
    const projectedVolume = payload.find(p => p.dataKey === 'projectedVolume')?.value
    
    return (
      <div className="bg-gray-800 text-white p-3 rounded-md shadow-lg border border-gray-700">
        <p className="text-gray-300 text-xs mb-1">{label}</p>
        <p className="text-white font-medium">
          <span className="text-blue-400">Actual:</span> {formatCurrency(actualVolume as number)}
        </p>
        {projectedVolume !== undefined && (
          <p className="text-white font-medium">
            <span className="text-amber-400">Projected:</span> {formatCurrency(projectedVolume as number)}
          </p>
        )}
      </div>
    )
  }
  return null
}

export function TotalSalesChartLite({ data, mtdTotal, eomEstimate, daysElapsed, totalDaysInMonth, className = '' }: TotalSalesChartProps) {
  // Format the data for display
  const formattedData = data.map(item => {
    // Convert time string to a more readable format
    const date = new Date(item.time)
    const formattedTime = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    
    return {
      ...item,
      formattedTime
    }
  })

  return (
    <motion.div initial="hidden" animate="visible" variants={animations.fadeIn} className="h-full">
      <Card className={`bg-card border-card-border shadow-card hover:shadow-elevated transition-all duration-200 h-full ${className}`}>
        <CardHeader className="pb-2 pt-5 px-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-foreground text-base font-medium">Total Sales Volume (MTD)</CardTitle>
              <CardDescription className="text-foreground-muted text-sm mt-1">
                Month-to-date sales + end-of-month projection
              </CardDescription>
            </div>
            <div className="flex flex-col items-start md:items-end space-y-1 mt-1 md:mt-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-foreground-muted text-sm">MTD: {formatCurrency(mtdTotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full" />
                <span className="text-foreground-muted text-sm">EOM Est: {formatCurrency(eomEstimate)}</span>
              </div>
              <div className="text-xs text-foreground-muted mt-1">
                {daysElapsed} of {totalDaysInMonth} days • {Math.round((mtdTotal / eomEstimate) * 100)}% of projection
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-2 overflow-hidden">
          <div className="w-full h-[300px] overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={formattedData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#504945" vertical={false} />
                <XAxis 
                  dataKey="formattedTime" 
                  tick={{ fill: '#a89984' }}
                  axisLine={{ stroke: '#504945' }}
                  tickLine={{ stroke: '#504945' }}
                />
                <YAxis 
                  tick={{ fill: '#a89984' }}
                  axisLine={{ stroke: '#504945' }}
                  tickLine={{ stroke: '#504945' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="actualVolume" 
                  name="Actual Volume"
                  stroke="#458588" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="projectedVolume" 
                  name="Projected Volume"
                  stroke="#d79921" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
