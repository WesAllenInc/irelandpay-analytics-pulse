import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Sync Analytics - Ireland Pay Analytics',
  description: 'Monitor and manage data synchronization performance and health',
};

export default function SyncAnalyticsPage() {
  // Redirect to the settings page where sync functionality is now consolidated
  redirect('/dashboard/settings?tab=sync');
}
