'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { StepProps } from './SetupWizard'
import { User, Mail, Bell } from 'lucide-react'

export function AdminSetupStep({ onNext, data, updateData }: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!data.adminName.trim()) {
      newErrors.adminName = 'Admin name is required'
    }

    if (!data.adminEmail.trim()) {
      newErrors.adminEmail = 'Admin email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.adminEmail)) {
      newErrors.adminEmail = 'Please enter a valid email address'
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
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900">
          Configure Admin Account
        </h2>
        
        <p className="text-gray-600 max-w-2xl mx-auto">
          Set up your administrator account details. This email will be used for receiving 
          important notifications about sync status, errors, and system alerts.
        </p>
      </div>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div>
            <Label htmlFor="adminName" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Admin Name</span>
            </Label>
            <Input
              id="adminName"
              type="text"
              placeholder="Enter admin name"
              value={data.adminName}
              onChange={(e) => updateData({ adminName: e.target.value })}
              className={errors.adminName ? 'border-red-500' : ''}
            />
            {errors.adminName && (
              <p className="text-sm text-red-500 mt-1">{errors.adminName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="adminEmail" className="flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <span>Admin Email</span>
            </Label>
            <Input
              id="adminEmail"
              type="email"
              placeholder="admin@irelandpay.com"
              value={data.adminEmail}
              onChange={(e) => updateData({ adminEmail: e.target.value })}
              className={errors.adminEmail ? 'border-red-500' : ''}
            />
            {errors.adminEmail && (
              <p className="text-sm text-red-500 mt-1">{errors.adminEmail}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              This email will receive sync notifications and system alerts
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notification Preferences</span>
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="emailNotifications"
                checked={data.notifications.email}
                onCheckedChange={(checked) => 
                  updateData({ 
                    notifications: { 
                      ...data.notifications, 
                      email: checked as boolean 
                    } 
                  })
                }
              />
              <Label htmlFor="emailNotifications" className="text-sm">
                Email notifications for sync status and errors
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="slackNotifications"
                checked={data.notifications.slack}
                onCheckedChange={(checked) => 
                  updateData({ 
                    notifications: { 
                      ...data.notifications, 
                      slack: checked as boolean 
                    } 
                  })
                }
              />
              <Label htmlFor="slackNotifications" className="text-sm">
                Slack notifications (if configured)
              </Label>
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
                <strong>Admin Account:</strong> This will create your administrator account with full access 
                to all features including sync management, user management, and system configuration.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <Button onClick={handleNext} size="lg">
          Continue to CRM Connection
        </Button>
      </div>
    </div>
  )
} 