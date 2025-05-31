'use client'

import { useEffect, useRef, useState, memo } from 'react'
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  ISeriesApi,
  LineStyle,
  CrosshairMode,
  Time,
  SeriesType,
  MouseEventParams,
  BarPrice
} from 'lightweight-charts'
import { useStore } from '@/lib/store'

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
  color = '#2962FF',
  showVolume = false,
  className = '',
  id,
  additionalSeries = [],
  showAlert = false,
  alertMessage = ''
}: InteractiveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null)
  const additionalSeriesRefs = useRef<ISeriesApi<SeriesType>[]>([])
  const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipData, setTooltipData] = useState<{time: string, value: number, additionalValues?: Record<string, number>}>()
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  
  // Get state from Zustand store
  const { 
    dateRange, 
    setDateRange, 
    comparisonMode,
    chartType
  } = useStore()

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { 
          color: '#1e1e1e',
          style: LineStyle.Solid,
          visible: true,
        },
        horzLines: { 
          color: '#1e1e1e',
          style: LineStyle.Solid,
          visible: true,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        borderColor: '#2a2a2a',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: Time) => {
          const date = new Date(time as string)
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })
        },
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.3 : 0.1,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#758696',
          width: 1,
          style: LineStyle.Solid,
          labelBackgroundColor: '#2a2a2a',
        },
        horzLine: {
          color: '#758696',
          width: 1,
          style: LineStyle.Solid,
          labelBackgroundColor: '#2a2a2a',
        },
      },
      // Enable chart interactions
      handleScale: true,
      handleScroll: true,
    })

    // Create main series based on type
    let series: ISeriesApi<SeriesType> | null = null
    
    if (type === 'area') {
      series = chart.addAreaSeries({
        lineColor: color,
        topColor: color,
        bottomColor: `${color}28`,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: color,
        crosshairMarkerBackgroundColor: '#ffffff',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      })
    } else if (type === 'line') {
      series = chart.addLineSeries({
        color: color,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: color,
        crosshairMarkerBackgroundColor: '#ffffff',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      })
    } else if (type === 'histogram') {
      series = chart.addHistogramSeries({
        color: color,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      })
    }

    // Set data
    const formattedData = data.map(d => ({
      time: d.time as Time,
      value: d.value
    }))
    
    // Initialize with default series if no specific type was specified
    if (!series) {
      series = chart.addAreaSeries({
        lineColor: color,
        topColor: color,
        bottomColor: `${color}28`,
      })
    }
    
    // At this point, series is guaranteed to be non-null
    if (series) {
      series.setData(formattedData)
    }

    // Add additional series if provided
    if (additionalSeries && additionalSeries.length > 0) {
      additionalSeriesRefs.current = additionalSeries.map(seriesItem => {
        let newSeries: ISeriesApi<SeriesType> | null = null;
        
        if (seriesItem.type === 'line') {
          newSeries = chart.addLineSeries({
            color: seriesItem.color,
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
            crosshairMarkerBorderColor: seriesItem.color,
            crosshairMarkerBackgroundColor: '#ffffff',
          });
        } else if (seriesItem.type === 'area') {
          newSeries = chart.addAreaSeries({
            lineColor: seriesItem.color,
            topColor: seriesItem.color,
            bottomColor: `${seriesItem.color}28`,
            lineWidth: 2,
          });
        } else if (seriesItem.type === 'histogram') {
          newSeries = chart.addHistogramSeries({
            color: seriesItem.color,
          });
        }
        
        if (newSeries && seriesItem.data) {
          newSeries.setData(seriesItem.data.map(d => ({
            time: d.time as Time,
            value: d.value
          })));
        }
        
        return newSeries as ISeriesApi<SeriesType>;
      });
    }

    // Add volume if requested
    if (showVolume && data.some(d => d.volume !== undefined)) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      })

      const volumeData = data
        .filter(d => d.volume !== undefined)
        .map(d => ({
          time: d.time as Time,
          value: d.volume!,
          color: d.value > (data[data.indexOf(d) - 1]?.value ?? 0) 
            ? '#26a69a' 
            : '#ef5350'
        }))
      
      volumeSeries.setData(volumeData)
      volumeSeriesRef.current = volumeSeries
    }

    // Subscribe to crosshair move to show tooltips
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        setTooltipVisible(false);
        return;
      }

      const mainValue = param.seriesData.get(series as ISeriesApi<SeriesType>)?.value as number;
      if (mainValue === undefined) {
        setTooltipVisible(false);
        return;
      }

      // Collect values from additional series
      const additionalValues: Record<string, number> = {};
      additionalSeries.forEach((seriesItem, index) => {
        const series = additionalSeriesRefs.current[index];
        if (series) {
          const value = param.seriesData.get(series)?.value as number;
          if (value !== undefined) {
            additionalValues[seriesItem.title] = value;
          }
        }
      });

      setTooltipData({
        time: param.time as string,
        value: mainValue,
        additionalValues
      });
      setTooltipPosition({ x: param.point.x, y: param.point.y });
      setTooltipVisible(true);

      // Dispatch an event for chart synchronization
      const event = new CustomEvent('chart-crosshair-move', {
        detail: {
          sourceChartId: id,
          time: param.time,
        }
      });
      document.dispatchEvent(event);
    });

    // Listen for crosshair move events from other charts
    const handleCrosshairMove = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.sourceChartId !== id && detail.time) {
        chart.timeScale().scrollToPosition(0, false);
        chart.timeScale().scrollToTime(detail.time as Time);
      }
    };

    document.addEventListener('chart-crosshair-move', handleCrosshairMove);

    // Listen for time range selection
    chart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
      if (timeRange) {
        // Update global state with selected time range
        const from = new Date(timeRange.from as number * 1000);
        const to = new Date(timeRange.to as number * 1000);
        setDateRange(from, to);
      }
    });

    chart.timeScale().fitContent()
    
    chartRef.current = chart
    seriesRef.current = series

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('chart-crosshair-move', handleCrosshairMove);
      chart.remove()
    }
  }, [data, height, type, color, showVolume, additionalSeries, id, setDateRange])

  // Update chart type when global chart type changes
  useEffect(() => {
    if (chartRef.current && seriesRef.current && chartType !== type) {
      // Remove existing series
      chartRef.current.removeSeries(seriesRef.current);
      
      // Create new series with the updated type
      let newSeries: ISeriesApi<SeriesType> | null = null;
      
      if (chartType === 'area') {
        newSeries = chartRef.current.addAreaSeries({
          lineColor: color,
          topColor: color,
          bottomColor: `${color}28`,
          lineWidth: 2,
        });
      } else if (chartType === 'line') {
        newSeries = chartRef.current.addLineSeries({
          color: color,
          lineWidth: 2,
        });
      } else if (chartType === 'candlestick' && data.some(d => d.open !== undefined)) {
        newSeries = chartRef.current.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });
      }
      
      if (newSeries) {
        // Format data for the new series
        const formattedData = data.map(d => {
          if (chartType === 'candlestick' && d.open !== undefined) {
            return {
              time: d.time as Time,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.value
            };
          }
          return {
            time: d.time as Time,
            value: d.value
          };
        });
        
        newSeries.setData(formattedData);
        seriesRef.current = newSeries;
      }
    }
  }, [chartType, color, data, type]);

  return (
    <div className={`bg-gray-950 rounded-lg p-4 border border-gray-800 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-4">
          {additionalSeries.length > 0 && (
            <div className="flex items-center gap-2">
              {additionalSeries.map((series, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: series.color }} />
                  <span className="text-xs text-gray-400">{series.title}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <div ref={chartContainerRef} className="w-full" />
        
        {showAlert && (
          <div className="absolute top-2 right-2 bg-red-500 bg-opacity-90 text-white px-3 py-1 rounded-md text-xs font-medium">
            {alertMessage || 'Alert'}
          </div>
        )}
        
        {tooltipVisible && tooltipData && (
          <div 
            className="absolute bg-gray-900 border border-gray-700 rounded-md p-2 shadow-lg z-50"
            style={{
              left: tooltipPosition.x + 15,
              top: tooltipPosition.y - 40,
              transform: tooltipPosition.x > chartContainerRef.current!.clientWidth - 200 ? 'translateX(-100%)' : 'none'
            }}
          >
            <div className="text-xs text-gray-400">
              {new Date(tooltipData.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-sm font-medium text-white">
              ${tooltipData.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {tooltipData.additionalValues && Object.entries(tooltipData.additionalValues).map(([key, value]) => (
              <div key={key} className="text-xs mt-1">
                <span className="text-gray-400">{key}: </span>
                <span className="text-white">${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const InteractiveChart = memo(InteractiveChartComponent)
