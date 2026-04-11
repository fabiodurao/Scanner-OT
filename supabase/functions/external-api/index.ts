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

// ── S3 Presigned URL helpers ──────────────────────────────────────────────

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(message))
  return toHex(hash)
}

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
}

async function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const kDate = await hmacSha256(encoder.encode('AWS4' + secretKey), dateStamp)
  const kRegion = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, service)
  return await hmacSha256(kService, 'aws4_request')
}

function encodeRFC3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
}

async function generatePresignedUrl(
  method: string, bucket: string, key: string, region: string,
  accessKeyId: string, secretAccessKey: string, expiresIn = 3600
): Promise<string> {
  const host = `${bucket}.s3.${region}.amazonaws.com`
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').substring(0, 15) + 'Z'
  const dateStamp = amzDate.substring(0, 8)
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
  const credential = `${accessKeyId}/${credentialScope}`
  const encodedKey = key.split('/').map(encodeRFC3986).join('/')

  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
  }

  const sortedQS = Object.keys(queryParams).sort()
    .map(k => `${encodeRFC3986(k)}=${encodeRFC3986(queryParams[k])}`).join('&')

  const canonicalRequest = [method, '/' + encodedKey, sortedQS, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n')
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256(canonicalRequest)].join('\n')
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, 's3')
  const signature = toHex(await hmacSha256(signingKey, stringToSign))

  return `https://${host}/${encodedKey}?${sortedQS}&X-Amz-Signature=${signature}`
}

// ── Valid site types ──────────────────────────────────────────────────────

const VALID_SITE_TYPES = [
  'eolica', 'eolica_offshore', 'fotovoltaica', 'bess', 'hidreletrica',
  'biomassa', 'biocombustivel', 'hibrida', 'subestacao', 'energia_residuos',
  'geotermica', 'hidrogenio', 'solar_termico', 'residuos_nao_energeticos',
  'nuclear', 'ondas', 'mare', 'solar_telhado',
]

