'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import MerchantSelector from '@/components/MerchantSelector';
import VolumeChart from '@/components/VolumeChart';
import NetChart from '@/components/NetChart';

// Mock data for testing charts
const mockVolumeData = [
  { time: '2025-01-01', value: 10000 },
  { time: '2025-02-01', value: 12000 },
  { time: '2025-03-01', value: 9000 },
  { time: '2025-04-01', value: 15000 },
  { time: '2025-05-01', value: 14000 },
  { time: '2025-06-01', value: 16000 },
  { time: '2025-07-01', value: 17500 },
];

const mockNetData = [
  { time: '2025-01-01', value: 1200 },
  { time: '2025-02-01', value: 1500 },
  { time: '2025-03-01', value: 900 },
  { time: '2025-04-01', value: 2000 },
  { time: '2025-05-01', value: 1800 },
  { time: '2025-06-01', value: 2200 },
  { time: '2025-07-01', value: 2500 },
];

// Mock merchants for selector
const mockMerchants = [
  { id: '1', name: 'Merchant 1' },
  { id: '2', name: 'Merchant 2' },
  { id: '3', name: 'Merchant 3' },
];

type ComponentTestStatus = {
  render: boolean;
  error: string | null;
};

export default function TestComponentsPage() {
  const [componentStatus, setComponentStatus] = useState<Record<string, ComponentTestStatus>>({
    merchantSelector: { render: true, error: null },
    volumeChart: { render: true, error: null },
    netChart: { render: true, error: null }
  });

  const toggleComponent = (name: string) => {
    setComponentStatus(prev => ({
      ...prev,
      [name]: { ...prev[name], render: !prev[name].render }
    }));
  };

  // Error handler for component test
  const handleComponentError = (name: string, error: Error) => {
    console.error(`Error rendering ${name}:`, error);
    setComponentStatus(prev => ({
      ...prev,
      [name]: { render: false, error: error.message }
    }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Component Test Suite</h1>
      <p className="text-muted-foreground">
        This page tests components in isolation to identify rendering issues
      </p>

      <Tabs defaultValue="components">
        <TabsList>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="components" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                MerchantSelector
                <button 
                  onClick={() => toggleComponent('merchantSelector')}
                  className="text-xs bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded"
                >
                  {componentStatus.merchantSelector.render ? 'Hide' : 'Show'}
                </button>
              </CardTitle>
              <CardDescription>Dropdown component for selecting merchants</CardDescription>
            </CardHeader>
            <CardContent>
              {componentStatus.merchantSelector.render ? (
                <div className="w-[300px]">
                  {(() => {
                    try {
                      return <MerchantSelector merchants={mockMerchants} />;
                    } catch (error) {
                      handleComponentError('merchantSelector', error as Error);
                      return (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{(error as Error).message}</AlertDescription>
                        </Alert>
                      );
                    }
                  })()}
                </div>
              ) : componentStatus.merchantSelector.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{componentStatus.merchantSelector.error}</AlertDescription>
                </Alert>
              ) : (
                <div className="text-muted-foreground italic">Component hidden</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                VolumeChart
                <button 
                  onClick={() => toggleComponent('volumeChart')}
                  className="text-xs bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded"
                >
                  {componentStatus.volumeChart.render ? 'Hide' : 'Show'}
                </button>
              </CardTitle>
              <CardDescription>Chart showing transaction volume over time</CardDescription>
            </CardHeader>
            <CardContent>
              {componentStatus.volumeChart.render ? (
                <div className="h-[400px] border rounded-md p-4">
                  {(() => {
                    try {
                      return <VolumeChart data={mockVolumeData} />;
                    } catch (error) {
                      handleComponentError('volumeChart', error as Error);
                      return (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{(error as Error).message}</AlertDescription>
                        </Alert>
                      );
                    }
                  })()}
                </div>
              ) : componentStatus.volumeChart.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{componentStatus.volumeChart.error}</AlertDescription>
                </Alert>
              ) : (
                <div className="text-muted-foreground italic">Component hidden</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                NetChart
                <button 
                  onClick={() => toggleComponent('netChart')}
                  className="text-xs bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded"
                >
                  {componentStatus.netChart.render ? 'Hide' : 'Show'}
                </button>
              </CardTitle>
              <CardDescription>Chart showing net profit over time</CardDescription>
            </CardHeader>
            <CardContent>
              {componentStatus.netChart.render ? (
                <div className="h-[400px] border rounded-md p-4">
                  {(() => {
                    try {
                      return <NetChart data={mockNetData} />;
                    } catch (error) {
                      handleComponentError('netChart', error as Error);
                      return (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{(error as Error).message}</AlertDescription>
                        </Alert>
                      );
                    }
                  })()}
                </div>
              ) : componentStatus.netChart.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{componentStatus.netChart.error}</AlertDescription>
                </Alert>
              ) : (
                <div className="text-muted-foreground italic">Component hidden</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Component Test Results</CardTitle>
              <CardDescription>Summary of rendering status for each component</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(componentStatus).map(([name, status]) => (
                  <div key={name} className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full ${status.error ? 'bg-destructive' : 'bg-green-500'}`} />
                    <span className="font-medium">{name}</span>
                    <span className="text-muted-foreground">
                      {status.error ? 'Failed: ' + status.error : 'Renders successfully'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Last tested: {new Date().toLocaleString()}
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
