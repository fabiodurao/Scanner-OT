import { useState, useMemo } from 'react';
import { DiscoveredVariable } from '@/types/discovery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VariableHistoryDialog } from './VariableHistoryDialog';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SlidersHorizontal, X, Maximize2, Minimize2, CheckCircle, HelpCircle, Lightbulb, Upload, Pencil, Loader2, Undo, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface HistoricalHeatmapTableProps {
  variables: DiscoveredVariable[];
  onVariableUpdated?: () => void;
}

interface ColumnFilters {
  sourceIp: string;
  address: string;
  fc: string;
  winner: string;
  learningState: string;
}

const emptyFilters: ColumnFilters = {
  sourceIp: '',
  address: '',
  fc: '',
  winner: '',
  learningState: '',
};

const dataTypeColumns = [
  { key: 'UINT16', scoreKey: 'historical_scores_uint16', label: 'UINT16' },
  { key: 'INT16', scoreKey: 'historical_scores_int16', label: 'INT16' },
  { key: 'UINT32BE', scoreKey: 'historical_scores_uint32be', label: 'UINT32BE' },
  { key: 'UINT32LE', scoreKey: 'historical_scores_uint32le', label: 'UINT32LE' },
  { key: 'INT32BE', scoreKey: 'historical_scores_int32be', label: 'INT32BE' },
  { key: 'INT32LE', scoreKey: 'historical_scores_int32le', label: 'INT32LE' },
  { key: 'FLOAT32BE', scoreKey: 'historical_scores_float32be', label: 'FLOAT32BE' },
  { key: 'FLOAT32LE', scoreKey: 'historical_scores_float32le', label: 'FLOAT32LE' },
  { key: 'UINT64BE', scoreKey: 'historical_scores_uint64be', label: 'UINT64BE' },
  { key: 'UINT64LE', scoreKey: 'historical_scores_uint64le', label: 'UINT64LE' },
  { key: 'INT64BE', scoreKey: 'historical_scores_int64be', label: 'INT64BE' },
  { key: 'INT64LE', scoreKey: 'historical_scores_int64le', label: 'INT64LE' },
  { key: 'FLOAT64BE', scoreKey: 'historical_scores_float64be', label: 'FLOAT64BE' },
  { key: 'FLOAT64LE', scoreKey: 'historical_scores_float64le', label: 'FLOAT64LE' },
] as const;

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500, 1000];

const learningStateConfig = {
  unknown: { label: 'Unknown', icon: HelpCircle, color: 'bg-slate-100 text-slate-700' },
  hypothesis: { label: 'Hypothesis', icon: Lightbulb, color: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700' },
  published: { label: 'Published', icon: Upload, color: 'bg-blue-100 text-blue-700' },
};

const getScoreColor = (score: number | null): string => {
  if (score === null || score === undefined) return 'bg-gray-100 text-gray-400';
  const s = Math.min(1, Math.max(0, score));
  if (s >= 0.95) return 'bg-[#00B050] text-white';
  if (s >= 0.90) return 'bg-[#17B169] text-white';
  if (s >= 0.85) return 'bg-[#2DC97A] text-white';
  if (s >= 0.80) return 'bg-[#5DD55D] text-black';
  if (s >= 0.75) return 'bg-[#8DE28D] text-black';
  if (s >= 0.70) return 'bg-[#B5E61D] text-black';
  if (s >= 0.65) return 'bg-[#D4ED26] text-black';
  if (s >= 0.60) return 'bg-[#FFFF00] text-black';
  if (s >= 0.55) return 'bg-[#FFE135] text-black';
  if (s >= 0.50) return 'bg-[#FFC000] text-black';
  if (s >= 0.45) return 'bg-[#FFA500] text-black';
  if (s >= 0.40) return 'bg-[#FF8C00] text-black';
  if (s >= 0.35) return 'bg-[#FF7518] text-white';
  if (s >= 0.30) return 'bg-[#FF5722] text-white';
  if (s >= 0.25) return 'bg-[#FF4500] text-white';
  if (s >= 0.20) return 'bg-[#FF3300] text-white';
  if (s >= 0.15) return 'bg-[#FF1A1A] text-white';
  if (s >= 0.10) return 'bg-[#FF0000] text-white';
  if (s >= 0.05) return 'bg-[#E60000] text-white';
  if (s > 0) return 'bg-[#CC0000] text-white';
  return 'bg-gray-100 text-gray-400';
};

const formatNumber = (value: number, decimals = 3): string =>
  value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const formatScale = (scale: number): string => {
  if (scale === 1) return '1.0';
  if (scale % 1 !== 0) return scale.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 3 });
  return scale.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

