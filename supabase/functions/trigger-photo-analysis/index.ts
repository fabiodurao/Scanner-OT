// @ts-ignore - Deno imports
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore - Deno imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  console.log("[trigger-photo-analysis] ========================================");
  console.log("[trigger-photo-analysis] Request received", { method: req.method });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[trigger-photo-analysis] Missing Authorization header");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("[trigger-photo-analysis] User verification failed", { userError });
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    console.log("[trigger-photo-analysis] User verified:", user.id);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const siteIdentifier = (body as { siteIdentifier?: string })?.siteIdentifier;
    const photoData = (body as { photoData?: string })?.photoData;
    const photoTimestamp = (body as { photoTimestamp?: string })?.photoTimestamp;

    if (!siteIdentifier || !photoData) {
      console.log("[trigger-photo-analysis] Missing required fields");
      return new Response(
        JSON.stringify({ error: "siteIdentifier and photoData are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[trigger-photo-analysis] Site identifier:", siteIdentifier);
    console.log("[trigger-photo-analysis] Photo data length:", photoData.length);
    console.log("[trigger-photo-analysis] Photo timestamp:", photoTimestamp || "not provided");

    // Load user settings (webhook URL)
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("photo_webhook_url")
      .eq("user_id", user.id)
      .single();

    if (settingsError && settingsError.code !== "PGRST116") {
      console.log("[trigger-photo-analysis] Failed to load settings", { settingsError });
      return new Response(
        JSON.stringify({ error: "Failed to load user settings" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const photoWebhookUrl = (settings?.photo_webhook_url as string | null) ?? 
                            "https://n8n.otscanner.qzz.io/webhook/9118e601-ae51-446f-8f44-fdbc7037f2ad";

    console.log("[trigger-photo-analysis] Using webhook URL:", photoWebhookUrl);

    // Create photo analysis job
    console.log("[trigger-photo-analysis] Creating photo analysis job...");

    const { data: job, error: jobError } = await supabase
      .from("photo_analysis_jobs")
      .insert({
        site_identifier: siteIdentifier,
        photo_data: photoData,
        photo_timestamp: photoTimestamp || new Date().toISOString(),
        status: "processing",
        n8n_webhook_url: photoWebhookUrl,
        created_by: user.id,
      })
      .select()
      .single();

    if (jobError) {
      console.log("[trigger-photo-analysis] Failed to create job", { jobError });
      return new Response(
        JSON.stringify({ error: "Failed to create photo analysis job" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[trigger-photo-analysis] Job created:", job.id);

    // Call N8N webhook asynchronously
    console.log("[trigger-photo-analysis] Calling N8N webhook (async):", photoWebhookUrl);

    fetch(photoWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site_identifier: siteIdentifier,
        photo_data: photoData,
        photo_timestamp: photoTimestamp || new Date().toISOString(),
        job_id: job.id,
      }),
    }).catch((error) => {
      console.error("[trigger-photo-analysis] Error calling webhook:", error);
    });

    console.log("[trigger-photo-analysis] Webhook called, returning immediately");
    console.log("[trigger-photo-analysis] N8N will update job status directly in database");
    console.log("[trigger-photo-analysis] ========================================");

    return new Response(
      JSON.stringify({
        ok: true,
        job_id: job.id,
        status: "processing",
        message: "Photo analysis started - N8N will update status when complete",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[trigger-photo-analysis] FATAL ERROR:", error);
    console.error("[trigger-photo-analysis] Error stack:", (error as Error).stack);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});