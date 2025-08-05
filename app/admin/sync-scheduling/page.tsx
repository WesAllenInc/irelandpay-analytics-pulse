import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Sync Scheduling | Ireland Pay Analytics',
  description: 'Configure automatic synchronization schedules',
};

export default function SyncSchedulingPage() {
  // Redirect to the settings page where sync functionality is now consolidated
  redirect('/dashboard/settings?tab=sync');
}
