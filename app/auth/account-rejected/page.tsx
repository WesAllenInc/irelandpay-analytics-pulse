"use client";

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Mail, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AccountRejectedPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold text-center">
            Account Access Denied
          </CardTitle>
          <CardDescription className="text-center">
            Your account registration has been rejected
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Access Denied
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    Your account registration for Ireland Pay Analytics has been rejected. This may be due to verification issues or because you're not authorized to access this platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border rounded-md p-4">
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-gray-400 mr-2" />
              <p className="text-sm text-gray-600">
                If you believe this is an error, please contact support at <a href="mailto:support@irelandpay.com" className="text-blue-600 hover:underline">support@irelandpay.com</a> for assistance.
              </p>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => router.push('/auth')}
          >
            Return to Login
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-gray-500" 
            onClick={() => signOut()}
          >
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
