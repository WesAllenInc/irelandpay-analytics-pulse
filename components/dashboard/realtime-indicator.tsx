'use client'

import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'

export function RealtimeIndicator() {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => {
    // Simulate connection - replace with actual Supabase realtime status
    setIsConnected(true)
    
    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-400">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="text-xs text-gray-500">
        Last update: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  )
}