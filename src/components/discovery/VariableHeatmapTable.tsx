import { useState, useMemo } from 'react';
import { LearningSample } from '@/types/discovery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, ChevronRight, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VariableHeatmapTableProps {
  variables: LearningSample[];
}

interface ColumnFilters {
  sourceIp: string;
  destinationIp: string;
  unitId: string;
  address: string;
  fc: string;
  protocol: string;
  bestType: string;
}

const emptyFilters: ColumnFilters = {
  sourceIp: '',
  destinationIp: '',
  unitId: '',
  address: '',
  fc: '',
  protocol: '',
  bestType: '',
};

// All data type columns for heatmap
const dataTypeColumns = [
  { key: 'UINT16', scoreKey: 'score_uint16', label: 'UINT16' },
  { key: 'INT16', scoreKey: 'score_int16', label: 'INT16' },
  { key: 'UINT32BE', scoreKey: 'score_uint32be', label: 'UINT32BE' },
  { key: 'UINT32LE', scoreKey: 'score_uint32le', label: 'UINT32LE' },
  { key: 'INT32BE', scoreKey: 'score_int32be', label: 'INT32BE' },
  { key: 'INT32LE', scoreKey: 'score_int32le', label: 'INT32LE' },
  { key: 'FLOAT32BE', scoreKey: 'score_float32be', label: 'FLOAT32BE' },
  { key: 'FLOAT32LE', scoreKey: 'score_float32le', label: 'FLOAT32LE' },
  { key: 'UINT64BE', scoreKey: 'score_uint64be', label: 'UINT64BE' },
  { key: 'UINT64LE', scoreKey: 'score_uint64le', label: 'UINT64LE' },
  { key: 'INT64BE', scoreKey: 'score_int64be', label: 'INT64BE' },
  { key: 'INT64LE', scoreKey: 'score_int64le', label: 'INT64LE' },
  { key: 'FLOAT64BE', scoreKey: 'score_float64be', label: 'FLOAT64BE' },
  { key: 'FLOAT64LE', scoreKey: 'score_float64le', label: 'FLOAT64LE' },
] as const;

// 20-tone gradient from red to green
const getScoreColor = (score: number | null): string => {
  if (score === null || score === undefined) return 'bg-gray-200 text-gray-500';
  const normalizedScore = Math.min(1, Math.max(0, score));
  if (normalizedScore >= 0.95) return 'bg-[#00B050] text-white';
  if (normalizedScore >= 0.90) return 'bg-[#17B169] text-white';
  if (normalizedScore >= 0.85) return 'bg-[#2DC97A] text-white';
  if (normalizedScore >= 0.80) return 'bg-[#5DD55D] text-black';
  if (normalizedScore >= 0.75) return 'bg-[#8DE28D] text-black';
  if (normalizedScore >= 0.70) return 'bg-[#B5E61D] text-black';
  if (normalizedScore >= 0.65) return 'bg-[#D4ED26] text-black';
  if (normalizedScore >= 0.60) return 'bg-[#FFFF00] text-black';
  if (normalizedScore >= 0.55) return 'bg-[#FFE135] text-black';
  if (normalizedScore >= 0.50) return 'bg-[#FFC000] text-black';
  if (normalizedScore >= 0.45) return 'bg-[#FFA500] text-black';
  if (normalizedScore >= 0.40) return 'bg-[#FF8C00] text-black';
  if (normalizedScore >= 0.35) return 'bg-[#FF7518] text-white';
  if (normalizedScore >= 0.30) return 'bg-[#FF5722] text-white';
  if (normalizedScore >= 0.25) return 'bg-[#FF4500] text-white';
  if (normalizedScore >= 0.20) return 'bg-[#FF3300] text-white';
  if (normalizedScore >= 0.15) return 'bg-[#FF1A1A] text-white';
  if (normalizedScore >= 0.10) return 'bg-[#FF0000] text-white';
  if (normalizedScore >= 0.05) return 'bg-[#E60000] text-white';
  if (normalizedScore > 0) return 'bg-[#CC0000] text-white';
  return 'bg-gray-200 text-gray-500';
};

