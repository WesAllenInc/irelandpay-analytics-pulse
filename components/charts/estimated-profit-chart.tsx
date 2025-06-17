'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { animations } from '@/lib/animations'
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
  TooltipProps
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Toggle } from '@/components/ui/toggle'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface MerchantProfit {
  merchantId: string
  name: string
  bps: number
  projectedVolume: number
  estimatedProfit: number
  actualProfit?: number
}

export interface EstimatedProfitChartProps {
  merchants: MerchantProfit[]
  totalEstimatedProfit: number
  totalActualProfit?: number
  className?: string
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const actualProfit = payload[0]?.value
    const estimatedProfit = payload[1]?.value || 0

    return (
      <div className="bg-card border border-card-border p-3 rounded-md shadow-lg">
        <p className="text-foreground-muted text-xs">{label}</p>
        {actualProfit !== undefined && (
          <p className="text-foreground font-medium">
            <span className="text-green-500">Actual:</span> {formatCurrency(actualProfit)}
          </p>
        )}
        <p className="text-foreground font-medium">
          <span className="text-purple-500">Estimated:</span> {formatCurrency(estimatedProfit)}
        </p>
      </div>
    )
  }

  return null
}

export function EstimatedProfitChart({ 
  merchants, 
  totalEstimatedProfit,
  totalActualProfit,
  className = '' 
}: EstimatedProfitChartProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  
  // Format data for the chart
  const aggregatedData = [
    {
      name: 'This Month',
      actualProfit: totalActualProfit,
      estimatedProfit: totalEstimatedProfit
    }
  ]

  // Format merchant data for the breakdown chart
  const merchantData = merchants
    .sort((a, b) => b.estimatedProfit - a.estimatedProfit)
    .map(merchant => ({
      name: merchant.name,
      actualProfit: merchant.actualProfit,
      estimatedProfit: merchant.estimatedProfit,
      bps: merchant.bps,
      volume: merchant.projectedVolume
    }))

  return (
    <motion.div initial="hidden" animate="visible" variants={animations.fadeIn} className="h-full">
      <Card className={`bg-card border-card-border shadow-card hover:shadow-elevated transition-all duration-200 h-full ${className}`}>
        <CardHeader className="pb-2 pt-5 px-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-foreground text-base font-medium">Estimated Net Profit</CardTitle>
              <CardDescription className="text-foreground-muted text-sm mt-1">
                Projected profit based on merchant BPS rates
              </CardDescription>
            </div>
            <div className="flex flex-col items-start md:items-end space-y-1 mt-1 md:mt-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span className="text-foreground-muted text-sm">Est. Profit: {formatCurrency(totalEstimatedProfit)}</span>
              </div>
              {totalActualProfit !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-foreground-muted text-sm">Actual: {formatCurrency(totalActualProfit)}</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-2 overflow-hidden">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              {!showBreakdown ? (
                <BarChart
                  data={aggregatedData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#504945" vertical={false} />
                  <XAxis 
                    dataKey="name" 
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
                    formatter={(value) => <span className="text-foreground-muted">{value}</span>}
                  />
                  {totalActualProfit !== undefined && (
                    <Bar 
                      dataKey="actualProfit" 
                      name="Actual Profit" 
                      fill="#98971a" 
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                  <Bar 
                    dataKey="estimatedProfit" 
                    name="Estimated Profit" 
                    fill="#b16286" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <BarChart
                  data={merchantData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#504945" horizontal={false} />
                  <XAxis 
                    type="number"
                    tick={{ fill: '#a89984' }} 
                    axisLine={{ stroke: '#504945' }}
                    tickLine={{ stroke: '#504945' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    dataKey="name"
                    type="category"
                    tick={{ fill: '#a89984' }} 
                    axisLine={{ stroke: '#504945' }}
                    tickLine={{ stroke: '#504945' }}
                    width={120}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px' }}
                    formatter={(value) => <span className="text-foreground-muted">{value}</span>}
                  />
                  {merchantData.some(m => m.actualProfit !== undefined) && (
                    <Bar 
                      dataKey="actualProfit" 
                      name="Actual Profit" 
                      fill="#98971a" 
                      radius={[0, 4, 4, 0]}
                    />
                  )}
                  <Bar 
                    dataKey="estimatedProfit" 
                    name="Estimated Profit" 
                    fill="#b16286" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          
          <div className="flex justify-center mt-4">
            <Toggle
              aria-label="Toggle merchant breakdown"
              pressed={showBreakdown}
              onPressedChange={setShowBreakdown}
              className="flex items-center gap-2 text-sm text-gruvbox-gray"
            >
              {showBreakdown ? (
                <>
                  <ChevronUp className="w-4 h-4" /> Hide Merchant Breakdown
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" /> Show Merchant Breakdown
                </>
              )}
            </Toggle>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
