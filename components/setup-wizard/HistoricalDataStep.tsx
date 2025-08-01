'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { StepProps } from './SetupWizard'
import { Calendar, Download, BarChart3 } from 'lucide-react'

export function HistoricalDataStep({ onNext, data, updateData }: StepProps) {
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importStatus, setImportStatus] = useState<string>('')

  const calculateMonths = () => {
    const startDate = new Date(data.historicalStartDate)
    const endDate = new Date(data.historicalEndDate)
    const months = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1,
        label: current.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      })
      current.setMonth(current.getMonth() + 1)
    }
    
    return months
  }

  const startHistoricalImport = async () => {
    setIsImporting(true)
    setProgress(0)
    setImportStatus('Starting historical data import...')

    try {
      const months = calculateMonths()
      
      for (let i = 0; i < months.length; i++) {
        const month = months[i]
        setImportStatus(`Importing ${month.label}...`)
        
        // Simulate import process - replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setProgress(((i + 1) / months.length) * 100)
      }
      
      setImportStatus('Historical data import completed successfully!')
      
      // Wait a moment to show completion
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      onNext()
    } catch (error) {
      setImportStatus('Error during import: ' + (error as Error).message)
      console.error('Import error:', error)
    } finally {
      setIsImporting(false)
    }
  }

  const months = calculateMonths()

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-purple-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900">
          Historical Data Import
        </h2>
        
        <p className="text-gray-600 max-w-2xl mx-auto">
          Import your existing data from Ireland Pay CRM. This will bring in all your 
          historical merchant data, residuals, and transaction volumes.
        </p>
      </div>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="startDate" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Start Date</span>
            </Label>
            <Input
              id="startDate"
              type="date"
              value={data.historicalStartDate}
              onChange={(e) => updateData({ historicalStartDate: e.target.value })}
              max={data.historicalEndDate}
            />
            <p className="text-sm text-gray-500 mt-1">
              Beginning of data import period
            </p>
          </div>

          <div>
            <Label htmlFor="endDate" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>End Date</span>
            </Label>
            <Input
              id="endDate"
              type="date"
              value={data.historicalEndDate}
              onChange={(e) => updateData({ historicalEndDate: e.target.value })}
              min={data.historicalStartDate}
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="text-sm text-gray-500 mt-1">
              End of data import period
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-sm font-medium">i</span>
            </div>
            <div>
              <p className="text-sm text-blue-800">
                <strong>Import Summary:</strong> This will import data for{' '}
                <strong>{months.length} months</strong> from{' '}
                <strong>{new Date(data.historicalStartDate).toLocaleDateString()}</strong> to{' '}
                <strong>{new Date(data.historicalEndDate).toLocaleDateString()}</strong>.
              </p>
            </div>
          </div>
        </div>

        {isImporting && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Import Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">{importStatus}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Data to be imported:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Merchant profiles and contact information</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Monthly residual calculations and reports</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Transaction volumes and processing data</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Agent assignments and commission data</span>
            </li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-yellow-600 text-sm font-medium">!</span>
            </div>
            <div>
              <p className="text-sm text-yellow-800">
                <strong>Import Time:</strong> The import process may take several minutes depending on 
                the amount of data. Please don't close this window during the import.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <Button
          onClick={startHistoricalImport}
          disabled={isImporting}
          size="lg"
          className="flex items-center space-x-2"
        >
          {isImporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Importing...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Start Import</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 