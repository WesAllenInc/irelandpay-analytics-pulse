import React from 'react'
import { Metadata } from 'next'
import { SyncProgressBar } from '@/components/sync/SyncProgressBar'
import { SyncHistory } from '@/components/sync/SyncHistory'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, RefreshCw, CheckCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Ireland Pay CRM Sync | IrelandPay Analytics Pulse',
  description: 'Synchronize merchant and residual data from Ireland Pay CRM',
}

export default function SyncPage() {
  return (
    <div className="container py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ireland Pay CRM Sync Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Automate data synchronization between Ireland Pay CRM and IrelandPay Analytics
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <SyncProgressBar />
          <SyncHistory />
        </div>
        
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>About Ireland Pay CRM Sync</CardTitle>
              <CardDescription>How automated data synchronization works</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                This dashboard allows you to synchronize merchant and residual data from Ireland Pay CRM
                directly into IrelandPay Analytics without the need for manual Excel file uploads.
              </p>
              
              <h3 className="font-semibold mt-4">Data Types</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Merchants</strong> - Basic merchant information including name and ID</li>
                <li><strong>Residuals</strong> - Monthly residual data including processing volume and earnings</li>
                <li><strong>Volumes</strong> - Detailed processing volume information</li>
                <li><strong>All</strong> - Sync all data types in a single operation</li>
              </ul>
              
              <h3 className="font-semibold mt-4">Scheduled Syncs</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Daily at 10:00 AM</p>
                    <p className="text-sm text-green-600">Morning sync for fresh data</p>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    Active
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">Daily at 8:00 PM</p>
                    <p className="text-sm text-blue-600">Evening sync for end-of-day data</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                    Active
                  </Badge>
                </div>
              </div>
              
              <h3 className="font-semibold mt-4">Manual Sync</h3>
              <p>
                You can also manually trigger a sync at any time using the "Start Sync" button.
                This is useful for testing or when you need immediate data updates.
              </p>
              
              <div className="bg-blue-50 p-4 rounded-md mt-4">
                <h4 className="font-medium text-blue-800">Note</h4>
                <p className="text-blue-700 text-sm">
                  For large datasets, synchronization may take several minutes to complete. You can check the
                  status in the Sync History tab or navigate away and return later.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
              <CardDescription>Common issues and solutions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <h3 className="font-semibold">Connection fails</h3>
                <p className="text-sm text-muted-foreground">
                  The connection is hardcoded and should work automatically. If you see connection errors,
                  check that the Ireland Pay CRM API is accessible and contact support if needed.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">Sync fails with API errors</h3>
                <p className="text-sm text-muted-foreground">
                  The API key is hardcoded and should work automatically. If you see API errors,
                  the Ireland Pay CRM service may be temporarily unavailable. Try again later.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">Missing merchant data</h3>
                <p className="text-sm text-muted-foreground">
                  Ensure that the merchant is active in Ireland Pay CRM and try syncing again.
                  Some merchants may not have data for the selected month.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">Sync is taking too long</h3>
                <p className="text-sm text-muted-foreground">
                  For large datasets, syncing can take several minutes. You can leave this page
                  and check the status later. If a sync remains &quot;In Progress&quot; for over 30 minutes,
                  try using the Force Sync option to start a new sync.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
