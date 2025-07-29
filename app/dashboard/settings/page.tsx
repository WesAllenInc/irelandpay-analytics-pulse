'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import ApiSyncSettings from '@/components/sync-scheduling/ApiSyncSettings';

// Force redeploy - API Sync tab should now work properly
const SettingsPage = () => {
  const [profile, setProfile] = useState({
    name: 'Jane Doe',
    email: 'jane@irelandpay.com',
    notifications: true,
  });

  const handleSave = () => {
    console.log('Saved profile settings:', profile);
  };

  return (
    <div className="p-6">
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="sync">API Sync</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-foreground">User Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullname" className="text-foreground-muted">Full Name</Label>
                  <Input
                    id="fullname"
                    className="bg-input border-input-border"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-foreground-muted">Email</Label>
                  <Input
                    id="email"
                    className="bg-input border-input-border"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <Button 
                  onClick={handleSave} 
                  className="mt-2"
                  variant="default"
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          <ApiSyncSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-foreground">Notification Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="notifications"
                    checked={profile.notifications}
                    onCheckedChange={(checked) => setProfile({ ...profile, notifications: checked })}
                  />
                  <Label htmlFor="notifications" className="text-foreground">Enable Email Notifications</Label>
                </div>
                <Button 
                  onClick={handleSave} 
                  className="mt-2"
                  variant="default"
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
