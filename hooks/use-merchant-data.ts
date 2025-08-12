'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '../lib/supabase/client'
import type { Database } from '@/types/database'

type MerchantData = Database['public']['Tables']['master_data_mv']['Row']

export function useMerchantData(merchantId?: string) {
  const [data, setData] = useState<MerchantData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        
        let query = supabase
          .from('master_data_mv')
          .select('*')
          .order('volume_month', { ascending: true })

        if (merchantId) {
          query = query.eq('mid', merchantId)
        }

        const { data, error } = await query

        if (error) throw error
        
        setData(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [merchantId, supabase])

  return { data, loading, error }
}