const formatValue = (value: number | null, type: string): string => {
  if (value === null || value === undefined) return '-';
  if (type.includes('FLOAT')) {
    if (!isFinite(value) || Math.abs(value) > 1e15) return 'Invalid';
    if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(2);
    return formatNumber(value, 3);
  }
  return value.toLocaleString('en-US');
};

const formatScore = (score: number | null): string => {
  if (score === null || score === undefined) return '—';
  return Math.round(score * 100) + '%';
};

const FilterButton = ({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options?: string[];
}) => {
  const hasFilter = value.length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('h-5 w-5 p-0', hasFilter && 'text-blue-600')}>
          <SlidersHorizontal className={cn('h-3 w-3', hasFilter && 'text-blue-600')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <Input placeholder="Filter..." value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs" autoFocus />
          {options && options.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {options.filter(o => o.toLowerCase().includes(value.toLowerCase())).slice(0, 10).map(o => (
                <Button key={o} variant="ghost" size="sm" className="w-full justify-start h-7 text-xs font-mono" onClick={() => onChange(o)}>{o}</Button>
              ))}
            </div>
          )}
          {hasFilter && (
            <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-red-600" onClick={() => onChange('')}>
              <X className="h-3 w-3 mr-1" />Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const HistoricalHeatmapTable = ({ variables, onVariableUpdated }: HistoricalHeatmapTableProps) => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ColumnFilters>(emptyFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(200);
  const [isCompactView, setIsCompactView] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  // History dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyVariable, setHistoryVariable] = useState<DiscoveredVariable | null>(null);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<DiscoveredVariable | null>(null);
  const [editForm, setEditForm] = useState({ semantic_label: '', semantic_unit: '', semantic_category: '', data_type: '', scale: '1' });
  const [saving, setSaving] = useState(false);

  const uniqueValues = useMemo(() => ({
    sourceIps: [...new Set(variables.map(v => v.source_ip).filter(Boolean))].sort(),
    addresses: [...new Set(variables.map(v => v.address?.toString()).filter(Boolean))].sort((a, b) => parseInt(a) - parseInt(b)),
    fcs: [...new Set(variables.map(v => v.function_code?.toString()).filter(Boolean))].sort((a, b) => parseInt(a) - parseInt(b)),
    winners: [...new Set(variables.map(v => v.winner).filter((w): w is string => Boolean(w)))].sort(),
    learningStates: ['unknown', 'hypothesis', 'confirmed', 'published'],
  }), [variables]);

  const filteredVariables = useMemo(() => {
    return variables.filter(v => {
      if (filters.sourceIp && !v.source_ip?.toLowerCase().includes(filters.sourceIp.toLowerCase())) return false;
      if (filters.address && !v.address?.toString().includes(filters.address)) return false;
      if (filters.fc && v.function_code?.toString() !== filters.fc) return false;
      if (filters.winner && !v.winner?.toLowerCase().includes(filters.winner.toLowerCase())) return false;
      if (filters.learningState && v.learning_state !== filters.learningState) return false;
      return true;
    });
  }, [variables, filters]);

  const totalPages = Math.ceil(filteredVariables.length / pageSize);
  const paginatedVariables = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVariables.slice(start, start + pageSize);
  }, [filteredVariables, currentPage, pageSize]);

  useMemo(() => { setCurrentPage(1); }, [filters, pageSize]);

  const hasActiveFilters = Object.values(filters).some(f => f.length > 0);
  const clearAllFilters = () => { setFilters(emptyFilters); setCurrentPage(1); };
  const updateFilter = (key: keyof ColumnFilters, value: string) => { setFilters(prev => ({ ...prev, [key]: value })); setCurrentPage(1); };
  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const getSuggestedType = (v: DiscoveredVariable) => v.winner || v.ai_suggested_type;
  const getWinnerConfidence = (v: DiscoveredVariable) => {
    const winner = v.winner;
    if (!winner) return null;
    const scoreKey = `historical_scores_${winner.toLowerCase()}` as keyof DiscoveredVariable;
    return v[scoreKey] as number | null;
  };

  const getInterpretedValue = (v: DiscoveredVariable): string => {
    const winner = v.winner;
    if (!winner) return '-';
    const col = winner.toUpperCase();
    const rawValue = (v as any)[col] as number | null;
    if (rawValue === null || rawValue === undefined) return '-';
    const scale = (v as any).scale || 1;
    return formatValue(rawValue * scale, col);
  };

  const handleOpenHistory = (v: DiscoveredVariable) => {
    setHistoryVariable(v);
    setHistoryDialogOpen(true);
  };

  const handleConfirm = async (v: DiscoveredVariable) => {
    if (!v.winner || !user) return;
    setConfirmingId(v.id);
    const { error } = await supabase.from('discovered_variables').update({
      data_type: v.winner.toLowerCase(),
      learning_state: 'confirmed',
      confidence_score: getWinnerConfidence(v) || 0.95,
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', v.id);
    if (error) toast.error('Error confirming: ' + error.message);
    else { toast.success('Variable confirmed!'); onVariableUpdated?.(); }
    setConfirmingId(null);
  };

  const handleUndo = async (v: DiscoveredVariable) => {
    if (!user) return;
    setUndoingId(v.id);
    const { error } = await supabase.from('discovered_variables').update({
      learning_state: 'unknown', data_type: null, semantic_label: null,
      semantic_unit: null, semantic_category: null, confidence_score: 0,
      confirmed_by: null, confirmed_at: null, updated_at: new Date().toISOString(),
    }).eq('id', v.id);
    if (error) toast.error('Error undoing: ' + error.message);
    else { toast.success('Reset to unknown!'); onVariableUpdated?.(); }
    setUndoingId(null);
  };

  const handleOpenEdit = (v: DiscoveredVariable) => {
    setEditingVariable(v);
    const currentScale = (v as any).scale || 1;
    setEditForm({
      semantic_label: v.semantic_label || '',
      semantic_unit: v.semantic_unit || '',
      semantic_category: v.semantic_category || '',
      data_type: v.data_type || v.winner?.toLowerCase() || v.ai_suggested_type || '',
      scale: currentScale.toString().replace(',', '.'),
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingVariable || !user || !editForm.data_type) return;
    setSaving(true);
    const scale = parseFloat(editForm.scale.replace(',', '.')) || 1;
    const { error } = await supabase.from('discovered_variables').update({
      data_type: editForm.data_type.toLowerCase(),
      semantic_label: editForm.semantic_label.trim() || null,
      semantic_unit: editForm.semantic_unit.trim() || null,
      semantic_category: editForm.semantic_category.trim() || null,
      scale,
      learning_state: 'confirmed',
      confidence_score: Math.max(editingVariable.confidence_score || 0, 0.95),
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', editingVariable.id);
    if (error) toast.error('Error saving: ' + error.message);
    else { toast.success('Saved & confirmed!'); setEditDialogOpen(false); onVariableUpdated?.(); }
    setSaving(false);
  };

  const hasAnalysis = (v: DiscoveredVariable) => v.winner !== null || v.historical_scores_uint16 !== null;
  const visibleColumnCount = isCompactView ? 8 + dataTypeColumns.length : 11 + dataTypeColumns.length;

  if (variables.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
        <p>No variables discovered yet.</p>
        <p className="text-sm mt-2">Upload and process a PCAP file to start discovering variables.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend + controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <span className="text-muted-foreground">Score (after analysis):</span>
          {[['#00B050', 'High'], ['#B5E61D', 'Good'], ['#FFC000', 'Med'], ['#FF5722', 'Low'], ['#FF0000', 'Poor']].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
              <span>{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-100 border" />
            <span className="text-muted-foreground">No analysis yet</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearAllFilters} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" />Clear filters
            </Button>
          )}
          <Button variant={isCompactView ? 'default' : 'outline'} size="sm" onClick={() => setIsCompactView(!isCompactView)} className="h-7 text-xs">
            {isCompactView ? <><Maximize2 className="h-3 w-3 mr-1" />Full View</> : <><Minimize2 className="h-3 w-3 mr-1" />Compact</>}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{variables.length} total variables</span>
        <span>•</span>
        <span className="text-purple-600 font-medium">{variables.filter(hasAnalysis).length} with historical analysis</span>
        <span>•</span>
        <span className="text-slate-500">{variables.filter(v => !hasAnalysis(v)).length} awaiting analysis</span>
      </div>

      {/* Pagination top */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows:</span>
          <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
            <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(s => <SelectItem key={s} value={s.toString()}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {filteredVariables.length > 0
              ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredVariables.length)} of ${filteredVariables.length}`
              : '0 results'}
          </span>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => goToPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs px-1">{currentPage}/{totalPages || 1}</span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => goToPage(totalPages)} disabled={currentPage >= totalPages}><ChevronsRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
          <table className={cn('w-full', isCompactView ? 'min-w-[1700px]' : 'min-w-[2400px]')}>
            <thead className="sticky top-0 z-10 bg-slate-100 border-b">
              <tr className="text-xs">
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Source IP</span>
                    <FilterButton label="Source IP" value={filters.sourceIp} onChange={v => updateFilter('sourceIp', v)} options={uniqueValues.sourceIps} />
                  </div>
                </th>
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Address</span>
                    <FilterButton label="Address" value={filters.address} onChange={v => updateFilter('address', v)} options={uniqueValues.addresses} />
                  </div>
                </th>
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">FC</span>
                    <FilterButton label="Function Code" value={filters.fc} onChange={v => updateFilter('fc', v)} options={uniqueValues.fcs} />
                  </div>
                </th>
                <th className="px-2 py-2 text-left whitespace-nowrap"><span className="font-medium">Label</span></th>
                {!isCompactView && <th className="px-2 py-2 text-left whitespace-nowrap"><span className="font-medium">Unit</span></th>}
                {!isCompactView && <th className="px-2 py-2 text-left whitespace-nowrap"><span className="font-medium">Scale</span></th>}
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">State</span>
                    <FilterButton label="Learning State" value={filters.learningState} onChange={v => updateFilter('learningState', v)} options={uniqueValues.learningStates} />
                  </div>
                </th>
                <th className="px-2 py-2 text-center whitespace-nowrap"><span className="font-medium">Samples</span></th>
                <th className="px-2 py-2 text-left whitespace-nowrap"><span className="font-medium">Current Value</span></th>
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Best Type</span>
                    <FilterButton label="Best Type" value={filters.winner} onChange={v => updateFilter('winner', v)} options={uniqueValues.winners} />
                  </div>
                </th>
                {!isCompactView && <th className="px-2 py-2 text-left whitespace-nowrap w-32"><span className="font-medium">Explanation</span></th>}
                <th className="px-2 py-2 text-center whitespace-nowrap"><span className="font-medium">Actions</span></th>
                {dataTypeColumns.map(col => (
                  <Tooltip key={col.key}>
                    <TooltipTrigger asChild>
                      <th className="px-1 py-2 text-center whitespace-nowrap font-medium cursor-help text-xs">{col.label}</th>
                    </TooltipTrigger>
                    <TooltipContent>{col.key}</TooltipContent>
                  </Tooltip>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedVariables.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount} className="text-center py-8 text-muted-foreground">
                    No variables match the current filters
                  </td>
                </tr>
              ) : (
                paginatedVariables.map((variable) => {
                  const suggestedType = getSuggestedType(variable);
                  const stateConfig = learningStateConfig[variable.learning_state as keyof typeof learningStateConfig] || learningStateConfig.unknown;
                  const StateIcon = stateConfig.icon;
                  const canConfirm = suggestedType && variable.learning_state !== 'confirmed' && variable.learning_state !== 'published';
                  const canUndo = variable.learning_state === 'confirmed' || variable.learning_state === 'published';
                  const interpretedValue = getInterpretedValue(variable);
                  const scale = (variable as any).scale || 1;
                  const varHasAnalysis = hasAnalysis(variable);

                  return (
                    <tr
                      key={variable.id}
                      className={cn(
                        'border-b text-xs',
                        varHasAnalysis ? 'hover:bg-slate-50' : 'hover:bg-slate-50/50 opacity-80'
                      )}
                    >
                      <td className="px-2 py-1.5 font-mono text-xs">{variable.source_ip}</td>
                      <td className="px-2 py-1.5 font-mono font-medium">{variable.address}</td>
                      <td className="px-2 py-1.5">
                        <Badge variant="outline" className="font-mono text-[10px] px-1 py-0">{variable.function_code}</Badge>
                      </td>
                      <td className="px-2 py-1.5">
                        {variable.semantic_label
                          ? <span className="text-xs font-medium">{variable.semantic_label}</span>
                          : <span className="text-muted-foreground italic text-xs">—</span>}
                      </td>
                      {!isCompactView && (
                        <td className="px-2 py-1.5">
                          {variable.semantic_unit
                            ? <Badge variant="secondary" className="font-mono text-[10px] px-1 py-0">{variable.semantic_unit}</Badge>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                      )}
                      {!isCompactView && (
                        <td className="px-2 py-1.5">
                          <span className="font-mono text-xs">{formatScale(scale)}</span>
                        </td>
                      )}
                      <td className="px-2 py-1.5">
                        <Badge className={stateConfig.color}>
                          <StateIcon className="h-3 w-3 mr-1" />{stateConfig.label}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Badge variant="secondary" className="font-mono text-[10px] px-1 py-0">
                          {variable.sample_count?.toLocaleString() || 0}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5">
                        {variable.winner ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-sm">{interpretedValue}</span>
                            {variable.semantic_unit && (
                              <Badge variant="secondary" className="font-mono text-[10px] px-1 py-0">{variable.semantic_unit}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">awaiting analysis</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {suggestedType ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="bg-purple-100 text-purple-800 font-mono text-[10px] px-1 py-0 cursor-help">
                                {suggestedType}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs p-3">
                              <div className="space-y-1">
                                <Badge className="bg-purple-600 text-white font-mono">{suggestedType}</Badge>
                                {(variable.explanation || variable.ai_reasoning) && (
                                  <p className="text-xs leading-relaxed text-slate-700 mt-2">
                                    {variable.explanation || variable.ai_reasoning}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">—</span>
                        )}
                      </td>
                      {!isCompactView && (
                        <td className="px-2 py-1.5 max-w-[130px]">
                          {variable.explanation ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-xs text-muted-foreground truncate cursor-help hover:text-foreground">
                                  {variable.explanation}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md p-4">
                                <p className="text-sm leading-relaxed">{variable.explanation}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* History chart button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleOpenHistory(variable)}
                              >
                                <TrendingUp className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View historical chart</TooltipContent>
                          </Tooltip>

                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleOpenEdit(variable)}>
                            <Pencil className="h-3 w-3 mr-1" />Edit
                          </Button>

                          {canConfirm ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300"
                              onClick={() => handleConfirm(variable)}
                              disabled={confirmingId === variable.id}
                            >
                              {confirmingId === variable.id
                                ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                                : <><CheckCircle className="h-3 w-3 mr-1" />Confirm</>}
                            </Button>
                          ) : canUndo ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => handleUndo(variable)}
                              disabled={undoingId === variable.id}
                            >
                              {undoingId === variable.id
                                ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                                : <><Undo className="h-3 w-3 mr-1" />Undo</>}
                            </Button>
                          ) : null}
                        </div>
                      </td>

                      {/* Heatmap columns */}
                      {dataTypeColumns.map(col => {
                        const score = variable[col.scoreKey as keyof DiscoveredVariable] as number | null;
                        const value = variable[col.key as keyof DiscoveredVariable] as number | null;
                        const isWinner = variable.winner?.toUpperCase() === col.key;

                        // Stats for tooltip
                        const countKey = `stats_${col.key}_count` as keyof DiscoveredVariable;
                        const avgValueKey = `stats_${col.key}_avg_value` as keyof DiscoveredVariable;
                        const stdKey = `stats_${col.key}_std` as keyof DiscoveredVariable;
                        const avgJumpKey = `stats_${col.key}_avg_jump` as keyof DiscoveredVariable;
                        const maxJumpKey = `stats_${col.key}_max_jump` as keyof DiscoveredVariable;
                        const nullsKey = `stats_${col.key}_nulls` as keyof DiscoveredVariable;
                        const zerosKey = `stats_${col.key}_zeros` as keyof DiscoveredVariable;
                        const avgScoreKey = `stats_${col.key}_avg_score` as keyof DiscoveredVariable;

                        const count = variable[countKey] as number | null;
                        const avgValue = variable[avgValueKey] as number | null;
                        const std = variable[stdKey] as number | null;
                        const avgJump = variable[avgJumpKey] as number | null;
                        const maxJump = variable[maxJumpKey] as number | null;
                        const nulls = variable[nullsKey] as number | null;
                        const zeros = variable[zerosKey] as number | null;
                        const avgScore = variable[avgScoreKey] as number | null;
                        const hasStats = count !== null;

                        return (
                          <td key={col.key} className="px-0.5 py-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    'px-1 py-1 rounded text-center text-xs font-medium flex flex-col items-center justify-center min-h-[40px] cursor-help transition-all hover:scale-105',
                                    getScoreColor(score),
                                    isWinner && 'ring-2 ring-emerald-500 ring-offset-1'
                                  )}
                                >
                                  <span className="text-[10px] font-semibold leading-tight truncate max-w-[70px]">
                                    {formatValue(value, col.key)}
                                  </span>
                                  <span className="text-[9px] mt-0.5 px-1 py-0 rounded bg-black/10">
                                    {formatScore(score)}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="p-0 bg-white border-2 border-slate-200 shadow-xl max-w-xs">
                                {hasStats ? (
                                  <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between pb-2 border-b-2">
                                      <Badge className="bg-blue-600 text-white font-mono text-sm px-2 py-1">{col.key}</Badge>
                                      <Badge className={cn('font-bold text-sm px-2 py-1',
                                        score && score >= 0.8 ? 'bg-emerald-600 text-white' :
                                        score && score >= 0.5 ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'
                                      )}>{formatScore(score)}</Badge>
                                    </div>
                                    {isWinner && (
                                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                                        <span className="text-xs font-semibold text-emerald-800">AI Winner</span>
                                      </div>
                                    )}
                                    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-lg p-3 border-2 border-blue-200">
                                      <div className="text-xs text-blue-700 mb-1 font-medium">Current Value</div>
                                      <div className="font-mono font-bold text-2xl text-blue-900">{formatValue(value, col.key)}</div>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="text-xs font-semibold text-slate-700 border-b-2 pb-1 flex items-center gap-2">
                                        <span>Historical Statistics</span>
                                        <Badge variant="secondary" className="text-[10px]">{count?.toLocaleString('en-US')} samples</Badge>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        {[
                                          { label: 'Avg Score', value: formatScore(avgScore), bg: 'bg-purple-50 border-purple-100', text: 'text-purple-700', val: 'text-purple-900' },
                                          { label: 'Avg Value', value: avgValue !== null ? formatNumber(avgValue, 3) : '-', bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700', val: 'text-blue-900' },
                                          { label: 'Std Dev', value: std !== null ? formatNumber(std, 3) : '-', bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', val: 'text-slate-900' },
                                          { label: 'Avg Jump', value: avgJump !== null ? formatNumber(avgJump, 3) : '-', bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700', val: 'text-amber-900' },
                                          { label: 'Max Jump', value: maxJump !== null ? formatNumber(maxJump, 3) : '-', bg: 'bg-red-50 border-red-100', text: 'text-red-700', val: 'text-red-900' },
                                          { label: 'Nulls', value: nulls?.toLocaleString('en-US') ?? '-', bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', val: 'text-slate-900' },
                                          { label: 'Zeros', value: zeros?.toLocaleString('en-US') ?? '-', bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', val: 'text-slate-900' },
                                          { label: 'Data Quality', value: count && nulls !== null && zeros !== null ? `${Math.round(((count - nulls - zeros) / count) * 100)}%` : '-', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', val: 'text-emerald-900' },
                                        ].map(item => (
                                          <div key={item.label} className={`rounded-lg p-2 border ${item.bg}`}>
                                            <div className={`text-[10px] mb-0.5 font-medium ${item.text}`}>{item.label}</div>
                                            <div className={`font-mono font-bold truncate ${item.val}`}>{item.value}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-4 space-y-2">
                                    <div className="flex items-center justify-between pb-2 border-b">
                                      <Badge className="bg-blue-600 text-white font-mono">{col.key}</Badge>
                                      <Badge className="bg-gray-200 text-gray-600">No analysis</Badge>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-lg p-3 border-2 border-blue-200">
                                      <div className="text-xs text-blue-700 mb-1 font-medium">Current Value</div>
                                      <div className="font-mono font-bold text-xl text-blue-900">{formatValue(value, col.key)}</div>
                                    </div>
                                    <p className="text-xs text-muted-foreground italic">Run historical analysis to see scores.</p>
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {paginatedVariables.length} of {filteredVariables.length} variables
        {hasActiveFilters && ` • filtered from ${variables.length}`}
        {isCompactView && ' • Compact view'}
      </div>

      {/* History Chart Dialog */}
      <VariableHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        variable={historyVariable}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Variable</DialogTitle>
            <DialogDescription>
              <span className="font-mono">{editingVariable?.source_ip}</span> • Address{' '}
              <span className="font-mono">{editingVariable?.address}</span> • FC{' '}
              <span className="font-mono">{editingVariable?.function_code}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingVariable && getSuggestedType(editingVariable) && (
              <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-3">
                <div className="text-sm font-semibold text-purple-900 mb-2">AI Suggestion</div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-600 text-white font-mono">{getSuggestedType(editingVariable)}</Badge>
                  {(() => {
                    const conf = editingVariable ? getWinnerConfidence(editingVariable) ?? editingVariable.ai_confidence : null;
                    return conf !== null && <span className="text-xs text-purple-800">{Math.round(conf * 100)}% confidence</span>;
                  })()}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Parameter Name</Label>
              <Input placeholder="e.g., Active Power" value={editForm.semantic_label} onChange={e => setEditForm(p => ({ ...p, semantic_label: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Data Type *</Label>
              <Select value={editForm.data_type} onValueChange={v => setEditForm(p => ({ ...p, data_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select data type..." /></SelectTrigger>
                <SelectContent>
                  {dataTypeColumns.map(col => (
                    <SelectItem key={col.key} value={col.key.toLowerCase()}>
                      <span className="font-mono">{col.key}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input placeholder="e.g., kW" value={editForm.semantic_unit} onChange={e => setEditForm(p => ({ ...p, semantic_unit: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input placeholder="e.g., Power" value={editForm.semantic_category} onChange={e => setEditForm(p => ({ ...p, semantic_category: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Scale</Label>
                <Input type="text" placeholder="e.g., 0.1" value={editForm.scale} onChange={e => setEditForm(p => ({ ...p, scale: e.target.value.replace(',', '.') }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.data_type || saving} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save & Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};