'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { createSupabaseClient } from '@/lib/supabase/client';

interface NotificationPreferences {
  sync_success: boolean;
  sync_failure: boolean;
  daily_summary: boolean;
  weekly_report: boolean;
  error_threshold: number;
  data_age_threshold: number;
  admin_email: string;
  cc_emails: string[];
}

const defaultPreferences: NotificationPreferences = {
  sync_success: true,
  sync_failure: true,
  daily_summary: true,
  weekly_report: false,
  error_threshold: 1,
  data_age_threshold: 24,
  admin_email: '',
  cc_emails: []
};

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to view notification settings');
        return;
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error loading preferences:', error);
        toast.error('Failed to load notification preferences');
      } else if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    
    try {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to save notification settings');
        return;
      }

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving preferences:', error);
        toast.error('Failed to save preferences');
      } else {
        toast.success('Preferences saved successfully');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleCcEmailsChange = (value: string) => {
    const emails = value.split(',').map(email => email.trim()).filter(Boolean);
    setPreferences({ ...preferences, cc_emails: emails });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Bell className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Email Notification Settings</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Configure when and how you receive email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Sync Notifications</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sync-success">Successful Syncs</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email when scheduled syncs complete successfully
                </p>
              </div>
              <Switch
                id="sync-success"
                checked={preferences.sync_success}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, sync_success: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sync-failure">Failed Syncs</Label>
                <p className="text-sm text-muted-foreground">
                  Immediately notify when a sync fails (recommended)
                </p>
              </div>
              <Switch
                id="sync-failure"
                checked={preferences.sync_failure}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, sync_failure: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="daily-summary">Daily Summary</Label>
                <p className="text-sm text-muted-foreground">
                  Receive a daily summary of all sync activities at 9 PM
                </p>
              </div>
              <Switch
                id="daily-summary"
                checked={preferences.daily_summary}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, daily_summary: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weekly-report">Weekly Report</Label>
                <p className="text-sm text-muted-foreground">
                  Receive a comprehensive weekly report every Sunday
                </p>
              </div>
              <Switch
                id="weekly-report"
                checked={preferences.weekly_report}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, weekly_report: checked })
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Alert Thresholds</h3>
            
            <div className="space-y-2">
              <Label htmlFor="error-threshold">
                Consecutive Failures Before Alert
              </Label>
              <Select
                value={preferences.error_threshold.toString()}
                onValueChange={(value) => 
                  setPreferences({ ...preferences, error_threshold: parseInt(value) })
                }
              >
                <SelectTrigger id="error-threshold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 failure</SelectItem>
                  <SelectItem value="2">2 failures</SelectItem>
                  <SelectItem value="3">3 failures</SelectItem>
                  <SelectItem value="5">5 failures</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data-age-threshold">
                Alert When Data Is Older Than
              </Label>
              <Select
                value={preferences.data_age_threshold.toString()}
                onValueChange={(value) => 
                  setPreferences({ ...preferences, data_age_threshold: parseInt(value) })
                }
              >
                <SelectTrigger id="data-age-threshold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">72 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Email Settings</h3>
            
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email Address</Label>
              <Input
                id="admin-email"
                type="email"
                value={preferences.admin_email}
                onChange={(e) => 
                  setPreferences({ ...preferences, admin_email: e.target.value })
                }
                placeholder="admin@irelandpay.com"
              />
              <p className="text-sm text-muted-foreground">
                All notifications will be sent to this address
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cc-emails">CC Emails (Optional)</Label>
              <Input
                id="cc-emails"
                type="text"
                value={preferences.cc_emails.join(', ')}
                onChange={(e) => handleCcEmailsChange(e.target.value)}
                placeholder="user1@example.com, user2@example.com"
              />
              <p className="text-sm text-muted-foreground">
                Additional recipients for critical alerts (comma-separated)
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={savePreferences} 
            disabled={saving}
            className="ml-auto"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Preferences
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 