import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_PROJECT_ID = "jgclhfwigmxmqyhqngcm";

export function RunAnalysisButton({ siteId }: { siteId: string }) {
  const [running, setRunning] = useState(false);

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
      },
    );

    const json = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      toast.error(json?.error ? String(json.error) : "Failed to run analysis");
      setRunning(false);
      return;
    }

    toast.success(
      `Analysis triggered: ${json.updated ?? 0} variables updated (${json.suggestionCount ?? 0} suggestions)`,
    );
    setRunning(false);
  };

  return (
    <Button
      variant="outline"
      onClick={run}
      disabled={running}
      className="border-purple-200 hover:bg-purple-50"
    >
      <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
      {running ? "Running..." : "Run AI Analysis"}
    </Button>
  );
}