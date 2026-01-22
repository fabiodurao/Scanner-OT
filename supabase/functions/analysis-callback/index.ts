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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  console.log("[analysis-callback] Request received:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role for updating jobs
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { 
      job_id, 
      status, // 'completed' ou 'error'
      variables_analyzed,
      suggestions_count,
      error_message 
    } = body;

    console.log("[analysis-callback] Callback received:", { 
      job_id, 
      status, 
      variables_analyzed, 
      suggestions_count 
    });

    if (!job_id || !status) {
      return new Response(
        JSON.stringify({ error: "job_id and status are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar o job no banco
    const { error } = await supabase
      .from('analysis_jobs')
      .update({
        status,
        completed_at: new Date().toISOString(),
        variables_analyzed: variables_analyzed || null,
        suggestions_count: suggestions_count || null,
        error_message: error_message || null,
      })
      .eq('id', job_id);

    if (error) {
      console.error('[analysis-callback] Error updating job:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[analysis-callback] Job updated successfully:", job_id);

    return new Response(
      JSON.stringify({ ok: true, message: "Job updated successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[analysis-callback] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});