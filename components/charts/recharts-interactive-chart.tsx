'use client'

import React, { useState, memo, useMemo } from 'react'
import { 
  ResponsiveContainer,
  AreaChart,
  LineChart, 
  Area,
  Line,
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend,
  TooltipProps,
  BarChart
} from 'recharts'
import { useStore } from '@/lib/store'
import styles from './charts.module.css'

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
  // Get state from Zustand store
  const { 
    dateRange, 
    setDateRange, 
    comparisonMode,
    chartType
  } = useStore()
  
  // State for tooltip
  const [activeTooltip, setActiveTooltip] = useState<any>(null)
  
  // Process the data to include proper formatting
  const processedData = useMemo(() => {
    return data.map(item => {
      const date = new Date(item.time);
      const formattedDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
      
      return {
        ...item,
        formattedTime: formattedDate,
        // Handle candlestick data for chart display
        ...(item.open !== undefined && {
          openValue: item.open,
          highValue: item.high,
          lowValue: item.low,
          closeValue: item.value
        })
      };
    });
  }, [data]);
  
  // Process additional series data
  const processedAdditionalSeries = useMemo(() => {
    return additionalSeries.map(series => ({
      ...series,
      data: series.data.map(item => {
        const date = new Date(item.time);
        const formattedDate = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });
        
        return {
          ...item,
          formattedTime: formattedDate
        };
      })
    }));
  }, [additionalSeries]);
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.tooltipContainer}>
          <div className={styles.tooltipTime}>
            {payload[0]?.payload.formattedTime}
          </div>
          <div className={styles.tooltipValue}>
            ${(payload[0]?.value as number)?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          
          {/* Show additional series values in the tooltip */}
          {payload.slice(1).map((entry, index) => (
            <div key={`tooltip-${index}`} className={styles.tooltipEntry}>
              <span className={styles.tooltipLabel}>{entry.name}: </span>
              <span className={styles.tooltipValue}>
                ${(entry.value as number)?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          
          {/* Show candlestick data if available */}
          {payload[0]?.payload.open !== undefined && (
            <div className={styles.grid}>
              <div className={styles.tooltipEntry}>
                <span className={styles.tooltipLabel}>Open: </span>
                <span className={styles.tooltipValue}>${payload[0].payload.open?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className={styles.tooltipEntry}>
                <span className={styles.tooltipLabel}>High: </span>
                <span className={styles.tooltipValue}>${payload[0].payload.high?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className={styles.tooltipEntry}>
                <span className={styles.tooltipLabel}>Low: </span>
                <span className={styles.tooltipValue}>${payload[0].payload.low?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className={styles.tooltipEntry}>
                <span className={styles.tooltipLabel}>Close: </span>
                <span className={styles.tooltipValue}>${payload[0].payload.close?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
          
          {/* Volume data if shown */}
          {showVolume && payload[0]?.payload.volume !== undefined && (
            <div className="text-xs mt-1">
              <span className="text-[#a89984]">Volume: </span>
              <span className="text-[#ebdbb2]">
                {payload[0].payload.volume?.toLocaleString('en-US')}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };
  
  // Determine which chart type to render based on the type prop or chart type from state
  const currentType = chartType || type;
  
  // Render the appropriate chart based on type
  const renderChart = () => {
    // Use the chartType from the store if it exists, otherwise use the prop
    const displayType = chartType || type;
    
    switch (displayType as 'area' | 'line' | 'histogram' | 'candlestick') {
      case 'area':
        return (
          <AreaChart 
            data={processedData}
            margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id={`colorGradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#504945" />
            <XAxis 
              dataKey="formattedTime" 
              tick={{ fill: '#ebdbb2' }}
              axisLine={{ stroke: '#504945' }}
              tickLine={{ stroke: '#504945' }}
              minTickGap={30}
            />
            <YAxis 
              tick={{ fill: '#ebdbb2' }}
              axisLine={{ stroke: '#504945' }}
              tickLine={{ stroke: '#504945' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              fillOpacity={1}
              fill={`url(#colorGradient-${id})`} 
              name={title}
            />
            
            {/* Render additional series */}
            {processedAdditionalSeries.map((series, index) => {
              if (series.type === 'area') {
                return (
                  <React.Fragment key={`additional-${index}`}>
                    <defs>
                      <linearGradient id={`additionalGradient-${id}-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={series.color} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={series.color} stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      data={series.data} 
                      stroke={series.color}
                      fillOpacity={0.6}
                      fill={`url(#additionalGradient-${id}-${index})`}
                      name={series.title}
                    />
                  </React.Fragment>
                );
              }
              return null;
            })}
          </AreaChart>
        );
        
      case 'line':
        return (
          <LineChart 
            data={processedData}
            margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#504945" />
            <XAxis 
              dataKey="formattedTime" 
              tick={{ fill: '#ebdbb2' }}
              axisLine={{ stroke: '#504945' }}
              tickLine={{ stroke: '#504945' }}
              minTickGap={30}
            />
            <YAxis 
              tick={{ fill: '#ebdbb2' }}
              axisLine={{ stroke: '#504945' }}
              tickLine={{ stroke: '#504945' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              dot={false}
              activeDot={{ r: 5 }}
              name={title}
            />
            
            {/* Render additional series */}
            {processedAdditionalSeries.map((series, index) => {
              if (series.type === 'line') {
                return (
                  <Line 
                    key={`additional-${index}`}
                    type="monotone" 
                    dataKey="value" 
                    data={series.data} 
                    stroke={series.color}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name={series.title}
                  />
                );
              }
              return null;
            })}
          </LineChart>
        );
        
      case 'histogram':
      case 'candlestick': // For candlestick, we'll use a bar chart for now since recharts doesn't have a native candlestick
        return (
          <BarChart 
            data={processedData}
            margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
            barSize={20}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#504945" />
            <XAxis 
              dataKey="formattedTime" 
              tick={{ fill: '#ebdbb2' }}
              axisLine={{ stroke: '#504945' }}
              tickLine={{ stroke: '#504945' }}
              minTickGap={30}
            />
            <YAxis 
              tick={{ fill: '#ebdbb2' }}
              axisLine={{ stroke: '#504945' }}
              tickLine={{ stroke: '#504945' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="value" 
              fill={color} 
              name={title}
            />
            
            {/* Volume series if needed */}
            {showVolume && (
              <Bar 
                dataKey="volume" 
                fill="#98971a"
                name="Volume"
                opacity={0.6}
              />
            )}
          </BarChart>
        );
        
      default:
        return (
          <AreaChart 
            data={processedData}
            margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id={`colorGradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#504945" />
            <XAxis 
              dataKey="formattedTime" 
              tick={{ fill: '#ebdbb2' }}
              axisLine={{ stroke: '#504945' }}
              tickLine={{ stroke: '#504945' }}
              minTickGap={30}
            />
            <YAxis 
              tick={{ fill: '#ebdbb2' }}
              axisLine={{ stroke: '#504945' }}
              tickLine={{ stroke: '#504945' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              fillOpacity={1}
              fill={`url(#colorGradient-${id})`} 
              name={title}
            />
          </AreaChart>
        );
    }
  };

  return (
    <div className={`${styles.chartContainer} ${className}`}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <div className="flex items-center gap-4">
          {additionalSeries.length > 0 && (
            <div className={styles.legendContainer}>
              {additionalSeries.map((series, index) => (
                <div key={index} className={styles.legendItem}>
                  <div 
                    className={`${styles.legendColorBox} ${series.color === '#458588' ? styles.bgPrimary : series.color === '#98971a' ? styles.bgSecondary : series.color === '#d79921' ? styles.bgTertiary : styles.bgQuaternary}`}
                  />
                  <span>{series.title}</span>
                </div>
              ))}
            </div>
          )}
          <div className={styles.loadingIndicator}>
            <div className={styles.loadingDot} />
            <span className="text-xs text-[#a89984]">Live</span>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <div className={`${styles.chartWrapper} ${height === 400 ? styles.height400 : height === 300 ? styles.height300 : height === 500 ? styles.height500 : styles.height600}`}>
          <ResponsiveContainer>
            {renderChart()}
          </ResponsiveContainer>
        </div>
        
        {showAlert && (
          <div className="absolute top-2 right-2 bg-[#cc241d] bg-opacity-90 text-[#ebdbb2] px-3 py-1 rounded-md text-xs font-medium">
            {alertMessage || 'Alert'}
          </div>
        )}
      </div>
    </div>
  )
}

export const RechartsInteractiveChart = memo(InteractiveChartComponent)
