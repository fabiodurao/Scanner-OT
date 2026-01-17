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

// Data type columns for heatmap
const dataTypeColumns = [
  { key: 'UINT16', scoreKey: 'score_uint16', label: 'U16' },
  { key: 'INT16', scoreKey: 'score_int16', label: 'I16' },
  { key: 'UINT32BE', scoreKey: 'score_uint32be', label: 'U32BE' },
  { key: 'INT32BE', scoreKey: 'score_int32be', label: 'I32BE' },
  { key: 'UINT32LE', scoreKey: 'score_uint32le', label: 'U32LE' },
  { key: 'INT32LE', scoreKey: 'score_int32le', label: 'I32LE' },
  { key: 'FLOAT32BE', scoreKey: 'score_float32be', label: 'F32BE' },
  { key: 'FLOAT32LE', scoreKey: 'score_float32le', label: 'F32LE' },
] as const;

// Get color based on score (0-1)
const getScoreColor = (score: number | null): string => {
  if (score === null || score === undefined) return 'bg-slate-100 text-slate-400';
  
  // Normalize score to 0-1 range if needed
  const normalizedScore = Math.min(1, Math.max(0, score));
  
  if (normalizedScore >= 0.9) return 'bg-emerald-500 text-white';
  if (normalizedScore >= 0.8) return 'bg-emerald-400 text-white';
  if (normalizedScore >= 0.7) return 'bg-emerald-300 text-emerald-900';
  if (normalizedScore >= 0.6) return 'bg-lime-300 text-lime-900';
  if (normalizedScore >= 0.5) return 'bg-yellow-300 text-yellow-900';
  if (normalizedScore >= 0.4) return 'bg-amber-300 text-amber-900';
  if (normalizedScore >= 0.3) return 'bg-orange-300 text-orange-900';
  if (normalizedScore >= 0.2) return 'bg-red-300 text-red-900';
  if (normalizedScore > 0) return 'bg-red-400 text-white';
  return 'bg-slate-100 text-slate-400';
};

// Format value for display
const formatValue = (value: number | null, type: string): string => {
  if (value === null || value === undefined) return '-';
  
  if (type.includes('FLOAT')) {
    // Check if it's a reasonable float value
    if (Math.abs(value) > 1e10 || (Math.abs(value) < 1e-10 && value !== 0)) {
      return 'Invalid';
    }
    return value.toFixed(2);
  }
  
  return value.toLocaleString();
};

// Group variables by destination IP and address
const groupVariables = (variables: LearningSample[]) => {
  const grouped = new Map<string, LearningSample[]>();
  
  for (const v of variables) {
    const key = `${v.DestinationIp}-${v.Address}-${v.FC}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(v);
  }
  
  // Return the most recent sample for each group
  const result: LearningSample[] = [];
  for (const [, samples] of grouped) {
    // Sort by time descending and take the first
    samples.sort((a, b) => {
      const timeA = a.time ? new Date(a.time).getTime() : 0;
      const timeB = b.time ? new Date(b.time).getTime() : 0;
      return timeB - timeA;
    });
    result.push(samples[0]);
  }
  
  // Sort by address
  result.sort((a, b) => {
    if (a.DestinationIp !== b.DestinationIp) {
      return (a.DestinationIp || '').localeCompare(b.DestinationIp || '');
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

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-muted-foreground">Score Legend:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-emerald-500" />
          <span>High (≥0.9)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-lime-300" />
          <span>Medium (0.5-0.9)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-red-400" />
          <span>Low (&lt;0.5)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-slate-100" />
          <span>N/A</span>
        </div>
      </div>
      
      <ScrollArea className="w-full">
        <div className="min-w-[1200px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-36">Destination IP</TableHead>
                <TableHead className="w-20">Unit</TableHead>
                <TableHead className="w-24">Address</TableHead>
                <TableHead className="w-16">FC</TableHead>
                <TableHead className="w-24">Best Type</TableHead>
                <TableHead className="w-24">HEX</TableHead>
                {dataTypeColumns.map(col => (
                  <TableHead key={col.key} className="w-20 text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">{col.label}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{col.key}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedVariables.map((variable) => {
                const rowKey = `${variable.DestinationIp}-${variable.Address}-${variable.FC}`;
                const isExpanded = expandedRows.has(rowKey);
                
                return (
                  <TableRow 
                    key={variable.id} 
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
                    <TableCell className="font-mono text-sm">
                      {variable.DestinationIp}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {variable.unid_Id ?? '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      {variable.Address}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {variable.FC}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {variable['Best Type'] ? (
                        <Badge className="bg-blue-100 text-blue-700">
                          {variable['Best Type']}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
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
                                  "px-2 py-1 rounded text-center text-xs font-medium",
                                  getScoreColor(score)
                                )}
                              >
                                {score !== null && score !== undefined 
                                  ? (score * 100).toFixed(0) + '%'
                                  : '-'
                                }
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
        Showing {groupedVariables.length} unique variables from {variables.length} samples
      </div>
    </div>
  );
};