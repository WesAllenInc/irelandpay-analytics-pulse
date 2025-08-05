'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
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
            {/* Current Sync Status */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Current Sync Status</h3>
              <div className="bg-card border-card-border rounded-lg p-4">
                <p className="text-foreground">Sync status monitoring is being loaded...</p>
                <div className="mt-4">
                  <Button 
                    onClick={() => console.log('Manual sync triggered')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Trigger Manual Sync
                  </Button>
                </div>
              </div>
            </div>
            
            {/* API Sync Settings */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">API Configuration</h3>
              <div className="bg-card border-card-border rounded-lg p-4">
                <p className="text-foreground">API configuration settings are being loaded...</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="api-key" className="text-foreground-muted">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Enter your API key"
                      className="bg-input border-input-border mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="base-url" className="text-foreground-muted">Base URL</Label>
                    <Input
                      id="base-url"
                      placeholder="https://api.irelandpay.com"
                      className="bg-input border-input-border mt-1"
                    />
                  </div>
                  <Button className="bg-green-600 hover:bg-green-700">
                    Test Connection
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Sync Scheduler */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Sync Scheduling</h3>
              <div className="bg-card border-card-border rounded-lg p-4">
                <p className="text-foreground">Sync scheduling interface is being loaded...</p>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="auto-sync" />
                    <Label htmlFor="auto-sync" className="text-foreground">Enable Automatic Sync</Label>
                  </div>
                  <div>
                    <Label htmlFor="sync-frequency" className="text-foreground-muted">Sync Frequency</Label>
                    <select 
                      id="sync-frequency"
                      aria-label="Select sync frequency"
                      className="bg-input border-input-border rounded-md px-3 py-2 mt-1 w-full"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sync Analytics */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Sync Analytics & Monitoring</h3>
              <div className="bg-card border-card-border rounded-lg p-4">
                <p className="text-foreground">Sync analytics dashboard is being loaded...</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-green-100 dark:bg-green-900 p-3 rounded">
                    <p className="text-sm font-medium">Success Rate</p>
                    <p className="text-2xl font-bold text-green-600">98%</p>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded">
                    <p className="text-sm font-medium">Last Sync</p>
                    <p className="text-sm">2 hours ago</p>
                  </div>
                </div>
              </div>
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
