"use client";

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Clock, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PendingApprovalPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-yellow-100">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold text-center">
            Account Pending Approval
          </CardTitle>
          <CardDescription className="text-center">
            Your account is awaiting administrator approval
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Approval Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Thank you for registering with Ireland Pay Analytics. Your account has been created but requires approval before you can access the platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border rounded-md p-4">
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-gray-400 mr-2" />
              <p className="text-sm text-gray-600">
                A notification has been sent to our administrators. You'll receive an email when your account is approved.
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
