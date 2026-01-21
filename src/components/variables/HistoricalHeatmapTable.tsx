import { DiscoveredVariable, DataTypeStats } from '@/types/discovery';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const dataTypeColumns = [
  { key: 'UINT16', label: 'UINT16' },
  { key: 'INT16', label: 'INT16' },
  { key: 'UINT32BE', label: 'UINT32BE' },
  { key: 'INT32BE', label: 'INT32BE' },
  { key: 'UINT32LE', label: 'UINT32LE' },
  { key: 'INT32LE', label: 'INT32LE' },
  { key: 'FLOAT32BE', label: 'FLOAT32BE' },
  { key: 'FLOAT32LE', label: 'FLOAT32LE' },
  { key: 'UINT64BE', label: 'UINT64BE' },
  { key: 'INT64BE', label: 'INT64BE' },
  { key: 'UINT64LE', label: 'UINT64LE' },
  { key: 'INT64LE', label: 'INT64LE' },
  { key: 'FLOAT64BE', label: 'FLOAT64BE' },
  { key: 'FLOAT64LE', label: 'FLOAT64LE' },
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
  // Filter to only show variables with AI historical data
  const varsWithHistory = variables.filter(v => v.stats && v.historical_scores);

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
                <th className="px-2 py-2 text-left whitespace-nowrap font-medium">Explanation</th>
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
                const stats = variable.stats as Record<string, DataTypeStats> | null;
                const scores = variable.historical_scores as Record<string, number> | null;
                
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
                      const typeStats = stats?.[col.key] as DataTypeStats | undefined;
                      const score = scores?.[col.key.toLowerCase()] ?? null;
                      const value = typeStats?.avg_value ?? null;
                      
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
                                  {formatValue(value, col.key)}
                                </span>
                                <span className="text-[9px] mt-0.5 px-1 py-0 rounded bg-black/10">
                                  {formatScore(score)}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {typeStats ? (
                                <div className="space-y-1 text-xs">
                                  <p className="font-medium border-b pb-1">{col.key}</p>
                                  <p>Count: <span className="font-mono">{typeStats.count}</span></p>
                                  <p>Avg Value: <span className="font-mono">{formatValue(typeStats.avg_value, col.key)}</span></p>
                                  <p>Std Dev: <span className="font-mono">{typeStats.std.toFixed(3)}</span></p>
                                  <p>Avg Jump: <span className="font-mono">{formatValue(typeStats.avg_jump, col.key)}</span></p>
                                  <p>Max Jump: <span className="font-mono">{formatValue(typeStats.max_jump, col.key)}</span></p>
                                  <p>Nulls: <span className="font-mono">{typeStats.nulls}</span></p>
                                  <p>Zeros: <span className="font-mono">{typeStats.zeros}</span></p>
                                  <p className="border-t pt-1 mt-1">Avg Score: <span className="font-mono font-bold">{formatScore(typeStats.avg_score)}</span></p>
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