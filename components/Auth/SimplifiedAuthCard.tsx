'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createSupabaseBrowserClient } from 'lib/supabase/client';
import OAuthButton from './OAuthButton';

// Allowed users whitelist
const ALLOWED_USERS = [
  'wvazquez@irelandpay.com',
  'jmarkey@irelandpay.com'
];

interface SimplifiedAuthCardProps {
  className?: string;
}

const SimplifiedAuthCard: React.FC<SimplifiedAuthCardProps> = ({
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const handleOAuthSuccess = () => {
    // OAuth redirect will happen automatically
    // We'll handle the callback separately
  };
  
  const handleOAuthError = (err: Error) => {
    setError(err.message || 'Microsoft authentication failed. Please try again.');
  };

  return (
    <Card className={`w-full max-w-md shadow-lg ${className}`}>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-center text-white">
          Welcome to Ireland Pay Analytics
        </CardTitle>
        <CardDescription className="text-center text-gray-300">
          Sign in with your Microsoft account to access the platform
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div className="text-center mb-6">
            <p className="text-sm text-gray-400 mb-2">
              Authorized users:
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              {ALLOWED_USERS.map(email => (
                <div key={email} className="font-mono">{email}</div>
              ))}
            </div>
          </div>
          
          <OAuthButton 
            className="mb-2" 
            onSuccess={handleOAuthSuccess} 
            onError={handleOAuthError} 
          />
          
          <div className="text-center text-xs text-gray-500 mt-4">
            <p>Only authorized Ireland Pay team members can access this platform.</p>
            <p className="mt-1">Contact your administrator if you need access.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimplifiedAuthCard; 