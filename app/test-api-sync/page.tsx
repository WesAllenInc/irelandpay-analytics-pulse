'use client';

import ApiSyncSettings from '@/components/sync-scheduling/ApiSyncSettings';

export default function TestApiSyncPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">API Sync Test Page</h1>
      <ApiSyncSettings />
    </div>
  );
} 