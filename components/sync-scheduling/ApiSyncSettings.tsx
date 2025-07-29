"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Clock, 
  Calendar, 
  RefreshCw, 
  Settings, 
  Zap, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useSupabaseClient } from '@/hooks/useSupabaseClient'

// Types
interface SyncSchedule {
  id: string
  data_type: string
  frequency: string
  cron_expression: string
  next_run: string
  is_active: boolean
  time_of_day?: string
  days?: string[]
  sync_scope?: string
}

interface SyncConfig {
  autoSyncEnabled: boolean
  defaultFrequency: string
  defaultTime: string
  retryAttempts: number
  retryDelay: number
  timeoutSeconds: number
  maxConcurrentSyncs: number
  enableNotifications: boolean
  enableErrorAlerts: boolean
}

const ApiSyncSettings: React.FC = () => {
  const supabase = useSupabaseClient()
  const { toast } = useToast()
  
  // State
  const [schedules, setSchedules] = useState<SyncSchedule[]>([])
  const [config, setConfig] = useState<SyncConfig>({
    autoSyncEnabled: true,
    defaultFrequency: 'daily',
    defaultTime: '06:00',
    retryAttempts: 3,
    retryDelay: 30,
    timeoutSeconds: 300,
    maxConcurrentSyncs: 2,
    enableNotifications: true,
    enableErrorAlerts: true
  })
  const [loading, setLoading] = useState(false)
  const [testSyncStatus, setTestSyncStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')

  // Fetch schedules and config on mount
  useEffect(() => {
    fetchSchedules()
    fetchConfig()
    checkApiStatus()
  }, [])

  // Fetch existing sync schedules
  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_schedules')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSchedules(data || [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to fetch schedules: ${error.message}`,
        variant: 'destructive',
      })
    }
  }

  // Fetch sync configuration
  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_config')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      if (data) {
        setConfig(data.config)
      }
    } catch (error: any) {
      console.error('Error fetching config:', error)
    }
  }

  // Check IRIS CRM API connection status
  const checkApiStatus = async () => {
    setApiStatus('checking')
    try {
      const response = await fetch('/api/sync-iriscrm/status')
      const data = await response.json()
      
      if (data.success) {
        setApiStatus('connected')
      } else {
        setApiStatus('disconnected')
      }
    } catch (error) {
      setApiStatus('disconnected')
    }
  }

  // Save configuration
  const saveConfig = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('sync_config')
        .upsert({
          id: 'default',
          config: config,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Sync configuration saved successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to save configuration: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Test sync connection
  const testSync = async () => {
    setTestSyncStatus('running')
    try {
      const response = await fetch('/api/sync-iriscrm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataType: 'merchants',
          forceSync: false
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setTestSyncStatus('success')
        toast({
          title: 'Success',
          description: 'Test sync completed successfully',
        })
      } else {
        setTestSyncStatus('error')
        toast({
          title: 'Error',
          description: `Test sync failed: ${data.error}`,
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      setTestSyncStatus('error')
      toast({
        title: 'Error',
        description: `Test sync failed: ${error.message}`,
        variant: 'destructive',
      })
    }
  }

  // Create new schedule
  const createSchedule = async (scheduleData: Partial<SyncSchedule>) => {
    try {
      const { error } = await supabase
        .from('sync_schedules')
        .insert(scheduleData)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Schedule created successfully',
      })
      
      fetchSchedules()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to create schedule: ${error.message}`,
        variant: 'destructive',
      })
    }
  }

  // Toggle schedule active status
  const toggleSchedule = async (scheduleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('sync_schedules')
        .update({ is_active: isActive })
        .eq('id', scheduleId)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Schedule ${isActive ? 'activated' : 'deactivated'} successfully`,
      })
      
      fetchSchedules()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to update schedule: ${error.message}`,
        variant: 'destructive',
      })
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>
      case 'disconnected':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Disconnected</Badge>
      case 'checking':
        return <Badge className="bg-yellow-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Checking</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* API Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            IRIS CRM API Status
          </CardTitle>
          <CardDescription>
            Monitor the connection status to IRIS CRM API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusBadge(apiStatus)}
              <span className="text-sm text-muted-foreground">
                {apiStatus === 'connected' && 'API connection is healthy'}
                {apiStatus === 'disconnected' && 'Unable to connect to IRIS CRM API'}
                {apiStatus === 'checking' && 'Checking API connection...'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkApiStatus}
              disabled={apiStatus === 'checking'}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="schedules">Sync Schedules</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="test">Test & Monitor</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Configuration</CardTitle>
              <CardDescription>
                Configure basic sync settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Automatic Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow the system to automatically sync data based on schedules
                  </p>
                </div>
                <Switch
                  checked={config.autoSyncEnabled}
                  onCheckedChange={(checked) => setConfig({ ...config, autoSyncEnabled: checked })}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Frequency</Label>
                  <Select
                    value={config.defaultFrequency}
                    onValueChange={(value) => setConfig({ ...config, defaultFrequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Default Time</Label>
                  <Input
                    type="time"
                    value={config.defaultTime}
                    onChange={(e) => setConfig({ ...config, defaultTime: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for sync status and errors
                  </p>
                </div>
                <Switch
                  checked={config.enableNotifications}
                  onCheckedChange={(checked) => setConfig({ ...config, enableNotifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Error Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get immediate alerts when sync operations fail
                  </p>
                </div>
                <Switch
                  checked={config.enableErrorAlerts}
                  onCheckedChange={(checked) => setConfig({ ...config, enableErrorAlerts: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Sync Schedules
              </CardTitle>
              <CardDescription>
                Manage automated sync schedules for different data types
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sync schedules configured</p>
                  <p className="text-sm">Create a schedule to enable automated syncing</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium capitalize">{schedule.data_type} Sync</h4>
                          <Badge variant={schedule.is_active ? "default" : "secondary"}>
                            {schedule.frequency}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Next run: {new Date(schedule.next_run).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={schedule.is_active}
                          onCheckedChange={(checked) => toggleSchedule(schedule.id, checked)}
                        />
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Settings
              </CardTitle>
              <CardDescription>
                Configure advanced sync behavior and performance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Retry Attempts</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={config.retryAttempts}
                    onChange={(e) => setConfig({ ...config, retryAttempts: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of times to retry failed sync operations
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Retry Delay (seconds)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="300"
                    value={config.retryDelay}
                    onChange={(e) => setConfig({ ...config, retryDelay: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Delay between retry attempts
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Timeout (seconds)</Label>
                  <Input
                    type="number"
                    min="30"
                    max="1800"
                    value={config.timeoutSeconds}
                    onChange={(e) => setConfig({ ...config, timeoutSeconds: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum time to wait for sync completion
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Max Concurrent Syncs</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={config.maxConcurrentSyncs}
                    onChange={(e) => setConfig({ ...config, maxConcurrentSyncs: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of syncs running simultaneously
                  </p>
                </div>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Security Note</AlertTitle>
                <AlertDescription>
                  These settings affect API rate limits and system performance. 
                  Adjust carefully to avoid overwhelming the IRIS CRM API.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test & Monitor Tab */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Test & Monitor
              </CardTitle>
              <CardDescription>
                Test sync functionality and monitor system health
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Test Sync Connection</Label>
                  <p className="text-sm text-muted-foreground">
                    Run a test sync to verify API connectivity and configuration
                  </p>
                </div>
                <Button
                  onClick={testSync}
                  disabled={testSyncStatus === 'running'}
                  variant="outline"
                >
                  {testSyncStatus === 'running' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {testSyncStatus === 'success' && <CheckCircle className="h-4 w-4 mr-2" />}
                  {testSyncStatus === 'error' && <XCircle className="h-4 w-4 mr-2" />}
                  {testSyncStatus === 'idle' && <RefreshCw className="h-4 w-4 mr-2" />}
                  Test Sync
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Sync Health Status</Label>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">API Connection</div>
                    <div className="text-muted-foreground">
                      {apiStatus === 'connected' ? 'Healthy' : 'Issues detected'}
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">Active Schedules</div>
                    <div className="text-muted-foreground">
                      {schedules.filter(s => s.is_active).length} running
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">Last Sync</div>
                    <div className="text-muted-foreground">
                      {schedules.length > 0 ? 'Recent' : 'Never'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Configuration
        </Button>
      </div>
    </div>
  )
}

export default ApiSyncSettings 