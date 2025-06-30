import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InteractiveChart } from './interactive-chart';
import { RechartsFeyAreaChart } from './recharts-fey-area-chart';

// Mock dynamic imports
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (callback) => {
    const Component = callback();
    Component.displayName = 'DynamicComponent';
    return Component;
  }
}));

// Mock CSS modules
vi.mock('./charts.module.css', () => ({
  chartContainer: 'mockChartContainer',
  chartHeader: 'mockChartHeader',
  chartTitle: 'mockChartTitle',
  loadingContainer: 'mockLoadingContainer',
  loadingIndicator: 'mockLoadingIndicator',
  loadingDot: 'mockLoadingDot',
  chartWrapper: 'mockChartWrapper',
  tooltipContainer: 'mockTooltipContainer',
  tooltipTime: 'mockTooltipTime',
  tooltipLabel: 'mockTooltipLabel',
  tooltipValue: 'mockTooltipValue',
  tooltipEntry: 'mockTooltipEntry',
  legendContainer: 'mockLegendContainer',
  legendItem: 'mockLegendItem',
  legendColorBox: 'mockLegendColorBox',
  periodButtonGroup: 'mockPeriodButtonGroup',
  periodButton: 'mockPeriodButton',
  activePeriodButton: 'mockActivePeriodButton',
  height400: 'mockHeight400',
  height300: 'mockHeight300',
  height500: 'mockHeight500',
  height600: 'mockHeight600',
  grid: 'mockGrid',
  colorPrimary: 'mockColorPrimary',
  bgPrimary: 'mockBgPrimary',
}));

// Mock useStore hook
vi.mock('@/lib/store', () => ({
  useStore: () => ({
    dateRange: '7d',
    setDateRange: vi.fn(),
    comparisonMode: false,
    chartType: null
  })
}));

// Test data
const testData = [
  { time: '2025-06-01', value: 1200 },
  { time: '2025-06-02', value: 1300 },
  { time: '2025-06-03', value: 1400 },
  { time: '2025-06-04', value: 1350 },
  { time: '2025-06-05', value: 1500 }
];

describe('Chart Components', () => {
  it('renders InteractiveChart with loading state on server', () => {
    // Mock window to simulate server-side rendering
    const originalWindow = global.window;
    delete global.window;
    
    render(
      <InteractiveChart
        data={testData}
        title="Test Chart"
        height={400}
        type="area"
        color="#458588"
        id="test-chart"
      />
    );
    
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Restore window
    global.window = originalWindow;
  });

  it('renders RechartsFeyAreaChart correctly', () => {
    // Ensure we're in client-side mode
    if (!global.window) {
      global.window = {};
    }
    
    render(
      <RechartsFeyAreaChart
        data={testData}
        title="Test Area Chart"
        color="#458588"
        height={400}
      />
    );
    
    expect(screen.getByText('Test Area Chart')).toBeInTheDocument();
  });
});
