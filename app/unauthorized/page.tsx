'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function UnauthorizedPage() {
  const searchParams = useSearchParams();
  const errorType = searchParams.get('error');
  
  const isExecutiveOnly = errorType === 'executive-only';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4">
        <Card className="border-destructive">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">
              {isExecutiveOnly ? 'Executive Access Only' : 'Access Denied'}
            </CardTitle>
            <CardDescription>
              {isExecutiveOnly 
                ? 'This application is restricted to authorized executives only'
                : 'You don\'t have permission to access this resource'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              {isExecutiveOnly ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    This Ireland Pay Analytics application is restricted to authorized executives only. 
                    If you believe you should have access, please contact the system administrator.
                  </p>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Executive access required</span>
                  </div>
                  
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>Authorized Executives:</strong><br />
                      • Jake Markey (jmarkey@irelandpay.com)<br />
                      • Wilfredo Vazquez (wvazquez@irelandpay.com)
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    This page requires administrative privileges. If you believe you should have access, 
                    please contact your system administrator.
                  </p>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>Admin access required</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Dashboard
                </Link>
              </Button>
              
              <Button variant="outline" asChild>
                <Link href="/auth/login">
                  Sign In with Different Account
                </Link>
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              <p>If you continue to see this error, please contact support.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 