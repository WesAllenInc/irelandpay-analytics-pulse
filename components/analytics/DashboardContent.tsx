'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MerchantTable } from '@/components/analytics/MerchantTable';
import { MerchantChart } from '@/components/analytics/MerchantChart';
import { DashboardKPI, type KPI } from '@/components/analytics/DashboardKPI';
import { TimeframeSelector, type Timeframe } from '@/components/analytics/TimeframeSelector';

interface DashboardContentProps {
  initialData: {
    kpis: KPI[];
    volumeData: Array<{ x: string | number; y: number }>;
    profitData: Array<{ x: string | number; y: number }>;
    dailyData: Array<{ x: string | number; y: number }>;
    merchantStats: any[];
  };
}

export const DashboardContent: React.FC<DashboardContentProps> = ({ initialData }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('Monthly');
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const fetchChartDataForTimeframe = async (timeframe: Timeframe) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard-metrics?timeframe=${timeframe}`);
      if (response.ok) {
        const newData = await response.json();
        // Only update the chart data, keep KPI cards and other data static
        setData(prevData => ({
          ...prevData,
          volumeData: newData.volumeData,
          profitData: newData.profitData
        }));
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTimeframe !== 'Monthly') {
      fetchChartDataForTimeframe(selectedTimeframe);
    } else {
      // Reset to initial data for monthly view
      setData(initialData);
    }
  }, [selectedTimeframe]);

  const handleTimeframeChange = (timeframe: Timeframe) => {
    setSelectedTimeframe(timeframe);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-foreground/60 mt-2">
              Monitor your financial performance and merchant analytics
            </p>
          </div>
          
          <TimeframeSelector
            selectedTimeframe={selectedTimeframe}
            onTimeframeChange={handleTimeframeChange}
          />
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            className="flex items-center justify-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/20 border-t-primary"></div>
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary/60 animate-ping"></div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* KPI Cards */}
            <motion.div variants={itemVariants}>
              <DashboardKPI kpis={data.kpis} />
            </motion.div>

            {/* Charts Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-lg"
              >
                <MerchantChart
                  title={`Total Volume (${selectedTimeframe})`}
                  data={data.volumeData}
                  type="bar"
                  highlightIndex={selectedTimeframe === 'Monthly' ? data.volumeData.length - 1 : undefined}
                  highlightColor="#EF4444"
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-lg"
              >
                <MerchantChart
                  title={`Total Profit (${selectedTimeframe})`}
                  data={data.profitData}
                  type="line"
                  highlightIndex={selectedTimeframe === 'Monthly' ? data.profitData.length - 1 : undefined}
                  highlightColor="#EF4444"
                />
              </motion.div>
            </motion.div>

            {/* Daily Deposit Chart */}
            <motion.div 
              variants={itemVariants}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-lg"
            >
              <MerchantChart
                title="Daily Deposits"
                data={data.dailyData}
                type="area"
              />
            </motion.div>

            {/* Merchant Table */}
            <motion.div 
              variants={itemVariants}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl shadow-lg overflow-hidden"
            >
              <MerchantTable merchants={data.merchantStats.map(m => ({
                name: m.name,
                volume: m.volume,
                profit: m.profit,
                bps: m.bps,
                processor: m.processor,
                merchantId: m.merchant_id
              }))} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}; 