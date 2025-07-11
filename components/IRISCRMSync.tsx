"use client"

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCcw } from 'lucide-react'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { format } from 'date-fns'

// Types
interface SyncOptions {
  dataType: 'merchants' | 'residuals' | 'volumes' | 'all';
  year?: number;
  month?: number;
  forceSync?: boolean;
}

interface SyncResults {
  merchants_count?: number;
  residuals_count?: number;
  volumes_count?: number;
  updated_count?: number;
  inserted_count?: number;
  skipped_count?: number;
  processing_time_ms?: number;
  [key: string]: any; // For any additional properties
}

interface SyncStatus {
  id: string;
  status: 'in_progress' | 'completed' | 'failed';
  data_type: string;
  started_at: string;
  completed_at?: string;
  results?: SyncResults;
  error?: string;
}

const IRISCRMSync: React.FC = () => {
  // State
  const [selectedTab, setSelectedTab] = useState<string>('sync')
  const [syncOptions, setSyncOptions] = useState<SyncOptions>({
    dataType: 'all',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    forceSync: false
  })
  const [syncInProgress, setSyncInProgress] = useState<boolean>(false)
  const [currentSync, setCurrentSync] = useState<SyncStatus | null>(null)
  const [syncHistory, setSyncHistory] = useState<SyncStatus[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Generate year and month options for Select
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  // Fetch sync status on component mount and when syncInProgress changes
  useEffect(() => {
    fetchSyncStatus()
    
    // If a sync is in progress, poll for updates
    if (syncInProgress) {
      const interval = setInterval(() => {
        fetchSyncStatus()
      }, 3000)
      
      return () => clearInterval(interval)
    }
  }, [syncInProgress])

  // Fetch sync status
  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync-iriscrm')
      const data = await response.json()
      
      if (data.success && data.data) {
        // Define type for sync objects
        type SyncObject = {
          created_at: string;
          [key: string]: any; // Other properties
        };

        // Sort by created_at in descending order
        const sortedSyncs = data.data.sort((a: SyncObject, b: SyncObject) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        
        setSyncHistory(sortedSyncs)
        
        // Check if there's an in-progress sync
        const inProgressSync = sortedSyncs.find((sync: SyncStatus) => sync.status === 'in_progress')
        
        if (inProgressSync) {
          setSyncInProgress(true)
          setCurrentSync(inProgressSync)
        } else {
          setSyncInProgress(false)
          setCurrentSync(null)
        }
      }
    } catch (error) {
      console.error('Error fetching sync status:', error)
    }
  }

  // Start a sync
  const startSync = async () => {
    setError(null)
    setSuccess(null)
    
    try {
      setSyncInProgress(true)
      
      const response = await fetch('/api/sync-iriscrm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(syncOptions),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSuccess(`Successfully started ${syncOptions.dataType} sync`)
        fetchSyncStatus()
      } else {
        setError(data.error || 'Failed to start sync')
        setSyncInProgress(false)
      }
    } catch (error: unknown) {
      console.error('Error starting sync:', error)
      setError(error instanceof Error ? error.message : 'Failed to start sync')
      setSyncInProgress(false)
    }
  }

  // Handle sync option changes
  const handleDataTypeChange = (value: string) => {
    setSyncOptions({
      ...syncOptions,
      dataType: value as SyncOptions['dataType']
    })
  }

  const handleYearChange = (value: string) => {
    setSyncOptions({
      ...syncOptions,
      year: parseInt(value, 10)
    })
  }

  const handleMonthChange = (value: string) => {
    setSyncOptions({
      ...syncOptions,
      month: parseInt(value, 10)
    })
  }

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy h:mm a')
    } catch (e) {
      return dateStr
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge className="bg-blue-500">In Progress</Badge>
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>IRIS CRM Data Sync</CardTitle>
        <CardDescription>
          Sync merchant, residual, and transaction data from IRIS CRM API
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sync">Sync Data</TabsTrigger>
            <TabsTrigger value="history">Sync History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sync" className="space-y-4">
            {syncInProgress && currentSync ? (
              <div className="space-y-4 pt-4">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <div>
                    <h3 className="font-medium">
                      Syncing {currentSync.data_type} data
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Started at {formatDate(currentSync.started_at)}
                    </p>
                  </div>
                </div>
                
                <Progress value={45} />
                
                <p className="text-sm text-muted-foreground">
                  This may take several minutes depending on the amount of data.
                </p>
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data Type</label>
                    <Select
                      value={syncOptions.dataType}
                      onValueChange={handleDataTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select data type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Data</SelectItem>
                        <SelectItem value="merchants">Merchants Only</SelectItem>
                        <SelectItem value="residuals">Residuals Only</SelectItem>
                        <SelectItem value="volumes">Volumes Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Year</label>
                    <Select
                      value={syncOptions.year?.toString()}
                      onValueChange={handleYearChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Month</label>
                    <Select
                      value={syncOptions.month?.toString()}
                      onValueChange={handleMonthChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month} value={month.toString()}>
                            {format(new Date(2000, month - 1, 1), 'MMMM')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {success && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertTitle className="text-green-600">Success</AlertTitle>
                    <AlertDescription className="text-green-700">{success}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            {syncHistory.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                No sync history available
              </div>
            ) : (
              <div className="space-y-4">
                {syncHistory.slice(0, 10).map((sync) => (
                  <div
                    key={sync.id}
                    className="flex items-center justify-between border-b pb-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium capitalize">{sync.data_type} Sync</h4>
                        {getStatusBadge(sync.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Started: {formatDate(sync.started_at)}
                      </p>
                      {sync.completed_at && (
                        <p className="text-sm text-muted-foreground">
                          Completed: {formatDate(sync.completed_at)}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      {sync.status === 'completed' && sync.results && (
                        <div className="text-sm text-right">
                          {sync.data_type === 'merchants' || sync.data_type === 'all' ? (
                            <div>Merchants: {sync.results.merchants?.total_merchants || 0}</div>
                          ) : null}
                          {sync.data_type === 'residuals' || sync.data_type === 'all' ? (
                            <div>Residuals: {sync.results.residuals?.total_residuals || 0}</div>
                          ) : null}
                        </div>
                      )}
                      
                      {sync.status === 'failed' && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="justify-between">
        <Button 
          variant="outline"
          onClick={fetchSyncStatus}
          disabled={syncInProgress}
        >
          <RefreshCcw className="h-4 w-4 mr-2" /> Refresh Status
        </Button>
        
        {selectedTab === 'sync' && (
          <Button
            onClick={startSync}
            disabled={syncInProgress}
          >
            {syncInProgress ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...
              </>
            ) : (
              'Start Sync'
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default IRISCRMSync
