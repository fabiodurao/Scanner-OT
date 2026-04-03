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
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  SlidersHorizontal, X, Maximize2, Minimize2,
  CheckCircle, HelpCircle, Lightbulb, Upload,
  Pencil, Loader2, Undo, TrendingUp, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

interface HistoricalHeatmapTableProps {
  variables: DiscoveredVariable[];
  onVariableUpdated?: () => void;
}

interface ColumnFilters {
  sourceIp: string;
  destinationIp: string;
  sourcePort: string;
  destinationPort: string;
  unitId: string;
  protocol: string;
  address: string;
  fc: string;
  winner: string;
  learningState: string;
}

const emptyFilters: ColumnFilters = {
  sourceIp: '', destinationIp: '',
  sourcePort: '', destinationPort: '',
  unitId: '', protocol: '',
  address: '', fc: '',
  winner: '', learningState: '',
};

const dataTypeColumns = [
  { key: 'UINT16',   scoreKey: 'historical_scores_uint16',   label: 'UINT16'   },
  { key: 'INT16',    scoreKey: 'historical_scores_int16',    label: 'INT16'    },
  { key: 'UINT32BE', scoreKey: 'historical_scores_uint32be', label: 'UINT32BE' },
  { key: 'UINT32LE', scoreKey: 'historical_scores_uint32le', label: 'UINT32LE' },
  { key: 'INT32BE',  scoreKey: 'historical_scores_int32be',  label: 'INT32BE'  },
  { key: 'INT32LE',  scoreKey: 'historical_scores_int32le',  label: 'INT32LE'  },
  { key: 'FLOAT32BE',scoreKey: 'historical_scores_float32be',label: 'FLOAT32BE'},
  { key: 'FLOAT32LE',scoreKey: 'historical_scores_float32le',label: 'FLOAT32LE'},
  { key: 'UINT64BE', scoreKey: 'historical_scores_uint64be', label: 'UINT64BE' },
  { key: 'UINT64LE', scoreKey: 'historical_scores_uint64le', label: 'UINT64LE' },
  { key: 'INT64BE',  scoreKey: 'historical_scores_int64be',  label: 'INT64BE'  },
  { key: 'INT64LE',  scoreKey: 'historical_scores_int64le',  label: 'INT64LE'  },
  { key: 'FLOAT64BE',scoreKey: 'historical_scores_float64be',label: 'FLOAT64BE'},
  { key: 'FLOAT64LE',scoreKey: 'historical_scores_float64le',label: 'FLOAT64LE'},
] as const;

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500, 1000];

const learningStateConfig = {
  unknown:   { label: 'Unknown',   icon: HelpCircle,   color: 'bg-slate-100 text-slate-700'  },
  hypothesis:{ label: 'Hypothesis',icon: Lightbulb,    color: 'bg-amber-100 text-amber-700'  },
  confirmed: { label: 'Confirmed', icon: CheckCircle,  color: 'bg-emerald-100 text-emerald-700'},
  published: { label: 'Published', icon: Upload,       color: 'bg-blue-100 text-blue-700'    },
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
  if (s > 0)     return 'bg-[#CC0000] text-white';
  return 'bg-gray-100 text-gray-400';
};

const formatNumber = (value: number, decimals = 3) =>
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

