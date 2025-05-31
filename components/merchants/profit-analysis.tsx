'use client'

import { useState } from 'react'
import { InteractiveChart } from '@/components/charts/interactive-chart'

interface ChartData {
  time: string
  value: number
  [key: string]: any
}

interface MovingAverages {
  threeMonth: ChartData[]
  twelveMonth: ChartData[]
}

interface ProfitAnalysisProps {
  profitData: ChartData[]
  bpsData: ChartData[]
  movingAverages: MovingAverages
  isProfitDecline: boolean
}

export function ProfitAnalysis({ 
  profitData, 
  bpsData, 
  movingAverages,
  isProfitDecline
}: ProfitAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'profit' | 'bps' | 'efficiency'>('profit')
  
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold text-white">Profit Trend Analysis</h2>
        
        <div className="flex items-center bg-gray-800 rounded-md p-1">
          <button
            onClick={() => setActiveTab('profit')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'profit'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            Profit Trajectory
          </button>
          <button
            onClick={() => setActiveTab('bps')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'bps'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            Basis Points
          </button>
          <button
            onClick={() => setActiveTab('efficiency')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'efficiency'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            Volume-to-Profit
          </button>
        </div>
      </div>
      
      {activeTab === 'profit' && (
        <div className="h-[400px]">
          <InteractiveChart 
            data={profitData} 
            title="Profit Trajectory" 
            type="line"
            color="#00E676"
            id="profit-trajectory-chart"
            additionalSeries={[
              { 
                data: movingAverages.threeMonth, 
                title: '3-Month MA', 
                color: '#FF9800',
                type: 'line'
              },
              { 
                data: movingAverages.twelveMonth, 
                title: '12-Month MA', 
                color: '#E91E63',
                type: 'line'
              }
            ]}
            showAlert={isProfitDecline}
            alertMessage="Profit decline >10% MoM"
          />
        </div>
      )}
      
      {activeTab === 'bps' && (
        <div className="h-[400px]">
          <InteractiveChart 
            data={bpsData} 
            title="Basis Points (BPS)" 
            type="line"
            color="#FF9800"
            id="bps-chart"
            additionalSeries={[]}
          />
          <div className="mt-4 p-4 bg-gray-800 rounded-lg">
            <h3 className="text-sm font-medium text-white mb-2">What are Basis Points?</h3>
            <p className="text-sm text-gray-400">
              Basis Points (BPS) represent the profit margin as a percentage of transaction volume, where 100 BPS = 1%.
              Calculated as (Profit / Volume) × 10,000. Higher BPS indicates better profitability per dollar processed.
            </p>
          </div>
        </div>
      )}
      
      {activeTab === 'efficiency' && (
        <div className="h-[400px]">
          <InteractiveChart 
            data={profitData.map((item, index) => {
              // Find matching volume data
              const matchingBps = bpsData.find(b => b.time === item.time)
              return {
                time: item.time,
                value: matchingBps?.value || 0
              }
            })}
            title="Volume-to-Profit Efficiency" 
            type="area"
            color="#7E57C2"
            id="efficiency-chart"
            additionalSeries={[]}
          />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-white mb-2">Efficiency Insights</h3>
              <p className="text-sm text-gray-400">
                This chart shows how efficiently volume is converted to profit over time. 
                Upward trends indicate improving profit margins relative to volume.
              </p>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-white mb-2">Optimization Tips</h3>
              <p className="text-sm text-gray-400">
                Focus on periods with higher efficiency to identify successful strategies.
                Investigate drops in efficiency to address potential issues with pricing or costs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
