'use client'

import { useState } from 'react'
import { InteractiveChart } from '@/components/charts/interactive-chart'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts'

interface ChartData {
  time: string
  value: number
  [key: string]: any
}

interface CorrelationData {
  x: number
  y: number
  time: string
}

interface DualAxisData {
  volume: ChartData[]
  margin: ChartData[]
}

interface VolumeToProfit {
  correlationData: CorrelationData[]
  profitPerTxnData: ChartData[]
  dualAxisData: DualAxisData
}

export function VolumeToProfit({ 
  correlationData, 
  profitPerTxnData,
  dualAxisData
}: VolumeToProfit) {
  const [activeTab, setActiveTab] = useState<'scatter' | 'efficiency' | 'dual'>('scatter')
  
  // Calculate correlation coefficient
  const calculateCorrelation = (data: CorrelationData[]): number => {
    if (data.length < 2) return 0;
    
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    
    for (const point of data) {
      sumX += point.x;
      sumY += point.y;
      sumXY += point.x * point.y;
      sumX2 += point.x * point.x;
      sumY2 += point.y * point.y;
    }
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };
  
  const correlationCoefficient = calculateCorrelation(correlationData);
  
  // Format the correlation coefficient for display
  const formatCorrelation = (value: number): string => {
    return value.toFixed(2);
  };
  
  // Determine correlation strength text
  const getCorrelationStrength = (value: number): string => {
    const abs = Math.abs(value);
    if (abs >= 0.7) return 'Strong';
    if (abs >= 0.3) return 'Moderate';
    return 'Weak';
  };
  
  // Format currency for tooltips
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Format percent for tooltips
  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Custom tooltip for scatter plot
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-md p-2 shadow-lg">
          <p className="text-xs text-gray-400">{new Date(data.time).toLocaleDateString()}</p>
          <p className="text-sm text-white">
            Volume: {formatCurrency(data.x)}
          </p>
          <p className="text-sm text-white">
            Margin: {formatPercent(data.y)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold text-white">Volume to Profit Correlation</h2>
        
        <div className="flex items-center bg-gray-800 rounded-md p-1">
          <button
            onClick={() => setActiveTab('scatter')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'scatter'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            Scatter Plot
          </button>
          <button
            onClick={() => setActiveTab('efficiency')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'efficiency'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            Profit Efficiency
          </button>
          <button
            onClick={() => setActiveTab('dual')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'dual'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            Dual Axis
          </button>
        </div>
      </div>
      
      {activeTab === 'scatter' && (
        <div>
          <div className="h-[400px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Volume" 
                  stroke="#666"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                >
                  <Label value="Transaction Volume" position="bottom" fill="#999" />
                </XAxis>
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Profit Margin" 
                  stroke="#666"
                  tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                >
                  <Label value="Profit Margin" position="left" angle={-90} fill="#999" />
                </YAxis>
                <Tooltip content={<CustomScatterTooltip />} />
                <Scatter 
                  name="Volume vs Profit" 
                  data={correlationData} 
                  fill="#8884d8" 
                  fillOpacity={0.6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-white mb-2">Correlation Coefficient</h3>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${
                  correlationCoefficient > 0 ? 'text-green-400' : 
                  correlationCoefficient < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {formatCorrelation(correlationCoefficient)}
                </span>
                <span className="text-sm text-gray-400">
                  ({getCorrelationStrength(correlationCoefficient)} {correlationCoefficient > 0 ? 'Positive' : 'Negative'})
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-white mb-2">What This Means</h3>
              <p className="text-sm text-gray-400">
                {correlationCoefficient > 0.5 ? 
                  'Strong positive correlation: As volume increases, profit margin tends to increase.' :
                correlationCoefficient > 0 ?
                  'Weak positive correlation: Volume and profit margin have some positive relationship.' :
                correlationCoefficient < -0.5 ?
                  'Strong negative correlation: As volume increases, profit margin tends to decrease.' :
                  'Weak negative correlation: Volume and profit margin have some negative relationship.'}
              </p>
            </div>
            
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-white mb-2">Recommendation</h3>
              <p className="text-sm text-gray-400">
                {correlationCoefficient > 0.5 ? 
                  'Focus on increasing transaction volume to improve profit margins.' :
                correlationCoefficient < -0.5 ?
                  'Consider reviewing pricing tiers as higher volumes may be less profitable.' :
                  'Volume and profit have a weak relationship. Consider other factors affecting profitability.'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'efficiency' && (
        <div className="h-[400px]">
          <InteractiveChart 
            data={profitPerTxnData} 
            title="Profit per Transaction" 
            type="line"
            color="#4CAF50"
            id="profit-per-txn-chart"
            additionalSeries={[]}
          />
        </div>
      )}
      
      {activeTab === 'dual' && (
        <div className="h-[400px]">
          <InteractiveChart 
            data={dualAxisData.volume} 
            title="Volume vs Profit Margin" 
            type="area"
            color="#2962FF"
            id="dual-axis-chart"
            additionalSeries={[
              { 
                data: dualAxisData.margin, 
                title: 'Profit Margin', 
                color: '#FF6D00',
                type: 'line'
              }
            ]}
          />
        </div>
      )}
    </div>
  )
}
