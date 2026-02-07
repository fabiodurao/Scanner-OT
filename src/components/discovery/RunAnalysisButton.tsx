import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAnalysisJobs } from "@/contexts/AnalysisJobsContext";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Button } from "@/components/ui/button";
import { TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SUPABASE_PROJECT_ID = "jgclhfwigmxmqyhqngcm";

export function RunAnalysisButton({ siteId }: { siteId: string }) {
  const { activeJobs } = useAnalysisJobs();
  const { settings } = useUserSettings();
  const [localRunning, setLocalRunning] = useState(false);
  const [maxSampleCount, setMaxSampleCount] = useState(0);
  const [variablesReady, setVariablesReady] = useState(0);
  const [loading, setLoading] = useState(true);

  const minSamples = settings.sample_threshold_for_analysis || 50;

  const isRunning = activeJobs.some(job => job.site_identifier === siteId) || localRunning;

  useEffect(() => {
    const fetchReadyCount = async () => {
      setLoading(true);
      
      // First, get the max sample count from ALL variables (for display)
      const { data: allVarsData, error: allVarsError } = await supabase
        .from('learning_samples')
        .select('SourceIp, DestinationIp, Address, FC')
        .eq('Identifier', siteId)
        .not('SourceIp', 'is', null)
        .not('Address', 'is', null);
      
      if (!allVarsError && allVarsData) {
        // Group by variable key and count samples
        const varCounts = new Map<string, number>();
        allVarsData.forEach(sample => {
          const key = `${sample.SourceIp}-${sample.DestinationIp}-${sample.Address}-${sample.FC}`;
          varCounts.set(key, (varCounts.get(key) || 0) + 1);
        });
        
        // Get max count
        const maxCount = varCounts.size > 0 ? Math.max(...Array.from(varCounts.values())) : 0;
        setMaxSampleCount(maxCount);
        
        console.log('[RunAnalysisButton] Max sample count across all variables:', maxCount);
      }
      
      // Then, get variables ready for analysis (>= minSamples)
      const { data, error } = await supabase
        .rpc('get_variables_ready_for_analysis', {
          p_site_identifier: siteId,
          p_min_samples: minSamples,
        });

      if (!error && data) {
        setVariablesReady(data.length);
        console.log('[RunAnalysisButton] Variables ready for analysis:', data.length);
      } else {
        console.error('[RunAnalysisButton] Error fetching ready variables:', error);
        setVariablesReady(0);
      }
      
      setLoading(false);
    };

    fetchReadyCount();

    // Refresh every 10 seconds
    const interval = setInterval(fetchReadyCount, 10000);

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
          `Historical analysis started! Processing ${variablesCount} variables...`
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

  if (loading) {
    return (
      <Button variant="outline" disabled className="relative overflow-hidden min-w-[140px] sm:min-w-[240px]">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        <span className="hidden sm:inline">Loading...</span>
        <span className="sm:hidden">...</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={run}
      disabled={!isReady || isRunning}
      className={cn(
        "relative overflow-hidden min-w-[140px] sm:min-w-[240px] transition-all",
        !isReady && "text-muted-foreground border-slate-200 bg-slate-50",
        isReady && !isRunning && "border-purple-300 hover:bg-purple-50 text-purple-700 font-medium",
        isRunning && "border-purple-400 bg-purple-50"
      )}
    >
      {isRunning ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span className="hidden sm:inline">Running...</span>
          <span className="sm:hidden">Running...</span>
        </>
      ) : (
        <>
          <TrendingUp className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Historical Analysis</span>
          <span className="sm:hidden">Analysis</span>
          <span className="ml-1 sm:ml-2 text-xs font-normal">
            ({maxSampleCount}/{minSamples})
          </span>
        </>
      )}
    </Button>
  );
}