'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, CheckCircle, AlertCircle, BarChart3, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function TestEmailPage() {
  const [sending, setSending] = useState<string | null>(null);

  const testEmailTypes = [
    {
      id: 'sync-success',
      title: 'Sync Success Notification',
      description: 'Test email sent when a sync completes successfully',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      color: 'bg-green-50 border-green-200'
    },
    {
      id: 'sync-failure',
      title: 'Sync Failure Alert',
      description: 'Test urgent email sent when a sync fails',
      icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      color: 'bg-red-50 border-red-200'
    },
    {
      id: 'daily-summary',
      title: 'Daily Summary Report',
      description: 'Test daily summary email with sync statistics',
      icon: <BarChart3 className="h-5 w-5 text-blue-500" />,
      color: 'bg-blue-50 border-blue-200'
    }
  ];

  const sendTestEmail = async (testType: string) => {
    setSending(testType);
    
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testType }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Test email sent successfully! Check your email for the ${testType} notification.`);
      } else {
        toast.error(`Failed to send test email: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Failed to send test email. Please try again.');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Mail className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Test Email Notifications</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Notification Testing</CardTitle>
          <CardDescription>
            Test the email notification system with different scenarios. 
            Make sure you have configured your notification preferences first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
            {testEmailTypes.map((testType) => (
              <Card key={testType.id} className={testType.color}>
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    {testType.icon}
                    <CardTitle className="text-lg">{testType.title}</CardTitle>
                  </div>
                  <CardDescription className="text-sm">
                    {testType.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => sendTestEmail(testType.id)}
                    disabled={sending === testType.id}
                    className="w-full"
                    variant={testType.id === 'sync-failure' ? 'destructive' : 'default'}
                  >
                    {sending === testType.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {sending === testType.id ? 'Sending...' : 'Send Test Email'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">What to Expect</h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Sync Success Email</h4>
                  <p className="text-sm text-muted-foreground">
                    You'll receive a professional email with sync statistics, including 
                    new merchants, updated records, transaction counts, and duration.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Sync Failure Alert</h4>
                  <p className="text-sm text-muted-foreground">
                    An urgent email with error details, recommended actions, and recent logs 
                    to help you troubleshoot the issue quickly.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <BarChart3 className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Daily Summary Report</h4>
                  <p className="text-sm text-muted-foreground">
                    A comprehensive daily overview with sync activity, data statistics, 
                    and any issues that need attention.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Important Notes</h4>
                <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                  <li>• Make sure you have configured your email address in notification preferences</li>
                  <li>• Test emails will be sent to your configured admin email address</li>
                  <li>• Check your spam folder if you don't receive the emails</li>
                  <li>• The Resend API key must be properly configured in your environment</li>
                  <li>• Email logs will be recorded in the database for monitoring</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 