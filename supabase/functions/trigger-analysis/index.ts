/* eslint-disable */
// @ts-ignore - Deno URL imports are valid in Edge Functions runtime
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore - Deno URL imports are valid in Edge Functions runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

type ReadyVar = {
  source_ip: string
  destination_ip: string
  address: number
  function_code: number
  unit_id: number | null
  sample_count: number
  first_seen: string | null
  last_seen: string | null
  protocols: string[] | null
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log("[trigger-analysis] Request received", { method: req.method })

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      console.log("[trigger-analysis] Missing Authorization header")
      return new Response("Unauthorized", { status: 401, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log("[trigger-analysis] User verification failed", { userError })
      return new Response("Unauthorized", { status: 401, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const siteIdentifier = (body as { siteIdentifier?: string })?.siteIdentifier

    if (!siteIdentifier) {
      console.log("[trigger-analysis] Missing siteIdentifier")
      return new Response(JSON.stringify({ error: "siteIdentifier is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Load user settings (webhook + thresholds)
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("analysis_webhook_url, sample_threshold_for_analysis")
      .eq("user_id", user.id)
      .single()

    if (settingsError && settingsError.code !== "PGRST116") {
      console.log("[trigger-analysis] Failed to load settings", { settingsError })
      return new Response(JSON.stringify({ error: "Failed to load user settings" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const analysisWebhookUrl = (settings?.analysis_webhook_url as string | null) ?? null
    const minSamples = (settings?.sample_threshold_for_analysis as number | null) ?? 50

    if (!analysisWebhookUrl) {
      console.log("[trigger-analysis] analysis_webhook_url not configured")
      return new Response(
        JSON.stringify({ error: "analysis_webhook_url not configured in user_settings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Get ready variables (RPC already exists in your DB)
    const { data: ready, error: readyError } = await supabase.rpc(
      "get_variables_ready_for_analysis",
      { p_site_identifier: siteIdentifier, p_min_samples: minSamples },
    )

    if (readyError) {
      console.log("[trigger-analysis] RPC get_variables_ready_for_analysis failed", { readyError })
      return new Response(JSON.stringify({ error: readyError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const readyVars = (ready || []) as ReadyVar[]

    console.log("[trigger-analysis] Ready vars", { count: readyVars.length, minSamples })

    if (readyVars.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "No variables ready for analysis", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Call external webhook (n8n)
    const webhookResp = await fetch(analysisWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site_identifier: siteIdentifier,
        min_samples: minSamples,
        variables: readyVars,
      }),
    })

    if (!webhookResp.ok) {
      const text = await webhookResp.text()
      console.log("[trigger-analysis] Webhook failed", { status: webhookResp.status, text })
      return new Response(
        JSON.stringify({ error: "Webhook call failed", status: webhookResp.status, details: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const webhookJson = await webhookResp.json().catch(() => null)

    // Expected response format:
    // { suggestions: [{ source_ip, address, function_code, suggested_type, confidence, reasoning }] }
    const suggestions = (webhookJson?.suggestions || []) as Array<{
      source_ip: string
      address: number
      function_code: number
      suggested_type: string
      confidence: number
      reasoning?: string | null
    }>

    console.log("[trigger-analysis] Suggestions received", { count: suggestions.length })

    // Update discovered_variables with AI results (best-effort)
    let updated = 0
    for (const s of suggestions) {
      const { error: updErr } = await supabase
        .from("discovered_variables")
        .update({
          ai_suggested_type: s.suggested_type,
          ai_confidence: s.confidence,
          ai_reasoning: s.reasoning ?? null,
          ai_analysis_at: new Date().toISOString(),
          learning_state: "hypothesis",
          updated_at: new Date().toISOString(),
        })
        .eq("site_identifier", siteIdentifier)
        .eq("source_ip", s.source_ip)
        .eq("address", s.address)
        .eq("function_code", s.function_code)

      if (!updErr) updated++
    }

    return new Response(
      JSON.stringify({
        ok: true,
        readyCount: readyVars.length,
        suggestionCount: suggestions.length,
        updated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("[trigger-analysis] Error", { error })
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})