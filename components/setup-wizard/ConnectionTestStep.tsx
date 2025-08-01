'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { StepProps } from './SetupWizard'
import { CheckCircle, XCircle, Loader2, Wifi, Database } from 'lucide-react'

export function ConnectionTestStep({ onNext, data }: StepProps) {
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<{
    connection: boolean
    authentication: boolean
    dataAccess: boolean
    error?: string
  } | null>(null)

  const testConnection = async () => {
    setTesting(true)
    setTestResults(null)

    try {
      const response = await fetch('/api/setup/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: data.baseUrl,
          apiKey: data.apiKey
        })
      })

      const result = await response.json()

      if (response.ok) {
        setTestResults({
          connection: true,
          authentication: true,
          dataAccess: true
        })
      } else {
        setTestResults({
          connection: false,
          authentication: false,
          dataAccess: false,
          error: result.error || 'Connection test failed'
        })
      }
    } catch (error) {
      setTestResults({
        connection: false,
        authentication: false,
        dataAccess: false,
        error: 'Network error occurred during testing'
      })
    } finally {
      setTesting(false)
    }
  }

  const canProceed = testResults && testResults.connection && testResults.authentication && testResults.dataAccess

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <Wifi className="w-8 h-8 text-blue-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900">
          Test CRM Connection
        </h2>
        
        <p className="text-gray-600 max-w-2xl mx-auto">
          Let's verify that your Ireland Pay CRM connection is working properly. 
          We'll test the connection, authentication, and data access.
        </p>
      </div>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Wifi className="w-5 h-5 text-gray-500" />
              <span className="font-medium">Connection Test</span>
            </div>
            {testing && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
            {testResults && (
              testResults.connection ? 
                <CheckCircle className="w-5 h-5 text-green-500" /> : 
                <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-gray-500" />
              <span className="font-medium">Authentication Test</span>
            </div>
            {testing && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
            {testResults && (
              testResults.authentication ? 
                <CheckCircle className="w-5 h-5 text-green-500" /> : 
                <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Database className="w-5 h-5 text-gray-500" />
              <span className="font-medium">Data Access Test</span>
            </div>
            {testing && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
            {testResults && (
              testResults.dataAccess ? 
                <CheckCircle className="w-5 h-5 text-green-500" /> : 
                <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        </div>

        {testResults?.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-800 font-medium">Connection Error</p>
                <p className="text-sm text-red-700 mt-1">{testResults.error}</p>
              </div>
            </div>
          </div>
        )}

        {canProceed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-green-800 font-medium">Connection Successful!</p>
                <p className="text-sm text-green-700 mt-1">
                  Your Ireland Pay CRM connection is working properly. You can proceed to the next step.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-sm font-medium">i</span>
            </div>
            <div>
              <p className="text-sm text-blue-800">
                <strong>Connection Test:</strong> This test verifies that your API credentials are correct 
                and that the system can successfully connect to your Ireland Pay CRM system.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button
          onClick={testConnection}
          disabled={testing}
          variant="outline"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Connection'
          )}
        </Button>

        <Button
          onClick={onNext}
          disabled={!canProceed}
          size="lg"
        >
          Continue to Historical Data
        </Button>
      </div>
    </div>
  )
} 