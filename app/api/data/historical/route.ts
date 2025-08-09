import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { ArchiveManager } from '@/lib/archive/archive-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, merchantId, metrics } = body;

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Validate date format
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Validate date range
    if (start > end) {
      return NextResponse.json(
        { error: 'startDate must be before endDate' },
        { status: 400 }
      );
    }

    // Check if start date is before April 2024
    const april2024 = new Date('2024-04-01');
    if (start < april2024) {
      return NextResponse.json(
        { error: 'Historical data is only available from April 2024 onwards' },
        { status: 400 }
      );
    }

    // Validate metrics
    const allowedMetrics = [
      'merchant_id', 'merchant_name', 'month', 'total_volume', 
      'total_transactions', 'avg_ticket', 'total_fees', 'net_revenue'
    ];
    
    const requestedMetrics = metrics || ['merchant_id', 'merchant_name', 'month', 'total_volume'];
    const invalidMetrics = requestedMetrics.filter(m => !allowedMetrics.includes(m));
    
    if (invalidMetrics.length > 0) {
      return NextResponse.json(
        { error: `Invalid metrics: ${invalidMetrics.join(', ')}` },
        { status: 400 }
      );
    }

    // Query historical data
    const archiveManager = new ArchiveManager();
    const data = await archiveManager.queryHistoricalData({
      startDate: startDate,
      endDate: endDate,
      merchantId: merchantId || undefined,
      metrics: requestedMetrics
    });

    // Calculate summary statistics
    const summary = {
      totalRecords: data.length,
      dateRange: { start: startDate, end: endDate },
      merchantCount: new Set(data.map((item: any) => item.merchant_id)).size,
      totalVolume: data.reduce((sum: number, item: any) => sum + (item.total_volume || 0), 0),
      totalTransactions: data.reduce((sum: number, item: any) => sum + (item.total_transactions || 0), 0)
    };

    return NextResponse.json({
      success: true,
      data,
      summary,
      query: {
        startDate,
        endDate,
        merchantId: merchantId || 'all',
        metrics: requestedMetrics
      }
    });

  } catch (error: any) {
    console.error('Historical data query error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to query historical data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const merchantId = searchParams.get('merchantId');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate query parameters are required' },
        { status: 400 }
      );
    }

    // Use the same logic as POST
    const body = { startDate, endDate, merchantId, metrics: ['merchant_id', 'merchant_name', 'month', 'total_volume'] };
    const modifiedRequest = new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return POST(modifiedRequest);

  } catch (error: any) {
    console.error('Historical data GET error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to query historical data',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 