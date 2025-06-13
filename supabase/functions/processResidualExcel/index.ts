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
    if (!path) throw new Error('File path is required')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('uploads')
      .download(`residual/${path}`)
    if (downloadError) throw new Error(`Failed to download file: ${downloadError.message}`)

    const arrayBuffer = await fileData.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    console.log(`Processing ${jsonData.length} residual records`)

    const residuals = []
    for (const row of jsonData) {
      const mid = row['Merchant ID']?.toString().trim()
      if (!mid) continue

      // Parse payout month
      let payoutMonth = null
      if (row['Date']) {
        try {
          if (row['Date'] instanceof Date) {
            payoutMonth = row['Date'].toISOString().split('T')[0]
          } else {
            const parsed = new Date(row['Date'].toString())
            if (!isNaN(parsed.getTime())) payoutMonth = parsed.toISOString().split('T')[0]
          }
        } catch {}
      }
      if (!payoutMonth) continue

      const parseNumeric = (val) => {
        if (!val) return 0
        const s = val.toString().replace(/[$,%]/g, '').trim()
        return parseFloat(s) || 0
      }

      residuals.push({
        mid,
        merchant_dba: row['Merchant']?.toString().trim() || null,
        payout_month: payoutMonth,
        transactions: parseInt(row['Transactions']?.toString().replace(/,/g, '') || '0'),
        sales_amount: parseNumeric(row['Sales Amount']),
        income: parseNumeric(row['Income']),
        expenses: parseNumeric(row['Expenses']),
        net_profit: parseNumeric(row['Net']),
        bps: parseNumeric(row['BPS']),
        commission_pct: parseNumeric(row['%']),
        agent_net: parseNumeric(row['Agent Net']),
        source_file: path,
      })
    }

    if (residuals.length > 0) {
      const { error: residualError } = await supabaseAdmin
        .from('residual_payouts')
        .upsert(residuals, { onConflict: 'mid,payout_month', ignoreDuplicates: false })
      if (residualError) throw new Error(`Failed to insert residuals: ${residualError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: `Processed ${jsonData.length} records`, residuals: residuals.length, fileName: path }),
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
