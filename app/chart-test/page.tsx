'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import styles from '../../components/charts/charts.module.css';

// Dynamic import for recharts-based component
const RechartsChart = dynamic(
  () => import('../../components/charts/recharts-interactive-chart').then((mod) => mod.RechartsInteractiveChart),
  { ssr: false }
);

// Test data
const testData = [
  { time: '2025-06-01', value: 1200 },
  { time: '2025-06-02', value: 1300 },
  { time: '2025-06-03', value: 1400 },
  { time: '2025-06-04', value: 1350 },
  { time: '2025-06-05', value: 1500 },
  { time: '2025-06-06', value: 1600 },
  { time: '2025-06-07', value: 1650 },
  { time: '2025-06-08', value: 1700 },
  { time: '2025-06-09', value: 1750 },
  { time: '2025-06-10', value: 1800 },
];

export default function ChartTestPage() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="p-6 bg-[#282828] min-h-screen">
      <h1 className="text-[#ebdbb2] text-2xl font-bold mb-6">Recharts Migration Test</h1>
      
      <div className="grid gap-6">
        <div>
          <h2 className="text-[#ebdbb2] text-xl mb-3">Area Chart</h2>
          {isClient ? (
            <RechartsChart
              data={testData}
              title="Sales Dashboard"
              height={400}
              type="area"
              color="#458588"
              id="test-area-chart"
              showVolume={false}
            />
          ) : (
            <div className={`${styles.chartContainer} ${styles.height400}`}>
              <div className={styles.chartHeader}>
                <h3 className={styles.chartTitle}>Sales Dashboard</h3>
                <div className={styles.loadingIndicator}>
                  <div className={styles.loadingDot}></div>
                  <span>Loading...</span>
                </div>
              </div>
              <div className="flex items-center justify-center h-[300px]">
                <div>Loading chart data...</div>
              </div>
            </div>
          )}
        </div>
        
        <div>
          <h2 className="text-[#ebdbb2] text-xl mb-3">Line Chart</h2>
          {isClient ? (
            <RechartsChart
              data={testData}
              title="Transaction Volume"
              height={400}
              type="line"
              color="#98971a"
              id="test-line-chart"
              showVolume={false}
            />
          ) : (
            <div className={`${styles.chartContainer} ${styles.height400}`}>
              <div className={styles.chartHeader}>
                <h3 className={styles.chartTitle}>Transaction Volume</h3>
                <div className={styles.loadingIndicator}>
                  <div className={styles.loadingDot}></div>
                  <span>Loading...</span>
                </div>
              </div>
              <div className="flex items-center justify-center h-[300px]">
                <div>Loading chart data...</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-[#3c3836] rounded-lg text-[#ebdbb2] font-mono text-sm">
        <p>Chart Migration Status:</p>
        <ul className="list-disc pl-6 mt-2">
          <li className="text-[#b8bb26]">CSS Modules: ✓ Implemented</li>
          <li className="text-[#b8bb26]">Recharts Migration: ✓ Complete</li>
          <li className="text-[#b8bb26]">SSR Compatibility: ✓ Handled</li>
          <li className="text-[#b8bb26]">Legacy Dependencies: ✓ Removed</li>
          <li className="text-[#b8bb26]">Type Safety: ✓ Fixed</li>
        </ul>
      </div>
    </div>
  );
}
