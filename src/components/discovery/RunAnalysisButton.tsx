import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_PROJECT_ID = "jgclhfwigmxmqyhqngcm";

export function RunAnalysisButton({ siteId }: { siteId: string }) {
  const [running, setRunning] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  // Escutar mudanças no job via Realtime
  useEffect(() => {
    if (!jobId) return;

    console.log('[RunAnalysisButton] Subscribing to job updates:', jobId);

    const channel = supabase
      .channel(`analysis_job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'analysis_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          console.log('[RunAnalysisButton] Job updated:', payload.new);
          const updatedJob = payload.new as {
            status: string;
            suggestions_count?: number;
            variables_analyzed?: number;
            error_message?: string;
          };
          
          if (updatedJob.status === 'completed') {
            toast.success(
              `Analysis complete! ${updatedJob.suggestions_count || 0} suggestions for ${updatedJob.variables_analyzed || 0} variables`
            );
            setRunning(false);
            setJobId(null);
            
            // Reload page to show new data
            window.location.reload();
          } else if (updatedJob.status === 'error') {
            toast.error('Analysis failed: ' + (updatedJob.error_message || 'Unknown error'));
            setRunning(false);
            setJobId(null);
          }
        }
      )
      .subscribe((status) => {
        console.log('[RunAnalysisButton] Subscription status:', status);
      });

    return () => {
      console.log('[RunAnalysisButton] Unsubscribing from job:', jobId);
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const run = async () => {
    setRunning(true);

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;

    if (!token) {
      toast.error("Not authenticated");
      setRunning(false);
      return;
    }

    const resp = await fetch(
      `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/trigger-analysis`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ siteIdentifier: siteId }),
      }
    );

    const json = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const msg =
        (json as { error?: string; details?: string })?.error ||
        (json as { message?: string })?.message ||
        "Failed to run analysis";
      toast.error(msg);
      setRunning(false);
      return;
    }

    // Guardar job_id e aguardar callback via Realtime
    const responseJobId = (json as { job_id?: string }).job_id;
    
    if (responseJobId) {
      setJobId(responseJobId);
      toast.info(`Analysis started for ${(json as { readyCount?: number }).readyCount || 0} variables. Processing...`);
    } else {
      // Fallback se não retornar job_id (compatibilidade)
      toast.success(
        `Analysis triggered: ${(json as { updated?: number }).updated ?? 0} variables updated`
      );
      setRunning(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={run}
      disabled={running}
      className="border-purple-200 hover:bg-purple-50"
    >
      {running ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin text-purple-600" />
          Running...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
          Run AI Analysis
        </>
      )}
    </Button>
  );
}