import { useState, useEffect, useRef, useCallback } from 'react';
import { CatalogRegister, REGISTER_CATEGORIES } from '@/types/catalog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Plus, Trash2, Save, X, Bot, Loader2, Sparkles } from 'lucide-react';
import { useAIService, AICategorizationResult } from '@/hooks/useAIService';
import { toast } from 'sonner';

interface RegisterEditTableProps {
  registers: CatalogRegister[];
  onSave: (registers: CatalogRegister[]) => void;
  saving?: boolean;
}

const DATA_TYPES = [
  'boolean',
  'uint16', 'int16',
  'uint32be', 'uint32le', 'int32be', 'int32le',
  'float32be', 'float32le',
  'uint64be', 'uint64le', 'int64be', 'int64le',
  'float64be', 'float64le',
];

const emptyRegister: CatalogRegister = {
  address: 0, name: '', label: '', data_type: '', scale: 1, unit: '', function_code: 3, category: '',
};

export const RegisterEditTable = ({ registers, onSave, saving = false }: RegisterEditTableProps) => {
  const [rows, setRows] = useState<CatalogRegister[]>(registers);
  const [hasChanges, setHasChanges] = useState(false);
  const [aiChangedAddresses, setAiChangedAddresses] = useState<Set<number>>(new Set());
  const [inlineSuggestions, setInlineSuggestions] = useState<Map<number, { category: string; confidence: number }>>(new Map());
  const debounceTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const { categorizeRegisters, loading: aiLoading, progress: aiProgress } = useAIService();

  // Sync rows when registers prop changes
  useEffect(() => {
    setRows(registers);
    setHasChanges(false);
    setAiChangedAddresses(new Set());
  }, [registers]);

  const updateRow = (index: number, field: keyof CatalogRegister, value: string | number) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setHasChanges(true);

    // Trigger inline AI suggestion when name or label changes
    if (field === 'name' || field === 'label') {
      const row = { ...rows[index], [field]: value };
      triggerInlineSuggestion(index, row);
    }
  };

  const triggerInlineSuggestion = useCallback((index: number, row: CatalogRegister) => {
    // Clear existing timer for this index
    const existing = debounceTimers.current.get(index);
    if (existing) clearTimeout(existing);

    // Only suggest if no category is set and name/label has content
    if (row.category || (!row.name && !row.label)) return;

    const timer = setTimeout(async () => {
      try {
        const results = await categorizeRegisters([row]);
        if (results.length > 0) {
          setInlineSuggestions(prev => {
            const next = new Map(prev);
            next.set(index, { category: results[0].category, confidence: results[0].confidence });
            return next;
          });
        }
      } catch {
        // Silently fail for inline suggestions
      }
    }, 1500);

    debounceTimers.current.set(index, timer);
  }, [categorizeRegisters]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  const applyInlineSuggestion = (index: number) => {
    const suggestion = inlineSuggestions.get(index);
    if (!suggestion) return;

    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], category: suggestion.category };
      return next;
    });
    setHasChanges(true);
    setAiChangedAddresses(prev => new Set(prev).add(rows[index].address));
    setInlineSuggestions(prev => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
  };

  const addRow = () => {
    const lastAddr = rows.length > 0 ? rows[rows.length - 1].address + 1 : 40001;
    const lastFc = rows.length > 0 ? rows[rows.length - 1].function_code : 3;
    const lastCat = rows.length > 0 ? rows[rows.length - 1].category || '' : '';
    setRows(prev => [...prev, { ...emptyRegister, address: lastAddr, function_code: lastFc, category: lastCat }]);
    setHasChanges(true);
  };

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleSave = () => {
    const valid = rows.filter(r => r.address > 0 && r.name.trim());
    onSave(valid);
    setHasChanges(false);
    setAiChangedAddresses(new Set());
  };

  const handleDiscard = () => {
    setRows(registers);
    setHasChanges(false);
    setAiChangedAddresses(new Set());
    setInlineSuggestions(new Map());
  };

  const handleAICategorize = async () => {
    // Get registers without categories (or all if none have categories)
    const uncategorized = rows.filter(r => !r.category && r.name.trim());
    const toProcess = uncategorized.length > 0 ? uncategorized : rows.filter(r => r.name.trim());

    if (toProcess.length === 0) {
      toast.info('No registers to categorize');
      return;
    }

    try {
      const results = await categorizeRegisters(toProcess);

      if (results.length === 0) {
        toast.warning('AI returned no categorizations. Check your API key and prompt in Settings.');
        return;
      }

      // Apply results
      const resultMap = new Map<number, AICategorizationResult>();
      results.forEach(r => resultMap.set(r.address, r));

      const changedAddresses = new Set<number>();
      setRows(prev => prev.map(row => {
        const result = resultMap.get(row.address);
        if (result) {
          changedAddresses.add(row.address);
          return { ...row, category: result.category };
        }
        return row;
      }));

      setAiChangedAddresses(changedAddresses);
      setHasChanges(true);
      toast.success(`AI categorized ${results.length} of ${toProcess.length} registers`);
    } catch (err) {
      toast.error('AI categorization failed: ' + (err as Error).message);
    }
  };

  const getCategoryLabel = (value: string) => {
    const cat = REGISTER_CATEGORIES.find(c => c.value === value);
    return cat ? `${cat.emoji} ${cat.label}` : value;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{rows.length} register{rows.length !== 1 ? 's' : ''}</span>
          {hasChanges && <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">Unsaved changes</Badge>}
          {aiLoading && aiProgress && (
            <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 text-xs animate-pulse">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Categorizing {aiProgress.current}/{aiProgress.total}...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAICategorize}
            disabled={aiLoading || rows.length === 0}
            className="text-violet-600 border-violet-200 hover:bg-violet-50"
          >
            {aiLoading ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Categorizing...</>
            ) : (
              <><Bot className="h-3.5 w-3.5 mr-1" />Categorize with AI</>
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add Row
          </Button>
          {hasChanges && (
            <>
              <Button size="sm" variant="ghost" onClick={handleDiscard}>
                <X className="h-3.5 w-3.5 mr-1" />Discard
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                <Save className="h-3.5 w-3.5 mr-1" />{saving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-md border max-h-[500px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-slate-50 z-10">
            <TableRow>
              <TableHead className="w-28 min-w-[112px]">Address</TableHead>
              <TableHead className="w-16">FC</TableHead>
              <TableHead className="min-w-[120px]">Name</TableHead>
              <TableHead className="min-w-[120px]">Label</TableHead>
              <TableHead className="w-48 min-w-[192px]">Category</TableHead>
              <TableHead className="w-36 min-w-[144px]">Data Type</TableHead>
              <TableHead className="w-20">Scale</TableHead>
              <TableHead className="w-20">Unit</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                  No registers. Click "Add Row" or import via JSON.
                </TableCell>
              </TableRow>
            ) : rows.map((reg, i) => {
              const isAiChanged = aiChangedAddresses.has(reg.address);
              const suggestion = inlineSuggestions.get(i);
              return (
                <TableRow key={i} className={isAiChanged ? 'bg-violet-50/50' : undefined}>
                  <TableCell className="p-1">
                    <Input type="number" value={reg.address} onChange={e => updateRow(i, 'address', parseInt(e.target.value) || 0)} className="h-7 text-xs font-mono w-full min-w-[90px]" />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input type="number" value={reg.function_code} onChange={e => updateRow(i, 'function_code', parseInt(e.target.value) || 3)} className="h-7 text-xs font-mono w-full" />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input value={reg.name} onChange={e => updateRow(i, 'name', e.target.value)} className="h-7 text-xs font-mono w-full" placeholder="REG_NAME" />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input value={reg.label} onChange={e => updateRow(i, 'label', e.target.value)} className="h-7 text-xs w-full" placeholder="Human label" />
                  </TableCell>
                  <TableCell className="p-1">
                    <div className="flex items-center gap-1">
                      <Select value={reg.category || '__none__'} onValueChange={v => { updateRow(i, 'category', v === '__none__' ? '' : v); setInlineSuggestions(prev => { const n = new Map(prev); n.delete(i); return n; }); }}>
                        <SelectTrigger className={`h-7 text-[10px] w-full ${isAiChanged ? 'border-violet-300 bg-violet-50' : ''}`}>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__"><span className="text-muted-foreground">None</span></SelectItem>
                          {REGISTER_CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <span className="text-xs">{cat.emoji} {cat.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {suggestion && !reg.category && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-[9px] text-violet-600 hover:bg-violet-100 whitespace-nowrap flex-shrink-0"
                                onClick={() => applyInlineSuggestion(i)}
                              >
                                <Sparkles className="h-3 w-3 mr-0.5" />
                                {getCategoryLabel(suggestion.category).substring(0, 15)}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">AI suggests: {getCategoryLabel(suggestion.category)}</p>
                              <p className="text-[10px] text-muted-foreground">Confidence: {(suggestion.confidence * 100).toFixed(0)}% — Click to apply</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-1">
                    <Select value={reg.data_type || '__none__'} onValueChange={v => updateRow(i, 'data_type', v === '__none__' ? '' : v)}>
                      <SelectTrigger className="h-7 text-xs font-mono w-full">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__"><span className="text-muted-foreground">None</span></SelectItem>
                        {DATA_TYPES.map(dt => (
                          <SelectItem key={dt} value={dt}>
                            <span className="font-mono text-xs">{dt}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-1">
                    <Input type="number" step="any" value={reg.scale} onChange={e => updateRow(i, 'scale', parseFloat(e.target.value) || 1)} className="h-7 text-xs font-mono w-full" />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input value={reg.unit} onChange={e => updateRow(i, 'unit', e.target.value)} className="h-7 text-xs w-full" placeholder="kW" />
                  </TableCell>
                  <TableCell className="p-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => removeRow(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
