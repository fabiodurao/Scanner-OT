import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DiscoveredVariable } from '@/types/discovery';
import { HistoricalHeatmapTable } from '@/components/variables/HistoricalHeatmapTable';
import { RunAnalysisButton } from './RunAnalysisButton';
import { PhotoAnalysisButton } from './PhotoAnalysisButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Grid3x3, Loader2 } from 'lucide-react';

interface HistoricalTabProps {
  siteId: string;
  discoveredVariables: DiscoveredVariable[];
  onVariableUpdated: () => void;
  onSampleCountLoaded?: (total: number) => void;
}

interface SampleMeta {
  count: number;
  lastTime: string | null;
}

function mergeSampleMeta(
  variables: DiscoveredVariable[],
  meta: Record<string, SampleMeta>
): DiscoveredVariable[] {
  return variables.map(v => {
    const key = `${v.source_ip}|${v.destination_ip}|${v.address}|${v.function_code}|${v.unit_id}`;
    const m = meta[key];
    if (m !== undefined) {
      return {
        ...v,
        sample_count: m.count,
        last_reading_at: m.lastTime,
      };
    }
    return v;
  });
}

export const HistoricalTab = ({
  siteId,
  discoveredVariables,
  onVariableUpdated,
  onSampleCountLoaded,
}: HistoricalTabProps) => {
  const [enrichedVariables, setEnrichedVariables] = useState<DiscoveredVariable[]>(discoveredVariables);
  const [sampleMetaLoading, setSampleMetaLoading] = useState(false);
  const sampleMetaRef = useRef<Record<string, SampleMeta>>({});

  const fetchSampleMeta = useCallback(async () => {
    if (!siteId) return;
    setSampleMetaLoading(true);

    const PAGE = 1000;
    const meta: Record<string, SampleMeta> = {};
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('learning_samples')
        .select('SourceIp, DestinationIp, Address, FC, unid_Id, time')
        .eq('Identifier', siteId)
        .range(from, from + PAGE - 1);

      if (error) {
        console.error('[HistoricalTab] Error fetching sample meta:', error);
        setSampleMetaLoading(false);
        return;
      }

      for (const row of data || []) {
        const key = `${row.SourceIp}|${row.DestinationIp}|${row.Address}|${row.FC}|${row.unid_Id}`;
        if (!meta[key]) {
          meta[key] = { count: 0, lastTime: null };
        }
        meta[key].count += 1;
        if (row.time && (!meta[key].lastTime || row.time > meta[key].lastTime!)) {
          meta[key].lastTime = row.time;
        }
      }

      hasMore = (data?.length ?? 0) === PAGE;
      from += PAGE;
    }

    sampleMetaRef.current = meta;
    setEnrichedVariables(prev => mergeSampleMeta(prev, meta));

    const total = Object.values(meta).reduce((sum, m) => sum + m.count, 0);
    onSampleCountLoaded?.(total);

    setSampleMetaLoading(false);
  }, [siteId]);

  useEffect(() => {
    setEnrichedVariables(mergeSampleMeta(discoveredVariables, sampleMetaRef.current));
  }, [discoveredVariables]);

  useEffect(() => {
    fetchSampleMeta();
    const interval = setInterval(fetchSampleMeta, 60_000);
    return () => clearInterval(interval);
  }, [fetchSampleMeta]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Grid3x3 className="h-4 w-4 sm:h-5 sm:w-5" />
              Variables
              {sampleMetaLoading && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              All discovered variables — scores appear after running historical analysis
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <RunAnalysisButton siteId={siteId} />
            <PhotoAnalysisButton siteId={siteId} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <HistoricalHeatmapTable
          variables={enrichedVariables}
          onVariableUpdated={onVariableUpdated}
        />
      </CardContent>
    </Card>
  );
};