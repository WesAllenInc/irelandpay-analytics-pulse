import { Metadata } from 'next';
import { SyncAnalyticsDashboard, SyncAlerts, ApiMonitor } from '@/components/sync-analytics';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export const metadata: Metadata = {
  title: 'Sync Analytics - Ireland Pay Analytics',
  description: 'Monitor and manage data synchronization performance and health',
};

export default function SyncAnalyticsPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sync Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Monitor synchronization performance, health, and manage data integration
        </p>
      </div>
      
      <Alert>
        <AlertTitle>Administrator Access</AlertTitle>
        <AlertDescription>
          This page provides insights into data synchronization performance and health.
          Use these metrics to optimize your sync processes and identify potential issues.
        </AlertDescription>
      </Alert>
      
      {/* Main Dashboard */}
      <SyncAnalyticsDashboard />
      
      {/* Additional Monitoring Components */}
      {/* Temporarily disabled for debugging
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <SyncAlerts maxHeight="500px" />
        <ApiMonitor />
      </div>
      */}
    </div>
  );
}
