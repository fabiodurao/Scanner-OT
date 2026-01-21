import { DiscoveredVariable } from '@/types/discovery';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const dataTypeColumns = [
  { key: 'UINT16', scoreKey: 'historical_scores_uint16', label: 'UINT16' },
  { key: 'INT16', scoreKey: 'historical_scores_int16', label: 'INT16' },
  { key: 'UINT32BE', scoreKey: 'historical_scores_uint32be', label: 'UINT32BE' },
  { key: 'INT32BE', scoreKey: 'historical_scores_int32be', label: 'INT32BE' },
  { key: 'UINT32LE', scoreKey: 'historical_scores_uint32le', label: 'UINT32LE' },
  { key: 'INT32LE', scoreKey: 'historical_scores_int32le', label: 'INT32LE' },
  { key: 'FLOAT32BE', scoreKey: 'historical_scores_float32be', label: 'FLOAT32BE' },
  { key: 'FLOAT32LE', scoreKey: 'historical_scores_float32le', label: 'FLOAT32LE' },
  { key: 'UINT64BE', scoreKey: 'historical_scores_uint64be', label: 'UINT64BE' },
  { key: 'INT64BE', scoreKey: 'historical_scores_int64be', label: 'INT64BE' },
  { key: 'UINT64LE', scoreKey: 'historical_scores_uint64le', label: 'UINT64LE' },
  { key: 'INT64LE', scoreKey: 'historical_scores_int64le', label: 'INT64LE' },
  { key: 'FLOAT64BE', scoreKey: 'historical_scores_float64be', label: 'FLOAT64BE' },
  { key: 'FLOAT64LE', scoreKey: 'historical_scores_float64le', label: 'FLOAT64LE' },
] as const;

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

interface HistoricalHeatmapTableProps {
  variables: DiscoveredVariable[];
}

export const HistoricalHeatmapTable = ({ variables }: HistoricalHeatmapTableProps) => {
  // Filter to only show variables with AI historical data (check if any score exists)
  const varsWithHistory = variables.filter(v => 
    v.historical_scores_uint16 !== null || 
    v.historical_scores_int16 !== null ||
    v.winner !== null
  );

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
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full min-w-[1800px]">
            <thead className="sticky top-0 z-10 bg-slate-100 border-b">
              <tr className="text-xs">
                <th className="px-2 py-2 text-left whitespace-nowrap font-medium">Source IP</th>
                <th className="px-2 py-2 text-left whitespace-nowrap font-medium">Address</th>
                <th className="px-2 py-2 text-left whitespace-nowrap font-medium">FC</th>
                <th className="px-2 py-2 text-left whitespace-nowrap font-medium">Winner</th>
                <th className="px-2 py-2 text-left whitespace-nowrap font-medium max-w-xs">Explanation</th>
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
              {varsWithHistory.map((variable) => {
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
                    
                    {dataTypeColumns.map(col => {
                      // Get score from individual column
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
                                  "px-1 py-1 rounded text-center text-xs font-medium flex flex-col items-center justify-center min-h-[40px] cursor-help",
                                  getScoreColor(score)
                                )}
                              >
                                <span className="text-[10px] font-semibold leading-tight truncate max-w-[70px]">
                                  {formatValue(avgValue, col.key)}
                                </span>
                                <span className="text-[9px] mt-0.5 px-1 py-0 rounded bg-black/10">
                                  {formatScore(score)}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {hasStats ? (
                                <div className="space-y-1 text-xs">
                                  <p className="font-medium border-b pb-1">{col.key}</p>
                                  <p>Count: <span className="font-mono">{count}</span></p>
                                  <p>Avg Value: <span className="font-mono">{formatValue(avgValue, col.key)}</span></p>
                                  <p>Std Dev: <span className="font-mono">{std?.toFixed(3) || '-'}</span></p>
                                  <p>Avg Jump: <span className="font-mono">{formatValue(avgJump, col.key)}</span></p>
                                  <p>Max Jump: <span className="font-mono">{formatValue(maxJump, col.key)}</span></p>
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
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground">
        {varsWithHistory.length} variables with AI historical analysis
      </div>
    </div>
  );
};