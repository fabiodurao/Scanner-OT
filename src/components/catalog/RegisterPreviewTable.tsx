import { useState, useMemo } from 'react';
import { CatalogRegister, REGISTER_CATEGORIES } from '@/types/catalog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, X } from 'lucide-react';

interface RegisterPreviewTableProps {
  registers: CatalogRegister[];
}

const DATA_TYPE_COLORS: Record<string, string> = {
  boolean:   'bg-slate-100 text-slate-700 border-slate-300',
  uint16:    'bg-blue-100 text-blue-700 border-blue-300',
  int16:     'bg-sky-100 text-sky-700 border-sky-300',
  uint32be:  'bg-indigo-100 text-indigo-700 border-indigo-300',
  uint32le:  'bg-indigo-100 text-indigo-700 border-indigo-300',
  int32be:   'bg-violet-100 text-violet-700 border-violet-300',
  int32le:   'bg-violet-100 text-violet-700 border-violet-300',
  float32be: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  float32le: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  uint64be:  'bg-amber-100 text-amber-700 border-amber-300',
  uint64le:  'bg-amber-100 text-amber-700 border-amber-300',
  int64be:   'bg-orange-100 text-orange-700 border-orange-300',
  int64le:   'bg-orange-100 text-orange-700 border-orange-300',
  float64be: 'bg-rose-100 text-rose-700 border-rose-300',
  float64le: 'bg-rose-100 text-rose-700 border-rose-300',
};

const getCategoryLabel = (value: string | undefined): { label: string; emoji: string } | null => {
  if (!value) return null;
  const cat = REGISTER_CATEGORIES.find(c => c.value === value);
  return cat ? { label: cat.label, emoji: cat.emoji } : { label: value, emoji: '📋' };
};

export const RegisterPreviewTable = ({ registers }: RegisterPreviewTableProps) => {
  const [search, setSearch] = useState('');
  const [dataTypeFilter, setDataTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const uniqueDataTypes = useMemo(() => [...new Set(registers.map(r => r.data_type).filter(Boolean))].sort(), [registers]);
  const uniqueCategories = useMemo(() => [...new Set(registers.map(r => r.category).filter((c): c is string => Boolean(c)))].sort(), [registers]);

  const filtered = useMemo(() => registers.filter(r => {
    if (dataTypeFilter !== 'all' && r.data_type !== dataTypeFilter) return false;
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.name.toLowerCase().includes(s) && !(r.label || '').toLowerCase().includes(s) && !r.address.toString().includes(s)) return false;
    }
    return true;
  }), [registers, search, dataTypeFilter, categoryFilter]);

  const hasFilters = search || dataTypeFilter !== 'all' || categoryFilter !== 'all';

  if (registers.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg border-dashed">
        No registers imported yet. Click "Edit Registers" to add them.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search address, name, label..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
        </div>
        <Select value={dataTypeFilter} onValueChange={setDataTypeFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Data Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {uniqueDataTypes.map(dt => (
              <SelectItem key={dt} value={dt}>
                <span className="font-mono">{dt}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {uniqueCategories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map(cat => {
                const info = getCategoryLabel(cat);
                return (
                  <SelectItem key={cat} value={cat}>
                    {info ? `${info.emoji} ${info.label}` : cat}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearch(''); setDataTypeFilter('all'); setCategoryFilter('all'); }}>
            <X className="h-3 w-3 mr-1" />Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {registers.length}</span>
      </div>

      <div className="rounded-md border max-h-[500px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-slate-50 z-10">
            <TableRow>
              <TableHead className="w-20">Address</TableHead>
              <TableHead className="w-12">FC</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-24">Data Type</TableHead>
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
              const dtColor = DATA_TYPE_COLORS[reg.data_type?.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-300';
              const catInfo = getCategoryLabel(reg.category);
              return (
                <TableRow key={`${reg.address}-${reg.function_code}-${index}`}>
                  <TableCell className="font-mono font-medium">{reg.address}</TableCell>
                  <TableCell className="font-mono">{reg.function_code}</TableCell>
                  <TableCell className="font-mono text-xs">{reg.name}</TableCell>
                  <TableCell className="text-sm">{reg.label || '—'}</TableCell>
                  <TableCell>
                    {catInfo ? (
                      <Badge variant="outline" className="text-[10px] gap-1">
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