// ── Main handler ──────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
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

  const keyOwnerId = keyData[0].owner_id
  console.log(`[external-api] Authenticated: ${keyData[0].key_name} (owner: ${keyOwnerId})`)

  // ── Route matching ────────────────────────────────────────────────────

  try {
    // ── SITES ───────────────────────────────────────────────────────────

    // GET /sites/list
    if (req.method === 'GET' && routePath === '/sites/list') {
      return await handleListSites(supabase)
    }

    // POST /sites
    if (req.method === 'POST' && routePath === '/sites') {
      const body = await req.json()
      return await handleCreateSite(supabase, body, keyOwnerId)
    }

    // GET /sites/:siteId
    const sitesGetMatch = routePath.match(/^\/sites\/([a-f0-9-]+)$/)
    if (req.method === 'GET' && sitesGetMatch) {
      return await handleGetSite(supabase, sitesGetMatch[1])
    }

    // PATCH /sites/:siteId
    const sitesPatchMatch = routePath.match(/^\/sites\/([a-f0-9-]+)$/)
    if (req.method === 'PATCH' && sitesPatchMatch) {
      const body = await req.json()
      return await handleUpdateSite(supabase, sitesPatchMatch[1], body)
    }

    // GET /sites/:siteId/stats
    const siteStatsMatch = routePath.match(/^\/sites\/([a-f0-9-]+)\/stats$/)
    if (req.method === 'GET' && siteStatsMatch) {
      return await handleGetSiteStats(supabase, siteStatsMatch[1])
    }

    // ── EQUIPMENT ───────────────────────────────────────────────────────

    // GET /sites/:siteId/equipment
    const equipListMatch = routePath.match(/^\/sites\/([a-f0-9-]+)\/equipment$/)
    if (req.method === 'GET' && equipListMatch) {
      return await handleListEquipment(supabase, equipListMatch[1])
    }

    // GET /sites/:siteId/equipment/:macAddress
    const equipGetMatch = routePath.match(/^\/sites\/([a-f0-9-]+)\/equipment\/([a-fA-F0-9:.-]+)$/)
    if (req.method === 'GET' && equipGetMatch) {
      return await handleGetEquipment(supabase, equipGetMatch[1], equipGetMatch[2])
    }

    // PATCH /sites/:siteId/equipment/:macAddress
    const equipPatchMatch = routePath.match(/^\/sites\/([a-f0-9-]+)\/equipment\/([a-fA-F0-9:.-]+)$/)
    if (req.method === 'PATCH' && equipPatchMatch) {
      const body = await req.json()
      return await handleUpdateEquipment(supabase, equipPatchMatch[1], equipPatchMatch[2], body)
    }

    // ── SESSIONS ────────────────────────────────────────────────────────

    // GET /sites/:siteId/sessions
    const sessionsListMatch = routePath.match(/^\/sites\/([a-f0-9-]+)\/sessions$/)
    if (req.method === 'GET' && sessionsListMatch) {
      return await handleListSessions(supabase, sessionsListMatch[1])
    }

    // POST /sites/:siteId/sessions
    const sessionsCreateMatch = routePath.match(/^\/sites\/([a-f0-9-]+)\/sessions$/)
    if (req.method === 'POST' && sessionsCreateMatch) {
      const body = await req.json()
      return await handleCreateSession(supabase, sessionsCreateMatch[1], body, keyOwnerId)
    }

    // ── FILES ───────────────────────────────────────────────────────────

    // GET /sites/:siteId/sessions/:sessionId/files
    const filesListMatch = routePath.match(/^\/sites\/([a-f0-9-]+)\/sessions\/([a-f0-9-]+)\/files$/)
    if (req.method === 'GET' && filesListMatch) {
      return await handleListFiles(supabase, filesListMatch[1], filesListMatch[2])
    }

    // POST /sites/:siteId/sessions/:sessionId/files
    const filesCreateMatch = routePath.match(/^\/sites\/([a-f0-9-]+)\/sessions\/([a-f0-9-]+)\/files$/)
    if (req.method === 'POST' && filesCreateMatch) {
      const body = await req.json()
      return await handleCreateFileUpload(supabase, filesCreateMatch[1], filesCreateMatch[2], body)
    }

    // PATCH /sites/:siteId/sessions/:sessionId/files/:fileId
    const filesPatchMatch = routePath.match(/^\/sites\/([a-f0-9-]+)\/sessions\/([a-f0-9-]+)\/files\/([a-f0-9-]+)$/)
    if (req.method === 'PATCH' && filesPatchMatch) {
      const body = await req.json()
      return await handleConfirmFileUpload(supabase, filesPatchMatch[1], filesPatchMatch[2], filesPatchMatch[3], body)
    }

    // ── CATALOGS ────────────────────────────────────────────────────────

    // GET /manufacturers
    if (req.method === 'GET' && routePath === '/manufacturers') {
      return await handleListManufacturers(supabase)
    }

    // GET /equipment-models
    if (req.method === 'GET' && routePath === '/equipment-models') {
      return await handleListEquipmentModels(supabase)
    }

    // GET /protocols
    if (req.method === 'GET' && routePath === '/protocols') {
      return handleListProtocols()
    }

    // GET /site-types
    if (req.method === 'GET' && routePath === '/site-types') {
      return handleListSiteTypes()
    }

    console.log(`[external-api] Route not found: ${req.method} ${routePath}`)
    return errorResponse(`Route not found: ${req.method} ${routePath}`, 404)
  } catch (err) {
    console.error('[external-api] Internal error:', err)
    return errorResponse('Internal server error', 500)
  }
})

// ── Helper: verify site exists ────────────────────────────────────────────

async function verifySiteExists(supabase: ReturnType<typeof createClient>, siteId: string) {
  const { data, error } = await supabase.from('sites').select('id, unique_id').eq('id', siteId).single()
  if (error || !data) return null
  return data
}

// ── SITES handlers ────────────────────────────────────────────────────────

async function handleListSites(supabase: ReturnType<typeof createClient>) {
  console.log('[external-api] Listing sites')
  const { data, error } = await supabase
    .from('sites')
    .select('id, name, slug, unique_id, site_type, city, state, country, latitude, longitude, description, created_at')
    .order('name')

  if (error) {
    console.error('[external-api] Error listing sites:', error)
    return errorResponse('Failed to list sites', 500)
  }

  return jsonResponse({ data: data, count: data.length })
}

