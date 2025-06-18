'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface VolumeData {
  month: string;
  volume: number;
  residual: number;
}

interface AgentVolumeChartProps {
  data: VolumeData[];
}

const AgentVolumeChart: React.FC<AgentVolumeChartProps> = ({ data }) => {
  // Format month labels to be more readable (e.g., "2023-01" to "Jan 2023")
  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const options = {
    chart: {
      id: 'agent-volume-chart',
      toolbar: {
        show: true,
      },
      zoom: {
        enabled: true,
      },
    },
    xaxis: {
      categories: data.map(item => formatMonthLabel(item.month)),
    },
    yaxis: [
      {
        title: {
          text: 'Processing Volume',
          style: {
            fontSize: '12px',
            fontWeight: 500,
          },
        },
        labels: {
          formatter: (value: number) => {
            return '$' + new Intl.NumberFormat('en-US', {
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(value);
          },
        },
      },
      {
        opposite: true,
        title: {
          text: 'Residual Earnings',
          style: {
            fontSize: '12px',
            fontWeight: 500,
          },
        },
        labels: {
          formatter: (value: number) => {
            return '$' + new Intl.NumberFormat('en-US', {
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(value);
          },
        },
      },
    ],
    stroke: {
      curve: 'smooth',
      width: [3, 3],
    },
    colors: ['#2563eb', '#10b981'],
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value: number, { seriesIndex }: { seriesIndex: number }) => {
          return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 2 });
        },
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
  };

  const series = [
    {
      name: 'Processing Volume',
      type: 'line',
      data: data.map(item => item.volume),
    },
    {
      name: 'Residual Earnings',
      type: 'line',
      data: data.map(item => item.residual),
    },
  ];

  return (
    <div className="w-full h-full">
      {typeof window !== 'undefined' && (
        <Chart
          options={options as any}
          series={series}
          type="line"
          height="100%"
          width="100%"
        />
      )}
    </div>
  );
};

export default AgentVolumeChart;
