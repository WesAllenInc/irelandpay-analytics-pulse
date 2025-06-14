'use client'

import React, { useRef, useEffect } from 'react'
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { motion } from 'framer-motion'
import { animations } from '@/lib/animations'

export interface SalesDayData {
  time: string
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

export function TotalSalesChartLite({ data, mtdTotal, eomEstimate, daysElapsed, totalDaysInMonth, className = '' }: TotalSalesChartProps) {
  const chartContainer = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi>()
  const actualSeriesRef = useRef<ISeriesApi<'Line'>>()
  const projectedSeriesRef = useRef<ISeriesApi<'Line'>>()

  useEffect(() => {
    if (!chartContainer.current) return
    chartRef.current = createChart(chartContainer.current, {
      width: chartContainer.current.clientWidth,
      height: 300,
      layout: {
        backgroundColor: 'hsl(var(--card))',
        textColor: 'hsl(var(--foreground-muted))',
      },
      grid: {
        vertLines: { color: 'hsl(var(--card-border))' },
        horzLines: { color: 'hsl(var(--card-border))' },
      },
      timeScale: {
        timeVisible: true,
        borderColor: 'hsl(var(--card-border))',
      },
      rightPriceScale: {
        borderColor: 'hsl(var(--card-border))',
      },
    })
    actualSeriesRef.current = chartRef.current.addLineSeries({ color: 'hsl(var(--accent-blue))', lineWidth: 2 })
    projectedSeriesRef.current = chartRef.current.addLineSeries({ color: 'hsl(var(--warning))', lineWidth: 2, lineStyle: 2 })
    return () => chartRef.current?.remove()
  }, [])

  useEffect(() => {
    const actualData = data.map(d => ({ time: d.time, value: d.actualVolume }))
    actualSeriesRef.current?.setData(actualData)
    const projectedData = data.filter(d => d.projectedVolume !== undefined).map(d => ({ time: d.time, value: d.projectedVolume! }))
    projectedSeriesRef.current?.setData(projectedData)
  }, [data])

  return (
    <motion.div initial="hidden" animate="visible" variants={animations.fadeIn}>
      <Card className={`bg-card border-card-border ${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-xl">Total Sales Volume (MTD)</CardTitle>
              <CardDescription className="text-foreground-muted">
                Month-to-date sales + end-of-month projection
              </CardDescription>
            </div>
            <div className="flex flex-col items-end">
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
        <CardContent>
          <div ref={chartContainer} className="w-full h-[300px]" />
        </CardContent>
      </Card>
    </motion.div>
  )
}
