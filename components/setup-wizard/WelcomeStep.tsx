import { Button } from '@/components/ui/button'
import { StepProps } from './SetupWizard'
import { CheckCircle, Database, BarChart3, Clock, Shield } from 'lucide-react'

export function WelcomeStep({ onNext }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-blue-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome to IrelandPay Analytics
        </h2>
        
        <p className="text-gray-600 max-w-2xl mx-auto">
          Let's get your analytics dashboard set up and connected to your Ireland Pay CRM system. 
          This setup will take about 5-10 minutes and will configure everything you need to start 
          tracking your merchant data and residuals.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">What we'll configure:</h3>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Admin Account</p>
                <p className="text-sm text-gray-600">Set up your administrator access and notification preferences</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Database className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">CRM Connection</p>
                <p className="text-sm text-gray-600">Connect to your Ireland Pay CRM API for data synchronization</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <BarChart3 className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Historical Data</p>
                <p className="text-sm text-gray-600">Import your existing data from April 2024 to present</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Sync Schedule</p>
                <p className="text-sm text-gray-600">Configure automatic data synchronization twice daily</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">What you'll need:</h3>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">API Credentials</p>
                <p className="text-sm text-gray-600">Your Ireland Pay CRM API key and base URL</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Admin Email</p>
                <p className="text-sm text-gray-600">Email address for receiving notifications and alerts</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">About 10 minutes</p>
                <p className="text-sm text-gray-600">Time to complete the full setup process</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <div className="flex items-start space-x-3">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-600 text-sm font-medium">i</span>
          </div>
          <div>
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This setup will configure your system for production use. 
              Make sure you have your Ireland Pay CRM API credentials ready before proceeding.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <Button onClick={onNext} size="lg">
          Get Started
        </Button>
      </div>
    </div>
  )
} 