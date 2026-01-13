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
    "authorization, x-client-info, apikey, content-type, x-agent-key",
};

// Simple agent authentication using a shared secret
const AGENT_SECRET = Deno.env.get("AGENT_SECRET_KEY") || "change-me-in-production";

serve(async (req: Request) => {
  console.log("[agent-jobs] Request received:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the agent using a secret key
    const agentKey = req.headers.get("x-agent-key");
    if (agentKey !== AGENT_SECRET) {
      console.log("[agent-jobs] Invalid agent key");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for full database access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    console.log("[agent-jobs] Action:", action);

    switch (action) {
      case "claim_job": {
        // First, get all pending jobs ordered by creation time
        const { data: pendingJobs, error: selectError } = await supabase
          .from("processing_jobs")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: true });

        if (selectError) {
          console.error("[agent-jobs] Error selecting jobs:", selectError);
          return new Response(
            JSON.stringify({ error: "Failed to fetch jobs", details: selectError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!pendingJobs || pendingJobs.length === 0) {
          return new Response(
            JSON.stringify({ job: null, message: "No pending jobs" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get currently running jobs to check for sequence_group conflicts
        const { data: runningJobs, error: runningError } = await supabase
          .from("processing_jobs")
          .select("id, sequence_group")
          .in("status", ["downloading", "extracting", "running"]);

        if (runningError) {
          console.error("[agent-jobs] Error fetching running jobs:", runningError);
        }

        // Get set of sequence_groups that are currently being processed
        const activeSequenceGroups = new Set<string>();
        if (runningJobs) {
          for (const job of runningJobs) {
            if (job.sequence_group) {
              activeSequenceGroups.add(job.sequence_group);
            }
          }
        }

        console.log("[agent-jobs] Active sequence groups:", Array.from(activeSequenceGroups));

        // Find the first eligible job
        // A job is eligible if:
        // 1. It has no sequence_group (individual job), OR
        // 2. Its sequence_group is not currently being processed
        let eligibleJob = null;
        for (const job of pendingJobs) {
          if (!job.sequence_group) {
            // Individual job - always eligible
            eligibleJob = job;
            break;
          } else if (!activeSequenceGroups.has(job.sequence_group)) {
            // Sequence job but no other job from this sequence is running
            eligibleJob = job;
            break;
          }
          // Skip this job - another job from the same sequence is running
          console.log(`[agent-jobs] Skipping job ${job.id} - sequence_group ${job.sequence_group} is active`);
        }

        if (!eligibleJob) {
          console.log("[agent-jobs] No eligible jobs found (all pending jobs are blocked by sequence constraints)");
          return new Response(
            JSON.stringify({ job: null, message: "No eligible jobs (sequence constraints)" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Claim the eligible job by updating status to 'downloading'
        const { data: claimedJob, error: updateError } = await supabase
          .from("processing_jobs")
          .update({
            status: "downloading",
            current_step: "downloading",
            started_at: new Date().toISOString(),
            output_log: "Job claimed by agent",
          })
          .eq("id", eligibleJob.id)
          .eq("status", "pending")
          .select()
          .single();

        if (updateError || !claimedJob) {
          console.log("[agent-jobs] Job was claimed by another agent or error:", updateError);
          return new Response(
            JSON.stringify({ job: null, message: "Job was claimed by another agent" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get the PCAP file details
        const { data: pcapFile, error: pcapError } = await supabase
          .from("pcap_files")
          .select("*")
          .eq("id", claimedJob.pcap_file_id)
          .single();

        if (pcapError || !pcapFile) {
          console.error("[agent-jobs] Error fetching PCAP file:", pcapError);
          await supabase
            .from("processing_jobs")
            .update({
              status: "error",
              current_step: "error",
              error_message: "PCAP file not found",
              completed_at: new Date().toISOString(),
            })
            .eq("id", claimedJob.id);

          return new Response(
            JSON.stringify({ error: "PCAP file not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get site details including unique_id
        const { data: site } = await supabase
          .from("sites")
          .select("id, name, unique_id")
          .eq("id", claimedJob.site_id)
          .single();

        console.log("[agent-jobs] Job claimed successfully:", claimedJob.id);
        if (claimedJob.sequence_group) {
          console.log("[agent-jobs] Job is part of sequence group:", claimedJob.sequence_group);
        }

        return new Response(
          JSON.stringify({
            job: claimedJob,
            pcap_file: pcapFile,
            site: site,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_status": {
        const { 
          job_id, 
          status, 
          progress, 
          current_step,
          output_log, 
          error_message,
          pcap_duration,
          pcap_packets,
          pcap_start_time,
          pcap_end_time,
          elapsed_seconds,
          total_duration,
          processing_time,
        } = body;

        if (!job_id || !status) {
          return new Response(
            JSON.stringify({ error: "job_id and status are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const validStatuses = ["downloading", "extracting", "running", "completed", "error", "cancelled"];
        if (!validStatuses.includes(status)) {
          return new Response(
            JSON.stringify({ error: "Invalid status", valid: validStatuses }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const updateData: Record<string, unknown> = { status };

        if (progress !== undefined) {
          updateData.progress = Math.min(100, Math.max(0, progress));
        }

        if (current_step !== undefined) {
          updateData.current_step = current_step;
        }

        if (output_log !== undefined) {
          updateData.output_log = output_log;
        }

        if (error_message !== undefined) {
          updateData.error_message = error_message;
        }

        // PCAP metadata fields
        if (pcap_duration !== undefined) {
          updateData.pcap_duration = pcap_duration;
        }
        if (pcap_packets !== undefined) {
          updateData.pcap_packets = pcap_packets;
        }
        if (pcap_start_time !== undefined) {
          updateData.pcap_start_time = pcap_start_time;
        }
        if (pcap_end_time !== undefined) {
          updateData.pcap_end_time = pcap_end_time;
        }
        if (elapsed_seconds !== undefined) {
          updateData.elapsed_seconds = elapsed_seconds;
        }
        if (total_duration !== undefined) {
          updateData.total_duration = total_duration;
        }
        if (processing_time !== undefined) {
          updateData.processing_time = processing_time;
        }

        if (status === "completed" || status === "error" || status === "cancelled") {
          updateData.completed_at = new Date().toISOString();
          if (status === "completed") {
            updateData.progress = 100;
          }
        }

        const { data: updatedJob, error: updateError } = await supabase
          .from("processing_jobs")
          .update(updateData)
          .eq("id", job_id)
          .select()
          .single();

        if (updateError) {
          console.error("[agent-jobs] Error updating job:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update job", details: updateError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("[agent-jobs] Job updated:", job_id, status, progress, current_step);

        return new Response(
          JSON.stringify({ job: updatedJob }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "append_log": {
        const { job_id, log_line } = body;

        if (!job_id || !log_line) {
          return new Response(
            JSON.stringify({ error: "job_id and log_line are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current log and append (with size limit)
        const { data: currentJob } = await supabase
          .from("processing_jobs")
          .select("output_log")
          .eq("id", job_id)
          .single();

        let newLog = (currentJob?.output_log || "") + log_line + "\n";
        
        // Limit log size to last 10KB
        if (newLog.length > 10000) {
          newLog = "...[truncated]...\n" + newLog.slice(-9000);
        }

        const { error: updateError } = await supabase
          .from("processing_jobs")
          .update({ output_log: newLog })
          .eq("id", job_id);

        if (updateError) {
          console.error("[agent-jobs] Error appending log:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to append log" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check_cancelled": {
        const { job_id } = body;

        if (!job_id) {
          return new Response(
            JSON.stringify({ error: "job_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: job, error } = await supabase
          .from("processing_jobs")
          .select("status")
          .eq("id", job_id)
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: "Failed to check job status" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ cancelled: job?.status === "cancelled" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_s3_credentials": {
        const credentials = {
          access_key_id: Deno.env.get("AWS_ACCESS_KEY_ID"),
          secret_access_key: Deno.env.get("AWS_SECRET_ACCESS_KEY"),
          region: Deno.env.get("AWS_S3_REGION"),
          bucket: Deno.env.get("AWS_S3_BUCKET"),
        };

        if (!credentials.access_key_id || !credentials.secret_access_key) {
          return new Response(
            JSON.stringify({ error: "S3 credentials not configured" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify(credentials),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: "Unknown action", 
            valid_actions: ["claim_job", "update_status", "append_log", "check_cancelled", "get_s3_credentials"] 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[agent-jobs] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});