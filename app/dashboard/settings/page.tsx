'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { SyncProgressBar } from '@/components/sync/SyncProgressBar';
import { IrelandPayCRMConfig } from '@/components/sync/IrelandPayCRMConfig';
import { SyncHistory } from '@/components/sync/SyncHistory';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Settings as SettingsIcon, 
  Bell, 
  Database, 
  Shield, 
  Activity,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import the ParticleBG component to avoid SSR issues
const ParticleBG = dynamic(() => import('@/components/Auth/ParticleBG'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black/90" />
});

const SettingsPage = () => {
  const [profile, setProfile] = useState({
    name: 'Jane Doe',
    email: 'jane@irelandpay.com',
    notifications: true,
    emailNotifications: true,
    pushNotifications: false,
    syncNotifications: true,
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/20 border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background to-background-secondary">
      {/* Enhanced Particle Background */}
      <ParticleBG 
        particleCount={100}
        particleSpread={20}
        particleColors={colors}
        speed={0.05}
        particleBaseSize={60}
        moveParticlesOnHover={true}
        alphaParticles={true}
      />
      
      {/* Content Container */}
      <motion.div 
        className="relative z-10 p-4 sm:p-6 lg:p-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <SettingsIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-foreground/60 mt-1">
                Manage your account preferences and system configurations
              </p>
            </div>
          </div>
        </motion.div>

        <Tabs 
          defaultValue={getDefaultTab()} 
          className="space-y-6"
          onValueChange={setActiveTab}
        >
          <motion.div variants={itemVariants}>
            <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur-sm border border-border/50">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="sync" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">API Sync</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
            </TabsList>
          </motion.div>

          <TabsContent value="profile" className="space-y-6">
            <motion.div variants={itemVariants}>
              <Card className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-medium text-foreground">
                    <User className="h-5 w-5 text-primary" />
                    User Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="fullname" className="text-foreground-muted font-medium">
                        Full Name
                      </Label>
                      <Input
                        id="fullname"
                        className="bg-input/50 border-input/50 focus:border-primary/50 transition-colors"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email" className="text-foreground-muted font-medium">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        className="bg-input/50 border-input/50 focus:border-primary/50 transition-colors"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        placeholder="Enter your email address"
                      />
                    </div>
                    <Button 
                      onClick={handleSave} 
                      className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                      size="lg"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="sync" className="space-y-8">
            {/* Debug info */}
            <div className="text-sm text-foreground/60 mb-4">
              Active tab: {activeTab} | Current time: {new Date().toLocaleTimeString()}
            </div>
            
            {/* Ireland Pay CRM Configuration */}
            <motion.div variants={itemVariants}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Database className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Ireland Pay CRM Configuration</h3>
                    <p className="text-foreground/60">Configure your CRM integration settings</p>
                  </div>
                </div>
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
            </motion.div>
            
            {/* Sync Progress & Monitoring */}
            <motion.div variants={itemVariants}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Activity className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Sync Progress & Monitoring</h3>
                    <p className="text-foreground/60">Monitor and control data synchronization</p>
                  </div>
                </div>
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
            </motion.div>
            
            {/* Sync History */}
            <motion.div variants={itemVariants}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Activity className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Sync History</h3>
                    <p className="text-foreground/60">View past synchronization activities</p>
                  </div>
                </div>
                <SyncHistory />
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <motion.div variants={itemVariants}>
              <Card className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-medium text-foreground">
                    <Bell className="h-5 w-5 text-primary" />
                    Notification Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="space-y-1">
                          <Label htmlFor="email-notifications" className="text-foreground font-medium">
                            Email Notifications
                          </Label>
                          <p className="text-sm text-foreground/60">Receive important updates via email</p>
                        </div>
                        <Switch
                          id="email-notifications"
                          checked={profile.emailNotifications}
                          onCheckedChange={(checked) => setProfile({ ...profile, emailNotifications: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="space-y-1">
                          <Label htmlFor="push-notifications" className="text-foreground font-medium">
                            Push Notifications
                          </Label>
                          <p className="text-sm text-foreground/60">Get real-time browser notifications</p>
                        </div>
                        <Switch
                          id="push-notifications"
                          checked={profile.pushNotifications}
                          onCheckedChange={(checked) => setProfile({ ...profile, pushNotifications: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="space-y-1">
                          <Label htmlFor="sync-notifications" className="text-foreground font-medium">
                            Sync Notifications
                          </Label>
                          <p className="text-sm text-foreground/60">Get notified about sync status changes</p>
                        </div>
                        <Switch
                          id="sync-notifications"
                          checked={profile.syncNotifications}
                          onCheckedChange={(checked) => setProfile({ ...profile, syncNotifications: checked })}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleSave} 
                      className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                      size="lg"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
