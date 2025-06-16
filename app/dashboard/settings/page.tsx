'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { Label } from '@/components/ui/label';

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
    <div className="p-6 grid gap-6">
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
            <div className="flex items-center gap-2 mt-1">
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
    </div>
  );
};

export default SettingsPage;
