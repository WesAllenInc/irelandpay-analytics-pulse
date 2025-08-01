'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StepProps } from './SetupWizard'
import { Database, Key, Globe } from 'lucide-react'

export function CredentialsStep({ onNext, data, updateData }: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!data.apiKey.trim()) {
      newErrors.apiKey = 'API key is required'
    } else if (data.apiKey.length < 10) {
      newErrors.apiKey = 'API key appears to be too short'
    }

    if (!data.baseUrl.trim()) {
      newErrors.baseUrl = 'Base URL is required'
    } else if (!data.baseUrl.startsWith('http')) {
      newErrors.baseUrl = 'Base URL must start with http:// or https://'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateForm()) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <Database className="w-8 h-8 text-blue-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900">
          Ireland Pay CRM Connection
        </h2>
        
        <p className="text-gray-600 max-w-2xl mx-auto">
          Configure the connection to your Ireland Pay CRM system. You'll need your API key 
          and base URL to enable data synchronization.
        </p>
      </div>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div>
            <Label htmlFor="baseUrl" className="flex items-center space-x-2">
              <Globe className="w-4 h-4" />
              <span>Base URL</span>
            </Label>
            <Input
              id="baseUrl"
              type="url"
              placeholder="https://crm.ireland-pay.com/api/v1"
              value={data.baseUrl}
              onChange={(e) => updateData({ baseUrl: e.target.value })}
              className={errors.baseUrl ? 'border-red-500' : ''}
            />
            {errors.baseUrl && (
              <p className="text-sm text-red-500 mt-1">{errors.baseUrl}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              The base URL for your Ireland Pay CRM API
            </p>
          </div>

          <div>
            <Label htmlFor="apiKey" className="flex items-center space-x-2">
              <Key className="w-4 h-4" />
              <span>API Key</span>
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your API key"
              value={data.apiKey}
              onChange={(e) => updateData({ apiKey: e.target.value })}
              className={errors.apiKey ? 'border-red-500' : ''}
            />
            {errors.apiKey && (
              <p className="text-sm text-red-500 mt-1">{errors.apiKey}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Your Ireland Pay CRM API authentication key
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-yellow-600 text-sm font-medium">!</span>
            </div>
            <div>
              <p className="text-sm text-yellow-800">
                <strong>Security Note:</strong> Your API key will be securely stored and encrypted. 
                Make sure you're using the correct API key for your Ireland Pay CRM system.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-sm font-medium">i</span>
            </div>
            <div>
              <p className="text-sm text-blue-800">
                <strong>API Access:</strong> The system will use these credentials to automatically 
                sync merchant data, residuals, and transaction volumes from your CRM system.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">What data will be synced:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Merchant information and details</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Monthly residual calculations</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Transaction volumes and processing data</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Agent and commission information</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <Button onClick={handleNext} size="lg">
          Test Connection
        </Button>
      </div>
    </div>
  )
} 