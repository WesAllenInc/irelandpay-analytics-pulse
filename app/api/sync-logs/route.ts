import { NextResponse } from 'next/server'
import { SyncLogger } from '@/lib/sync-logger'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const syncId = searchParams.get('syncId')
    const limit = parseInt(searchParams.get('limit') || '100')

    let logs
    if (syncId) {
      logs = await SyncLogger.getLogsBySyncId(syncId)
    } else {
      logs = await SyncLogger.getRecentLogs(limit)
    }

    return NextResponse.json({
      success: true,
      data: logs,
      count: logs.length
    })
  } catch (error) {
    console.error('Error fetching sync logs:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sync logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const daysToKeep = parseInt(searchParams.get('daysToKeep') || '30')

    await SyncLogger.clearOldLogs(daysToKeep)

    return NextResponse.json({
      success: true,
      message: `Cleared sync logs older than ${daysToKeep} days`
    })
  } catch (error) {
    console.error('Error clearing sync logs:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear sync logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
