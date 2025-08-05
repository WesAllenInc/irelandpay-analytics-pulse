import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const setupData = await request.json()
    const supabase = createSupabaseServerClient()
    const serviceSupabase = createSupabaseServiceClient()

    // 1. Create admin user in auth system
    const { data: authUser, error: authError } = await serviceSupabase.auth.admin.createUser({
      email: setupData.adminEmail,
      password: 'TempPassword123!', // User will need to change this
      email_confirm: true,
      user_metadata: { 
        name: setupData.adminName,
        role: 'admin'
      }
    })

    if (authError) {
      console.error('Error creating admin user:', authError)
      return NextResponse.json(
        { error: 'Failed to create admin user' },
        { status: 500 }
      )
    }

    // 2. Add admin user to agents table
    const { error: agentError } = await serviceSupabase
      .from('agents')
      .insert({
        email: setupData.adminEmail,
        agent_name: setupData.adminName,
        role: 'admin',
        approval_status: 'approved'
      })

    if (agentError) {
      console.error('Error adding admin to agents table:', agentError)
      return NextResponse.json(
        { error: 'Failed to create admin account' },
        { status: 500 }
      )
    }

    // 3. Save sync configuration
    const { error: configError } = await serviceSupabase
      .from('sync_config')
      .upsert({
        id: 'default',
        config: {
          autoSyncEnabled: true,
          defaultFrequency: 'daily',
          defaultTime: setupData.syncSchedule.morning,
          retryAttempts: 3,
          retryDelay: 30,
          timeoutSeconds: 300,
          maxConcurrentSyncs: 2,
          enableNotifications: setupData.notifications.email,
          enableErrorAlerts: true,
          syncSchedule: setupData.syncSchedule,
          notifications: setupData.notifications
        }
      })

    if (configError) {
      console.error('Error saving sync config:', configError)
      return NextResponse.json(
        { error: 'Failed to save sync configuration' },
        { status: 500 }
      )
    }

    // 4. Set up scheduled sync jobs
    const { error: scheduleError } = await serviceSupabase
      .from('sync_schedules')
      .insert([
        {
          data_type: 'all',
          frequency: 'daily',
          cron_expression: `0 ${setupData.syncSchedule.morning.split(':')[1]} ${setupData.syncSchedule.morning.split(':')[0]} * * *`,
          next_run: new Date().toISOString(),
          time_of_day: setupData.syncSchedule.morning
        },
        {
          data_type: 'all',
          frequency: 'daily',
          cron_expression: `0 ${setupData.syncSchedule.evening.split(':')[1]} ${setupData.syncSchedule.evening.split(':')[0]} * * *`,
          next_run: new Date().toISOString(),
          time_of_day: setupData.syncSchedule.evening
        }
      ])

    if (scheduleError) {
      console.error('Error setting up sync schedules:', scheduleError)
      // Don't fail the setup for this, just log it
    }

    // 5. Store API credentials securely (in production, use proper secret management)
    // For now, we'll store them in environment variables or a secure table
    const { error: credentialsError } = await serviceSupabase
      .from('api_credentials')
      .upsert({
        id: 'irelandpay_crm',
        service_name: 'irelandpay_crm',
        base_url: setupData.baseUrl,
        api_key: setupData.apiKey, // In production, encrypt this
        is_active: true,
        created_at: new Date().toISOString()
      })

    if (credentialsError) {
      console.error('Error storing API credentials:', credentialsError)
      // Don't fail the setup for this, just log it
    }

    return NextResponse.json({
      success: true,
      message: 'Setup completed successfully',
      adminUserId: authUser.user?.id
    })

  } catch (error) {
    console.error('Setup completion error:', error)
    return NextResponse.json(
      { error: 'Failed to complete setup' },
      { status: 500 }
    )
  }
} 