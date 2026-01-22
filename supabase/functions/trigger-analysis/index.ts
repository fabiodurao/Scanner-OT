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

    // Create analysis job for tracking
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

    console.log("[trigger-analysis] Created job:", job.id)

    // Call n8n webhook and WAIT for response (synchronous with Respond to Webhook)
    console.log("[trigger-analysis] Calling n8n webhook:", analysisWebhookUrl)
    
    const webhookResp = await fetch(analysisWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site_identifier: siteIdentifier,
        min_samples: minSamples,
        variables: readyVars,
        job_id: job.id,
      }),
    })

    console.log("[trigger-analysis] Webhook response status:", webhookResp.status)

    // Parse response from n8n
    const webhookData = await webhookResp.json().catch(() => ({}))
    console.log("[trigger-analysis] Webhook response data:", webhookData)

    if (!webhookResp.ok) {
      console.log("[trigger-analysis] Webhook failed", { 
        status: webhookResp.status, 
        data: webhookData 
      })
      
      // Update job as error
      await supabase
        .from('analysis_jobs')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          error_message: (webhookData as { error_message?: string }).error_message || `Webhook failed: ${webhookResp.status}`,
        })
        .eq('id', job.id)
      
      return new Response(
        JSON.stringify({ 
          error: "Analysis failed", 
          details: (webhookData as { error_message?: string }).error_message || 'Unknown error'
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Success! Update job with data from n8n response
    const variablesAnalyzed = (webhookData as { variables_analyzed?: number }).variables_analyzed || readyVars.length
    const suggestionsCount = (webhookData as { suggestions_count?: number }).suggestions_count || 0

    await supabase
      .from('analysis_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        variables_analyzed: variablesAnalyzed,
        suggestions_count: suggestionsCount,
      })
      .eq('id', job.id)

    console.log("[trigger-analysis] Analysis completed successfully", {
      job_id: job.id,
      variables_analyzed: variablesAnalyzed,
      suggestions_count: suggestionsCount,
    })

    return new Response(
      JSON.stringify({
        ok: true,
        job_id: job.id,
        status: 'completed',
        variables_analyzed: variablesAnalyzed,
        suggestions_count: suggestionsCount,
        message: 'Analysis completed successfully',
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("[trigger-analysis] Error", { error })
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})