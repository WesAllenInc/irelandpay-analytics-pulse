'use client';

// Force this page to be client-side only to prevent build-time Supabase errors
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import dynamicImport from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the component to prevent SSR issues
const ApiSyncSettings = dynamicImport(
  () => import('@/components/sync-scheduling/ApiSyncSettings'),
  {
    loading: () => <div className="p-6">Loading API Sync Settings...</div>,
    ssr: false // Disable SSR for this component
  }
);

export default function TestApiSyncPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">API Sync Test Page</h1>
      <Suspense fallback={<div className="p-6">Loading API Sync Settings...</div>}>
        <ApiSyncSettings />
      </Suspense>
    </div>
  );
} 