async function handleCreateSite(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
  ownerId: string
) {
  console.log('[external-api] Creating site', body)

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return errorResponse('Field "name" is required', 400)
  }

  if (body.site_type && !VALID_SITE_TYPES.includes(body.site_type as string)) {
    return errorResponse(`Invalid site_type. Valid values: ${VALID_SITE_TYPES.join(', ')}`, 400)
  }

  const insertData: Record<string, unknown> = {
    name: (body.name as string).trim(),
    created_by: ownerId,
  }

  const optionalFields = ['unique_id', 'slug', 'site_type', 'description', 'address', 'city', 'state', 'country', 'latitude', 'longitude']
  for (const field of optionalFields) {
    if (body[field] !== undefined) {
      insertData[field] = body[field]
    }
  }

  const { data, error } = await supabase
    .from('sites')
    .insert(insertData)
    .select('id, name, slug, unique_id, site_type, city, state, country, latitude, longitude, description, created_at')
    .single()

  if (error) {
    console.error('[external-api] Error creating site:', error)
    if (error.code === '23505') {
      return errorResponse('A site with this unique_id or slug already exists', 409)
    }
    return errorResponse('Failed to create site: ' + error.message, 500)
  }

  return jsonResponse({ data }, 201)
}

async function handleGetSite(supabase: ReturnType<typeof createClient>, siteId: string) {
  console.log(`[external-api] Getting site ${siteId}`)

  const { data, error } = await supabase
    .from('sites')
    .select('id, name, slug, unique_id, site_type, description, address, city, state, country, latitude, longitude, created_at, updated_at')
    .eq('id', siteId)
    .single()

  if (error || !data) {
    return errorResponse('Site not found', 404)
  }

  return jsonResponse({ data })
}

async function handleUpdateSite(
  supabase: ReturnType<typeof createClient>,
  siteId: string,
  body: Record<string, unknown>
) {
  console.log(`[external-api] Updating site ${siteId}`, body)

  const allowedFields = ['name', 'slug', 'site_type', 'description', 'address', 'city', 'state', 'country', 'latitude', 'longitude']
  const updateData: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse(`No valid fields to update. Allowed: ${allowedFields.join(', ')}`, 400)
  }

  if (updateData.site_type && !VALID_SITE_TYPES.includes(updateData.site_type as string)) {
    return errorResponse(`Invalid site_type. Valid values: ${VALID_SITE_TYPES.join(', ')}`, 400)
  }

  const existing = await verifySiteExists(supabase, siteId)
  if (!existing) return errorResponse('Site not found', 404)

  if (updateData.slug) {
    const { data: slugCheck } = await supabase
      .from('sites').select('id').eq('slug', updateData.slug as string).neq('id', siteId).single()
    if (slugCheck) return errorResponse('Slug already in use by another site', 409)
  }

  updateData.updated_at = new Date().toISOString()
  const { data, error } = await supabase
    .from('sites')
    .update(updateData)
    .eq('id', siteId)
    .select('id, name, slug, unique_id, site_type, description, address, city, state, country, latitude, longitude, created_at, updated_at')
    .single()

  if (error) {
    console.error('[external-api] Error updating site:', error)
    return errorResponse('Failed to update site', 500)
  }

  return jsonResponse({ data })
}

async function handleGetSiteStats(supabase: ReturnType<typeof createClient>, siteId: string) {
  console.log(`[external-api] Getting stats for site ${siteId}`)

  const site = await verifySiteExists(supabase, siteId)
  if (!site) return errorResponse('Site not found', 404)

  // Equipment count
  const { count: equipmentCount } = await supabase
    .from('discovered_equipment')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', siteId)

  // Sessions count
  const { count: sessionsCount } = await supabase
    .from('upload_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', siteId)

  // Files count and total size
  const { data: sessions } = await supabase
    .from('upload_sessions')
    .select('id')
    .eq('site_id', siteId)

  let totalFiles = 0
  let totalSizeBytes = 0

  if (sessions && sessions.length > 0) {
    const sessionIds = sessions.map(s => s.id)
    const { data: files } = await supabase
      .from('pcap_files')
      .select('size_bytes')
      .in('session_id', sessionIds)
      .eq('upload_status', 'completed')

    if (files) {
      totalFiles = files.length
      totalSizeBytes = files.reduce((sum, f) => sum + (f.size_bytes || 0), 0)
    }
  }

  // Unique protocols
  const { data: equipWithProtocols } = await supabase
    .from('discovered_equipment')
    .select('protocols')
    .eq('site_id', siteId)

  const protocolSet = new Set<string>()
  if (equipWithProtocols) {
    for (const eq of equipWithProtocols) {
      if (eq.protocols) {
        for (const p of eq.protocols) protocolSet.add(p)
      }
    }
  }

  return jsonResponse({
    data: {
      site_id: siteId,
      equipment_count: equipmentCount || 0,
      sessions_count: sessionsCount || 0,
      files_count: totalFiles,
      total_size_bytes: totalSizeBytes,
      unique_protocols: Array.from(protocolSet),
    }
  })
}

