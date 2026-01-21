import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DataType, DiscoveredVariable } from "@/types/discovery";
import { VariableReviewCard } from "@/components/variables/VariableReviewCard";
import { VariableEditDialog } from "@/components/variables/VariableEditDialog";
import { HistoricalHeatmapTable } from "@/components/variables/HistoricalHeatmapTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  RefreshCw,
  Search,
  Sparkles,
  CheckCircle,
  HelpCircle,
  Grid3x3,
  LayoutGrid,
  Lightbulb,
  Upload,
  Filter,
  X,
} from "lucide-react";
import { toast } from "sonner";

type LearningState = "unknown" | "hypothesis" | "confirmed" | "published";

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

  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [ipFilter, setIpFilter] = useState<string>("all");
  const [aiFilter, setAiFilter] = useState<string>("all");

  const [editing, setEditing] = useState<DiscoveredVariable | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

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

  const ipOptions = useMemo(() => {
    const ips = new Set<string>();
    for (const v of variables) if (v.source_ip) ips.add(v.source_ip);
    return Array.from(ips).sort();
  }, [variables]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return variables.filter((v) => {
      const state = (v.learning_state || "unknown") as LearningState;

      if (stateFilter !== "all" && state !== stateFilter) return false;
      if (ipFilter !== "all" && v.source_ip !== ipFilter) return false;

      if (aiFilter === "with_ai" && !v.ai_suggested_type) return false;
      if (aiFilter === "needs_review" && (!v.ai_suggested_type || state === "confirmed" || state === "published")) return false;
      if (aiFilter === "no_ai" && v.ai_suggested_type) return false;

      if (q) {
        const matchesIp = v.source_ip?.toLowerCase().includes(q);
        const matchesAddr = String(v.address).includes(q);
        const matchesLabel = (v.semantic_label || "").toLowerCase().includes(q);
        const matchesWinner = (v.winner || "").toLowerCase().includes(q);
        if (!matchesIp && !matchesAddr && !matchesLabel && !matchesWinner) return false;
      }

      return true;
    });
  }, [variables, query, stateFilter, ipFilter, aiFilter]);

  const counts = useMemo(() => {
    const all = variables.length;
    const withAi = variables.filter((v) => Boolean(v.ai_suggested_type)).length;
    const withHistory = variables.filter((v) => v.winner !== null).length;
    const needsReview = variables.filter((v) => {
      const st = (v.learning_state || "unknown") as LearningState;
      return Boolean(v.ai_suggested_type) && st !== "confirmed" && st !== "published";
    }).length;
    
    const byState = {
      unknown: variables.filter(v => (v.learning_state || "unknown") === "unknown").length,
      hypothesis: variables.filter(v => v.learning_state === "hypothesis").length,
      confirmed: variables.filter(v => v.learning_state === "confirmed").length,
      published: variables.filter(v => v.learning_state === "published").length,
    };
    
    return { all, withAi, withHistory, needsReview, byState };
  }, [variables]);

  const confirmAI = async (v: DiscoveredVariable) => {
    const aiType = asDataTypeOrNull(v.ai_suggested_type);
    if (!aiType) {
      toast.error("No valid AI suggestion to confirm");
      return;
    }
    if (!user) {
      toast.error("Not authenticated");
      return;
    }

    const nowIso = new Date().toISOString();

    setConfirmingId(v.id);
    const { error } = await supabase
      .from("discovered_variables")
      .update({
        data_type: aiType,
        confidence_score: v.ai_confidence ?? 0,
        learning_state: "confirmed",
        confirmed_by: user.id,
        confirmed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", v.id);

    if (error) {
      toast.error("Failed to confirm: " + error.message);
      setConfirmingId(null);
      return;
    }

    setVariables((prev) =>
      prev.map((x) =>
        x.id === v.id
          ? {
              ...x,
              data_type: aiType,
              confidence_score: v.ai_confidence ?? x.confidence_score,
              learning_state: "confirmed",
              confirmed_by: user.id,
              confirmed_at: nowIso,
              updated_at: nowIso,
            }
          : x,
      ),
    );

    toast.success("Variable confirmed");
    setConfirmingId(null);
  };

  const openEdit = (v: DiscoveredVariable) => {
    setEditing(v);
    setEditOpen(true);
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
      toast.error("Invalid data type");
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
              data_type: dt,
              semantic_label: data.semantic_label,
              semantic_unit: data.semantic_unit,
              semantic_category: data.semantic_category,
              learning_state: "confirmed",
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

  const hasActiveFilters = query || stateFilter !== "all" || ipFilter !== "all" || aiFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setStateFilter("all");
    setIpFilter("all");
    setAiFilter("all");
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
                Variables Review
              </h1>
              <p className="text-muted-foreground mt-1">
                Review and confirm AI suggestions for discovered variables
              </p>
            </div>

            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{counts.all}</div>
            </CardContent>
          </Card>
          
          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm text-muted-foreground">With AI Analysis</CardTitle>
              <Sparkles className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700">{counts.withAi}</div>
              <p className="text-xs text-purple-600 mt-1">
                {counts.withHistory} with historical data
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm text-muted-foreground">Needs Review</CardTitle>
              <Lightbulb className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-700">{counts.needsReview}</div>
              <p className="text-xs text-amber-600 mt-1">AI suggestions pending</p>
            </CardContent>
          </Card>
          
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm text-muted-foreground">Confirmed</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-700">{counts.byState.confirmed}</div>
              <p className="text-xs text-emerald-600 mt-1">
                {counts.all > 0 ? Math.round((counts.byState.confirmed / counts.all) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm text-muted-foreground">Unknown</CardTitle>
              <HelpCircle className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-600">{counts.byState.unknown}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="cards" className="space-y-4">
          <TabsList>
            <TabsTrigger value="cards">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Cards View
              {counts.needsReview > 0 && (
                <Badge className="ml-2 bg-amber-500 text-white">{counts.needsReview}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="heatmap">
              <Grid3x3 className="h-4 w-4 mr-2" />
              Historical Heatmap
              {counts.withHistory > 0 && (
                <Badge variant="secondary" className="ml-2">{counts.withHistory}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="space-y-4">
            {/* Filters Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                  </CardTitle>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Clear all
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="IP, address, label..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-10 h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Equipment IP</label>
                    <Select value={ipFilter} onValueChange={setIpFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All IPs ({ipOptions.length})</SelectItem>
                        {ipOptions.map((ip) => (
                          <SelectItem key={ip} value={ip}>
                            <span className="font-mono">{ip}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Learning State</label>
                    <Select value={stateFilter} onValueChange={setStateFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All States</SelectItem>
                        <SelectItem value="unknown">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="h-3 w-3" />
                            Unknown ({counts.byState.unknown})
                          </div>
                        </SelectItem>
                        <SelectItem value="hypothesis">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="h-3 w-3" />
                            Hypothesis ({counts.byState.hypothesis})
                          </div>
                        </SelectItem>
                        <SelectItem value="confirmed">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3" />
                            Confirmed ({counts.byState.confirmed})
                          </div>
                        </SelectItem>
                        <SelectItem value="published">
                          <div className="flex items-center gap-2">
                            <Upload className="h-3 w-3" />
                            Published ({counts.byState.published})
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">AI Status</label>
                    <Select value={aiFilter} onValueChange={setAiFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Variables</SelectItem>
                        <SelectItem value="with_ai">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-purple-600" />
                            With AI ({counts.withAi})
                          </div>
                        </SelectItem>
                        <SelectItem value="needs_review">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="h-3 w-3 text-amber-600" />
                            Needs Review ({counts.needsReview})
                          </div>
                        </SelectItem>
                        <SelectItem value="no_ai">Without AI ({counts.all - counts.withAi})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>
                Showing {filtered.length} of {counts.all} variables
                {hasActiveFilters && " (filtered)"}
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-muted-foreground">
                <div className="inline-flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading variables...
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  {hasActiveFilters ? (
                    <>
                      <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium mb-2">No variables match the current filters</p>
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-2" />
                        Clear filters
                      </Button>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No variables found for this site</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((v) => (
                  <VariableReviewCard
                    key={v.id}
                    variable={v}
                    onEdit={() => openEdit(v)}
                    onConfirmAI={() => confirmAI(v)}
                    isConfirming={confirmingId === v.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="heatmap" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historical Analysis Heatmap</CardTitle>
                <CardDescription>
                  Detailed statistical analysis across all data types with AI winner selection
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
          </TabsContent>
        </Tabs>

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