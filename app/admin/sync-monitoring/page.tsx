import { redirect } from 'next/navigation';

export default function SyncMonitoringPage() {
  // Redirect to the settings page where sync functionality is now consolidated
  redirect('/dashboard/settings?tab=sync');
} 