import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_PROJECT_ID = "jgclhfwigmxmqyhqngcm";

export function RunAnalysisButton({ siteId }: { siteId: string }) {
  const [running, setRunning] = useState(false);
  const navigate = useNavigate();

  const run = async () => {
    setRunning(true);

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;

    if (!token) {
      toast.error("Not authenticated");
      setRunning(false);
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
        setRunning(false);
        return;
      }

      // Success! Show results
      const variablesAnalyzed = (json as { variables_analyzed?: number }).variables_analyzed || 0;
      const suggestionsCount = (json as { suggestions_count?: number }).suggestions_count || 0;

      if (variablesAnalyzed === 0) {
        toast.info("No variables ready for analysis (need more samples)");
      } else {
        toast.success(
          `Analysis complete! ${suggestionsCount} suggestions for ${variablesAnalyzed} variables`
        );
        
        // Navigate to Historical Analysis tab
        setTimeout(() => {
          navigate(`/discovery/${siteId}?tab=historical`, { replace: true });
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      console.error('[RunAnalysisButton] Error:', error);
      toast.error("Failed to run analysis");
    }

    setRunning(false);
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