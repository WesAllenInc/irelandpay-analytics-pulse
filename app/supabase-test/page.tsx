'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function SupabaseTestPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/supabase-test');
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Error testing Supabase connection:', err);
      setError('Failed to test connection. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>
      
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>
            This page tests the connection between your Next.js application and Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2">Testing connection...</span>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          ) : status ? (
            <div className="space-y-4">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <p className="font-bold">Status: {status.connected ? 'Connected' : 'Not Connected'}</p>
                <p>{status.message}</p>
              </div>
              
              <div className="mt-4">
                <h3 className="text-lg font-medium">Connection Details:</h3>
                <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto text-sm">
                  {JSON.stringify(status, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p>No status information available.</p>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={testConnection} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Connection Again'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
