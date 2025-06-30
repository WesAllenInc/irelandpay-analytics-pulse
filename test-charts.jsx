import { InteractiveChart } from './components/charts/interactive-chart';
import { FeyAreaChart } from './components/charts/fey-area-chart';
import { RechartsFeyAreaChart } from './components/charts/recharts-fey-area-chart';

// Test data for charts
const testChartData = [
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

// Test additional series for interactive chart
const additionalSeries = [
  {
    title: 'Previous Period',
    dataKey: 'prevValue',
    color: '#98971a',
    data: [
      { time: '2025-06-01', prevValue: 1000 },
      { time: '2025-06-02', prevValue: 1100 },
      { time: '2025-06-03', prevValue: 1150 },
      { time: '2025-06-04', prevValue: 1250 },
      { time: '2025-06-05', prevValue: 1300 },
      { time: '2025-06-06', prevValue: 1400 },
      { time: '2025-06-07', prevValue: 1450 },
      { time: '2025-06-08', prevValue: 1500 },
      { time: '2025-06-09', prevValue: 1550 },
      { time: '2025-06-10', prevValue: 1600 },
    ]
  }
];

export default function TestCharts() {
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Chart Component Tests</h1>
      
      <section style={{ marginBottom: '40px' }}>
        <h2>InteractiveChart (Area)</h2>
        <InteractiveChart
          data={testChartData}
          title="Test Area Chart"
          height={400}
          type="area"
          color="#458588"
          id="test-area"
        />
      </section>
      
      <section style={{ marginBottom: '40px' }}>
        <h2>InteractiveChart (Line with additional series)</h2>
        <InteractiveChart
          data={testChartData}
          title="Test Line Chart with Comparison"
          height={400}
          type="line"
          color="#458588"
          id="test-line"
          additionalSeries={additionalSeries}
        />
      </section>
      
      <section style={{ marginBottom: '40px' }}>
        <h2>FeyAreaChart</h2>
        <FeyAreaChart
          data={testChartData}
          title="Test Fey Area Chart"
          color="#d79921"
          height={400}
        />
      </section>
      
      <section style={{ marginBottom: '40px' }}>
        <h2>RechartsFeyAreaChart</h2>
        <RechartsFeyAreaChart
          data={testChartData}
          title="Test Recharts Fey Area Chart"
          color="#d79921"
          height={400}
        />
      </section>
    </div>
  );
}
