import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DataType, DiscoveredVariable } from "@/types/discovery";
import { VariableEditDialog } from "@/components/variables/VariableEditDialog";
import { HistoricalHeatmapTable } from "@/components/variables/HistoricalHeatmapTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  RefreshCw,
  Grid3x3,
} from "lucide-react";
import { toast } from "sonner";

const asDataTypeOrNull = (value: string | null): DataType | null => {
  if (!value) return null;

  const allowed: ReadonlyArray<DataType> = [
    "uint16",
    "int16",
    "uint32be",
    "int32be",
    "uint32le",
    "int32le",
    "float32be",
    "float32le",
    "uint64be",
    "int64be",
    "uint64le",
    "int64le",
    "float64be",
    "float64le",
  ];

  return (allowed as ReadonlyArray<string>).includes(value) ? (value as DataType) : null;
};

export default function VariablesReview() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user } = useAuth();

  const [variables, setVariables] = useState<DiscoveredVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [editing, setEditing] = useState<DiscoveredVariable | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

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

  const saveEdit = async (data: {
    data_type: string;
    semantic_label: string | null;
    semantic_unit: string | null;
    semantic_category: string | null;
  }) => {
    if (!editing || !user) return;

    const dt = asDataTypeOrNull(data.data_type);
    if (!dt) {
      toast.error('Invalid data type');
      return;
    }

    setSavingEdit(true);

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("discovered_variables")
      .update({
        data_type: dt,
        semantic_label: data.semantic_label,
        semantic_unit: data.semantic_unit,
        semantic_category: data.semantic_category,
        learning_state: "confirmed",
        confidence_score: Math.max(editing.confidence_score ?? 0, 0.95),
        confirmed_by: user.id,
        confirmed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", editing.id);

    if (error) {
      toast.error("Failed to save: " + error.message);
      setSavingEdit(false);
      return;
    }

    setVariables((prev) =>
      prev.map((x) =>
        x.id === editing.id
          ? {
              ...x,
              data_type: dt as DataType,
              semantic_label: data.semantic_label,
              semantic_unit: data.semantic_unit,
              semantic_category: data.semantic_category,
              learning_state: "confirmed" as const,
              confirmed_by: user.id,
              confirmed_at: nowIso,
              updated_at: nowIso,
              confidence_score: Math.max(x.confidence_score ?? 0, 0.95),
            }
          : x,
      ),
    );

    toast.success("Saved & confirmed");
    setSavingEdit(false);
    setEditOpen(false);
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
              Historical Heatmap
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

        <VariableEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          variable={editing}
          onSave={saveEdit}
          isSaving={savingEdit}
        />
      </div>
    </MainLayout>
  );
}