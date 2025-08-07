'use client'

import React from 'react'
import { SyncProgressBar } from '@/components/sync/SyncProgressBar'
import { DetailedSyncProgress } from '@/components/sync/DetailedSyncProgress'
import { SyncHistory } from '@/components/sync/SyncHistory'
import { SyncLogs } from '@/components/sync/SyncLogs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, RefreshCw, CheckCircle } from 'lucide-react'

export default function SyncPage() {
  const [currentSyncId, setCurrentSyncId] = React.useState<string | null>(null);

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
                 <SyncProgressBar onSyncIdChange={setCurrentSyncId} />
                 {currentSyncId && <DetailedSyncProgress syncId={currentSyncId} />}
                 <SyncHistory />
                 <SyncLogs />
               </div>
         
         <div className="space-y-8">
           <Card>
             <CardHeader>
               <CardTitle>Ireland Pay CRM Sync</CardTitle>
               <CardDescription>Automated data synchronization with Ireland Pay CRM</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="bg-green-50 p-4 rounded-md border border-green-200">
                 <h4 className="font-medium text-green-800 flex items-center gap-2">
                   <CheckCircle className="h-4 w-4" />
                   Connection Configured
                 </h4>
                 <p className="text-green-700 text-sm mt-1">
                   Your Ireland Pay CRM connection is pre-configured and ready to use. 
                   No additional setup required.
                 </p>
               </div>
               
               <h3 className="font-semibold mt-4">What Gets Synced</h3>
               <ul className="list-disc pl-6 space-y-1">
                 <li><strong>Merchants</strong> - Basic merchant information including name and ID</li>
                 <li><strong>Residuals</strong> - Monthly residual data including processing volume and earnings</li>
                 <li><strong>Volumes</strong> - Detailed processing volume information</li>
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
                 Use the "Start Sync" button to manually trigger a sync at any time.
                 This is useful for testing or when you need immediate data updates.
               </p>
             </CardContent>
           </Card>
           
           <Card>
             <CardHeader>
               <CardTitle>Troubleshooting</CardTitle>
               <CardDescription>Common issues and solutions</CardDescription>
             </CardHeader>
             <CardContent className="space-y-2">
               <div>
                 <h3 className="font-semibold">Sync fails to start</h3>
                 <p className="text-sm text-muted-foreground">
                   The connection is pre-configured and should work automatically. If you see connection errors,
                   the Ireland Pay CRM service may be temporarily unavailable. Try again later.
                 </p>
               </div>
               
               <div>
                 <h3 className="font-semibold">Sync is taking too long</h3>
                 <p className="text-sm text-muted-foreground">
                   For large datasets, syncing can take several minutes. You can leave this page
                   and check the status later. The progress bar will show detailed information about what's being synced.
                 </p>
               </div>
               
               <div>
                 <h3 className="font-semibold">Missing data after sync</h3>
                 <p className="text-sm text-muted-foreground">
                   Ensure that the merchant is active in Ireland Pay CRM and try syncing again.
                   Some merchants may not have data for the selected month.
                 </p>
               </div>
             </CardContent>
           </Card>
         </div>
       </div>
    </div>
  )
}
