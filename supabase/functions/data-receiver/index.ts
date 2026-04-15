import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let payload: unknown
    try {
      payload = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extract site_identifier from payload or query param
    const url = new URL(req.url)
    const siteFromQuery = url.searchParams.get('site')
    const siteFromBody = typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>).site_identifier as string | undefined
      : undefined
    const siteIdentifier = siteFromQuery || siteFromBody || null

    // Extract relevant headers
    const relevantHeaders: Record<string, string> = {}
    for (const key of ['content-type', 'user-agent', 'x-forwarded-for', 'x-real-ip']) {
      const val = req.headers.get(key)
      if (val) relevantHeaders[key] = val
    }

    // Try to get source IP
    const sourceIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || null

    const { data, error } = await supabase
      .from('received_data')
      .insert({
        site_identifier: siteIdentifier,
        payload,
        headers: relevantHeaders,
        source_ip: sourceIp,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[data-receiver] Insert error:', error)
      return new Response(JSON.stringify({ error: 'Failed to store data', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[data-receiver] Data received and stored:', { id: data.id, site_identifier: siteIdentifier })

    return new Response(JSON.stringify({ received: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[data-receiver] Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
