import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DataType, DiscoveredVariable } from "@/types/discovery";
import { VariableReviewCard } from "@/components/variables/VariableReviewCard";
import { VariableEditDialog } from "@/components/variables/VariableEditDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const [aiOnly, setAiOnly] = useState<string>("all"); // all | ai | needs_review

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
      toast.error("Erro ao carregar variáveis");
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

      if (aiOnly === "ai" && !v.ai_suggested_type) return false;
      if (
        aiOnly === "needs_review" &&
        (!v.ai_suggested_type || state === "confirmed" || state === "published")
      )
        return false;

      if (q) {
        const matchesIp = v.source_ip?.toLowerCase().includes(q);
        const matchesAddr = String(v.address).includes(q);
        const matchesLabel = (v.semantic_label || "").toLowerCase().includes(q);
        if (!matchesIp && !matchesAddr && !matchesLabel) return false;
      }

      return true;
    });
  }, [variables, query, stateFilter, ipFilter, aiOnly]);

  const counts = useMemo(() => {
    const all = variables.length;
    const withAi = variables.filter((v) => Boolean(v.ai_suggested_type)).length;
    const needsReview = variables.filter((v) => {
      const st = (v.learning_state || "unknown") as LearningState;
      return Boolean(v.ai_suggested_type) && st !== "confirmed" && st !== "published";
    }).length;
    const confirmed = variables.filter((v) => (v.learning_state || "unknown") === "confirmed").length;
    return { all, withAi, needsReview, confirmed };
  }, [variables]);

  const confirmAI = async (v: DiscoveredVariable) => {
    const aiType = asDataTypeOrNull(v.ai_suggested_type);
    if (!aiType) {
      toast.error("Sem sugestão de IA válida para confirmar");
      return;
    }
    if (!user) {
      toast.error("Não autenticado");
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
      toast.error("Erro ao confirmar: " + error.message);
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

    toast.success("Variável confirmada!");
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
      toast.error("Tipo de dado inválido");
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
      toast.error("Erro ao salvar: " + error.message);
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

    toast.success("Salvo e confirmado!");
    setSavingEdit(false);
    setEditOpen(false);
  };

  return (
    <MainLayout>
      <div className="p-6 sm:p-8">
        <div className="mb-6">
          <Link
            to={`/discovery/${siteId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar para Discovery
          </Link>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a2744]">
                Variables Review
              </h1>
              <p className="text-muted-foreground mt-1">
                Revise e confirme tipos (IA ou manual) para o site{" "}
                <span className="font-mono">{siteId}</span>
              </p>
            </div>

            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{counts.all}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Com IA</CardTitle>
              <Sparkles className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent className="text-2xl font-bold">{counts.withAi}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Precisa revisão</CardTitle>
              <HelpCircle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent className="text-2xl font-bold text-amber-700">
              {counts.needsReview}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Confirmadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="text-2xl font-bold text-emerald-700">
              {counts.confirmed}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por IP, address ou label..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={ipFilter} onValueChange={setIpFilter}>
                <SelectTrigger className="w-full lg:w-56">
                  <SelectValue placeholder="Equipment IP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All IPs</SelectItem>
                  {ipOptions.map((ip) => (
                    <SelectItem key={ip} value={ip}>
                      {ip}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-full lg:w-56">
                  <SelectValue placeholder="Learning state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="hypothesis">Hypothesis</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>

              <Select value={aiOnly} onValueChange={setAiOnly}>
                <SelectTrigger className="w-full lg:w-56">
                  <SelectValue placeholder="AI filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ai">Only with AI</SelectItem>
                  <SelectItem value="needs_review">AI needs review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma variável encontrada com os filtros atuais.
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