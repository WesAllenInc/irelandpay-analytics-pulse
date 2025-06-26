'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import OAuthButton from './OAuthButton';

type AuthMode = 'login' | 'signup';
type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface AuthCardProps {
  defaultMode?: AuthMode;
  className?: string;
}

const AuthCard: React.FC<AuthCardProps> = ({
  defaultMode = 'login',
  className = ''
}) => {
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (mode === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInError) throw signInError;
        
        if (data.user) {
          // Fetch user role to determine redirect path
          const { data: agentData } = await supabase
            .from('agents')
            .select('role, agent_name')
            .eq('email', data.user.email)
            .single();

          if (!agentData) {
            // Create new agent record if this is first login
            const { error: insertError } = await supabase
              .from('agents')
              .insert({
                email: data.user.email || '',
                agent_name: data.user?.user_metadata?.name || email.split('@')[0],
                role: 'agent',
                approval_status: 'pending'
              });
            
            // Send approval notification email
            await sendApprovalNotification({
              newUserEmail: data.user.email || '',
              newUserName: data.user?.user_metadata?.name || email.split('@')[0]
            });
            
            if (insertError) throw insertError;
            router.push('/leaderboard');
          } else {
            // Redirect based on role
            router.push(agentData.role === 'admin' ? '/dashboard' : '/leaderboard');
          }
        }
      } else {
        // Handle signup
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0]
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
        if (data.user) {
          // Create new agent record with pending approval status
          const { error: insertError } = await supabase
            .from('agents')
            .insert({
              email: data.user.email,
              agent_name: name || email.split('@')[0],
              role: 'agent',
              approval_status: 'pending'
            });
            
          if (insertError) throw insertError;
          
          // Send approval notification email
          await sendApprovalNotification({
            newUserEmail: email,
            newUserName: name || email.split('@')[0]
          });
          
          // Show confirmation message or redirect
          alert("Signup successful! Your account is pending approval. Please confirm your email to continue.");
          setMode('login');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleOAuthSuccess = () => {
    // OAuth redirect will happen automatically
    // We'll handle the callback separately
  };
  
  const handleOAuthError = (err: Error) => {
    setError(err.message || 'OAuth authentication failed. Please try again.');
  };
  
  // Function to send approval notification email
  const sendApprovalNotification = async ({ newUserEmail, newUserName }: { newUserEmail: string, newUserName: string }) => {
    try {
      const response = await fetch('/api/send-approval-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newUserEmail,
          newUserName
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to send approval notification:', errorData);
      }
    } catch (error) {
      console.error('Error sending approval notification:', error);
    }
  };

  return (
    <Card className={`w-full max-w-md shadow-lg ${className}`}>
      <Tabs defaultValue={mode} onValueChange={(v) => setMode(v as AuthMode)}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-center">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-center">
            {mode === 'login' 
              ? 'Sign in to access your Ireland Pay Analytics account' 
              : 'Sign up to join Ireland Pay Analytics platform'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <OAuthButton 
              className="mb-2" 
              onSuccess={handleOAuthSuccess} 
              onError={handleOAuthError} 
            />
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">Or continue with</span>
              </div>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
              <TabsContent value="signup" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    type="text" 
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </TabsContent>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === 'login' && (
                    <Button type="button" variant="link" className="px-0 font-normal h-auto text-xs">
                      Forgot password?
                    </Button>
                  )}
                </div>
                <Input 
                  id="password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading 
                  ? 'Please wait...' 
                  : mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          {mode === 'login' 
            ? "Don't have an account? Switch to Sign Up tab" 
            : "Already have an account? Switch to Login tab"}
        </CardFooter>
      </Tabs>
    </Card>
  );
};

export default AuthCard;
