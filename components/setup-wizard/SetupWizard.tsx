'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { WelcomeStep } from './WelcomeStep'
import { AdminSetupStep } from './AdminSetupStep'
import { CredentialsStep } from './CredentialsStep'
import { ConnectionTestStep } from './ConnectionTestStep'
import { HistoricalDataStep } from './HistoricalDataStep'
import { ScheduleSetupStep } from './ScheduleSetupStep'
import { CheckCircle, Circle } from 'lucide-react'

export interface StepProps {
  onNext: () => void
  onBack: () => void
  onComplete: () => void
  data: SetupData
  updateData: (data: Partial<SetupData>) => void
}

export interface SetupData {
  adminEmail: string
  adminName: string
  apiKey: string
  baseUrl: string
  historicalStartDate: string
  historicalEndDate: string
  syncSchedule: {
    morning: string
    evening: string
  }
  notifications: {
    email: boolean
    slack: boolean
  }
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to IrelandPay Analytics',
    component: WelcomeStep
  },
  {
    id: 'admin',
    title: 'Configure Admin Account',
    component: AdminSetupStep
  },
  {
    id: 'credentials',
    title: 'Ireland Pay CRM Connection',
    component: CredentialsStep
  },
  {
    id: 'test',
    title: 'Test Connection',
    component: ConnectionTestStep
  },
  {
    id: 'historical',
    title: 'Historical Data Import',
    component: HistoricalDataStep
  },
  {
    id: 'schedule',
    title: 'Sync Schedule',
    component: ScheduleSetupStep
  }
]

export function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [data, setData] = useState<SetupData>({
    adminEmail: '',
    adminName: '',
    apiKey: '',
    baseUrl: process.env.NEXT_PUBLIC_IRELANDPAY_CRM_BASE_URL || 'https://crm.ireland-pay.com/api/v1',
    historicalStartDate: '2024-04-01',
    historicalEndDate: new Date().toISOString().split('T')[0],
    syncSchedule: {
      morning: '11:00',
      evening: '19:00'
    },
    notifications: {
      email: true,
      slack: false
    }
  })

  const updateData = (newData: Partial<SetupData>) => {
    setData(prev => ({ ...prev, ...newData }))
  }

  const nextStep = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]))
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
  }

  const backStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const completeSetup = async () => {
    try {
      // Save configuration to database
      const response = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to save configuration')
      }

      // Redirect to dashboard
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Setup completion failed:', error)
      // Handle error appropriately
    }
  }

  const CurrentStepComponent = steps[currentStep].component

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">
            IrelandPay Analytics Setup
          </h1>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <Progress value={(currentStep / (steps.length - 1)) * 100} className="h-2" />
          </div>
          
          {/* Step Indicators */}
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center">
                  {completedSteps.has(index) ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : index === currentStep ? (
                    <Circle className="h-6 w-6 text-blue-500 fill-current" />
                  ) : (
                    <Circle className="h-6 w-6 text-gray-300" />
                  )}
                  <span className={`ml-2 text-sm ${
                    index === currentStep ? 'text-blue-600 font-medium' : 
                    completedSteps.has(index) ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-px bg-gray-300 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {steps[currentStep].title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CurrentStepComponent
              onNext={nextStep}
              onBack={backStep}
              onComplete={completeSetup}
              data={data}
              updateData={updateData}
            />
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={backStep}
            disabled={currentStep === 0}
          >
            Back
          </Button>
          
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>
      </div>
    </div>
  )
} 