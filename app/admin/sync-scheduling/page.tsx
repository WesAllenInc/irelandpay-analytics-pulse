import { Metadata } from 'next';
import { SyncScheduler } from '@/components/sync-scheduling';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sync Scheduling | Ireland Pay Analytics',
  description: 'Configure automatic synchronization schedules',
};

export default function SyncSchedulingPage() {
  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Sync Scheduling</h1>
      
      <Alert className="bg-blue-50 dark:bg-blue-950">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Sync Scheduling</AlertTitle>
        <AlertDescription>
          Configure when data synchronization happens automatically. Set up recurring schedules for merchants, 
          residuals, and agent data to ensure your analytics are always up to date.
        </AlertDescription>
      </Alert>
      
      <SyncScheduler />
    </div>
  );
}
