import { DiscoveredVariable } from '@/types/discovery';
import { HistoricalHeatmapTable } from '@/components/variables/HistoricalHeatmapTable';
import { RunAnalysisButton } from './RunAnalysisButton';
import { PhotoAnalysisButton } from './PhotoAnalysisButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Grid3x3 } from 'lucide-react';

interface HistoricalTabProps {
  siteId: string;
  discoveredVariables: DiscoveredVariable[];
  onVariableUpdated: () => void;
}

export const HistoricalTab = ({
  siteId,
  discoveredVariables,
  onVariableUpdated,
}: HistoricalTabProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Grid3x3 className="h-4 w-4 sm:h-5 sm:w-5" />
              Variables & Historical Analysis
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
          variables={discoveredVariables}
          onVariableUpdated={onVariableUpdated}
        />
      </CardContent>
    </Card>
  );
};