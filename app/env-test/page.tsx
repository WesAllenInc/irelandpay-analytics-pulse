'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { env } from '@/lib/env';

export default function EnvTestPage() {
  const [envVars, setEnvVars] = useState<{
    url: string;
    keyExists: boolean;
  }>({
    url: '',
    keyExists: false
  });
  
  useEffect(() => {
    // Check environment variables in the browser
    setEnvVars({
      url: env.NEXT_PUBLIC_SUPABASE_URL || 'Not defined',
      keyExists: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
  }, []);
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Environment Variables Test</h1>
      
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Environment Variables Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded border">
              <h3 className="font-medium">NEXT_PUBLIC_SUPABASE_URL:</h3>
              <p className="mt-1 font-mono break-all">{envVars.url}</p>
            </div>
            
            <div className="p-4 rounded border">
              <h3 className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY:</h3>
              <p className="mt-1">{envVars.keyExists ? '✅ Key exists (not showing for security)' : '❌ Key missing'}</p>
            </div>
            
            <p className="mt-6 text-sm text-gray-500">
              Note: This page directly accesses environment variables using the env utility.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
