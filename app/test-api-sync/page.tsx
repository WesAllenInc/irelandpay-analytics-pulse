'use client';

import dynamicImport from 'next/dynamic';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

// Dynamically import the component to prevent SSR issues
const ApiSyncSettings = dynamicImport(
  () => import('@/components/sync-scheduling/ApiSyncSettings'),
  {
    ssr: false,
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