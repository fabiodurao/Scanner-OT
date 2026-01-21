import { useState, useMemo } from 'react';
import { DiscoveredVariable } from '@/types/discovery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SlidersHorizontal, X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoricalHeatmapTableProps {
  variables: DiscoveredVariable[];
}

interface ColumnFilters {
  sourceIp: string;
  address: string;
  fc: string;
  winner: string;
}

const emptyFilters: ColumnFilters = {
  sourceIp: '',
  address: '',
  fc: '',
  winner: '',
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

const formatScore = (score: number | null): string => {
  if (score === null || score === undefined) return '-';
  return (score * 100).toFixed(0) + '%';
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

export const HistoricalHeatmapTable = ({ variables }: HistoricalHeatmapTableProps) => {
  const [filters, setFilters] = useState<ColumnFilters>(emptyFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(200);
  const [isCompactView, setIsCompactView] = useState(false);

  // Filter to only show variables with historical data
  const varsWithHistory = useMemo(() => 
    variables.filter(v => v.winner !== null || v.historical_scores_uint16 !== null),
    [variables]
  );

  const uniqueValues = useMemo(() => ({
    sourceIps: [...new Set(varsWithHistory.map(v => v.source_ip).filter((ip): ip is string => Boolean(ip)))].sort(),
    addresses: [...new Set(varsWithHistory.map(v => v.address?.toString()).filter((addr): addr is string => Boolean(addr)))].sort((a, b) => parseInt(a) - parseInt(b)),
    fcs: [...new Set(varsWithHistory.map(v => v.function_code?.toString()).filter((fc): fc is string => Boolean(fc)))].sort((a, b) => parseInt(a) - parseInt(b)),
    winners: [...new Set(varsWithHistory.map(v => v.winner).filter((w): w is string => Boolean(w)))].sort(),
  }), [varsWithHistory]);

  const filteredVariables = useMemo(() => {
    return varsWithHistory.filter(v => {
      if (filters.sourceIp && !v.source_ip?.toLowerCase().includes(filters.sourceIp.toLowerCase())) return false;
      if (filters.address && !v.address?.toString().includes(filters.address)) return false;
      if (filters.fc && v.function_code?.toString() !== filters.fc) return false;
      if (filters.winner && !v.winner?.toLowerCase().includes(filters.winner.toLowerCase())) return false;
      return true;
    });
  }, [varsWithHistory, filters]);

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
  };

  const updateFilter = (key: keyof ColumnFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Calculate column count for colspan
  const visibleColumnCount = isCompactView ? 4 + dataTypeColumns.length : 5 + dataTypeColumns.length;

  if (varsWithHistory.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
        <p>No variables with AI historical analysis yet.</p>
        <p className="text-sm mt-2">Click "Run AI Analysis" to generate historical scores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Score legend */}
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
              {isCompactView ? 'Show explanation column' : 'Hide explanation column for compact view'}
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
          <table className={cn("w-full", isCompactView ? "min-w-[1400px]" : "min-w-[1800px]")}>
            <thead className="sticky top-0 z-10 bg-slate-100 border-b">
              <tr className="text-xs">
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
                <th className="px-2 py-2 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Winner</span>
                    <FilterButton 
                      label="Winner Type" 
                      value={filters.winner} 
                      onChange={(v) => updateFilter('winner', v)}
                      options={uniqueValues.winners}
                    />
                  </div>
                </th>
                {!isCompactView && (
                  <th className="px-2 py-2 text-left whitespace-nowrap">
                    <span className="font-medium">Explanation</span>
                  </th>
                )}
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
              {paginatedVariables.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount} className="text-center py-8 text-muted-foreground">
                    No variables match the current filters
                  </td>
                </tr>
              ) : (
                paginatedVariables.map((variable) => {
                  return (
                    <tr key={variable.id} className="hover:bg-slate-50 border-b text-xs">
                      <td className="px-2 py-1.5 font-mono text-xs">{variable.source_ip}</td>
                      <td className="px-2 py-1.5 font-mono font-medium">{variable.address}</td>
                      <td className="px-2 py-1.5">
                        <Badge variant="outline" className="font-mono text-[10px] px-1 py-0">
                          {variable.function_code}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5">
                        {variable.winner ? (
                          <Badge className="bg-emerald-100 text-emerald-800 font-mono text-[10px] px-1 py-0">
                            {variable.winner}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      {!isCompactView && (
                        <td className="px-2 py-1.5 max-w-xs">
                          {variable.explanation ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-xs text-muted-foreground truncate cursor-help">
                                  {variable.explanation}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md">
                                <p className="text-xs">{variable.explanation}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      )}

                      {dataTypeColumns.map(col => {
                        const score = variable[col.scoreKey as keyof DiscoveredVariable] as number | null;
                        
                        // Get stats from individual columns
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
                                    "px-1 py-1 rounded text-center text-xs font-medium flex items-center justify-center min-h-[32px] cursor-help",
                                    getScoreColor(score)
                                  )}
                                >
                                  <span className="text-[9px] font-semibold">
                                    {formatScore(score)}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                {hasStats ? (
                                  <div className="space-y-1 text-xs">
                                    <p className="font-medium border-b pb-1">{col.key}</p>
                                    <p>Count: <span className="font-mono">{count}</span></p>
                                    <p>Avg Value: <span className="font-mono">{avgValue?.toFixed(3) || '-'}</span></p>
                                    <p>Std Dev: <span className="font-mono">{std?.toFixed(3) || '-'}</span></p>
                                    <p>Avg Jump: <span className="font-mono">{avgJump?.toFixed(3) || '-'}</span></p>
                                    <p>Max Jump: <span className="font-mono">{maxJump?.toFixed(3) || '-'}</span></p>
                                    <p>Nulls: <span className="font-mono">{nulls ?? '-'}</span></p>
                                    <p>Zeros: <span className="font-mono">{zeros ?? '-'}</span></p>
                                    <p className="border-t pt-1 mt-1">Avg Score: <span className="font-mono font-bold">{formatScore(avgScore)}</span></p>
                                  </div>
                                ) : (
                                  <p className="text-xs">No stats available</p>
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

      {/* Footer info */}
      <div className="text-xs text-muted-foreground">
        {paginatedVariables.length} of {filteredVariables.length} variables
        {hasActiveFilters && ` • filtered from ${varsWithHistory.length}`}
        {isCompactView && ' • Compact view (explanation hidden)'}
      </div>
    </div>
  );
};