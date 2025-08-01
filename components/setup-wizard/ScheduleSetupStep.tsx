'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { StepProps } from './SetupWizard'
import { Clock, Calendar, Bell } from 'lucide-react'

export function ScheduleSetupStep({ onComplete, data, updateData }: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!data.syncSchedule.morning || !data.syncSchedule.evening) {
      newErrors.schedule = 'Both sync times are required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleComplete = () => {
    if (validateForm()) {
      onComplete()
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
          <Clock className="w-8 h-8 text-orange-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900">
          Sync Schedule Configuration
        </h2>
        
        <p className="text-gray-600 max-w-2xl mx-auto">
          Configure when your system should automatically sync data from Ireland Pay CRM. 
          We recommend syncing twice daily to keep your analytics up to date.
        </p>
      </div>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Sync Schedule</span>
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="morningSync" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Morning Sync</span>
              </Label>
              <Input
                id="morningSync"
                type="time"
                value={data.syncSchedule.morning}
                onChange={(e) => updateData({ 
                  syncSchedule: { 
                    ...data.syncSchedule, 
                    morning: e.target.value 
                  } 
                })}
              />
              <p className="text-sm text-gray-500 mt-1">
                First sync of the day (recommended: 11:00 AM)
              </p>
            </div>

            <div>
              <Label htmlFor="eveningSync" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Evening Sync</span>
              </Label>
              <Input
                id="eveningSync"
                type="time"
                value={data.syncSchedule.evening}
                onChange={(e) => updateData({ 
                  syncSchedule: { 
                    ...data.syncSchedule, 
                    evening: e.target.value 
                  } 
                })}
              />
              <p className="text-sm text-gray-500 mt-1">
                Second sync of the day (recommended: 7:00 PM)
              </p>
            </div>
          </div>

          {errors.schedule && (
            <p className="text-sm text-red-500">{errors.schedule}</p>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notification Settings</span>
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
                <strong>Automatic Sync:</strong> Your system will automatically sync data at{' '}
                <strong>{data.syncSchedule.morning}</strong> and{' '}
                <strong>{data.syncSchedule.evening}</strong> daily. You can modify these 
                settings later in the admin dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">What happens during sync:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Fetch latest merchant data and updates</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Import new residual calculations</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Update transaction volumes and processing data</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Send notifications if configured</span>
            </li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-green-600 text-sm font-medium">✓</span>
            </div>
            <div>
              <p className="text-sm text-green-800">
                <strong>Setup Complete:</strong> You're almost done! Click "Complete Setup" 
                to finish configuring your Ireland Pay Analytics system.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <Button onClick={handleComplete} size="lg">
          Complete Setup
        </Button>
      </div>
    </div>
  )
} 