// ── EQUIPMENT handlers ────────────────────────────────────────────────────

async function handleListEquipment(supabase: ReturnType<typeof createClient>, siteId: string) {
  console.log(`[external-api] Listing equipment for site ${siteId}`)

  const site = await verifySiteExists(supabase, siteId)
  if (!site) return errorResponse('Site not found', 404)

  const { data, error } = await supabase
    .from('discovered_equipment')
    .select('id, ip_address, mac_address, role, manufacturer, model, device_name, device_type, firmware_version, variable_count, sample_count, protocols, first_seen_at, last_seen_at')
    .eq('site_id', siteId)
    .order('last_seen_at', { ascending: false })

  if (error) {
    console.error('[external-api] Error listing equipment:', error)
    return errorResponse('Failed to list equipment', 500)
  }

  return jsonResponse({ data: data || [], count: (data || []).length })
}

async function handleGetEquipment(
  supabase: ReturnType<typeof createClient>,
  siteId: string,
  macAddress: string
) {
  const normalizedMac = macAddress.toLowerCase()
  console.log(`[external-api] Getting equipment ${normalizedMac} for site ${siteId}`)

  const site = await verifySiteExists(supabase, siteId)
  if (!site) return errorResponse('Site not found', 404)

  const { data, error } = await supabase
    .from('discovered_equipment')
    .select('*')
    .eq('site_id', siteId)
    .ilike('mac_address', normalizedMac)
    .single()

  if (error || !data) {
    return errorResponse('Equipment not found', 404)
  }

  return jsonResponse({ data })
}

async function handleUpdateEquipment(
  supabase: ReturnType<typeof createClient>,
  siteId: string,
  macAddress: string,
  body: Record<string, unknown>
) {
  const normalizedMac = macAddress.toLowerCase()
  console.log(`[external-api] Updating equipment ${normalizedMac} for site ${siteId}`, body)

  const site = await verifySiteExists(supabase, siteId)
  if (!site) return errorResponse('Site not found', 404)

  const allowedFields = ['role', 'manufacturer', 'model', 'device_name', 'device_type', 'firmware_version']
  const updateData: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse(`No valid fields to update. Allowed: ${allowedFields.join(', ')}`, 400)
  }

  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('discovered_equipment')
    .update(updateData)
    .eq('site_id', siteId)
    .ilike('mac_address', normalizedMac)
    .select('id, ip_address, mac_address, role, manufacturer, model, device_name, device_type, firmware_version, variable_count, sample_count, protocols, first_seen_at, last_seen_at, updated_at')
    .single()

  if (error || !data) {
    console.error('[external-api] Error updating equipment:', error)
    return errorResponse('Equipment not found or update failed', 404)
  }

  return jsonResponse({ data })
}

// ── SESSIONS handlers ─────────────────────────────────────────────────────

async function handleListSessions(supabase: ReturnType<typeof createClient>, siteId: string) {
  console.log(`[external-api] Listing sessions for site ${siteId}`)

  const site = await verifySiteExists(supabase, siteId)
  if (!site) return errorResponse('Site not found', 404)

  const { data, error } = await supabase
    .from('upload_sessions')
    .select('id, site_id, name, description, total_files, total_size_bytes, status, created_at, completed_at')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[external-api] Error listing sessions:', error)
    return errorResponse('Failed to list sessions', 500)
  }

  return jsonResponse({ data: data || [], count: (data || []).length })
}

async function handleCreateSession(
  supabase: ReturnType<typeof createClient>,
  siteId: string,
  body: Record<string, unknown>,
  ownerId: string
) {
  console.log(`[external-api] Creating session for site ${siteId}`, body)

  const site = await verifySiteExists(supabase, siteId)
  if (!site) return errorResponse('Site not found', 404)

  const insertData: Record<string, unknown> = {
    site_id: siteId,
    uploaded_by: ownerId,
    status: 'in_progress',
  }

  if (body.name) insertData.name = body.name
  if (body.description) insertData.description = body.description

  const { data, error } = await supabase
    .from('upload_sessions')
    .insert(insertData)
    .select('id, site_id, name, description, total_files, total_size_bytes, status, created_at')
    .single()

  if (error) {
    console.error('[external-api] Error creating session:', error)
    return errorResponse('Failed to create session: ' + error.message, 500)
  }

  return jsonResponse({ data }, 201)
}

