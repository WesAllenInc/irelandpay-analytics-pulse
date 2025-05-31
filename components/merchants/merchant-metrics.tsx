'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'

interface MetricsData {
  volume: {
    current: number
    momChange: number
    yoyChange: number
  }
  profit: {
    current: number
    momChange: number
    yoyChange: number
    isDecline: boolean
  }
  transactions: {
    current: number
    profitEfficiency: number
  }
  basisPoints: {
    current: number
  }
  freshness: {
    volumeDataAge: number | null
    profitDataAge: number | null
    isProfitDataStale: boolean
  }
}

interface MerchantMetricsProps {
  metrics: MetricsData
}

export function MerchantMetrics({ metrics }: MerchantMetricsProps) {
  const { comparisonMode } = useStore()
  const [comparisonType, setComparisonType] = useState<'mom' | 'yoy'>('mom')
  
  // Format numbers for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }
  
  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100)
  }
  
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }
  
  const formatBasisPoints = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  return (
    <div className="space-y-4">
      {/* Comparison type toggle */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-gray-400">Comparison:</span>
        <div className="flex items-center bg-gray-800 rounded-md p-1">
          <button
            onClick={() => setComparisonType('mom')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              comparisonType === 'mom'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            Month over Month
          </button>
          <button
            onClick={() => setComparisonType('yoy')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              comparisonType === 'yoy'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            Year over Year
          </button>
        </div>
      </div>
      
      {/* Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Volume card */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-400 text-sm">Transaction Volume</h3>
            {comparisonMode && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                (comparisonType === 'mom' ? metrics.volume.momChange : metrics.volume.yoyChange) >= 0
                  ? 'bg-green-900 text-green-300'
                  : 'bg-red-900 text-red-300'
              }`}>
                {formatPercent(comparisonType === 'mom' ? metrics.volume.momChange : metrics.volume.yoyChange)}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {formatCurrency(metrics.volume.current)}
          </p>
          {comparisonMode && (
            <div className="mt-2 text-xs">
              <span className="text-gray-400">
                {comparisonType === 'mom' ? 'vs Last Month' : 'vs Last Year'}:
              </span>
              <span className={`ml-1 font-medium ${
                (comparisonType === 'mom' ? metrics.volume.momChange : metrics.volume.yoyChange) >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {(comparisonType === 'mom' ? metrics.volume.momChange : metrics.volume.yoyChange) >= 0 ? '↑' : '↓'} 
                {formatPercent(Math.abs(comparisonType === 'mom' ? metrics.volume.momChange : metrics.volume.yoyChange))}
              </span>
            </div>
          )}
        </div>
        
        {/* Profit card */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-400 text-sm">Net Profit</h3>
            {comparisonMode && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                (comparisonType === 'mom' ? metrics.profit.momChange : metrics.profit.yoyChange) >= 0
                  ? 'bg-green-900 text-green-300'
                  : 'bg-red-900 text-red-300'
              }`}>
                {formatPercent(comparisonType === 'mom' ? metrics.profit.momChange : metrics.profit.yoyChange)}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {formatCurrency(metrics.profit.current)}
          </p>
          {comparisonMode && (
            <div className="mt-2 text-xs">
              <span className="text-gray-400">
                {comparisonType === 'mom' ? 'vs Last Month' : 'vs Last Year'}:
              </span>
              <span className={`ml-1 font-medium ${
                (comparisonType === 'mom' ? metrics.profit.momChange : metrics.profit.yoyChange) >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {(comparisonType === 'mom' ? metrics.profit.momChange : metrics.profit.yoyChange) >= 0 ? '↑' : '↓'} 
                {formatPercent(Math.abs(comparisonType === 'mom' ? metrics.profit.momChange : metrics.profit.yoyChange))}
              </span>
            </div>
          )}
          {metrics.profit.isDecline && (
            <div className="mt-2 text-xs bg-red-900 bg-opacity-50 text-red-300 px-2 py-1 rounded-md">
              ⚠️ Significant profit decline
            </div>
          )}
        </div>
        
        {/* Transactions card */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-400 text-sm">Transactions</h3>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {formatNumber(metrics.transactions.current)}
          </p>
          <div className="mt-2 text-xs">
            <span className="text-gray-400">Avg. Transaction Value:</span>
            <span className="ml-1 text-white">
              {formatCurrency(metrics.volume.current / metrics.transactions.current)}
            </span>
          </div>
          <div className="mt-1 text-xs">
            <span className="text-gray-400">Profit Efficiency:</span>
            <span className="ml-1 text-white">
              {formatCurrency(metrics.transactions.profitEfficiency)} / txn
            </span>
          </div>
        </div>
        
        {/* Basis Points card */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-400 text-sm">Basis Points (BPS)</h3>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {formatBasisPoints(metrics.basisPoints.current)}
          </p>
          <div className="mt-2 text-xs">
            <span className="text-gray-400">Formula:</span>
            <span className="ml-1 text-white">
              (Profit / Volume) × 10,000
            </span>
          </div>
          <div className="mt-1 text-xs">
            <span className="text-gray-400">Effective Rate:</span>
            <span className="ml-1 text-white">
              {formatPercent(metrics.basisPoints.current / 100)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
