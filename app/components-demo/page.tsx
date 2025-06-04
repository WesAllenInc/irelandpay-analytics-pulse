"use client"

import React from "react"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { GridLayout } from "@/components/ui/grid-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MetricCard } from "@/components/ui/metric-card"
import { ExcelUploadTest } from "@/components/ExcelUploadTest"
import { Toaster } from "@/components/ui/toaster"
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart3, 
  LineChart, 
  PieChart,
  Users,
  CreditCard,
  Info
} from "lucide-react"

export default function ComponentsDemo() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <ResponsiveContainer>
        <h1 className="text-3xl font-bold mb-6">Ireland Pay Analytics UI Components</h1>
        
        <Tabs defaultValue="metrics">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metrics">Metrics & Cards</TabsTrigger>
            <TabsTrigger value="excel">Excel Upload</TabsTrigger>
            <TabsTrigger value="ui">UI Components</TabsTrigger>
          </TabsList>
          
          <TabsContent value="metrics" className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Merchant Analytics Dashboard</h2>
            
            <GridLayout cols={{ default: 1, sm: 2, lg: 4 }} gap="md" className="mb-8">
              <MetricCard
                title="Total Volume"
                value="€1,245,678"
                icon={<BarChart3 className="h-4 w-4" />}
                trend={{ value: 12.5, isPositive: true, isUpGood: true }}
                description="Last 30 days"
              />
              
              <MetricCard
                title="Total Transactions"
                value="24,853"
                icon={<LineChart className="h-4 w-4" />}
                trend={{ value: 8.2, isPositive: true, isUpGood: true }}
                description="Last 30 days"
              />
              
              <MetricCard
                title="Average Transaction"
                value="€50.12"
                icon={<CreditCard className="h-4 w-4" />}
                trend={{ value: 2.1, isPositive: false, isUpGood: true }}
                description="Last 30 days"
              />
              
              <MetricCard
                title="Active Merchants"
                value="1,245"
                icon={<Users className="h-4 w-4" />}
                trend={{ value: 5.3, isPositive: true, isUpGood: true }}
                description="Last 30 days"
              />
            </GridLayout>
            
            <GridLayout cols={{ default: 1, lg: 2 }} gap="md">
              <Card>
                <CardHeader>
                  <CardTitle>Volume by Merchant Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md">
                    <PieChart className="h-16 w-16 text-gray-400" />
                    <span className="ml-2 text-gray-500">Chart Placeholder</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md">
                    <LineChart className="h-16 w-16 text-gray-400" />
                    <span className="ml-2 text-gray-500">Chart Placeholder</span>
                  </div>
                </CardContent>
              </Card>
            </GridLayout>
          </TabsContent>
          
          <TabsContent value="excel" className="mt-6">
            <ExcelUploadTest />
          </TabsContent>
          
          <TabsContent value="ui" className="mt-6">
            <GridLayout cols={{ default: 1, md: 2 }} gap="md">
              <Card>
                <CardHeader>
                  <CardTitle>Alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Information</AlertTitle>
                    <AlertDescription>
                      This is an informational alert.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert variant="success">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>
                      This is a success alert.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert variant="warning">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      This is a warning alert.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert variant="destructive">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      This is an error alert.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Buttons</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button>Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button variant="destructive">Destructive</Button>
                    <Button disabled>Disabled</Button>
                    <Button size="sm">Small</Button>
                    <Button size="lg">Large</Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button>
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                      With Icon
                    </Button>
                    <Button variant="outline">
                      <ArrowDownRight className="mr-2 h-4 w-4" />
                      With Icon
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </GridLayout>
          </TabsContent>
        </Tabs>
      </ResponsiveContainer>
      <Toaster />
    </div>
  )
}