// ── FILES handlers ────────────────────────────────────────────────────────

async function handleListFiles(
  supabase: ReturnType<typeof createClient>,
  siteId: string,
  sessionId: string
) {
  console.log(`[external-api] Listing files for session ${sessionId}`)

  const site = await verifySiteExists(supabase, siteId)
  if (!site) return errorResponse('Site not found', 404)

  // Verify session belongs to site
  const { data: session } = await supabase
    .from('upload_sessions').select('id').eq('id', sessionId).eq('site_id', siteId).single()
  if (!session) return errorResponse('Session not found', 404)

  const { data, error } = await supabase
    .from('pcap_files')
    .select('id, filename, original_filename, size_bytes, content_type, upload_status, uploaded_at, completed_at, display_order')
    .eq('session_id', sessionId)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[external-api] Error listing files:', error)
    return errorResponse('Failed to list files', 500)
  }

  return jsonResponse({ data: data || [], count: (data || []).length })
}

async function handleCreateFileUpload(
  supabase: ReturnType<typeof createClient>,
  siteId: string,
  sessionId: string,
  body: Record<string, unknown>
) {
  console.log(`[external-api] Creating file upload for session ${sessionId}`, body)

  const site = await verifySiteExists(supabase, siteId)
  if (!site) return errorResponse('Site not found', 404)

  // Verify session belongs to site
  const { data: session } = await supabase
    .from('upload_sessions').select('id').eq('id', sessionId).eq('site_id', siteId).single()
  if (!session) return errorResponse('Session not found', 404)

  // Validate required fields
  if (!body.filename || typeof body.filename !== 'string') {
    return errorResponse('Field "filename" is required', 400)
  }

  const contentType = (body.content_type as string) || 'application/octet-stream'
  const sizeBytes = body.size_bytes as number || 0

  // Get AWS credentials
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')
  const bucket = Deno.env.get('AWS_S3_BUCKET')
  const region = Deno.env.get('AWS_S3_REGION')

  if (!accessKeyId || !secretAccessKey || !bucket || !region) {
    console.error('[external-api] Missing AWS configuration')
    return errorResponse('Storage configuration error', 500)
  }

  // Build S3 key (same pattern as frontend)
  const timestamp = Date.now()
  const sanitizedFilename = (body.filename as string)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
  const s3Key = `customers/${siteId}/sessions/${sessionId}/${timestamp}_${sanitizedFilename}`

  // Generate presigned URL
  const presignedUrl = await generatePresignedUrl('PUT', bucket, s3Key, region, accessKeyId, secretAccessKey, 3600)

  // Get next display_order
  const { data: existingFiles } = await supabase
    .from('pcap_files')
    .select('display_order')
    .eq('session_id', sessionId)
    .order('display_order', { ascending: false })
    .limit(1)

  const nextOrder = (existingFiles && existingFiles.length > 0 ? (existingFiles[0].display_order || 0) : 0) + 1

  // Create pcap_files record
  const { data: pcapFile, error: dbError } = await supabase
    .from('pcap_files')
    .insert({
      session_id: sessionId,
      filename: `${timestamp}_${sanitizedFilename}`,
      original_filename: body.filename as string,
      size_bytes: sizeBytes,
      s3_key: s3Key,
      s3_bucket: bucket,
      content_type: contentType,
      upload_status: 'uploading',
      display_order: nextOrder,
    })
    .select('id')
    .single()

  if (dbError) {
    console.error('[external-api] Error creating file record:', dbError)
    return errorResponse('Failed to create file record: ' + dbError.message, 500)
  }

  console.log(`[external-api] Presigned URL generated for file ${pcapFile.id}`)

  return jsonResponse({
    data: {
      file_id: pcapFile.id,
      upload_url: presignedUrl,
      s3_key: s3Key,
      expires_in: 3600,
    }
  }, 201)
}

