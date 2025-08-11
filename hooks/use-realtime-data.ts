'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useRealtimeData<T extends { id?: string }>(  
  table: string,
  initialData: T[],
  filter?: { column: string; value: string }
) {
  const [data, setData] = useState<T[]>(initialData)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    let channel: RealtimeChannel

    const setupRealtimeSubscription = async () => {
      const channelName = filter 
        ? `${table}_${filter.column}_${filter.value}` 
        : `${table}_changes`

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: filter ? `${filter.column}=eq.${filter.value}` : undefined,
          },
          (payload) => {
            console.log('Realtime event:', payload)
            
            if (payload.eventType === 'INSERT') {
              setData((current) => [...current, payload.new as T])
            } else if (payload.eventType === 'UPDATE') {
              setData((current) =>
                current.map((item) =>
                  item.id === (payload.new as any).id ? payload.new as T : item
                )
              )
            } else if (payload.eventType === 'DELETE') {
              setData((current) =>
                current.filter((item) => item.id !== (payload.old as any).id)
              )
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status)
        })
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [table, filter, supabase])

  return data
}