const formatValue = (value: number | null, type: string): string => {
  if (value === null || value === undefined) return '-';
  if (type.includes('FLOAT')) {
    if (!isFinite(value) || Math.abs(value) > 1e15) return 'Invalid';
    if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(2);
    return value.toFixed(3);
  }
  return value.toLocaleString();
};

const formatScore = (score: number | null): string => {
  if (score === null || score === undefined) return '-';
  return (score * 100).toFixed(0) + '%';
};

const formatHex = (hex: string | null): string[] => {
  if (!hex) return ['-'];
  const cleanHex = hex.replace(/\s/g, '').toUpperCase();
  const lines: string[] = [];
  for (let i = 0; i < cleanHex.length; i += 8) {
    const chunk = cleanHex.slice(i, i + 8);
    const formatted = chunk.match(/.{1,2}/g)?.join(' ') || chunk;
    lines.push(formatted);
  }
  return lines.length > 0 ? lines : ['-'];
};

const groupVariables = (variables: LearningSample[]) => {
  const grouped = new Map<string, LearningSample[]>();
  for (const v of variables) {
    const key = `${v.SourceIp}-${v.DestinationIp}-${v.Address}-${v.FC}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(v);
  }
  const result: Array<LearningSample & { sampleCount: number }> = [];
  for (const [, samples] of grouped) {
    samples.sort((a, b) => {
      const timeA = a.time ? new Date(a.time).getTime() : 0;
      const timeB = b.time ? new Date(b.time).getTime() : 0;
      return timeB - timeA;
    });
    result.push({ ...samples[0], sampleCount: samples.length });
  }
  result.sort((a, b) => {
    if (a.SourceIp !== b.SourceIp) return (a.SourceIp || '').localeCompare(b.SourceIp || '');
    if (a.DestinationIp !== b.DestinationIp) return (a.DestinationIp || '').localeCompare(b.DestinationIp || '');
    return (a.Address || 0) - (b.Address || 0);
  });
  return result;
};

// Filter header component
const FilterHeader = ({ 
  label, 
  value, 
  onChange, 
  placeholder,
  options,
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
  placeholder?: string;
  options?: string[];
}) => {
  const hasFilter = value.length > 0;
  
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "h-6 px-2 text-xs justify-start font-normal",
              hasFilter && "bg-blue-100 text-blue-700"
            )}
          >
            <Filter className={cn("h-3 w-3 mr-1", hasFilter && "text-blue-600")} />
            {hasFilter ? value : 'Filter'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-2">
            <Input
              placeholder={placeholder || `Filter ${label}...`}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 text-xs"
            />
            {options && options.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {options.filter(opt => opt.toLowerCase().includes(value.toLowerCase())).slice(0, 10).map(opt => (
                  <Button
                    key={opt}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7 text-xs"
                    onClick={() => onChange(opt)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            )}
            {hasFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-red-600"
                onClick={() => onChange('')}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export const VariableHeatmapTable = ({ variables }: VariableHeatmapTableProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ColumnFilters>(emptyFilters);
  
  const groupedVariables = useMemo(() => groupVariables(variables), [variables]);
  
  // Get unique values for filter dropdowns
  const uniqueValues = useMemo(() => ({
    sourceIps: [...new Set(groupedVariables.map(v => v.SourceIp).filter(Boolean))] as string[],
    destinationIps: [...new Set(groupedVariables.map(v => v.DestinationIp).filter(Boolean))] as string[],
    unitIds: [...new Set(groupedVariables.map(v => v.unid_Id?.toString()).filter(Boolean))] as string[],
    addresses: [...new Set(groupedVariables.map(v => v.Address?.toString()).filter(Boolean))] as string[],
    fcs: [...new Set(groupedVariables.map(v => v.FC?.toString()).filter(Boolean))] as string[],
    protocols: [...new Set(groupedVariables.map(v => v.Protocol).filter(Boolean))] as string[],
    bestTypes: [...new Set(groupedVariables.map(v => v['Best Type']).filter(Boolean))] as string[],
  }), [groupedVariables]);
  
  // Apply filters
  const filteredVariables = useMemo(() => {
    return groupedVariables.filter(v => {
      if (filters.sourceIp && !v.SourceIp?.toLowerCase().includes(filters.sourceIp.toLowerCase())) return false;
      if (filters.destinationIp && !v.DestinationIp?.toLowerCase().includes(filters.destinationIp.toLowerCase())) return false;
      if (filters.unitId && v.unid_Id?.toString() !== filters.unitId) return false;
      if (filters.address && !v.Address?.toString().includes(filters.address)) return false;
      if (filters.fc && v.FC?.toString() !== filters.fc) return false;
      if (filters.protocol && !v.Protocol?.toLowerCase().includes(filters.protocol.toLowerCase())) return false;
      if (filters.bestType && v['Best Type'] !== filters.bestType) return false;
      return true;
    });
  }, [groupedVariables, filters]);
  
  const hasActiveFilters = Object.values(filters).some(f => f.length > 0);
  
  const clearAllFilters = () => setFilters(emptyFilters);
  
  const updateFilter = (key: keyof ColumnFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const uniqueAddresses = new Set(filteredVariables.map(v => `${v.SourceIp}-${v.Address}`)).size;

  return (
    <div className="space-y-4">
      {/* Legend and filter status */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <span className="text-muted-foreground">Score Legend:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[#00B050]" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[#B5E61D]" />
            <span>Good</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[#FFC000]" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[#FF5722]" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[#FF0000]" />
            <span>Poor</span>
          </div>
        </div>
        
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearAllFilters} className="h-7 text-xs">
            <X className="h-3 w-3 mr-1" />
            Clear all filters
          </Button>
        )}
      </div>
      
      {/* Table with sticky header */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full min-w-[2000px]">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b">
              <tr>
                <th className="w-10 px-2 py-2"></th>
                <th className="w-28 px-2 py-2 text-left">
                  <FilterHeader 
                    label="Source IP" 
                    value={filters.sourceIp} 
                    onChange={(v) => updateFilter('sourceIp', v)}
                    options={uniqueValues.sourceIps}
                  />
                </th>
                <th className="w-28 px-2 py-2 text-left">
                  <FilterHeader 
                    label="Destination IP" 
                    value={filters.destinationIp} 
                    onChange={(v) => updateFilter('destinationIp', v)}
                    options={uniqueValues.destinationIps}
                  />
                </th>
                <th className="w-16 px-2 py-2 text-left">
                  <FilterHeader 
                    label="Unit" 
                    value={filters.unitId} 
                    onChange={(v) => updateFilter('unitId', v)}
                    options={uniqueValues.unitIds}
                  />
                </th>
                <th className="w-20 px-2 py-2 text-left">
                  <FilterHeader 
                    label="Address" 
                    value={filters.address} 
                    onChange={(v) => updateFilter('address', v)}
                    options={uniqueValues.addresses}
                  />
                </th>
                <th className="w-12 px-2 py-2 text-left">
                  <FilterHeader 
                    label="FC" 
                    value={filters.fc} 
                    onChange={(v) => updateFilter('fc', v)}
                    options={uniqueValues.fcs}
                  />
                </th>
                <th className="w-20 px-2 py-2 text-left">
                  <FilterHeader 
                    label="Protocol" 
                    value={filters.protocol} 
                    onChange={(v) => updateFilter('protocol', v)}
                    options={uniqueValues.protocols}
                  />
                </th>
                <th className="w-16 px-2 py-2 text-center">
                  <span className="text-xs font-medium text-muted-foreground">Samples</span>
                </th>
                <th className="w-20 px-2 py-2 text-left">
                  <FilterHeader 
                    label="Best Type" 
                    value={filters.bestType} 
                    onChange={(v) => updateFilter('bestType', v)}
                    options={uniqueValues.bestTypes}
                  />
                </th>
                <th className="w-24 px-2 py-2 text-left">
                  <span className="text-xs font-medium text-muted-foreground">HEX</span>
                </th>
                {dataTypeColumns.map(col => (
                  <th key={col.key} className="w-24 px-1 py-2 text-center text-xs font-medium text-muted-foreground">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredVariables.length === 0 ? (
                <tr>
                  <td colSpan={10 + dataTypeColumns.length} className="text-center py-8 text-muted-foreground">
                    No variables match the current filters
                  </td>
                </tr>
              ) : (
                filteredVariables.map((variable) => {
                  const rowKey = `${variable.SourceIp}-${variable.DestinationIp}-${variable.Address}-${variable.FC}`;
                  const isExpanded = expandedRows.has(rowKey);
                  const hexLines = formatHex(variable.HEX);
                  
                  return (
                    <tr 
                      key={rowKey} 
                      className="hover:bg-slate-50 cursor-pointer border-b"
                      onClick={() => toggleRow(rowKey)}
                    >
                      <td className="px-2 py-2">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </td>
                      <td className="px-2 py-2 font-mono text-xs">{variable.SourceIp || '-'}</td>
                      <td className="px-2 py-2 font-mono text-xs">{variable.DestinationIp || '-'}</td>
                      <td className="px-2 py-2 font-mono text-sm">{variable.unid_Id ?? '-'}</td>
                      <td className="px-2 py-2 font-mono text-sm font-medium">{variable.Address}</td>
                      <td className="px-2 py-2">
                        <Badge variant="outline" className="font-mono text-xs">{variable.FC}</Badge>
                      </td>
                      <td className="px-2 py-2">
                        {variable.Protocol ? (
                          <Badge variant="secondary" className="text-xs">{variable.Protocol}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Badge variant="secondary" className="font-mono text-xs">{variable.sampleCount}</Badge>
                      </td>
                      <td className="px-2 py-2">
                        {variable['Best Type'] ? (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">{variable['Best Type']}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 font-mono text-[10px] leading-tight">
                        <div className="flex flex-col">
                          {hexLines.map((line, i) => (
                            <span key={i} className="whitespace-nowrap">{line}</span>
                          ))}
                        </div>
                      </td>
                      {dataTypeColumns.map(col => {
                        const score = variable[col.scoreKey as keyof LearningSample] as number | null;
                        const value = variable[col.key as keyof LearningSample] as number | null;
                        
                        return (
                          <td key={col.key} className="px-1 py-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div 
                                  className={cn(
                                    "px-1 py-1 rounded text-center text-xs font-medium flex flex-col items-center justify-center min-h-[44px]",
                                    getScoreColor(score)
                                  )}
                                >
                                  <span className="text-[10px] font-semibold leading-tight">
                                    {formatValue(value, col.key)}
                                  </span>
                                  <span className="text-[9px] mt-0.5 px-1.5 py-0.5 rounded bg-black/10 backdrop-blur-sm">
                                    {formatScore(score)}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-medium">{col.label}</p>
                                  <p>Value: {formatValue(value, col.key)}</p>
                                  <p>Score: {score !== null ? (score * 100).toFixed(1) + '%' : 'N/A'}</p>
                                </div>
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
      
      <div className="text-xs text-muted-foreground text-center">
        Showing {filteredVariables.length} unique variables ({uniqueAddresses} addresses) 
        {hasActiveFilters && ` (filtered from ${groupedVariables.length})`}
        {' '}from {variables.length} total samples
      </div>
    </div>
  );
};