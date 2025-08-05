import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/email-service';
import { createSupabaseServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { testType } = await request.json();

    switch (testType) {
      case 'sync-success':
        await emailService.sendSyncSuccess({
          syncId: 'test-sync-123',
          syncType: 'daily',
          startTime: new Date(),
          endTime: new Date(),
          stats: {
            merchantsNew: 5,
            merchantsUpdated: 12,
            transactionsCount: 150,
            residualsCount: 25,
            duration: 300000 // 5 minutes
          }
        });
        break;

      case 'sync-failure':
        await emailService.sendSyncFailure({
          syncId: 'test-sync-456',
          syncType: 'daily',
          error: {
            message: 'Test error: API connection timeout',
            details: {
              endpoint: 'https://api.irelandpay.com/merchants',
              timeout: 30000,
              retries: 3
            }
          },
          failedAt: new Date(),
          lastSuccessfulSync: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          logs: [
            '2024-01-27 09:00:00: Starting daily sync',
            '2024-01-27 09:00:05: Connecting to Ireland Pay CRM API',
            '2024-01-27 09:00:35: Connection timeout after 30 seconds',
            '2024-01-27 09:00:35: Retrying connection...',
            '2024-01-27 09:01:05: Connection timeout after 30 seconds',
            '2024-01-27 09:01:05: Retrying connection...',
            '2024-01-27 09:01:35: Connection timeout after 30 seconds',
            '2024-01-27 09:01:35: All retries exhausted, sync failed'
          ]
        });
        break;

      case 'daily-summary':
        await emailService.sendDailySummary({
          date: new Date(),
          syncs: [
            {
              id: 'sync-1',
              type: 'daily',
              status: 'success',
              startTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
              endTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
              merchantsNew: 3,
              merchantsUpdated: 8,
              transactionsCount: 120,
              residualsCount: 15,
              duration: 300000
            },
            {
              id: 'sync-2',
              type: 'manual',
              status: 'success',
              startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
              endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
              merchantsNew: 1,
              merchantsUpdated: 4,
              transactionsCount: 30,
              residualsCount: 10,
              duration: 180000
            }
          ],
          totalMerchants: 1250,
          totalTransactions: 45000,
          totalVolume: 1250000,
          issues: [
            'API response time increased by 15%',
            '2 merchants had incomplete data'
          ]
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid test type' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Test email sent: ${testType}` 
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ 
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 