async function handleConfirmFileUpload(
  supabase: ReturnType<typeof createClient>,
  siteId: string,
  sessionId: string,
  fileId: string,
  body: Record<string, unknown>
) {
  console.log(`[external-api] Confirming file upload ${fileId}`, body)

  const site = await verifySiteExists(supabase, siteId)
  if (!site) return errorResponse('Site not found', 404)

  // Verify session belongs to site
  const { data: session } = await supabase
    .from('upload_sessions').select('id').eq('id', sessionId).eq('site_id', siteId).single()
  if (!session) return errorResponse('Session not found', 404)

  const status = body.status as string
  if (!status || !['completed', 'error'].includes(status)) {
    return errorResponse('Field "status" must be "completed" or "error"', 400)
  }

  const updateData: Record<string, unknown> = {
    upload_status: status,
  }

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }

  if (status === 'error' && body.error_message) {
    updateData.error_message = body.error_message
  }

  const { data: file, error } = await supabase
    .from('pcap_files')
    .update(updateData)
    .eq('id', fileId)
    .eq('session_id', sessionId)
    .select('id, filename, original_filename, size_bytes, upload_status, completed_at')
    .single()

  if (error || !file) {
    console.error('[external-api] Error confirming file:', error)
    return errorResponse('File not found or update failed', 404)
  }

  // Update session stats
  if (status === 'completed') {
    const { data: sessionFiles } = await supabase
      .from('pcap_files')
      .select('size_bytes')
      .eq('session_id', sessionId)
      .eq('upload_status', 'completed')

    if (sessionFiles) {
      await supabase
        .from('upload_sessions')
        .update({
          total_files: sessionFiles.length,
          total_size_bytes: sessionFiles.reduce((s, f) => s + (f.size_bytes || 0), 0),
        })
        .eq('id', sessionId)
    }
  }

  return jsonResponse({ data: file })
}

// ── CATALOG handlers ──────────────────────────────────────────────────────

async function handleListManufacturers(supabase: ReturnType<typeof createClient>) {
  console.log('[external-api] Listing manufacturers')
  const { data, error } = await supabase
    .from('manufacturers')
    .select('id, name, created_at')
    .order('name')

  if (error) {
    console.error('[external-api] Error listing manufacturers:', error)
    return errorResponse('Failed to list manufacturers', 500)
  }

  return jsonResponse({ data: data || [], count: (data || []).length })
}

async function handleListEquipmentModels(supabase: ReturnType<typeof createClient>) {
  console.log('[external-api] Listing equipment models')
  const { data, error } = await supabase
    .from('equipment_models')
    .select('id, manufacturer_id, name, description, created_at')
    .order('name')

  if (error) {
    console.error('[external-api] Error listing equipment models:', error)
    return errorResponse('Failed to list equipment models', 500)
  }

  return jsonResponse({ data: data || [], count: (data || []).length })
}

function handleListProtocols() {
  console.log('[external-api] Listing protocols')
  const protocols = [
    'Modbus TCP', 'Modbus RTU', 'DNP3', 'IEC 61850', 'IEC 60870-5-104',
    'OPC UA', 'OPC DA', 'MQTT', 'BACnet', 'PROFINET', 'EtherNet/IP',
    'S7comm', 'GOOSE', 'MMS', 'SV (Sampled Values)', 'HART-IP',
    'FF HSE', 'CIP', 'FINS', 'MELSEC',
  ]
  return jsonResponse({ data: protocols, count: protocols.length })
}

function handleListSiteTypes() {
  console.log('[external-api] Listing site types')
  const siteTypes = [
    { value: 'eolica', label: 'Wind Turbine' },
    { value: 'eolica_offshore', label: 'Wind Offshore' },
    { value: 'fotovoltaica', label: 'Solar' },
    { value: 'bess', label: 'BESS' },
    { value: 'hidreletrica', label: 'Hydropower' },
    { value: 'biomassa', label: 'Biomass' },
    { value: 'biocombustivel', label: 'Biofuels' },
    { value: 'hibrida', label: 'Hybrid' },
    { value: 'subestacao', label: 'Substation' },
    { value: 'energia_residuos', label: 'Energy from Waste' },
    { value: 'geotermica', label: 'Geothermal' },
    { value: 'hidrogenio', label: 'Hydrogen' },
    { value: 'solar_termico', label: 'Solar Thermal' },
    { value: 'residuos_nao_energeticos', label: 'Non-Energy Waste' },
    { value: 'nuclear', label: 'Nuclear' },
    { value: 'ondas', label: 'Wave' },
    { value: 'mare', label: 'Tidal' },
    { value: 'solar_telhado', label: 'Solar Rooftop' },
  ]
  return jsonResponse({ data: siteTypes, count: siteTypes.length })
}
