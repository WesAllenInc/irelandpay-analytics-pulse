'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { SyncProgressBar } from '@/components/sync/SyncProgressBar';
import { IrelandPayCRMConfig } from '@/components/sync/IrelandPayCRMConfig';
import { SyncHistory } from '@/components/sync/SyncHistory';
import dynamic from 'next/dynamic';

// Dynamically import the ParticleBG component to avoid SSR issues
const ParticleBG = dynamic(() => import('@/components/Auth/ParticleBG'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black/90" />
});

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

  // Get the default tab from URL search params
  const getDefaultTab = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      if (tab === 'sync') return 'sync';
    }
    return 'profile';
  };

  // Define Ireland Pay colors (Gruvbox inspired palette)
  const colors = ['#d79921', '#98971a', '#458588', '#b16286', '#689d6a', '#d65d0e'];

  return (
    <div className="relative min-h-screen bg-black">
      {/* Particle Background */}
      <ParticleBG 
        particleCount={150}
        particleSpread={15}
        particleColors={colors}
        speed={0.08}
        particleBaseSize={80}
        moveParticlesOnHover={true}
        alphaParticles={true}
      />
      
      {/* Content Container */}
      <div className="relative z-10 p-6">
        <Tabs defaultValue={getDefaultTab()} className="space-y-6">
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
          <div className="space-y-8">
            {/* Ireland Pay CRM Configuration */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Ireland Pay CRM Configuration</h3>
              <IrelandPayCRMConfig 
                onConfigSave={(config) => {
                  console.log('Configuration saved:', config);
                  // Here you would typically save to your database
                }}
                onTestConnection={async (config) => {
                  console.log('Testing connection with:', config);
                  // Here you would typically test the actual API connection
                  return true; // Simulate successful connection
                }}
              />
            </div>
            
            {/* Sync Progress & Monitoring */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Sync Progress & Monitoring</h3>
              <SyncProgressBar 
                onSyncComplete={(result) => {
                  console.log('Sync completed:', result);
                  // Here you would typically update your database or show success message
                }}
                onSyncError={(error) => {
                  console.error('Sync error:', error);
                  // Here you would typically show error message or retry logic
                }}
              />
            </div>
            
            {/* Sync History */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Sync History</h3>
              <SyncHistory />
            </div>
          </div>
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
    </div>
  );
};

export default SettingsPage;
