'use client';

export const dynamic = 'force-dynamic';

import dynamicImport from 'next/dynamic';

// Dynamically import the component to prevent SSR issues
const ApiSyncSettings = dynamicImport(
  () => import('@/components/sync-scheduling/ApiSyncSettings'),
  {
    loading: () => <div className="p-6">Loading API Sync Settings...</div>
  }
);

export default function TestApiSyncPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">API Sync Test Page</h1>
      <ApiSyncSettings />
    </div>
  );
} 