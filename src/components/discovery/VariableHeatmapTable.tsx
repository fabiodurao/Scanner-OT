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

// 20-tone gradient from red to green - vibrant colors like Excel conditional formatting
const getScoreColor = (score: number | null): string => {
  if (score === null || score === undefined) return 'bg-gray-200 text-gray-500';
  
  // Normalize score to 0-1 range
  const normalizedScore = Math.min(1, Math.max(0, score));
  
  // 20 tones from red (0) to green (1) - vibrant colors
  if (normalizedScore >= 0.95) return 'bg-[#00B050] text-white';        // Bright green
  if (normalizedScore >= 0.90) return 'bg-[#17B169] text-white';        // Green
  if (normalizedScore >= 0.85) return 'bg-[#2DC97A] text-white';        // Light green
  if (normalizedScore >= 0.80) return 'bg-[#5DD55D] text-black';        // Lime green
  if (normalizedScore >= 0.75) return 'bg-[#8DE28D] text-black';        // Light lime
  if (normalizedScore >= 0.70) return 'bg-[#B5E61D] text-black';        // Yellow-green
  if (normalizedScore >= 0.65) return 'bg-[#D4ED26] text-black';        // Chartreuse
  if (normalizedScore >= 0.60) return 'bg-[#FFFF00] text-black';        // Yellow
  if (normalizedScore >= 0.55) return 'bg-[#FFE135] text-black';        // Golden yellow
  if (normalizedScore >= 0.50) return 'bg-[#FFC000] text-black';        // Orange-yellow
  if (normalizedScore >= 0.45) return 'bg-[#FFA500] text-black';        // Orange
  if (normalizedScore >= 0.40) return 'bg-[#FF8C00] text-black';        // Dark orange
  if (normalizedScore >= 0.35) return 'bg-[#FF7518] text-white';        // Pumpkin
  if (normalizedScore >= 0.30) return 'bg-[#FF5722] text-white';        // Deep orange
  if (normalizedScore >= 0.25) return 'bg-[#FF4500] text-white';        // Orange-red
  if (normalizedScore >= 0.20) return 'bg-[#FF3300] text-white';        // Red-orange
  if (normalizedScore >= 0.15) return 'bg-[#FF1A1A] text-white';        // Bright red
  if (normalizedScore >= 0.10) return 'bg-[#FF0000] text-white';        // Red
  if (normalizedScore >= 0.05) return 'bg-[#E60000] text-white';        // Dark red
  if (normalizedScore > 0) return 'bg-[#CC0000] text-white';            // Darker red
  return 'bg-gray-200 text-gray-500';
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

// Format HEX with 4 characters per line
const formatHex = (hex: string | null): string[] => {
  if (!hex) return ['-'];
  // Remove spaces and split into chunks of 4
  const cleanHex = hex.replace(/\s/g, '').toUpperCase();
  const chunks: string[] = [];
  for (let i = 0; i < cleanHex.length; i += 4) {
    chunks.push(cleanHex.slice(i, i + 4));
  }
  return chunks.length > 0 ? chunks : ['-'];
};

// Group variables by source IP, destination IP, address, and FC - count samples per group
// Note: In Modbus, SourceIp is the equipment (slave) responding, DestinationIp is the master asking
const groupVariables = (variables: LearningSample[]) => {
  const grouped = new Map<string, LearningSample[]>();
  
  for (const v of variables) {
    // Key by SourceIp (equipment), DestinationIp (master), Address, and FC
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
  
  // Sort by source IP (equipment), then destination IP (master), then address
  result.sort((a, b) => {
    if (a.SourceIp !== b.SourceIp) {
      return (a.SourceIp || '').localeCompare(b.SourceIp || '');
    }
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

  // Calculate total unique addresses (by equipment + address)
  const uniqueAddresses = new Set(groupedVariables.map(v => `${v.SourceIp}-${v.Address}`)).size;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <span className="text-muted-foreground">Score Legend (20 tones):</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-[#00B050]" />
          <span>High (≥0.9)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-[#B5E61D]" />
          <span>Good (0.7-0.9)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-[#FFC000]" />
          <span>Medium (0.5-0.7)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-[#FF5722]" />
          <span>Low (0.3-0.5)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-[#FF0000]" />
          <span>Poor (&lt;0.3)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gray-200 border" />
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
                <TableHead className="w-16">HEX</TableHead>
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
                const hexChunks = formatHex(variable.HEX);
                
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
                    <TableCell className="font-mono text-[10px] leading-tight">
                      <div className="flex flex-col">
                        {hexChunks.map((chunk, i) => (
                          <span key={i}>{chunk}</span>
                        ))}
                      </div>
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
                                  "px-1 py-1 rounded text-center text-xs font-medium flex flex-col items-center justify-center min-h-[36px]",
                                  getScoreColor(score)
                                )}
                              >
                                <span className="text-[10px] font-semibold">
                                  {formatValue(value, col.key)}
                                </span>
                                <span className="text-[9px] opacity-80">
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