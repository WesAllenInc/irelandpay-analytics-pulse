'use client';

import dynamic from 'next/dynamic';

// Use dynamic import to load the test component on client-side only
const TestCharts = dynamic(() => import('../../test-charts'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center',
      alignItems: 'center', 
      height: '500px',
      backgroundColor: '#282828',
      color: '#ebdbb2',
      borderRadius: '8px'
    }}>
      Loading charts...
    </div>
  )
});

export default function TestChartsPage() {
  return <TestCharts />;
}
