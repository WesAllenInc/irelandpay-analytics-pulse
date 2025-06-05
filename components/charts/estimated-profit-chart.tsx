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
      <div className="bg-gray-900 border border-gray-800 p-3 rounded-md shadow-lg">
        <p className="text-gray-400 text-xs">{label}</p>
        {actualProfit !== undefined && (
          <p className="text-white font-medium">
            <span className="text-green-400">Actual:</span> {formatCurrency(actualProfit)}
          </p>
        )}
        <p className="text-white font-medium">
          <span className="text-purple-400">Estimated:</span> {formatCurrency(estimatedProfit)}
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
    <Card className={`bg-gray-950 border-gray-800 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white text-xl">Estimated Net Profit</CardTitle>
            <CardDescription className="text-gray-400">
              Projected profit based on merchant BPS rates
            </CardDescription>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span className="text-gray-400 text-sm">Est. Profit: {formatCurrency(totalEstimatedProfit)}</span>
            </div>
            {totalActualProfit !== undefined && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-gray-400 text-sm">Actual: {formatCurrency(totalActualProfit)}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            {!showBreakdown ? (
              <BarChart
                data={aggregatedData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis 
                  dataKey="name" 
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
                {totalActualProfit !== undefined && (
                  <Bar 
                    dataKey="actualProfit" 
                    name="Actual Profit" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]}
                  />
                )}
                <Bar 
                  dataKey="estimatedProfit" 
                  name="Estimated Profit" 
                  fill="#8b5cf6" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
              <BarChart
                data={merchantData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis 
                  type="number"
                  tick={{ fill: '#9ca3af' }} 
                  axisLine={{ stroke: '#333' }}
                  tickLine={{ stroke: '#333' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#9ca3af' }} 
                  axisLine={{ stroke: '#333' }}
                  tickLine={{ stroke: '#333' }}
                  width={120}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span className="text-gray-400">{value}</span>}
                />
                {merchantData.some(m => m.actualProfit !== undefined) && (
                  <Bar 
                    dataKey="actualProfit" 
                    name="Actual Profit" 
                    fill="#10b981" 
                    radius={[0, 4, 4, 0]}
                  />
                )}
                <Bar 
                  dataKey="estimatedProfit" 
                  name="Estimated Profit" 
                  fill="#8b5cf6" 
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
            className="flex items-center gap-2 text-sm text-gray-400"
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
  )
}
