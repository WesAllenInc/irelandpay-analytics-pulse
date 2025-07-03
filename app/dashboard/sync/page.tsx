import React from 'react'
import { Metadata } from 'next'
import IRISCRMSync from '@/components/IRISCRMSync'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'IRIS CRM Sync | IrelandPay Analytics Pulse',
  description: 'Synchronize merchant and residual data from IRIS CRM',
}

export default function SyncPage() {
  return (
    <div className="container py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">IRIS CRM Sync Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Automate data synchronization between IRIS CRM and IrelandPay Analytics
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <IRISCRMSync />
        </div>
        
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>About IRIS CRM Sync</CardTitle>
              <CardDescription>How automated data synchronization works</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                This dashboard allows you to synchronize merchant and residual data from IRIS CRM
                directly into IrelandPay Analytics without the need for manual Excel file uploads.
              </p>
              
              <h3 className="font-semibold mt-4">Data Types</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Merchants</strong> - Basic merchant information including name and ID</li>
                <li><strong>Residuals</strong> - Monthly residual data including processing volume and earnings</li>
                <li><strong>Volumes</strong> - Detailed processing volume information</li>
                <li><strong>All</strong> - Sync all data types in a single operation</li>
              </ul>
              
              <h3 className="font-semibold mt-4">Sync Frequency</h3>
              <p>
                Data is automatically synchronized daily from IRIS CRM, but you can also manually
                trigger a sync for specific data types or date ranges using this interface.
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
                <h3 className="font-semibold">Sync fails with API errors</h3>
                <p className="text-sm text-muted-foreground">
                  Verify that your IRIS CRM API token is valid and has the required permissions.
                  Contact your administrator if the issue persists.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">Missing merchant data</h3>
                <p className="text-sm text-muted-foreground">
                  Ensure that the merchant is active in IRIS CRM and try syncing again.
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
