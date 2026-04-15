import { useState, useMemo } from 'react';
import { CatalogRegister, REGISTER_CATEGORIES } from '@/types/catalog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SlidersHorizontal, X, Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIService } from '@/hooks/useAIService';
import { toast } from 'sonner';

interface RegisterPreviewTableProps {
  registers: CatalogRegister[];
  onAICategorize?: (updatedRegisters: CatalogRegister[]) => void;
}

const DATA_TYPE_COLORS: Record<string, string> = {
  boolean:   'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
  uint16:    'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
  int16:     'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-700',
  uint32be:  'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-700',
  uint32le:  'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-700',
  int32be:   'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-700',
  int32le:   'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-700',
  float32be: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700',
  float32le: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700',
  uint64be:  'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700',
  uint64le:  'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700',
  int64be:   'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700',
  int64le:   'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700',
  float64be: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-700',
  float64le: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-700',
};

const getCategoryLabel = (value: string | undefined): { label: string; emoji: string } | null => {
  if (!value) return null;
  const cat = REGISTER_CATEGORIES.find(c => c.value === value);
  return cat ? { label: cat.label, emoji: cat.emoji } : { label: value, emoji: '📋' };
};

const HeaderFilter = ({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) => {
  const hasFilter = value.length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('h-5 w-5 p-0 ml-1', hasFilter && 'text-blue-600')}>
          <SlidersHorizontal className={cn('h-3 w-3', hasFilter && 'text-blue-600')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="start">
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground mb-2">{label}</div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {options.map(o => (
              <Button
                key={o.value}
                variant={value === o.value ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start h-7 text-xs"
                onClick={() => onChange(value === o.value ? '' : o.value)}
              >
                {o.label}
              </Button>
            ))}
          </div>
          {hasFilter && (
            <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-red-600 mt-1" onClick={() => onChange('')}>
              <X className="h-3 w-3 mr-1" />Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const RegisterPreviewTable = ({ registers, onAICategorize }: RegisterPreviewTableProps) => {
  const [dataTypeFilter, setDataTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [aiChangedAddresses, setAiChangedAddresses] = useState<Set<number>>(new Set());

  const { categorizeRegisters, loading: aiLoading, progress: aiProgress } = useAIService();

  const uniqueDataTypes = useMemo(() => [...new Set(registers.map(r => r.data_type).filter(Boolean))].sort(), [registers]);
  const uniqueCategories = useMemo(() => [...new Set(registers.map(r => r.category).filter((c): c is string => Boolean(c)))].sort(), [registers]);

  const dataTypeOptions = useMemo(() => uniqueDataTypes.map(dt => ({ value: dt, label: dt })), [uniqueDataTypes]);
  const categoryOptions = useMemo(() => uniqueCategories.map(cat => {
    const info = getCategoryLabel(cat);
    return { value: cat, label: info ? `${info.emoji} ${info.label}` : cat };
  }), [uniqueCategories]);

  const filtered = useMemo(() => registers.filter(r => {
    if (dataTypeFilter && r.data_type !== dataTypeFilter) return false;
    if (categoryFilter && r.category !== categoryFilter) return false;
    if (searchFilter) {
      const s = searchFilter.toLowerCase();
      if (!r.name.toLowerCase().includes(s) && !(r.label || '').toLowerCase().includes(s) && !r.address.toString().includes(s)) return false;
    }
    return true;
  }), [registers, dataTypeFilter, categoryFilter, searchFilter]);

  const hasFilters = dataTypeFilter || categoryFilter || searchFilter;

  const handleAICategorize = async () => {
    const uncategorized = registers.filter(r => !r.category && r.name.trim());
    const toProcess = uncategorized.length > 0 ? uncategorized : registers.filter(r => r.name.trim());

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

      const resultMap = new Map(results.map(r => [r.address, r.category]));
      const changedAddresses = new Set<number>();
      const updatedRegisters = registers.map(reg => {
        const newCategory = resultMap.get(reg.address);
        if (newCategory) {
          changedAddresses.add(reg.address);
          return { ...reg, category: newCategory };
        }
        return reg;
      });

      setAiChangedAddresses(changedAddresses);

      if (onAICategorize) {
        onAICategorize(updatedRegisters);
      }

      toast.success(`AI categorized ${results.length} of ${toProcess.length} registers`);
    } catch (err) {
      toast.error('AI categorization failed: ' + (err as Error).message);
    }
  };

  if (registers.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg border-dashed">
        No registers imported yet. Click "Edit Registers" to add them.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Input placeholder="Search address, name, label..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="h-7 text-xs w-56" />
        <div className="flex items-center gap-2">
          {aiLoading && aiProgress && (
            <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30 text-xs animate-pulse">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Categorizing {aiProgress.current}/{aiProgress.total}...
            </Badge>
          )}
          {onAICategorize && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-violet-600 border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-950/30"
              onClick={handleAICategorize}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Categorizing...</>
              ) : (
                <><Bot className="h-3 w-3 mr-1" />Categorize with AI</>
              )}
            </Button>
          )}
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setDataTypeFilter(''); setCategoryFilter(''); setSearchFilter(''); }}>
              <X className="h-3 w-3 mr-1" />Clear filters
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{filtered.length} of {registers.length}</span>
        </div>
      </div>

      <div className="rounded-md border max-h-[500px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-24">Address</TableHead>
              <TableHead className="w-12">FC</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>
                <div className="flex items-center">
                  Category
                  {categoryOptions.length > 0 && (
                    <HeaderFilter label="Filter by Category" value={categoryFilter} onChange={setCategoryFilter} options={categoryOptions} />
                  )}
                  {categoryFilter && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 ml-1">{getCategoryLabel(categoryFilter)?.emoji}</Badge>}
                </div>
              </TableHead>
              <TableHead className="w-28">
                <div className="flex items-center">
                  Data Type
                  {dataTypeOptions.length > 0 && (
                    <HeaderFilter label="Filter by Data Type" value={dataTypeFilter} onChange={setDataTypeFilter} options={dataTypeOptions} />
                  )}
                  {dataTypeFilter && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 ml-1 font-mono">{dataTypeFilter}</Badge>}
                </div>
              </TableHead>
              <TableHead className="w-16">Scale</TableHead>
              <TableHead className="w-16">Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-sm">
                  {hasFilters ? 'No registers match filters' : 'No registers'}
                </TableCell>
              </TableRow>
            ) : filtered.map((reg, index) => {
              const dtColor = DATA_TYPE_COLORS[reg.data_type?.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
              const catInfo = getCategoryLabel(reg.category);
              const isAiChanged = aiChangedAddresses.has(reg.address);
              return (
                <TableRow key={`${reg.address}-${reg.function_code}-${index}`} className={isAiChanged ? 'bg-violet-50/50 dark:bg-violet-950/20' : undefined}>
                  <TableCell className="font-mono font-medium">{reg.address}</TableCell>
                  <TableCell className="font-mono">{reg.function_code}</TableCell>
                  <TableCell className="font-mono text-xs">{reg.name}</TableCell>
                  <TableCell className="text-sm">{reg.label || '—'}</TableCell>
                  <TableCell>
                    {catInfo ? (
                      <Badge variant="outline" className={cn("text-[10px] gap-1", isAiChanged && "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-300")}>
                        <span>{catInfo.emoji}</span>
                        <span className="truncate max-w-[100px]">{catInfo.label}</span>
                      </Badge>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {reg.data_type ? (
                      <Badge variant="outline" className={`font-mono text-[10px] ${dtColor}`}>{reg.data_type}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{reg.scale !== 1 ? reg.scale : '1'}</TableCell>
                  <TableCell>
                    {reg.unit ? (
                      <Badge variant="outline" className="text-[10px]">{reg.unit}</Badge>
                    ) : '—'}
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