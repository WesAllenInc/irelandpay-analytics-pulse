"use client"

import React, { useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import UploadExcel from "@/components/components/upload/UploadExcel"
import { supabaseClient } from "@/lib/supabaseClient"
import { FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react"

export function ExcelUploadTest() {
  // Define a more structured interface for test results
  interface TestResult {
    success: boolean;
    message: string;
  }
  
  interface TestResults {
    storage?: TestResult;
    database?: TestResult;
    api?: TestResult;
  }
  
  const [testResults, setTestResults] = useState<TestResults>({})
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Test if the uploads bucket exists in Supabase Storage
  const testStorageBucket = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabaseClient.storage.getBucket("uploads")
      
      if (error) {
        setTestResults(prev => ({
          ...prev,
          storage: { 
            success: false, 
            message: `Error: ${error.message}. The 'uploads' bucket does not exist or is not accessible.` 
          }
        }))
      } else {
        setTestResults(prev => ({
          ...prev,
          storage: { 
            success: true, 
            message: `Success: The 'uploads' bucket exists and is accessible.` 
          }
        }))
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        storage: { 
          success: false, 
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}` 
        }
      }))
    } finally {
      setIsLoading(false)
    }
  }

  // Test if the merchant_metrics table exists in the database
  const testDatabase = async () => {
    setIsLoading(true)
    try {
      // Try to query the table structure
      const { error: merchantsError } = await supabaseClient
        .from("merchants")
        .select("mid")
        .limit(1)
      
      const { error: metricsError } = await supabaseClient
        .from("merchant_metrics")
        .select("mid")
        .limit(1)

      if (merchantsError || metricsError) {
        setTestResults(prev => ({
          ...prev,
          database: { 
            success: false, 
            message: `Error: ${merchantsError?.message || metricsError?.message || "Tables do not exist or are not accessible"}` 
          }
        }))
      } else {
        setTestResults(prev => ({
          ...prev,
          database: { 
            success: true, 
            message: `Success: The required database tables exist and are accessible.` 
          }
        }))
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        database: { 
          success: false, 
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}` 
        }
      }))
    } finally {
      setIsLoading(false)
    }
  }

  // Test if the API route is working
  const testApiRoute = async () => {
    setIsLoading(true)
    try {
      // Create a simple test file in memory
      const testData = [
        { MID: "TEST123", "Merchant DBA": "Test Merchant", Datasource: "Test", "Total Transactions": 100, "Total Volume": 1000, "Last Batch Date": "2025-06-01" }
      ]
      
      // Send a request to the API endpoint
      const response = await fetch('/api/process-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path: "test/test-file.xlsx",
          testMode: true,
          testData: testData
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setTestResults(prev => ({
          ...prev,
          api: { 
            success: true, 
            message: `Success: API route is working. Response: ${JSON.stringify(result)}` 
          }
        }))
      } else {
        setTestResults(prev => ({
          ...prev,
          api: { 
            success: false, 
            message: `Error: ${result.error || "Unknown API error"}` 
          }
        }))
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        api: { 
          success: false, 
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}` 
        }
      }))
    } finally {
      setIsLoading(false)
    }
  }

  // Run all tests
  const runAllTests = async () => {
    await testStorageBucket()
    await testDatabase()
    await testApiRoute()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Excel Upload Testing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Component</TabsTrigger>
            <TabsTrigger value="tests">Integration Tests</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="mt-4">
            <UploadExcel />
          </TabsContent>
          <TabsContent value="tests" className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={testStorageBucket} disabled={isLoading}>
                Test Storage Bucket
              </Button>
              <Button onClick={testDatabase} disabled={isLoading}>
                Test Database Tables
              </Button>
              <Button onClick={testApiRoute} disabled={isLoading}>
                Test API Route
              </Button>
              <Button onClick={runAllTests} disabled={isLoading} variant="secondary">
                Run All Tests
              </Button>
            </div>
            
            {testResults.storage && (
              <Alert variant={testResults.storage.success ? "success" : "destructive"}>
                {testResults.storage.success ? 
                  <CheckCircle2 className="h-4 w-4" /> : 
                  <AlertCircle className="h-4 w-4" />
                }
                <AlertTitle>Storage Bucket Test</AlertTitle>
                <AlertDescription>
                  {testResults.storage.message}
                </AlertDescription>
              </Alert>
            )}
            
            {testResults.database && (
              <Alert variant={testResults.database.success ? "success" : "destructive"}>
                {testResults.database.success ? 
                  <CheckCircle2 className="h-4 w-4" /> : 
                  <AlertCircle className="h-4 w-4" />
                }
                <AlertTitle>Database Tables Test</AlertTitle>
                <AlertDescription>
                  {testResults.database.message}
                </AlertDescription>
              </Alert>
            )}
            
            {testResults.api && (
              <Alert variant={testResults.api.success ? "success" : "destructive"}>
                {testResults.api.success ? 
                  <CheckCircle2 className="h-4 w-4" /> : 
                  <AlertCircle className="h-4 w-4" />
                }
                <AlertTitle>API Route Test</AlertTitle>
                <AlertDescription>
                  {testResults.api.message}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
