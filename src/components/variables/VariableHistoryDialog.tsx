import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DiscoveredVariable } from '@/types/discovery';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';

interface VariableHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variable: DiscoveredVariable | null;
}

interface ChartPoint {
  time: string;
  timeLabel: string;
  value: number | null;
}

const DATA_TYPE_COLUMNS: Record<string, string> = {
  uint16: 'UINT16',
  int16: 'INT16',
  uint32be: 'UINT32BE',
  int32be: 'INT32BE',
  uint32le: 'UINT32LE',
  int32le: 'INT32LE',
  float32be: 'FLOAT32BE',
  float32le: 'FLOAT32LE',
  uint64be: 'UINT64BE',
  int64be: 'INT64BE',
  uint64le: 'UINT64LE',
  int64le: 'INT64LE',
  float64be: 'FLOAT64BE',
  float64le: 'FLOAT64LE',
};

const formatValue = (value: number | null, dataType: string): string => {
  if (value === null || value === undefined) return '-';
  if (dataType.includes('float')) {
    if (!isFinite(value) || Math.abs(value) > 1e15) return 'Invalid';
    return value.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  }
  return value.toLocaleString('en-US');
};

export const VariableHistoryDialog = ({
  open,
  onOpenChange,
  variable,
}: VariableHistoryDialogProps) => {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ min: number; max: number; avg: number; count: number } | null>(null);

  // Determine which column to use for the chart
  const activeType = variable?.winner || variable?.data_type || variable?.ai_suggested_type;
  const columnName = activeType ? DATA_TYPE_COLUMNS[activeType.toLowerCase()] : null;
  const scale = (variable as any)?.scale || 1;

  useEffect(() => {
    if (!open || !variable || !columnName) return;

    const fetchHistory = async () => {
      setLoading(true);
      setChartData([]);
      setStats(null);

      const { data, error } = await supabase
        .from('learning_samples')
        .select(`id, time, ${columnName}`)
        .eq('Identifier', variable.site_identifier)
        .eq('SourceIp', variable.source_ip)
        .eq('DestinationIp', variable.destination_ip)
        .eq('Address', variable.address)
        .eq('FC', variable.function_code)
        .not('time', 'is', null)
        .order('time', { ascending: true })
        .limit(500);

      if (error) {
        console.error('[VariableHistoryDialog] Error fetching history:', error);
        setLoading(false);
        return;
      }

      const points: ChartPoint[] = (data || [])
        .filter((row: any) => row[columnName] !== null && row[columnName] !== undefined)
        .map((row: any) => {
          const rawValue = row[columnName] as number;
          const scaledValue = rawValue * scale;
          return {
            time: row.time,
            timeLabel: format(new Date(row.time), 'MM/dd HH:mm:ss'),
            value: scaledValue,
          };
        });

      setChartData(points);

      if (points.length > 0) {
        const values = points.map(p => p.value as number);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        setStats({ min, max, avg, count: points.length });
      }

      setLoading(false);
    };

    fetchHistory();
  }, [open, variable, columnName, scale]);

  if (!variable) return null;

  const avgValue = stats?.avg ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#2563EB]" />
            Historical Values
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="font-mono text-sm font-medium text-foreground">
                {variable.source_ip}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="font-mono text-sm text-muted-foreground">
                {variable.destination_ip}
              </span>
              <Badge variant="outline" className="font-mono text-xs">
                Addr {variable.address}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                FC {variable.function_code}
              </Badge>
              {variable.protocol && (
                <Badge variant="secondary" className="text-xs">
                  {variable.protocol}
                </Badge>
              )}
              {activeType && (
                <Badge className="bg-purple-100 text-purple-800 font-mono text-xs">
                  {activeType.toUpperCase()}
                </Badge>
              )}
              {scale !== 1 && (
                <Badge variant="outline" className="text-xs">
                  ×{scale}
                </Badge>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Variable info */}
          {(variable.semantic_label || variable.semantic_unit) && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
              {variable.semantic_label && (
                <div>
                  <div className="text-xs text-muted-foreground">Label</div>
                  <div className="font-medium">{variable.semantic_label}</div>
                </div>
              )}
              {variable.semantic_unit && (
                <div>
                  <div className="text-xs text-muted-foreground">Unit</div>
                  <Badge variant="secondary" className="font-mono">{variable.semantic_unit}</Badge>
                </div>
              )}
            </div>
          )}

          {/* Stats row */}
          {stats && (
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-center">
                <div className="text-xs text-blue-600 mb-1">Samples</div>
                <div className="font-bold text-blue-900">{stats.count.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                <div className="text-xs text-emerald-600 mb-1">Min</div>
                <div className="font-bold text-emerald-900 font-mono text-sm">
                  {formatValue(stats.min, activeType?.toLowerCase() || '')}
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-center">
                <div className="text-xs text-amber-600 mb-1">Avg</div>
                <div className="font-bold text-amber-900 font-mono text-sm">
                  {formatValue(stats.avg, activeType?.toLowerCase() || '')}
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-center">
                <div className="text-xs text-red-600 mb-1">Max</div>
                <div className="font-bold text-red-900 font-mono text-sm">
                  {formatValue(stats.max, activeType?.toLowerCase() || '')}
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="border rounded-lg p-4 bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading history...</span>
              </div>
            ) : !columnName ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                <div className="text-center">
                  <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No data type defined yet.</p>
                  <p className="text-xs mt-1">Run historical analysis to determine the best type.</p>
                </div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                <div className="text-center">
                  <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No data points found for this variable.</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xs text-muted-foreground mb-3 flex items-center justify-between">
                  <span>
                    Showing {chartData.length} points
                    {chartData.length === 500 && ' (limited to last 500)'}
                  </span>
                  {variable.semantic_unit && (
                    <span className="font-mono">[{variable.semantic_unit}]</span>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="timeLabel"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                      tickFormatter={(val) => {
                        // Show only time part if same day
                        const parts = val.split(' ');
                        return parts[1] || val;
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val) => {
                        if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                        if (Math.abs(val) >= 1000) return (val / 1000).toFixed(1) + 'k';
                        return val.toFixed(2);
                      }}
                      width={60}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const val = payload[0]?.value as number;
                        return (
                          <div className="bg-white border rounded-lg shadow-lg p-3 text-xs">
                            <div className="text-muted-foreground mb-1">{label}</div>
                            <div className="font-bold font-mono text-[#2563EB]">
                              {formatValue(val, activeType?.toLowerCase() || '')}
                              {variable.semantic_unit && (
                                <span className="text-muted-foreground ml-1">{variable.semantic_unit}</span>
                              )}
                            </div>
                          </div>
                        );
                      }}
                    />
                    {avgValue !== null && (
                      <ReferenceLine
                        y={avgValue}
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        label={{ value: 'avg', position: 'right', fontSize: 10, fill: '#f59e0b' }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#2563EB"
                      strokeWidth={1.5}
                      dot={chartData.length <= 50 ? { r: 3, fill: '#2563EB' } : false}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Time range */}
          {chartData.length > 0 && (
            <div className="text-xs text-muted-foreground flex items-center justify-between px-1">
              <span>From: {chartData[0]?.timeLabel}</span>
              <span>To: {chartData[chartData.length - 1]?.timeLabel}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};