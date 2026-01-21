import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { DiscoveredVariable } from "@/types/discovery";
import { HistoricalHeatmapTable } from "@/components/variables/HistoricalHeatmapTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  RefreshCw,
  Grid3x3,
} from "lucide-react";
import { toast } from "sonner";

export default function VariablesReview() {
  const { siteId } = useParams<{ siteId: string }>();

  const [variables, setVariables] = useState<DiscoveredVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("discovered_variables")
      .select("*")
      .eq("site_identifier", siteId)
      .order("source_ip", { ascending: true })
      .order("address", { ascending: true });

    if (error) {
      toast.error("Failed to load variables");
      setLoading(false);
      return;
    }

    setVariables((data || []) as DiscoveredVariable[]);
    setLoading(false);
  }, [siteId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <MainLayout>
      <div className="p-6 sm:p-8">
        <div className="mb-6">
          <Link
            to={`/discovery/${siteId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-slate-900 mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Discovery
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a2744]">
                Historical Analysis
              </h1>
              <p className="text-muted-foreground mt-1">
                Detailed statistical analysis across all data types with AI winner selection
              </p>
            </div>

            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3x3 className="h-5 w-5" />
              Historical Analysis
            </CardTitle>
            <CardDescription>
              Statistical analysis and AI-selected winner for each variable
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">
                <div className="inline-flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading...
                </div>
              </div>
            ) : (
              <HistoricalHeatmapTable variables={variables} />
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}