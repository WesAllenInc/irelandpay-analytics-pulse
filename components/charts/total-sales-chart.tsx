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
import { motion } from 'framer-motion'
import { animations } from '@/lib/animations'

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
      <div className="bg-gruvbox-bg-1 border-gruvbox-bg-3 p-3 rounded-md shadow-lg">
        <p className="text-gruvbox-gray text-xs">{label}</p>
        <p className="text-gruvbox-fg font-medium">
          <span className="text-gruvbox-blue">Actual:</span> {formatCurrency(actualVolume)}
        </p>
        {projectedVolume !== undefined && (
          <p className="text-gruvbox-fg font-medium">
            <span className="text-gruvbox-yellow">Projected:</span> {formatCurrency(projectedVolume)}
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
    <motion.div initial="hidden" animate="visible" variants={animations.fadeIn}>
      <Card className={`bg-gruvbox-bg border-gruvbox-bg-2 ${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gruvbox-fg text-xl">Total Sales Volume (MTD)</CardTitle>
              <CardDescription className="text-gruvbox-gray">
                Month-to-date sales + end-of-month projection
              </CardDescription>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gruvbox-blue rounded-full" />
                <span className="text-gruvbox-gray text-sm">MTD: {formatCurrency(mtdTotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gruvbox-yellow rounded-full" />
                <span className="text-gruvbox-gray text-sm">EOM Est: {formatCurrency(eomEstimate)}</span>
              </div>
              <div className="text-xs text-gruvbox-gray mt-1">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#504945" vertical={false} />
                <XAxis 
                  dataKey="date" 
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
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span className="text-gruvbox-gray">{value}</span>}
                />
                <ReferenceLine 
                  y={eomEstimate / totalDaysInMonth} 
                  stroke="#d79921" 
                  strokeDasharray="3 3"
                  label={{ 
                    value: 'Daily Target', 
                    position: 'right', 
                    fill: '#d79921',
                    fontSize: 12
                  }} 
                />
                <Bar 
                  dataKey="actualVolume" 
                  name="Actual Volume" 
                  fill={hoveredBar ? '#458588cc' : '#458588'} 
                  radius={[4, 4, 0, 0]}
                />
                <Line 
                  dataKey="projectedVolume" 
                  name="Projected" 
                  stroke="#d79921" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  dot={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
