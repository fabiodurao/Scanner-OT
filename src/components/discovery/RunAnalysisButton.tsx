import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAnalysisJobs } from "@/contexts/AnalysisJobsContext";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SUPABASE_PROJECT_ID = "jgclhfwigmxmqyhqngcm";

export function RunAnalysisButton({ siteId }: { siteId: string }) {
  const { activeJobs } = useAnalysisJobs();
  const { settings } = useUserSettings();
  const [localRunning, setLocalRunning] = useState(false);
  const [totalSamples, setTotalSamples] = useState(0);
  const [variablesReady, setVariablesReady] = useState(0);
  const [totalVariables, setTotalVariables] = useState(0);
  const [loading, setLoading] = useState(true);

  const minSamples = settings.sample_threshold_for_analysis || 50;

  // Check if there's an active job for this site
  const isRunning = activeJobs.some(job => job.site_identifier === siteId) || localRunning;

  // Fetch ALL samples count for this site
  useEffect(() => {
    const fetchSampleCount = async () => {
      setLoading(true);
      
      // Count ALL samples for this site (not just ready ones)
      const { count: sampleCount, error: countError } = await supabase
        .from('learning_samples')
        .select('*', { count: 'exact', head: true })
        .eq('Identifier', siteId);

      if (!countError && sampleCount !== null) {
        setTotalSamples(sampleCount);
      }

      // Get variables ready for analysis (>= minSamples)
      const { data, error } = await supabase
        .rpc('get_variables_ready_for_analysis', {
          p_site_identifier: siteId,
          p_min_samples: minSamples,
        });

      if (!error && data) {
        setVariablesReady(data.length);
      }

      // Count total unique variables (for progress calculation)
      const { data: allVars, error: varsError } = await supabase
        .from('learning_samples')
        .select('SourceIp, DestinationIp, Address, FC')
        .eq('Identifier', siteId);

      if (!varsError && allVars) {
        const uniqueVars = new Set(
          allVars.map(v => `${v.SourceIp}-${v.DestinationIp}-${v.Address}-${v.FC}`)
        );
        setTotalVariables(uniqueVars.size);
      }
      
      setLoading(false);
    };

    fetchSampleCount();

    // Refresh every 10 seconds
    const interval = setInterval(fetchSampleCount, 10000);

    return () => clearInterval(interval);
  }, [siteId, minSamples]);

  const run = async () => {
    setLocalRunning(true);

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;

    if (!token) {
      toast.error("Not authenticated");
      setLocalRunning(false);
      return;
    }

    try {
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
        setLocalRunning(false);
        return;
      }

      const variablesCount = (json as { variables_count?: number }).variables_count || 0;

      setLocalRunning(false);

      if (variablesCount === 0) {
        toast.info("No variables ready for analysis (need more samples)");
      } else {
        toast.success(
          `Analysis started! Processing ${variablesCount} variables with ${totalSamples} total samples...`
        );
        
        setTimeout(() => {
          toast.info("You'll be notified when analysis completes", {
            duration: 3000,
          });
        }, 1000);
      }
    } catch (error) {
      console.error('[RunAnalysisButton] Error:', error);
      toast.error("Failed to run analysis");
      setLocalRunning(false);
    }
  };

  const isReady = variablesReady > 0;
  
  // Progress: how many samples we have vs how many we need
  // We need minSamples * totalVariables to have all variables ready
  const samplesNeeded = totalVariables * minSamples;
  const progressPercent = samplesNeeded > 0 
    ? Math.min(100, (totalSamples / samplesNeeded) * 100)
    : 0;

  if (loading) {
    return (
      <Button variant="outline" disabled className="relative overflow-hidden min-w-[220px]">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={run}
      disabled={!isReady || isRunning}
      className={cn(
        "relative overflow-hidden min-w-[220px] transition-all",
        !isReady && "text-muted-foreground border-slate-200 bg-slate-50",
        isReady && !isRunning && "border-purple-300 hover:bg-purple-50 text-purple-700 font-medium",
        isRunning && "border-purple-400 bg-purple-50"
      )}
    >
      {/* Progress bar background */}
      <div 
        className={cn(
          "absolute inset-0 transition-all duration-500",
          isReady ? "bg-purple-200" : "bg-slate-200"
        )}
        style={{ 
          width: `${progressPercent}%`,
          opacity: 0.4,
        }}
      />
      
      {/* Button content */}
      <div className="relative z-10 flex items-center">
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Run AI Analysis
            <span className="ml-2 text-xs font-normal">
              ({totalSamples.toLocaleString()} samples)
            </span>
          </>
        )}
      </div>
    </Button>
  );
}