import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, status: number) {
  return jsonResponse({ error: message }, status)
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  // Extract path after /external-api/
  const fullPath = url.pathname
  const basePath = '/external-api/'
  const idx = fullPath.indexOf(basePath)
  const routePath = idx !== -1 ? fullPath.substring(idx + basePath.length - 1) : fullPath
  
  console.log(`[external-api] ${req.method} ${routePath}`)

  // Authenticate via X-API-Key header
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey) {
    console.log('[external-api] Missing X-API-Key header')
    return errorResponse('Missing X-API-Key header', 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Validate API key
  const keyHash = await hashKey(apiKey)
  const { data: keyData, error: keyError } = await supabase
    .rpc('validate_api_key', { p_key_hash: keyHash })

  if (keyError || !keyData || keyData.length === 0) {
    console.log('[external-api] Invalid or revoked API key')
    return errorResponse('Invalid or revoked API key', 401)
  }

  console.log(`[external-api] Authenticated with key: ${keyData[0].key_name}`)

  // Route handling
  try {
    // GET /sites/list
    if (req.method === 'GET' && routePath === '/sites/list') {
      return await handleListSites(supabase)
    }

    // PATCH /sites/:siteId
    const sitesPatchMatch = routePath.match(/^\/sites\/([a-f0-9-]+)$/)
    if (req.method === 'PATCH' && sitesPatchMatch) {
      const siteId = sitesPatchMatch[1]
      const body = await req.json()
      return await handleUpdateSite(supabase, siteId, body)
    }

    console.log(`[external-api] Route not found: ${req.method} ${routePath}`)
    return errorResponse(`Route not found: ${req.method} ${routePath}`, 404)
  } catch (err) {
    console.error('[external-api] Internal error:', err)
    return errorResponse('Internal server error', 500)
  }
})

async function handleListSites(supabase: ReturnType<typeof createClient>) {
  console.log('[external-api] Listing sites')
  const { data, error } = await supabase
    .from('sites')
    .select('id, name, slug, site_type, city, state, country, created_at')
    .order('name')

  if (error) {
    console.error('[external-api] Error listing sites:', error)
    return errorResponse('Failed to list sites', 500)
  }

  return jsonResponse({ sites: data, count: data.length })
}

async function handleUpdateSite(
  supabase: ReturnType<typeof createClient>,
  siteId: string,
  body: Record<string, unknown>
) {
  console.log(`[external-api] Updating site ${siteId}`, body)

  // Validate body
  const allowedFields = ['name', 'slug']
  const updateData: Record<string, unknown> = {}
  
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse('No valid fields to update. Allowed fields: name, slug', 400)
  }

  // Check if site exists
  const { data: existing, error: fetchError } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .single()

  if (fetchError || !existing) {
    console.log(`[external-api] Site not found: ${siteId}`)
    return errorResponse('Site not found', 404)
  }

  // Check slug uniqueness if updating slug
  if (updateData.slug) {
    const { data: slugCheck } = await supabase
      .from('sites')
      .select('id')
      .eq('slug', updateData.slug as string)
      .neq('id', siteId)
      .single()

    if (slugCheck) {
      return errorResponse('Slug already in use by another site', 409)
    }
  }

  // Update
  updateData.updated_at = new Date().toISOString()
  const { data, error } = await supabase
    .from('sites')
    .update(updateData)
    .eq('id', siteId)
    .select('id, name, slug, site_type, city, state, country, created_at, updated_at')
    .single()

  if (error) {
    console.error('[external-api] Error updating site:', error)
    return errorResponse('Failed to update site', 500)
  }

  return jsonResponse({ site: data })
}
