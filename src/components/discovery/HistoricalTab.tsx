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
}

// Merge sample counts into variables
function mergeSampleCounts(
  variables: DiscoveredVariable[],
  counts: Record<string, number>
): DiscoveredVariable[] {
  return variables.map(v => {
    // Key matches the 5-field link
    const key = `${v.source_ip}|${v.destination_ip}|${v.address}|${v.function_code}|${v.unit_id}`;
    const realCount = counts[key];
    if (realCount !== undefined) {
      return { ...v, sample_count: realCount };
    }
    return v;
  });
}

export const HistoricalTab = ({
  siteId,
  discoveredVariables,
  onVariableUpdated,
}: HistoricalTabProps) => {
  const [enrichedVariables, setEnrichedVariables] = useState<DiscoveredVariable[]>(discoveredVariables);
  const [sampleCountsLoading, setSampleCountsLoading] = useState(false);
  const sampleCountsRef = useRef<Record<string, number>>({});

  // Fetch real sample counts from learning_samples (grouped by the 5-field key)
  const fetchSampleCounts = useCallback(async () => {
    if (!siteId) return;
    setSampleCountsLoading(true);

    const { data, error } = await supabase
      .from('learning_samples')
      .select('SourceIp, DestinationIp, Address, FC, unid_Id')
      .eq('Identifier', siteId);

    if (error) {
      console.error('[HistoricalTab] Error fetching sample counts:', error);
      setSampleCountsLoading(false);
      return;
    }

    // Count per unique variable key
    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const key = `${row.SourceIp}|${row.DestinationIp}|${row.Address}|${row.FC}|${row.unid_Id}`;
      counts[key] = (counts[key] || 0) + 1;
    }

    sampleCountsRef.current = counts;
    setEnrichedVariables(prev => mergeSampleCounts(prev, counts));
    setSampleCountsLoading(false);
  }, [siteId]);

  // When parent updates discoveredVariables, merge with latest sample counts
  useEffect(() => {
    setEnrichedVariables(mergeSampleCounts(discoveredVariables, sampleCountsRef.current));
  }, [discoveredVariables]);

  // Fetch sample counts on mount and every 60 seconds
  useEffect(() => {
    fetchSampleCounts();
    const interval = setInterval(fetchSampleCounts, 60_000);
    return () => clearInterval(interval);
  }, [fetchSampleCounts]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Grid3x3 className="h-4 w-4 sm:h-5 sm:w-5" />
              Variables & Historical Analysis
              {sampleCountsLoading && (
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
