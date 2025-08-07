import { createSupabaseServiceClient } from '@/lib/supabase'

export interface SyncLog {
  id?: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  details?: any
  sync_id?: string
  timestamp: string
  user_id?: string
}

export class SyncLogger {
  private supabase = createSupabaseServiceClient()
  private logs: SyncLog[] = []

  constructor(private syncId?: string, private userId?: string) {}

  async log(level: SyncLog['level'], message: string, details?: any) {
    const logEntry: SyncLog = {
      level,
      message,
      details,
      sync_id: this.syncId,
      timestamp: new Date().toISOString(),
      user_id: this.userId
    }

    // Add to local logs
    this.logs.push(logEntry)

    // Also log to console for immediate visibility
    console.log(`[SYNC ${level.toUpperCase()}] ${message}`, details || '')

    try {
      // Store in database (optional - will fail gracefully if table doesn't exist)
      await this.supabase
        .from('sync_logs')
        .insert(logEntry)
    } catch (error) {
      // Silently fail if table doesn't exist - logs are still available in console and local array
      console.log(`[SYNC LOG] Database storage failed (table may not exist): ${error}`)
    }
  }

  async info(message: string, details?: any) {
    await this.log('info', message, details)
  }

  async warn(message: string, details?: any) {
    await this.log('warn', message, details)
  }

  async error(message: string, details?: any) {
    await this.log('error', message, details)
  }

  async debug(message: string, details?: any) {
    await this.log('debug', message, details)
  }

  getLogs(): SyncLog[] {
    return this.logs
  }

  static async getRecentLogs(limit = 100): Promise<SyncLog[]> {
    const supabase = createSupabaseServiceClient()
    
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        console.log('Failed to fetch sync logs (table may not exist):', error.message)
        return []
      }

      return data || []
    } catch (error) {
      console.log('Error fetching sync logs (table may not exist):', error)
      return []
    }
  }

  static async getLogsBySyncId(syncId: string): Promise<SyncLog[]> {
    const supabase = createSupabaseServiceClient()
    
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('sync_id', syncId)
        .order('timestamp', { ascending: true })

      if (error) {
        console.error('Failed to fetch sync logs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching sync logs:', error)
      return []
    }
  }

  static async clearOldLogs(daysToKeep = 30): Promise<void> {
    const supabase = createSupabaseServiceClient()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    try {
      const { error } = await supabase
        .from('sync_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())

      if (error) {
        console.error('Failed to clear old sync logs:', error)
      }
    } catch (error) {
      console.error('Error clearing old sync logs:', error)
    }
  }
}
