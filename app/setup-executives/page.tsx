'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SetupResult {
  email: string;
  status: string;
  message?: string;
}

interface SetupResponse {
  success: boolean;
  message: string;
  results: SetupResult[];
  executives: { email: string; name: string }[];
  note: string;
}

export default function SetupExecutivesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SetupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executiveUsers = [
    {
      email: 'jmarkey@irelandpay.com',
      name: 'Jake Markey',
      role: 'admin'
    },
    {
      email: 'wvazquez@irelandpay.com',
      name: 'Wilfredo Vazquez',
      role: 'admin'
    }
  ];

  const handleSetup = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/setup-executives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to setup executive users');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Ireland Pay Analytics - Executive Setup</h1>
          <p className="text-muted-foreground">
            Configure the application for executive-only access
          </p>
        </div>

        {/* Executive Users Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Authorized Executives
            </CardTitle>
            <CardDescription>
              Only these 2 executives will have access to the Ireland Pay Analytics application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {executiveUsers.map((user) => (
                <div key={user.email} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant="secondary">{user.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Setup Action */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Executive Users</CardTitle>
            <CardDescription>
              This will create or update the executive user accounts in the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">What this does:</h4>
              <ul className="text-sm space-y-1">
                <li>• Creates/updates user accounts in Supabase Auth</li>
                <li>• Sets up database records in the agents table</li>
                <li>• Assigns admin role and approved status</li>
                <li>• Sets default password: IrelandPay2025!</li>
              </ul>
            </div>

            <Button 
              onClick={handleSetup} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up executives...
                </>
              ) : (
                'Setup Executive Users'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Setup Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {result.message}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h4 className="font-semibold">Results:</h4>
                {result.results.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm">{item.email}</span>
                    <Badge variant={item.status.includes('error') ? 'destructive' : 'default'}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Important Note:
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {result.note}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Security Notice */}
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="text-orange-800 dark:text-orange-200">
              Security Notice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                After setup, only the configured executives will be able to access the application. 
                All other users will be denied access.
              </p>
              <p>
                <strong>Default Password:</strong> IrelandPay2025!<br />
                <strong>Action Required:</strong> Users should change their password on first login.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 