'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function RealtimeIndicator() {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  useEffect(() => {
    const supabase = createClient()
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('merchant-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'merchant_data'
      }, (payload) => {
        setIsConnected(true)
        setLastUpdate(new Date())
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else {
          setIsConnected(false)
        }
      })
    
    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
  
  return (
    <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
      <span className="text-xs text-gray-300">
        {isConnected ? 'Realtime Connected' : 'Connecting...'}
      </span>
      {lastUpdate && (
        <span className="text-xs text-gray-400">
          Last update: {lastUpdate.toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}