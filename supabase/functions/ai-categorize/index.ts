import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Register {
  address: number
  name: string
  label: string
  data_type: string
  unit: string
  scale: number
  function_code: number
  category?: string
}

interface CategorizeRequest {
  registers: Register[]
  task: 'categorize' | 'test_connection'
}

interface AICategorizationResult {
  address: number
  category: string
  confidence: number
}

async function callAnthropic(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  console.log("[ai-categorize] Calling Anthropic API with model:", model)
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error("[ai-categorize] Anthropic API error:", response.status, errorBody)
    throw new Error(`Anthropic API error (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  console.log("[ai-categorize] Anthropic response received, stop_reason:", data.stop_reason)
  return data.content?.[0]?.text || ''
}

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string, baseUrl?: string): Promise<string> {
  const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}/chat/completions` : 'https://api.openai.com/v1/chat/completions'
  console.log("[ai-categorize] Calling OpenAI-compatible API at:", url, "with model:", model)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error("[ai-categorize] OpenAI API error:", response.status, errorBody)
    throw new Error(`OpenAI API error (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  console.log("[ai-categorize] OpenAI response received, finish_reason:", data.choices?.[0]?.finish_reason)
  return data.choices?.[0]?.message?.content || ''
}

function parseAIResponse(responseText: string, validCategories: string[]): AICategorizationResult[] {
  console.log("[ai-categorize] Parsing AI response, length:", responseText.length)
  
  // Extract JSON array from response (may be wrapped in markdown code blocks)
  const jsonMatch = responseText.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    console.error("[ai-categorize] No JSON array found in response")
    throw new Error('AI response does not contain a valid JSON array')
  }

  let parsed: unknown[]
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error("[ai-categorize] Failed to parse JSON from response:", e)
    throw new Error('Failed to parse AI response as JSON')
  }

  const results: AICategorizationResult[] = []
  for (const item of parsed) {
    const obj = item as Record<string, unknown>
    if (typeof obj.address !== 'number' || typeof obj.category !== 'string') continue
    
    // Only include valid categories
    if (validCategories.includes(obj.category)) {
      results.push({
        address: obj.address,
        category: obj.category,
        confidence: typeof obj.confidence === 'number' ? obj.confidence : 0.5,
      })
    } else {
      console.log("[ai-categorize] Skipping invalid category:", obj.category, "for address:", obj.address)
    }
  }

  console.log("[ai-categorize] Parsed", results.length, "valid categorizations")
  return results
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error("[ai-categorize] No authorization header")
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.error("[ai-categorize] Auth error:", authError?.message)
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log("[ai-categorize] Authenticated user:", user.id)

    // Get user settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('user_settings')
      .select('ai_provider, ai_api_key, ai_model, ai_custom_base_url, ai_prompts')
      .eq('user_id', user.id)
      .single()

    if (settingsError || !settings) {
      console.error("[ai-categorize] Settings error:", settingsError?.message)
      return new Response(JSON.stringify({ error: 'AI settings not configured. Please configure your AI provider in Settings.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!settings.ai_api_key) {
      console.error("[ai-categorize] No API key configured")
      return new Response(JSON.stringify({ error: 'AI API key not configured. Please add your API key in Settings.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: CategorizeRequest = await req.json()
    console.log("[ai-categorize] Request task:", body.task, "registers:", body.registers?.length)

    // Test connection
    if (body.task === 'test_connection') {
      console.log("[ai-categorize] Testing connection for provider:", settings.ai_provider)
      try {
        const testPrompt = 'Respond with exactly: {"status":"ok"}'
        let response: string

        if (settings.ai_provider === 'anthropic') {
          response = await callAnthropic(settings.ai_api_key, settings.ai_model || 'claude-sonnet-4-20250514', 'You are a test assistant.', testPrompt)
        } else {
          response = await callOpenAI(
            settings.ai_api_key,
            settings.ai_model || 'gpt-4o',
            'You are a test assistant.',
            testPrompt,
            settings.ai_provider === 'custom' ? settings.ai_custom_base_url || undefined : undefined
          )
        }

        console.log("[ai-categorize] Test connection successful, response:", response.substring(0, 100))
        return new Response(JSON.stringify({ success: true, message: 'Connection successful!', provider: settings.ai_provider, model: settings.ai_model }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (error) {
        console.error("[ai-categorize] Test connection failed:", error)
        return new Response(JSON.stringify({ success: false, error: `Connection failed: ${(error as Error).message}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Categorize registers
    if (body.task === 'categorize') {
      if (!body.registers || body.registers.length === 0) {
        return new Response(JSON.stringify({ error: 'No registers provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const categories = [
        { value: 'instantaneous_electrical', label: 'Instantaneous Electrical' },
        { value: 'demand', label: 'Demand' },
        { value: 'energy_accumulators', label: 'Energy (Accumulators)' },
        { value: 'power_quality', label: 'Power Quality' },
        { value: 'operational_state', label: 'Operational State' },
        { value: 'control_commands', label: 'Control / Commands' },
        { value: 'internal_sensors', label: 'Internal Sensors' },
        { value: 'alarms_faults', label: 'Alarms & Faults' },
        { value: 'grid', label: 'Grid' },
        { value: 'generation', label: 'Generation' },
        { value: 'inverter_conversion', label: 'Inverter / Conversion' },
        { value: 'statistics_metrics', label: 'Statistics / Metrics' },
        { value: 'identification_metadata', label: 'Identification / Metadata' },
        { value: 'communication', label: 'Communication' },
        { value: 'diagnostics', label: 'Diagnostics' },
      ]
      const validCategoryValues = categories.map(c => c.value)

      // Get prompt template
      const prompts = settings.ai_prompts as Record<string, string> | null
      const promptTemplate = prompts?.categorize_registers || `You are an expert in OT (Operational Technology) and energy systems.
Given a list of Modbus/protocol registers from industrial equipment, classify each register into exactly one category.

Available categories:
{{categories_json}}

For each register, analyze the name, label, unit, data type, and address to determine the most appropriate category.

Respond ONLY with a JSON array where each element has:
- "address": the register address (number)
- "category": the category value (string, must be one of the available categories)
- "confidence": your confidence level (number, 0.0 to 1.0)

Registers to classify:
{{registers_json}}`

      // Build the prompt
      const categoriesJson = JSON.stringify(categories, null, 2)
      const registersJson = JSON.stringify(
        body.registers.map(r => ({
          address: r.address,
          name: r.name || `register_${r.address}`,
          label: r.label || r.name || `Register ${r.address}`,
          unit: r.unit || '',
          data_type: r.data_type || '',
        })),
        null,
        2
      )

      // Split prompt into system and user parts
      const fullPrompt = promptTemplate
        .replace('{{categories_json}}', categoriesJson)
        .replace('{{registers_json}}', registersJson)

      // Use the part before "Registers to classify:" as system, rest as user
      const splitIndex = fullPrompt.indexOf('Registers to classify:')
      let systemPrompt: string
      let userPrompt: string

      if (splitIndex !== -1) {
        systemPrompt = fullPrompt.substring(0, splitIndex).trim()
        userPrompt = fullPrompt.substring(splitIndex).trim()
      } else {
        systemPrompt = 'You are an expert in OT (Operational Technology) and energy systems. Classify registers into categories. Respond ONLY with a JSON array.'
        userPrompt = fullPrompt
      }

      console.log("[ai-categorize] Calling AI provider:", settings.ai_provider, "model:", settings.ai_model)
      console.log("[ai-categorize] Processing", body.registers.length, "registers")

      let responseText: string
      const maxRetries = 3

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (settings.ai_provider === 'anthropic') {
            responseText = await callAnthropic(settings.ai_api_key, settings.ai_model || 'claude-sonnet-4-20250514', systemPrompt, userPrompt)
          } else {
            responseText = await callOpenAI(
              settings.ai_api_key,
              settings.ai_model || 'gpt-4o',
              systemPrompt,
              userPrompt,
              settings.ai_provider === 'custom' ? settings.ai_custom_base_url || undefined : undefined
            )
          }
          break
        } catch (error) {
          const errMsg = (error as Error).message
          if (attempt < maxRetries && (errMsg.includes('429') || errMsg.includes('rate') || errMsg.includes('overloaded'))) {
            const delay = Math.pow(2, attempt) * 1000
            console.log(`[ai-categorize] Rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`)
            await new Promise(resolve => setTimeout(resolve, delay))
          } else {
            throw error
          }
        }
      }

      const results = parseAIResponse(responseText!, validCategoryValues)

      return new Response(JSON.stringify({ results, total: body.registers.length, categorized: results.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid task. Use "categorize" or "test_connection".' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("[ai-categorize] Unhandled error:", error)
    return new Response(JSON.stringify({ error: `Internal error: ${(error as Error).message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
