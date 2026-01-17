import { useState } from 'react';
import { LearningSample } from '@/types/discovery';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VariableHeatmapTableProps {
  variables: LearningSample[];
}

// All data type columns for heatmap - full names in uppercase
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
  if (score === null || score === undefined) return 'bg-slate-100 text-slate-400';
  
  // Normalize score to 0-1 range
  const normalizedScore = Math.min(1, Math.max(0, score));
  
  // 20 tones from red (0) to green (1)
  if (normalizedScore >= 0.95) return 'bg-emerald-600 text-white';
  if (normalizedScore >= 0.90) return 'bg-emerald-500 text-white';
  if (normalizedScore >= 0.85) return 'bg-emerald-400 text-white';
  if (normalizedScore >= 0.80) return 'bg-green-500 text-white';
  if (normalizedScore >= 0.75) return 'bg-green-400 text-green-950';
  if (normalizedScore >= 0.70) return 'bg-lime-500 text-lime-950';
  if (normalizedScore >= 0.65) return 'bg-lime-400 text-lime-950';
  if (normalizedScore >= 0.60) return 'bg-yellow-400 text-yellow-950';
  if (normalizedScore >= 0.55) return 'bg-yellow-500 text-yellow-950';
  if (normalizedScore >= 0.50) return 'bg-amber-400 text-amber-950';
  if (normalizedScore >= 0.45) return 'bg-amber-500 text-amber-950';
  if (normalizedScore >= 0.40) return 'bg-orange-400 text-orange-950';
  if (normalizedScore >= 0.35) return 'bg-orange-500 text-white';
  if (normalizedScore >= 0.30) return 'bg-orange-600 text-white';
  if (normalizedScore >= 0.25) return 'bg-red-400 text-white';
  if (normalizedScore >= 0.20) return 'bg-red-500 text-white';
  if (normalizedScore >= 0.15) return 'bg-red-600 text-white';
  if (normalizedScore >= 0.10) return 'bg-red-700 text-white';
  if (normalizedScore >= 0.05) return 'bg-red-800 text-white';
  if (normalizedScore > 0) return 'bg-red-900 text-white';
  return 'bg-slate-100 text-slate-400';
};

// Format value for display
const formatValue = (value: number | null, type: string): string => {
  if (value === null || value === undefined) return '-';
  
  if (type.includes('FLOAT')) {
    // Check if it's a reasonable float value
    if (!isFinite(value) || Math.abs(value) > 1e15) {
      return 'Invalid';
    }
    // Show more precision for small values
    if (Math.abs(value) < 0.01 && value !== 0) {
      return value.toExponential(2);
    }
    return value.toFixed(3);
  }
  
  // For integers, show with thousand separators
  return value.toLocaleString();
};

// Format score as percentage
const formatScore = (score: number | null): string => {
  if (score === null || score === undefined) return '-';
  return (score * 100).toFixed(0) + '%';
};

// Group variables by source IP, destination IP, address, and FC - count samples per group
const groupVariables = (variables: LearningSample[]) => {
  const grouped = new Map<string, LearningSample[]>();
  
  for (const v of variables) {
    const key = `${v.SourceIp}-${v.DestinationIp}-${v.Address}-${v.FC}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(v);
  }
  
  // Return the most recent sample for each group, along with sample count
  const result: Array<LearningSample & { sampleCount: number }> = [];
  for (const [, samples] of grouped) {
    // Sort by time descending and take the first (most recent)
    samples.sort((a, b) => {
      const timeA = a.time ? new Date(a.time).getTime() : 0;
      const timeB = b.time ? new Date(b.time).getTime() : 0;
      return timeB - timeA;
    });
    result.push({ ...samples[0], sampleCount: samples.length });
  }
  
  // Sort by destination IP, then source IP, then address
  result.sort((a, b) => {
    if (a.DestinationIp !== b.DestinationIp) {
      return (a.DestinationIp || '').localeCompare(b.DestinationIp || '');
    }
    if (a.SourceIp !== b.SourceIp) {
      return (a.SourceIp || '').localeCompare(b.SourceIp || '');
    }
    return (a.Address || 0) - (b.Address || 0);
  });
  
  return result;
};

export const VariableHeatmapTable = ({ variables }: VariableHeatmapTableProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const groupedVariables = groupVariables(variables);
  
  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Calculate total unique addresses
  const uniqueAddresses = new Set(groupedVariables.map(v => `${v.DestinationIp}-${v.Address}`)).size;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <span className="text-muted-foreground">Score Legend (20 tones):</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-emerald-500" />
          <span>High (≥0.9)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-lime-500" />
          <span>Good (0.7-0.9)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-amber-500" />
          <span>Medium (0.5-0.7)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-orange-500" />
          <span>Low (0.3-0.5)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-red-600" />
          <span>Poor (&lt;0.3)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-slate-100 border" />
          <span>N/A</span>
        </div>
      </div>
      
      <ScrollArea className="w-full">
        <div className="min-w-[1800px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-28">Source IP</TableHead>
                <TableHead className="w-28">Destination IP</TableHead>
                <TableHead className="w-16">Unit</TableHead>
                <TableHead className="w-20">Address</TableHead>
                <TableHead className="w-12">FC</TableHead>
                <TableHead className="w-16">Samples</TableHead>
                <TableHead className="w-20">Best Type</TableHead>
                <TableHead className="w-28">HEX</TableHead>
                {dataTypeColumns.map(col => (
                  <TableHead key={col.key} className="w-24 text-center text-xs">
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedVariables.map((variable) => {
                const rowKey = `${variable.SourceIp}-${variable.DestinationIp}-${variable.Address}-${variable.FC}`;
                const isExpanded = expandedRows.has(rowKey);
                
                return (
                  <TableRow 
                    key={rowKey} 
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => toggleRow(rowKey)}
                  >
                    <TableCell className="p-2">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {variable.SourceIp || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {variable.DestinationIp || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {variable.unid_Id ?? '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      {variable.Address}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {variable.FC}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {variable.sampleCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {variable['Best Type'] ? (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          {variable['Best Type']}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {variable.HEX || '-'}
                    </TableCell>
                    {dataTypeColumns.map(col => {
                      const score = variable[col.scoreKey as keyof LearningSample] as number | null;
                      const value = variable[col.key as keyof LearningSample] as number | null;
                      
                      return (
                        <TableCell key={col.key} className="p-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className={cn(
                                  "px-1 py-1 rounded text-center text-xs font-medium flex flex-col items-center justify-center min-h-[40px]",
                                  getScoreColor(score)
                                )}
                              >
                                <span className="text-[10px] opacity-90">
                                  {formatValue(value, col.key)}
                                </span>
                                <span className="text-[9px] opacity-75">
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
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      
      <div className="text-xs text-muted-foreground text-center">
        Showing {groupedVariables.length} unique variables ({uniqueAddresses} addresses) from {variables.length} total samples
      </div>
    </div>
  );
};