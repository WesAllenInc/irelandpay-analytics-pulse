import {
  Card,
  Title,
  MetricCard,
} from 'react-bits';
import Chart from 'react-apexcharts';
import { Card as CustomCard } from '@/components/ui';

const DashboardPage = () => {
  const metrics = [
    { label: 'Total Volume', value: '$850,000', change: '+4.2%' },
    { label: 'Net Residuals', value: '$12,400', change: '+3.1%' },
    { label: 'Active Merchants', value: '142', change: '+5' },
  ];

  const chartOptions = {
    chart: { id: 'volume-bar' },
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May'] },
  };

  const volumeSeries = [
    { name: 'Processing Volume', data: [160000, 170000, 180000, 165000, 175000] },
  ];

  const residualSeries = [
    { name: 'Residuals', data: [2300, 2500, 2700, 2600, 3000] },
  ];

  return (
    <div className="p-6 grid gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} title={metric.label} value={metric.value} change={metric.change} />
        ))}
      </div>
      <CustomCard>
        <Title level={3}>Monthly Processing Volume</Title>
        <Chart options={chartOptions} series={volumeSeries} type="bar" height={300} />
      </CustomCard>
      <CustomCard>
        <Title level={3}>Net Residuals Trend</Title>
        <Chart options={chartOptions} series={residualSeries} type="line" height={300} />
      </CustomCard>
    </div>
  );
};

export default DashboardPage;
