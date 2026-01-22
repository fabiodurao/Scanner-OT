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
  console.log("[trigger-analysis] ========================================")
  console.log("[trigger-analysis] Request received", { method: req.method })

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    console.log("[trigger-analysis] User verified:", user.id)

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const siteIdentifier = (body as { siteIdentifier?: string })?.siteIdentifier

    if (!siteIdentifier) {
      console.log("[trigger-analysis] Missing siteIdentifier")
      return new Response(JSON.stringify({ error: "siteIdentifier is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    console.log("[trigger-analysis] Site identifier:", siteIdentifier)

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

    console.log("[trigger-analysis] Settings loaded:", { 
      webhookUrl: analysisWebhookUrl, 
      minSamples 
    })

    if (!analysisWebhookUrl) {
      console.log("[trigger-analysis] analysis_webhook_url not configured")
      return new Response(
        JSON.stringify({ error: "analysis_webhook_url not configured in user_settings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Get ready variables
    console.log("[trigger-analysis] Calling get_variables_ready_for_analysis RPC...")
    
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

    console.log("[trigger-analysis] Ready vars count:", readyVars.length)

    if (readyVars.length === 0) {
      console.log("[trigger-analysis] No variables ready for analysis")
      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: "No variables ready for analysis", 
          variables_analyzed: 0,
          suggestions_count: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Create analysis job for tracking
    console.log("[trigger-analysis] Creating analysis job...")
    
    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .insert({
        site_identifier: siteIdentifier,
        status: 'processing',
        created_by: user.id,
      })
      .select()
      .single()

    if (jobError) {
      console.log("[trigger-analysis] Failed to create job", { jobError })
      return new Response(
        JSON.stringify({ error: "Failed to create analysis job" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    console.log("[trigger-analysis] Job created:", job.id)

    // Build callback URL for n8n to call when done
    const callbackUrl = `${supabaseUrl}/functions/v1/analysis-callback`
    
    console.log("[trigger-analysis] Callback URL:", callbackUrl)

    // Call n8n webhook asynchronously (fire and forget)
    console.log("[trigger-analysis] Calling n8n webhook (async):", analysisWebhookUrl)
    console.log("[trigger-analysis] Sending", readyVars.length, "variables to analyze")
    
    // Don't await - let n8n process in background
    fetch(analysisWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site_identifier: siteIdentifier,
        min_samples: minSamples,
        variables: readyVars,
        job_id: job.id,
        callback_url: callbackUrl,
      }),
    }).catch(error => {
      console.error("[trigger-analysis] Error calling webhook:", error)
    })

    console.log("[trigger-analysis] Webhook called, returning immediately")
    console.log("[trigger-analysis] n8n will call callback when done")
    console.log("[trigger-analysis] ========================================")

    // Return immediately - n8n will call the callback when done
    return new Response(
      JSON.stringify({
        ok: true,
        job_id: job.id,
        status: 'processing',
        message: 'Analysis started - processing in background',
        variables_count: readyVars.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("[trigger-analysis] FATAL ERROR:", error)
    console.error("[trigger-analysis] Error stack:", (error as Error).stack)
    return new Response(JSON.stringify({ error: "Internal server error", details: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})