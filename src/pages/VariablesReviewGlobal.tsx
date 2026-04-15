import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useVariablesNeedingReview } from '@/hooks/useVariablesNeedingReview';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DiscoveredVariable, DataType } from '@/types/discovery';
import { VariableReviewCard } from '@/components/variables/VariableReviewCard';
import { VariableEditDialog } from '@/components/variables/VariableEditDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw, Search, Sparkles, CheckCircle, HelpCircle, Lightbulb, Upload, Filter, X, Building2, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

type LearningState = 'unknown' | 'hypothesis' | 'confirmed' | 'published';

const asDataTypeOrNull = (value: string | null): DataType | null => {
  if (!value) return null;
  const allowed: DataType[] = ['uint16', 'int16', 'uint32be', 'int32be', 'uint32le', 'int32le', 'float32be', 'float32le', 'uint64be', 'int64be', 'uint64le', 'int64le', 'float64be', 'float64le'];
  return allowed.includes(value as DataType) ? (value as DataType) : null;
};

const VariablesReviewGlobal = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { bySite, refresh: refreshCounts } = useVariablesNeedingReview();

  const [variables, setVariables] = useState<DiscoveredVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('needs_review');
  const [aiFilter, setAiFilter] = useState<string>('all');

  const [editing, setEditing] = useState<DiscoveredVariable | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    const siteParam = searchParams.get('site');
    if (siteParam) setSelectedSiteId(siteParam);
  }, [searchParams]);

  const loadVariables = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('discovered_variables')
      .select('*')
      .order('site_identifier', { ascending: true })
      .order('source_ip', { ascending: true })
      .order('address', { ascending: true });

    if (selectedSiteId !== 'all') q = q.eq('site_identifier', selectedSiteId);

    const { data, error } = await q;
    if (error) { toast.error('Failed to load variables'); setLoading(false); return; }
    setVariables((data || []) as DiscoveredVariable[]);
    setLoading(false);
  }, [selectedSiteId]);

  useEffect(() => { loadVariables(); }, [loadVariables]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadVariables(), refreshCounts()]);
    setRefreshing(false);
  };

  const handleSiteChange = (value: string) => {
    setSelectedSiteId(value);
    if (value === 'all') searchParams.delete('site');
    else searchParams.set('site', value);
    setSearchParams(searchParams);
  };

  const filtered = variables.filter((v) => {
    const state = (v.learning_state || 'unknown') as LearningState;
    if (stateFilter === 'needs_review') {
      if (!v.ai_suggested_type || state === 'confirmed' || state === 'published') return false;
    } else if (stateFilter !== 'all' && state !== stateFilter) return false;
    if (aiFilter === 'with_ai' && !v.ai_suggested_type) return false;
    if (aiFilter === 'no_ai' && v.ai_suggested_type) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!v.source_ip?.toLowerCase().includes(q) && !String(v.address).includes(q) &&
          !(v.semantic_label || '').toLowerCase().includes(q) && !(v.winner || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = {
    all: variables.length,
    withAi: variables.filter(v => Boolean(v.ai_suggested_type)).length,
    needsReview: variables.filter(v => {
      const st = (v.learning_state || 'unknown') as LearningState;
      return Boolean(v.ai_suggested_type) && st !== 'confirmed' && st !== 'published';
    }).length,
    byState: {
      unknown: variables.filter(v => (v.learning_state || 'unknown') === 'unknown').length,
      hypothesis: variables.filter(v => v.learning_state === 'hypothesis').length,
      confirmed: variables.filter(v => v.learning_state === 'confirmed').length,
      published: variables.filter(v => v.learning_state === 'published').length,
    },
  };

  const confirmAI = async (v: DiscoveredVariable) => {
    const aiType = asDataTypeOrNull(v.ai_suggested_type);
    if (!aiType || !user) { toast.error('No valid AI suggestion'); return; }
    setConfirmingId(v.id);
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('discovered_variables').update({
      data_type: aiType, confidence_score: v.ai_confidence ?? 0,
      learning_state: 'confirmed', confirmed_by: user.id, confirmed_at: nowIso, updated_at: nowIso,
    }).eq('id', v.id);
    if (error) { toast.error('Failed to confirm: ' + error.message); setConfirmingId(null); return; }
    setVariables(prev => prev.map(x => x.id === v.id ? { ...x, data_type: aiType as DataType, learning_state: 'confirmed' as const, confirmed_by: user.id, confirmed_at: nowIso, updated_at: nowIso } : x));
    toast.success('Variable confirmed');
    setConfirmingId(null);
    refreshCounts();
  };

  const openEdit = (v: DiscoveredVariable) => { setEditing(v); setEditOpen(true); };

  const saveEdit = async (data: { data_type: string; semantic_label: string | null; semantic_unit: string | null; semantic_category: string | null }) => {
    if (!editing || !user) return;
    const dt = asDataTypeOrNull(data.data_type);
    if (!dt) { toast.error('Invalid data type'); return; }
    setSavingEdit(true);
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('discovered_variables').update({
      data_type: dt, semantic_label: data.semantic_label, semantic_unit: data.semantic_unit,
      semantic_category: data.semantic_category, learning_state: 'confirmed',
      confidence_score: Math.max(editing.confidence_score ?? 0, 0.95),
      confirmed_by: user.id, confirmed_at: nowIso, updated_at: nowIso,
    }).eq('id', editing.id);
    if (error) { toast.error('Failed to save: ' + error.message); setSavingEdit(false); return; }
    setVariables(prev => prev.map(x => x.id === editing.id ? { ...x, data_type: dt as DataType, semantic_label: data.semantic_label, semantic_unit: data.semantic_unit, semantic_category: data.semantic_category, learning_state: 'confirmed' as const, confirmed_by: user.id, confirmed_at: nowIso, updated_at: nowIso } : x));
    toast.success('Saved & confirmed');
    setSavingEdit(false);
    setEditOpen(false);
    refreshCounts();
  };

  const hasActiveFilters = query || stateFilter !== 'needs_review' || aiFilter !== 'all';
  const clearFilters = () => { setQuery(''); setStateFilter('needs_review'); setAiFilter('all'); };

  return (
    <MainLayout>
      <div className="p-6 sm:p-8">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a2744]">Variables Review</h1>
              <p className="text-muted-foreground mt-1">Review and confirm AI suggestions across all sites</p>
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Variables</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{counts.all}</div></CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm text-muted-foreground">With AI Analysis</CardTitle>
              <Sparkles className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent><div className="text-3xl font-bold text-purple-700">{counts.withAi}</div></CardContent>
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
        </div>

        {/* Sites needing review */}
        {selectedSiteId === 'all' && bySite.length > 0 && (
          <Card className="mb-6 border-purple-200 bg-purple-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <Sparkles className="h-5 w-5" />Sites Needing Review
              </CardTitle>
              <CardDescription className="text-purple-700">
                {bySite.length} site{bySite.length !== 1 ? 's have' : ' has'} variables with AI suggestions pending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {bySite.slice(0, 6).map(site => (
                  <button key={site.siteIdentifier} onClick={() => handleSiteChange(site.siteIdentifier)}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-400 hover:shadow-md transition-all text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <Building2 className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{site.siteName}</div>
                        <div className="text-xs text-muted-foreground">{site.count} variable{site.count !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <Badge className="bg-purple-500 text-white flex-shrink-0">{site.count}</Badge>
                  </button>
                ))}
              </div>
              {bySite.length > 6 && <p className="text-xs text-purple-700 mt-3 text-center">+{bySite.length - 6} more sites</p>}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" />Filters</CardTitle>
              {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" />Clear all</Button>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Site</label>
                <Select value={selectedSiteId} onValueChange={handleSiteChange}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sites ({bySite.length})</SelectItem>
                    {bySite.map(site => (
                      <SelectItem key={site.siteIdentifier} value={site.siteIdentifier}>
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{site.siteName}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">{site.count}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="IP, address, label..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10 h-9" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Learning State</label>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="needs_review"><div className="flex items-center gap-2"><Lightbulb className="h-3 w-3 text-amber-600" />Needs Review ({counts.needsReview})</div></SelectItem>
                    <SelectItem value="all">All States</SelectItem>
                    <SelectItem value="unknown"><div className="flex items-center gap-2"><HelpCircle className="h-3 w-3" />Unknown ({counts.byState.unknown})</div></SelectItem>
                    <SelectItem value="hypothesis"><div className="flex items-center gap-2"><Lightbulb className="h-3 w-3" />Hypothesis ({counts.byState.hypothesis})</div></SelectItem>
                    <SelectItem value="confirmed"><div className="flex items-center gap-2"><CheckCircle className="h-3 w-3" />Confirmed ({counts.byState.confirmed})</div></SelectItem>
                    <SelectItem value="published"><div className="flex items-center gap-2"><Upload className="h-3 w-3" />Published ({counts.byState.published})</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">AI Status</label>
                <Select value={aiFilter} onValueChange={setAiFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Variables</SelectItem>
                    <SelectItem value="with_ai"><div className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-purple-600" />With AI ({counts.withAi})</div></SelectItem>
                    <SelectItem value="no_ai">Without AI ({counts.all - counts.withAi})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <span>Showing {filtered.length} of {counts.all} variables{hasActiveFilters && ' (filtered)'}</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading variables...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              {hasActiveFilters ? (
                <><Filter className="h-12 w-12 mx-auto mb-4 opacity-50" /><p className="font-medium mb-2">No variables match the current filters</p><Button variant="outline" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-2" />Clear filters</Button></>
              ) : counts.needsReview === 0 ? (
                <><CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" /><p className="font-medium mb-2">All caught up!</p><p className="text-sm">No variables need review at the moment.</p></>
              ) : (
                <><Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No variables found</p></>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(v => (
              <VariableReviewCard key={v.id} variable={v} onEdit={() => openEdit(v)} onConfirmAI={() => confirmAI(v)} isConfirming={confirmingId === v.id} />
            ))}
          </div>
        )}

        <VariableEditDialog open={editOpen} onOpenChange={setEditOpen} variable={editing} onSave={saveEdit} isSaving={savingEdit} />
      </div>
    </MainLayout>
  );
};

export default VariablesReviewGlobal;