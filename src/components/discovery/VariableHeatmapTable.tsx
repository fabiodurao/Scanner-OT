import { useState, useMemo } from 'react';
import { LearningSample } from '@/types/discovery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, SlidersHorizontal, X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface VariableHeatmapTableProps {
  variables: LearningSample[];
  allSourceIps?: string[];
  onFilterBySourceIp?: (ip: string | null) => void;
  isLoadingFiltered?: boolean;
}

interface ColumnFilters {
  sourceIp: string;
  destinationIp: string;
  sourcePort: string;
  destinationPort: string;
  unitId: string;
  address: string;
  fc: string;
  protocol: string;
  bestType: string;
}

const emptyFilters: ColumnFilters = {
  sourceIp: '',
  destinationIp: '',
  sourcePort: '',
  destinationPort: '',
  unitId: '',
  address: '',
  fc: '',
  protocol: '',
  bestType: '',
};

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

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500, 1000];

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

const formatTimestamp = (time: string | null): string => {
  if (!time) return '-';
  try {
    return format(new Date(time), 'MM/dd HH:mm:ss');
  } catch {
    return '-';
  }
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

// Compact filter button component
const FilterButton = ({ 
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
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-5 w-5 p-0",
            hasFilter && "text-blue-600"
          )}
        >
          <SlidersHorizontal className={cn("h-3 w-3", hasFilter && "text-blue-600")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
          <Input
            placeholder={placeholder || `Filter...`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 text-xs"
            autoFocus
          />
          {options && options.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {options.filter(opt => opt.toLowerCase().includes(value.toLowerCase())).slice(0, 10).map(opt => (
                <Button
                  key={opt}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-7 text-xs font-mono"
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
  );
};

export const VariableHeatmapTable = ({ 
  variables, 
  allSourceIps = [],
  onFilterBySourceIp,
  isLoadingFiltered = false,
}: VariableHeatmapTableProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ColumnFilters>(emptyFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(200);
  const [isCompactView, setIsCompactView] = useState(false);
  
  const groupedVariables = useMemo(() => groupVariables(variables), [variables]);
  
  const uniqueValues = useMemo(() => {
    const sourceIpsFromData = [...new Set(groupedVariables.map(v => v.SourceIp).filter((ip): ip is string => Boolean(ip)))];
    const sourceIps = allSourceIps.length > 0 ? allSourceIps : sourceIpsFromData;
    
    return {
      sourceIps: sourceIps.sort(),
      destinationIps: [...new Set(groupedVariables.map(v => v.DestinationIp).filter((ip): ip is string => Boolean(ip)))].sort(),
      sourcePorts: [...new Set(groupedVariables.map(v => v.SourcePort?.toString()).filter((p): p is string => Boolean(p)))].sort((a, b) => parseInt(a) - parseInt(b)),
      destinationPorts: [...new Set(groupedVariables.map(v => v.DestinationPort?.toString()).filter((p): p is string => Boolean(p)))].sort((a, b) => parseInt(a) - parseInt(b)),
      unitIds: [...new Set(groupedVariables.map(v => v.unid_Id?.toString()).filter((id): id is string => Boolean(id)))].sort(),
      addresses: [...new Set(groupedVariables.map(v => v.Address?.toString()).filter((addr): addr is string => Boolean(addr)))].sort((a, b) => parseInt(a) - parseInt(b)),
      fcs: [...new Set(groupedVariables.map(v => v.FC?.toString()).filter((fc): fc is string => Boolean(fc)))].sort((a, b) => parseInt(a) - parseInt(b)),
      protocols: [...new Set(groupedVariables.map(v => v.Protocol).filter((p): p is string => Boolean(p)))].sort(),
      bestTypes: [...new Set(groupedVariables.map(v => v['Best Type']).filter((t): t is string => Boolean(t)))].sort(),
    };
  }, [groupedVariables, allSourceIps]);
  
  const filteredVariables = useMemo(() => {
    return groupedVariables.filter(v => {
      if (filters.sourceIp && !v.SourceIp?.toLowerCase().includes(filters.sourceIp.toLowerCase())) return false;
      if (filters.destinationIp && !v.DestinationIp?.toLowerCase().includes(filters.destinationIp.toLowerCase())) return false;
      if (filters.sourcePort && v.SourcePort?.toString() !== filters.sourcePort) return false;
      if (filters.destinationPort && v.DestinationPort?.toString() !== filters.destinationPort) return false;
      if (filters.unitId && v.unid_Id?.toString() !== filters.unitId) return false;
      if (filters.address && !v.Address?.toString().includes(filters.address)) return false;
      if (filters.fc && v.FC?.toString() !== filters.fc) return false;
      if (filters.protocol && !v.Protocol?.toLowerCase().includes(filters.protocol.toLowerCase())) return false;
      if (filters.bestType && v['Best Type'] !== filters.bestType) return false;
      return true;
    });
  }, [groupedVariables, filters]);
  
  // Pagination
  const totalPages = Math.ceil(filteredVariables.length / pageSize);
  const paginatedVariables = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVariables.slice(start, start + pageSize);
  }, [filteredVariables, currentPage, pageSize]);
  
  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [filters, pageSize]);
  
  const hasActiveFilters = Object.values(filters).some(f => f.length > 0);
  
  const clearAllFilters = () => {
    setFilters(emptyFilters);
    setCurrentPage(1);
    if (onFilterBySourceIp) {
      onFilterBySourceIp(null);
    }
  };
  
  const updateFilter = (key: keyof ColumnFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    
    // If filtering by sourceIp and we have a callback, trigger server-side filter
    if (key === 'sourceIp' && onFilterBySourceIp) {
      onFilterBySourceIp(value || null);
    }
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
  
  const sourceIpsInData = new Set(groupedVariables.map(v => v.SourceIp).filter(Boolean)).size;
  const totalSourceIps = uniqueValues.sourceIps.length;

  // Pagination controls
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Calculate column count for colspan
  // Compact: expand + sourceIp + address + protocol + bestType + timestamp + 14 data types = 20
  // Full: expand + sourceIp + destIp + srcPort + dstPort + unit + address + FC + protocol + N + bestType + HEX + timestamp + 14 data types = 27
  const visibleColumnCount = isCompactView ? 6 + dataTypeColumns.length : 13 + dataTypeColumns.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <span className="text-muted-foreground">Score:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#00B050]" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#B5E61D]" />
            <span>Good</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#FFC000]" />
            <span>Med</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#FF5722]" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#FF0000]" />
            <span>Poor</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {sourceIpsInData < totalSourceIps && (
            <span className="text-xs text-amber-600">
              {sourceIpsInData}/{totalSourceIps} IPs shown
            </span>
          )}
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearAllFilters} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" />
              Clear filters
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={isCompactView ? "default" : "outline"} 
                size="sm" 
                onClick={() => setIsCompactView(!isCompactView)} 
                className="h-7 text-xs"
              >
                {isCompactView ? (
                  <>
                    <Maximize2 className="h-3 w-3 mr-1" />
                    Full View
                  </>
                ) : (
                  <>
                    <Minimize2 className="h-3 w-3 mr-1" />
                    Compact
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isCompactView ? 'Show all columns (Dest IP, Ports, Unit, FC, N, HEX)' : 'Hide extra columns for compact view'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      
      {/* Pagination controls - top */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows:</span>
          <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
            <SelectTrigger className="w-16 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(size => (
                <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {filteredVariables.length > 0 ? (
              <>
                {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredVariables.length)} of {filteredVariables.length}
              </>
            ) : (
              '0 results'
            )}
          </span>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs px-1">
              {currentPage}/{totalPages || 1}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage >= totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
          <table className={cn("w-full", isCompactView ? "min-w-[1300px]" : "min-w-[2100px]")}>
            <thead className="sticky top-0 z-10 bg-slate-100 border-b">
              <tr className="text-xs">
                <th className="w-8 px-1 py-2"></th>
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Source IP</span>
                    <FilterButton 
                      label="Source IP"
                      value={filters.sourceIp} 
                      onChange={(v) => updateFilter('sourceIp', v)}
                      options={uniqueValues.sourceIps}
                    />
                  </div>
                </th>
                {!isCompactView && (
                  <th className="px-2 py-2 text-left whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Dest IP</span>
                      <FilterButton 
                        label="Destination IP" 
                        value={filters.destinationIp} 
                        onChange={(v) => updateFilter('destinationIp', v)}
                        options={uniqueValues.destinationIps}
                      />
                    </div>
                  </th>
                )}
                {!isCompactView && (
                  <th className="px-2 py-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-medium">Src Port</span>
                      <FilterButton 
                        label="Source Port" 
                        value={filters.sourcePort} 
                        onChange={(v) => updateFilter('sourcePort', v)}
                        options={uniqueValues.sourcePorts}
                      />
                    </div>
                  </th>
                )}
                {!isCompactView && (
                  <th className="px-2 py-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-medium">Dst Port</span>
                      <FilterButton 
                        label="Destination Port" 
                        value={filters.destinationPort} 
                        onChange={(v) => updateFilter('destinationPort', v)}
                        options={uniqueValues.destinationPorts}
                      />
                    </div>
                  </th>
                )}
                {!isCompactView && (
                  <th className="px-2 py-2 text-left whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Unit</span>
                      <FilterButton 
                        label="Unit ID" 
                        value={filters.unitId} 
                        onChange={(v) => updateFilter('unitId', v)}
                        options={uniqueValues.unitIds}
                      />
                    </div>
                  </th>
                )}
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Address</span>
                    <FilterButton 
                      label="Address" 
                      value={filters.address} 
                      onChange={(v) => updateFilter('address', v)}
                      options={uniqueValues.addresses}
                    />
                  </div>
                </th>
                {!isCompactView && (
                  <th className="px-2 py-2 text-left whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">FC</span>
                      <FilterButton 
                        label="Function Code" 
                        value={filters.fc} 
                        onChange={(v) => updateFilter('fc', v)}
                        options={uniqueValues.fcs}
                      />
                    </div>
                  </th>
                )}
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Protocol</span>
                    <FilterButton 
                      label="Protocol" 
                      value={filters.protocol} 
                      onChange={(v) => updateFilter('protocol', v)}
                      options={uniqueValues.protocols}
                    />
                  </div>
                </th>
                {!isCompactView && (
                  <th className="px-1 py-2 text-center whitespace-nowrap">
                    <span className="font-medium">N</span>
                  </th>
                )}
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Best Type</span>
                    <FilterButton 
                      label="Best Type" 
                      value={filters.bestType} 
                      onChange={(v) => updateFilter('bestType', v)}
                      options={uniqueValues.bestTypes}
                    />
                  </div>
                </th>
                {!isCompactView && (
                  <th className="px-2 py-2 text-left whitespace-nowrap">
                    <span className="font-medium">HEX</span>
                  </th>
                )}
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <span className="font-medium">Timestamp</span>
                </th>
                {dataTypeColumns.map(col => (
                  <Tooltip key={col.key}>
                    <TooltipTrigger asChild>
                      <th className="px-1 py-2 text-center whitespace-nowrap font-medium cursor-help text-xs">
                        {col.label}
                      </th>
                    </TooltipTrigger>
                    <TooltipContent>{col.key}</TooltipContent>
                  </Tooltip>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoadingFiltered ? (
                <tr>
                  <td colSpan={visibleColumnCount} className="text-center py-8 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : paginatedVariables.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount} className="text-center py-8 text-muted-foreground">
                    No variables match the current filters
                  </td>
                </tr>
              ) : (
                paginatedVariables.map((variable) => {
                  const rowKey = `${variable.SourceIp}-${variable.DestinationIp}-${variable.Address}-${variable.FC}`;
                  const isExpanded = expandedRows.has(rowKey);
                  const hexLines = formatHex(variable.HEX);
                  
                  return (
                    <tr 
                      key={rowKey} 
                      className="hover:bg-slate-50 cursor-pointer border-b text-xs"
                      onClick={() => toggleRow(rowKey)}
                    >
                      <td className="px-1 py-1.5">
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </Button>
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs">{variable.SourceIp || '-'}</td>
                      {!isCompactView && (
                        <td className="px-2 py-1.5 font-mono text-xs">{variable.DestinationIp || '-'}</td>
                      )}
                      {!isCompactView && (
                        <td className="px-2 py-1.5 font-mono text-center text-xs">{variable.SourcePort || '-'}</td>
                      )}
                      {!isCompactView && (
                        <td className="px-2 py-1.5 font-mono text-center text-xs">{variable.DestinationPort || '-'}</td>
                      )}
                      {!isCompactView && (
                        <td className="px-2 py-1.5 font-mono">{variable.unid_Id ?? '-'}</td>
                      )}
                      <td className="px-2 py-1.5 font-mono font-medium">{variable.Address}</td>
                      {!isCompactView && (
                        <td className="px-2 py-1.5">
                          <Badge variant="outline" className="font-mono text-[10px] px-1 py-0">{variable.FC}</Badge>
                        </td>
                      )}
                      <td className="px-2 py-1.5">
                        {variable.Protocol ? (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">{variable.Protocol}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      {!isCompactView && (
                        <td className="px-1 py-1.5 text-center">
                          <Badge variant="secondary" className="font-mono text-[10px] px-1 py-0">{variable.sampleCount}</Badge>
                        </td>
                      )}
                      <td className="px-2 py-1.5">
                        {variable['Best Type'] ? (
                          <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1 py-0">{variable['Best Type']}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      {!isCompactView && (
                        <td className="px-2 py-1.5 font-mono text-[9px] leading-tight">
                          <div className="flex flex-col">
                            {hexLines.map((line, i) => (
                              <span key={i} className="whitespace-nowrap">{line}</span>
                            ))}
                          </div>
                        </td>
                      )}
                      <td className="px-2 py-1.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(variable.time)}
                      </td>
                      {dataTypeColumns.map(col => {
                        const score = variable[col.scoreKey as keyof LearningSample] as number | null;
                        const value = variable[col.key as keyof LearningSample] as number | null;
                        
                        return (
                          <td key={col.key} className="px-0.5 py-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div 
                                  className={cn(
                                    "px-1 py-1 rounded text-center text-xs font-medium flex flex-col items-center justify-center min-h-[40px]",
                                    getScoreColor(score)
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
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-medium">{col.key}</p>
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
      
      {/* Footer info */}
      <div className="text-xs text-muted-foreground">
        {paginatedVariables.length} of {filteredVariables.length} variables ({uniqueAddresses} addresses)
        {hasActiveFilters && ` • filtered from ${groupedVariables.length}`}
        {' '}• {variables.length} samples
        {isCompactView && ' • Compact view (7 columns hidden)'}
      </div>
    </div>
  );
};