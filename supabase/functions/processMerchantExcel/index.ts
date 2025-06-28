import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { path } = await req.json()
    
    if (!path) {
      throw new Error('File path is required')
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('merchants')
      .download(path)

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`)
    }

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer()
    
    // Parse Excel file
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    console.log(`Processing ${jsonData.length} rows from ${sheetName}`)

    // Prepare data for insertion
    const merchants = []
    const metrics = []
    
    for (const row of jsonData) {
      // Extract and clean merchant data
      const mid = row['MID']?.toString().trim()
      if (!mid) continue

      // Merchant info (for upsert)
      merchants.push({
        mid,
        datasource: row['Datasource']?.toString().trim() || null,
        merchant_dba: row['Merchant DBA']?.toString().trim() || null
      })

      // Merchant metrics
      const totalVolume = row['Total Volume']?.toString()
        .replace(/[$,]/g, '')
        .trim()
      
      const totalTxns = row['Total Transactions']?.toString()
        .replace(/,/g, '')
        .trim()

      // Parse date - handle various date formats
      let monthDate = null
      if (row['Date']) {
        try {
          if (row['Date'] instanceof Date) {
            monthDate = row['Date'].toISOString().split('T')[0]
          } else {
            const dateStr = row['Date'].toString()
            const parsed = new Date(dateStr)
            if (!isNaN(parsed.getTime())) {
              monthDate = parsed.toISOString().split('T')[0]
            }
          }
        } catch (e) {
          console.error(`Failed to parse date: ${row['Date']}`, e)
        }
      }

      if (monthDate) {
        metrics.push({
          mid,
          month: monthDate,
          total_txns: parseInt(totalTxns) || 0,
          total_volume: parseFloat(totalVolume) || 0,
          source_file: path
        })
      }
    }

    console.log(`Prepared ${merchants.length} merchants and ${metrics.length} metrics for insertion`)

    // Insert merchants (upsert)
    if (merchants.length > 0) {
      const { error: merchantError } = await supabaseAdmin
        .from('merchants')
        .upsert(merchants, { onConflict: 'mid', ignoreDuplicates: false })

      if (merchantError) {
        throw new Error(`Failed to insert merchants: ${merchantError.message}`)
      }
    }

    // Insert metrics (upsert)
    if (metrics.length > 0) {
      const { error: metricsError } = await supabaseAdmin
        .from('merchant_metrics')
        .upsert(metrics, { onConflict: 'mid,month', ignoreDuplicates: false })

      if (metricsError) {
        throw new Error(`Failed to insert metrics: ${metricsError.message}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully processed ${path}`,
        merchants: merchants.length,
        metrics: metrics.length,
        fileName: path 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