// Single-field filter popover
const FilterButton = ({ label, value, onChange, options }: {
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
      <PopoverContent className="w-52 p-2" align="start">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <Input placeholder="Filter..." value={value} onChange={e => onChange(e.target.value)} className="h-8 text-xs" autoFocus />
          {options && options.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {options.filter(o => o.toLowerCase().includes(value.toLowerCase())).map(o => (
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

// Dual-field filter popover (src + dst)
const DualFilterButton = ({
  labelSrc, labelDst, valueSrc, valueDst, onChangeSrc, onChangeDst, optionsSrc, optionsDst,
}: {
  labelSrc: string; labelDst: string;
  valueSrc: string; valueDst: string;
  onChangeSrc: (v: string) => void; onChangeDst: (v: string) => void;
  optionsSrc?: string[]; optionsDst?: string[];
}) => {
  const hasFilter = valueSrc.length > 0 || valueDst.length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('h-5 w-5 p-0', hasFilter && 'text-blue-600')}>
          <SlidersHorizontal className={cn('h-3 w-3', hasFilter && 'text-blue-600')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-700">{labelSrc}</div>
            <Input placeholder="Filter..." value={valueSrc} onChange={e => onChangeSrc(e.target.value)} className="h-7 text-xs" />
            {optionsSrc && optionsSrc.length > 0 && (
              <div className="max-h-28 overflow-y-auto space-y-0.5">
                {optionsSrc.filter(o => o.toLowerCase().includes(valueSrc.toLowerCase())).map(o => (
                  <Button key={o} variant="ghost" size="sm" className="w-full justify-start h-6 text-xs font-mono" onClick={() => onChangeSrc(o)}>{o}</Button>
                ))}
              </div>
            )}
            {valueSrc && (
              <Button variant="ghost" size="sm" className="w-full h-6 text-xs text-red-600" onClick={() => onChangeSrc('')}>
                <X className="h-3 w-3 mr-1" />Clear
              </Button>
            )}
          </div>
          <div className="border-t" />
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-400">{labelDst}</div>
            <Input placeholder="Filter..." value={valueDst} onChange={e => onChangeDst(e.target.value)} className="h-7 text-xs" />
            {optionsDst && optionsDst.length > 0 && (
              <div className="max-h-28 overflow-y-auto space-y-0.5">
                {optionsDst.filter(o => o.toLowerCase().includes(valueDst.toLowerCase())).map(o => (
                  <Button key={o} variant="ghost" size="sm" className="w-full justify-start h-6 text-xs font-mono" onClick={() => onChangeDst(o)}>{o}</Button>
                ))}
              </div>
            )}
            {valueDst && (
              <Button variant="ghost" size="sm" className="w-full h-6 text-xs text-red-600" onClick={() => onChangeDst('')}>
                <X className="h-3 w-3 mr-1" />Clear
              </Button>
            )}
          </div>
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

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyVariable, setHistoryVariable] = useState<DiscoveredVariable | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<DiscoveredVariable | null>(null);
  const [editForm, setEditForm] = useState({ semantic_label: '', semantic_unit: '', semantic_category: '', data_type: '', scale: '1' });
  const [saving, setSaving] = useState(false);

  // Build unique option lists from ALL variables (no limit)
  const uniqueValues = useMemo(() => ({
    sourceIps:        [...new Set(variables.map(v => v.source_ip).filter(Boolean))].sort(),
    destinationIps:   [...new Set(variables.map(v => v.destination_ip).filter(Boolean))].sort(),
    sourcePorts:      [...new Set(variables.map(v => v.source_port?.toString()).filter((p): p is string => Boolean(p)))].sort((a, b) => +a - +b),
    destinationPorts: [...new Set(variables.map(v => v.destination_port?.toString()).filter((p): p is string => Boolean(p)))].sort((a, b) => +a - +b),
    unitIds:          [...new Set(variables.map(v => v.unit_id?.toString()).filter((u): u is string => Boolean(u)))].sort((a, b) => +a - +b),
    protocols:        [...new Set(variables.map(v => v.protocol).filter((p): p is string => Boolean(p)))].sort(),
    addresses:        [...new Set(variables.map(v => v.address?.toString()).filter(Boolean))].sort((a, b) => +a - +b),
    fcs:              [...new Set(variables.map(v => v.function_code?.toString()).filter(Boolean))].sort((a, b) => +a - +b),
    winners:          [...new Set(variables.map(v => v.winner).filter((w): w is string => Boolean(w)))].sort(),
    learningStates:   ['unknown', 'hypothesis', 'confirmed', 'published'],
  }), [variables]);

  const filteredVariables = useMemo(() => variables.filter(v => {
    if (filters.sourceIp      && !v.source_ip?.toLowerCase().includes(filters.sourceIp.toLowerCase())) return false;
    if (filters.destinationIp && !v.destination_ip?.toLowerCase().includes(filters.destinationIp.toLowerCase())) return false;
    if (filters.sourcePort    && v.source_port?.toString() !== filters.sourcePort) return false;
    if (filters.destinationPort && v.destination_port?.toString() !== filters.destinationPort) return false;
    if (filters.unitId        && v.unit_id?.toString() !== filters.unitId) return false;
    if (filters.protocol      && !v.protocol?.toLowerCase().includes(filters.protocol.toLowerCase())) return false;
    if (filters.address       && !v.address?.toString().includes(filters.address)) return false;
    if (filters.fc            && v.function_code?.toString() !== filters.fc) return false;
    if (filters.winner        && !v.winner?.toLowerCase().includes(filters.winner.toLowerCase())) return false;
    if (filters.learningState && v.learning_state !== filters.learningState) return false;
    return true;
  }), [variables, filters]);

  const totalPages = Math.ceil(filteredVariables.length / pageSize);
  const paginatedVariables = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVariables.slice(start, start + pageSize);
  }, [filteredVariables, currentPage, pageSize]);

  useMemo(() => { setCurrentPage(1); }, [filters, pageSize]);

  const hasActiveFilters = Object.values(filters).some(f => f.length > 0);
  const clearAllFilters = () => { setFilters(emptyFilters); setCurrentPage(1); };
  const updateFilter = (key: keyof ColumnFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };
  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const getSuggestedType = (v: DiscoveredVariable) => v.winner || v.ai_suggested_type;
  const getWinnerConfidence = (v: DiscoveredVariable): number | null => {
    if (!v.winner) return null;
    const key = `historical_scores_${v.winner.toLowerCase()}` as keyof DiscoveredVariable;
    return v[key] as number | null;
  };
  const getInterpretedValue = (v: DiscoveredVariable): string => {
    if (!v.winner) return '-';
    const col = v.winner.toUpperCase();
    const raw = (v as any)[col] as number | null;
    if (raw === null || raw === undefined) return '-';
    return formatValue(raw * ((v as any).scale || 1), col);
  };

  const handleOpenHistory = (v: DiscoveredVariable) => { setHistoryVariable(v); setHistoryDialogOpen(true); };

  const handleConfirm = async (v: DiscoveredVariable) => {
    if (!v.winner || !user) return;
    setConfirmingId(v.id);
    const { error } = await supabase.from('discovered_variables').update({
      data_type: v.winner.toLowerCase(), learning_state: 'confirmed',
      confidence_score: getWinnerConfidence(v) || 0.95,
      confirmed_by: user.id, confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
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
    const s = (v as any).scale || 1;
    setEditForm({
      semantic_label: v.semantic_label || '', semantic_unit: v.semantic_unit || '',
      semantic_category: v.semantic_category || '',
      data_type: v.data_type || v.winner?.toLowerCase() || v.ai_suggested_type || '',
      scale: s.toString().replace(',', '.'),
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
      scale, learning_state: 'confirmed',
      confidence_score: Math.max(editingVariable.confidence_score || 0, 0.95),
      confirmed_by: user.id, confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', editingVariable.id);
    if (error) toast.error('Error saving: ' + error.message);
    else { toast.success('Saved & confirmed!'); setEditDialogOpen(false); onVariableUpdated?.(); }
    setSaving(false);
  };

  const hasAnalysis = (v: DiscoveredVariable) => v.winner !== null || v.historical_scores_uint16 !== null;

  // Column count for empty state colspan
  // Full: IP, Port, Addr, Proto, UnitID, FC, Label, EngUnit, Scale, State, Samples, CurVal, Timestamp, BestType, Actions, 14 heatmap, HEX
  // Compact: IP, Port, Addr, Proto, UnitID, FC, Label, State, CurVal, BestType, 14 heatmap, HEX
  const visibleColumnCount = isCompactView
    ? 10 + dataTypeColumns.length   // no EngUnit, Scale, Samples, Timestamp, Actions
    : 15 + dataTypeColumns.length;  // all columns (added Timestamp)

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
          {[['#00B050','High'],['#B5E61D','Good'],['#FFC000','Med'],['#FF5722','Low'],['#FF0000','Poor']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: c }} />
              <span>{l}</span>
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
          <Select value={pageSize.toString()} onValueChange={v => setPageSize(parseInt(v))}>
            <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{PAGE_SIZE_OPTIONS.map(s => <SelectItem key={s} value={s.toString()}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {filteredVariables.length > 0
              ? `${(currentPage-1)*pageSize+1}–${Math.min(currentPage*pageSize, filteredVariables.length)} of ${filteredVariables.length}`
              : '0 results'}
          </span>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => goToPage(1)} disabled={currentPage===1}><ChevronsLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => goToPage(currentPage-1)} disabled={currentPage===1}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs px-1">{currentPage}/{totalPages||1}</span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => goToPage(currentPage+1)} disabled={currentPage>=totalPages}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => goToPage(totalPages)} disabled={currentPage>=totalPages}><ChevronsRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
          <table className={cn('w-full', isCompactView ? 'min-w-[1600px]' : 'min-w-[2600px]')}>
            <thead className="sticky top-0 z-10 bg-slate-100 border-b">
              <tr className="text-xs">

                {/* IP */}
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium">Src IP</span>
                      <span className="font-medium text-slate-400">Dst IP</span>
                    </div>
                    <DualFilterButton
                      labelSrc="Source IP" labelDst="Destination IP"
                      valueSrc={filters.sourceIp} valueDst={filters.destinationIp}
                      onChangeSrc={v => updateFilter('sourceIp', v)} onChangeDst={v => updateFilter('destinationIp', v)}
                      optionsSrc={uniqueValues.sourceIps} optionsDst={uniqueValues.destinationIps}
                    />
                  </div>
                </th>

                {/* Port */}
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium">Src Port</span>
                      <span className="font-medium text-slate-400">Dst Port</span>
                    </div>
                    <DualFilterButton
                      labelSrc="Source Port" labelDst="Destination Port"
                      valueSrc={filters.sourcePort} valueDst={filters.destinationPort}
                      onChangeSrc={v => updateFilter('sourcePort', v)} onChangeDst={v => updateFilter('destinationPort', v)}
                      optionsSrc={uniqueValues.sourcePorts} optionsDst={uniqueValues.destinationPorts}
                    />
                  </div>
                </th>

                {/* Address */}
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Address</span>
                    <FilterButton label="Address" value={filters.address} onChange={v => updateFilter('address', v)} options={uniqueValues.addresses} />
                  </div>
                </th>

                {/* Protocol */}
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Protocol</span>
                    <FilterButton label="Protocol" value={filters.protocol} onChange={v => updateFilter('protocol', v)} options={uniqueValues.protocols} />
                  </div>
                </th>

                {/* Unit ID */}
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-medium cursor-help border-b border-dashed border-slate-400">Unit ID</span>
                      </TooltipTrigger>
                      <TooltipContent>Slave Unit ID (e.g. 1, 2, 3...)</TooltipContent>
                    </Tooltip>
                    <FilterButton label="Unit ID" value={filters.unitId} onChange={v => updateFilter('unitId', v)} options={uniqueValues.unitIds} />
                  </div>
                </th>

                {/* FC */}
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">FC</span>
                    <FilterButton label="Function Code" value={filters.fc} onChange={v => updateFilter('fc', v)} options={uniqueValues.fcs} />
                  </div>
                </th>

                {/* Label */}
                <th className="px-2 py-2 text-left whitespace-nowrap"><span className="font-medium">Label</span></th>

                {/* Eng. Unit — hidden in compact */}
                {!isCompactView && (
                  <th className="px-2 py-2 text-left whitespace-nowrap">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-medium cursor-help border-b border-dashed border-slate-400">Eng. Unit</span>
                      </TooltipTrigger>
                      <TooltipContent>Engineering unit (e.g. kW, V, °C)</TooltipContent>
                    </Tooltip>
                  </th>
                )}

                {/* Scale — hidden in compact */}
                {!isCompactView && (
                  <th className="px-2 py-2 text-left whitespace-nowrap"><span className="font-medium">Scale</span></th>
                )}

                {/* State */}
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">State</span>
                    <FilterButton label="Learning State" value={filters.learningState} onChange={v => updateFilter('learningState', v)} options={uniqueValues.learningStates} />
                  </div>
                </th>

                {/* Samples — hidden in compact */}
                {!isCompactView && (
                  <th className="px-2 py-2 text-center whitespace-nowrap"><span className="font-medium">Samples</span></th>
                )}

                {/* Current Value */}
                <th className="px-2 py-2 text-left whitespace-nowrap"><span className="font-medium">Current Value</span></th>

                {/* Timestamp — hidden in compact */}
                {!isCompactView && (
                  <th className="px-2 py-2 text-left whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">Last Update</span>
                    </div>
                  </th>
                )}

                {/* Best Type */}
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Best Type</span>
                    <FilterButton label="Best Type" value={filters.winner} onChange={v => updateFilter('winner', v)} options={uniqueValues.winners} />
                  </div>
                </th>

                {/* Actions — hidden in compact */}
                {!isCompactView && (
                  <th className="px-2 py-2 text-center whitespace-nowrap"><span className="font-medium">Actions</span></th>
                )}

                {/* Heatmap columns */}
                {dataTypeColumns.map(col => (
                  <Tooltip key={col.key}>
                    <TooltipTrigger asChild>
                      <th className="px-1 py-2 text-center whitespace-nowrap font-medium cursor-help text-xs">{col.label}</th>
                    </TooltipTrigger>
                    <TooltipContent>{col.key}</TooltipContent>
                  </Tooltip>
                ))}

                {/* HEX */}
                <th className="px-2 py-2 text-left whitespace-nowrap"><span className="font-medium">HEX</span></th>
              </tr>
            </thead>
            <tbody>
              {paginatedVariables.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount} className="text-center py-8 text-muted-foreground">
                    No variables match the current filters
                  </td>
                </tr>
              ) : paginatedVariables.map(variable => {
                const suggestedType = getSuggestedType(variable);
                const stateConfig = learningStateConfig[variable.learning_state as keyof typeof learningStateConfig] || learningStateConfig.unknown;
                const StateIcon = stateConfig.icon;
                const canConfirm = suggestedType && variable.learning_state !== 'confirmed' && variable.learning_state !== 'published';
                const canUndo = variable.learning_state === 'confirmed' || variable.learning_state === 'published';
                const interpretedValue = getInterpretedValue(variable);
                const scale = (variable as any).scale || 1;
                const varHasAnalysis = hasAnalysis(variable);
                const explanation = variable.explanation || variable.ai_reasoning || null;
                const winnerConfidence = getWinnerConfidence(variable);
                const lastSeenAt = variable.last_seen_at || null;

                return (
                  <tr key={variable.id} className={cn('border-b text-xs', varHasAnalysis ? 'hover:bg-slate-50' : 'hover:bg-slate-50/50 opacity-80')}>

                    {/* IP */}
                    <td className="px-2 py-1.5 font-mono text-xs">
                      <div className="flex flex-col leading-tight gap-0.5">
                        <span className="text-slate-800">{variable.source_ip || '—'}</span>
                        <span className="text-slate-400">{variable.destination_ip || '—'}</span>
                      </div>
                    </td>

                    {/* Port */}
                    <td className="px-2 py-1.5 font-mono text-xs">
                      <div className="flex flex-col leading-tight gap-0.5">
                        <span className="text-slate-800">{variable.source_port ?? '—'}</span>
                        <span className="text-slate-400">{variable.destination_port ?? '—'}</span>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="px-2 py-1.5 font-mono font-medium">{variable.address}</td>

                    {/* Protocol */}
                    <td className="px-2 py-1.5">
                      {variable.protocol
                        ? <Badge variant="secondary" className="text-[10px] px-1 py-0">{variable.protocol}</Badge>
                        : <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* Unit ID */}
                    <td className="px-2 py-1.5 text-center">
                      {variable.unit_id != null
                        ? <Badge variant="outline" className="font-mono text-[10px] px-1 py-0">{variable.unit_id}</Badge>
                        : <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* FC */}
                    <td className="px-2 py-1.5">
                      <Badge variant="outline" className="font-mono text-[10px] px-1 py-0">{variable.function_code}</Badge>
                    </td>

                    {/* Label */}
                    <td className="px-2 py-1.5">
                      {variable.semantic_label
                        ? <span className="text-xs font-medium">{variable.semantic_label}</span>
                        : <span className="text-muted-foreground italic text-xs">—</span>}
                    </td>

                    {/* Eng. Unit — hidden in compact */}
                    {!isCompactView && (
                      <td className="px-2 py-1.5">
                        {variable.semantic_unit
                          ? <Badge variant="secondary" className="font-mono text-[10px] px-1 py-0">{variable.semantic_unit}</Badge>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                    )}

                    {/* Scale — hidden in compact */}
                    {!isCompactView && (
                      <td className="px-2 py-1.5">
                        <span className="font-mono text-xs">{formatScale(scale)}</span>
                      </td>
                    )}

                    {/* State */}
                    <td className="px-2 py-1.5">
                      <Badge className={stateConfig.color}>
                        <StateIcon className="h-3 w-3 mr-1" />{stateConfig.label}
                      </Badge>
                    </td>

                    {/* Samples — hidden in compact */}
                    {!isCompactView && (
                      <td className="px-2 py-1.5 text-center">
                        <Badge variant="secondary" className="font-mono text-[10px] px-1 py-0">
                          {variable.sample_count?.toLocaleString() || 0}
                        </Badge>
                      </td>
                    )}

                    {/* Current Value */}
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

                    {/* Timestamp — hidden in compact */}
                    {!isCompactView && (
                      <td className="px-2 py-1.5">
                        {lastSeenAt ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col leading-tight cursor-help">
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDistanceToNow(new Date(lastSeenAt), { addSuffix: true })}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(lastSeenAt), 'MM/dd/yyyy HH:mm:ss')}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}

                    {/* Best Type */}
                    <td className="px-2 py-1.5">
                      {suggestedType ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-mono text-[10px] cursor-help hover:bg-purple-200 transition-colors">
                              {suggestedType}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            className="p-0 bg-white border-2 border-purple-200 shadow-xl max-w-sm"
                            side="left"
                          >
                            <div className="p-3 space-y-2">
                              <div className="flex items-center gap-2 pb-2 border-b border-purple-100">
                                <span className="bg-purple-600 text-white font-mono text-xs px-2 py-0.5 rounded">{suggestedType}</span>
                                {winnerConfidence !== null && (
                                  <span className="text-xs text-purple-700 font-medium">
                                    {Math.round(winnerConfidence * 100)}% confidence
                                  </span>
                                )}
                              </div>
                              {explanation ? (
                                <p className="text-xs leading-relaxed text-slate-700">{explanation}</p>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">No explanation available.</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">—</span>
                      )}
                    </td>

                    {/* Actions — hidden in compact */}
                    {!isCompactView && (
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleOpenHistory(variable)}>
                                <TrendingUp className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View historical chart</TooltipContent>
                          </Tooltip>

                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleOpenEdit(variable)}>
                            <Pencil className="h-3 w-3 mr-1" />Edit
                          </Button>

                          {canConfirm ? (
                            <Button size="sm" variant="outline" className="h-6 px-2 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300" onClick={() => handleConfirm(variable)} disabled={confirmingId === variable.id}>
                              {confirmingId === variable.id
                                ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                                : <><CheckCircle className="h-3 w-3 mr-1" />Confirm</>}
                            </Button>
                          ) : canUndo ? (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => handleUndo(variable)} disabled={undoingId === variable.id}>
                              {undoingId === variable.id
                                ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                                : <><Undo className="h-3 w-3 mr-1" />Undo</>}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    )}

                    {/* Heatmap columns */}
                    {dataTypeColumns.map(col => {
                      const score = variable[col.scoreKey as keyof DiscoveredVariable] as number | null;
                      const value = variable[col.key as keyof DiscoveredVariable] as number | null;
                      const isWinner = variable.winner?.toUpperCase() === col.key;
                      const count     = variable[`stats_${col.key}_count`     as keyof DiscoveredVariable] as number | null;
                      const avgValue  = variable[`stats_${col.key}_avg_value` as keyof DiscoveredVariable] as number | null;
                      const std       = variable[`stats_${col.key}_std`       as keyof DiscoveredVariable] as number | null;
                      const avgJump   = variable[`stats_${col.key}_avg_jump`  as keyof DiscoveredVariable] as number | null;
                      const maxJump   = variable[`stats_${col.key}_max_jump`  as keyof DiscoveredVariable] as number | null;
                      const nulls     = variable[`stats_${col.key}_nulls`     as keyof DiscoveredVariable] as number | null;
                      const zeros     = variable[`stats_${col.key}_zeros`     as keyof DiscoveredVariable] as number | null;
                      const avgScore  = variable[`stats_${col.key}_avg_score` as keyof DiscoveredVariable] as number | null;
                      const hasStats  = count !== null;

                      return (
                        <td key={col.key} className="px-0.5 py-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                'px-1 py-1 rounded text-center text-xs font-medium flex flex-col items-center justify-center min-h-[40px] cursor-help transition-all hover:scale-105',
                                getScoreColor(score),
                                isWinner && 'ring-2 ring-emerald-500 ring-offset-1'
                              )}>
                                <span className="text-[10px] font-semibold leading-tight truncate max-w-[70px]">{formatValue(value, col.key)}</span>
                                <span className="text-[9px] mt-0.5 px-1 py-0 rounded bg-black/10">{formatScore(score)}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="p-0 bg-white border-2 border-slate-200 shadow-xl max-w-xs">
                              {hasStats ? (
                                <div className="p-4 space-y-3">
                                  <div className="flex items-center justify-between pb-2 border-b-2">
                                    <Badge className="bg-blue-600 text-white font-mono text-sm px-2 py-1">{col.key}</Badge>
                                    <Badge className={cn('font-bold text-sm px-2 py-1', score && score >= 0.8 ? 'bg-emerald-600 text-white' : score && score >= 0.5 ? 'bg-amber-500 text-white' : 'bg-red-600 text-white')}>{formatScore(score)}</Badge>
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
                                        { label: 'Avg Score',    value: formatScore(avgScore),                                bg: 'bg-purple-50 border-purple-100', text: 'text-purple-700', val: 'text-purple-900' },
                                        { label: 'Avg Value',    value: avgValue !== null ? formatNumber(avgValue, 3) : '-', bg: 'bg-blue-50 border-blue-100',     text: 'text-blue-700',   val: 'text-blue-900'   },
                                        { label: 'Std Dev',      value: std     !== null ? formatNumber(std, 3)     : '-', bg: 'bg-slate-50 border-slate-200',   text: 'text-slate-700',  val: 'text-slate-900'  },
                                        { label: 'Avg Jump',     value: avgJump !== null ? formatNumber(avgJump, 3) : '-', bg: 'bg-amber-50 border-amber-100',   text: 'text-amber-700',  val: 'text-amber-900'  },
                                        { label: 'Max Jump',     value: maxJump !== null ? formatNumber(maxJump, 3) : '-', bg: 'bg-red-50 border-red-100',       text: 'text-red-700',    val: 'text-red-900'    },
                                        { label: 'Nulls',        value: nulls?.toLocaleString('en-US') ?? '-',             bg: 'bg-slate-50 border-slate-200',   text: 'text-slate-700',  val: 'text-slate-900'  },
                                        { label: 'Zeros',        value: zeros?.toLocaleString('en-US') ?? '-',             bg: 'bg-slate-50 border-slate-200',   text: 'text-slate-700',  val: 'text-slate-900'  },
                                        { label: 'Data Quality', value: count && nulls !== null && zeros !== null ? `${Math.round(((count-nulls-zeros)/count)*100)}%` : '-', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', val: 'text-emerald-900' },
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

                    {/* HEX */}
                    <td className="px-2 py-1.5 font-mono text-[9px] leading-tight align-middle">
                      {variable.HEX ? (() => {
                        const clean = variable.HEX.replace(/\s/g, '').toUpperCase();
                        const pairs = clean.match(/.{1,2}/g) || [];
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-700 whitespace-nowrap">{pairs.slice(0, 4).join(' ')}</span>
                            {pairs.length > 4 && <span className="text-slate-400 whitespace-nowrap">{pairs.slice(4, 8).join(' ')}</span>}
                          </div>
                        );
                      })() : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {paginatedVariables.length} of {filteredVariables.length} variables
        {hasActiveFilters && ` • filtered from ${variables.length}`}
        {isCompactView && ' • Compact view (Samples, Timestamp and Actions hidden)'}
      </div>

      <VariableHistoryDialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} variable={historyVariable} />

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
                  {dataTypeColumns.map(col => <SelectItem key={col.key} value={col.key.toLowerCase()}><span className="font-mono">{col.key}</span></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Eng. Unit</Label>
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