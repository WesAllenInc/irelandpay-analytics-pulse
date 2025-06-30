'use client'

import { useState, memo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useStore } from '@/lib/store'
import styles from './charts.module.css'

// Dynamically import the recharts component to avoid SSR issues
const RechartsInteractiveChart = dynamic(
  () => import('./recharts-interactive-chart').then((mod) => mod.RechartsInteractiveChart),
  { ssr: false }
)

export interface ChartData {
  time: string
  value: number
  [key: string]: any
}

interface AdditionalSeries {
  data: ChartData[]
  title: string
  color: string
  type: 'line' | 'area' | 'histogram'
}

interface InteractiveChartProps {
  data: ChartData[]
  title: string
  height?: number
  type?: 'area' | 'line' | 'histogram' | 'candlestick'
  color?: string
  showVolume?: boolean
  className?: string
  id: string
  additionalSeries?: AdditionalSeries[]
  showAlert?: boolean
  alertMessage?: string
}

function InteractiveChartComponent({ 
  data, 
  title, 
  height = 400,
  type = 'area',
  color = '#458588', // Gruvbox blue
  showVolume = false,
  className = '',
  id,
  additionalSeries = [],
  showAlert = false,
  alertMessage = ''
}: InteractiveChartProps) {
  const [isClient, setIsClient] = useState(false)

  // Use effect to ensure we're rendering on client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // If we're on the server or the component hasn't mounted yet, return loading state
  if (!isClient) {
    return (
      <div 
        className={`${styles.chartContainer} ${height === 400 ? styles.height400 : height === 300 ? styles.height300 : height === 500 ? styles.height500 : styles.height600} ${className}`}
      >
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>{title}</h3>
          <div className={styles.loadingIndicator}>
            <div className={styles.loadingDot} />
            <span className="text-xs text-[#a89984]">Loading...</span>
          </div>
        </div>
        <div className={styles.loadingContainer}>
          <div className="animate-pulse text-[#a89984]">Loading chart data...</div>
        </div>
      </div>
    );
  }

  // Render the recharts component
  return (
    <RechartsInteractiveChart
      data={data}
      title={title}
      height={height}
      type={type}
      color={color}
      showVolume={showVolume}
      className={className}
      id={id}
      additionalSeries={additionalSeries}
      showAlert={showAlert}
      alertMessage={alertMessage}
    />
  )
}

export const InteractiveChart = memo(InteractiveChartComponent)
