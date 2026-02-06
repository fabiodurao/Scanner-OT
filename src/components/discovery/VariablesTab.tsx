import { LearningSample } from '@/types/discovery';
import { VariableHeatmapTable } from './VariableHeatmapTable';
import { RunAnalysisButton } from './RunAnalysisButton';
import { PhotoAnalysisButton } from './PhotoAnalysisButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Variable } from 'lucide-react';

interface VariablesTabProps {
  siteId: string;
  variables: LearningSample[];
  activeSourceIpFilter: string | null;
  allSourceIps: string[];
  loadingFiltered: boolean;
  onFilterBySourceIp: (ip: string | null) => void;
}

export const VariablesTab = ({
  siteId,
  variables,
  activeSourceIpFilter,
  allSourceIps,
  loadingFiltered,
  onFilterBySourceIp,
}: VariablesTabProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg">Discovered Variables</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Protocol registers with type inference scores
              {activeSourceIpFilter && (
                <span className="ml-2 text-blue-600 block sm:inline mt-1 sm:mt-0">
                  (filtered by: {activeSourceIpFilter})
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <RunAnalysisButton siteId={siteId} />
            <PhotoAnalysisButton siteId={siteId} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {variables.length === 0 && !loadingFiltered ? (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <Variable className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm sm:text-base">No variables found</p>
            <p className="text-xs sm:text-sm mt-2">
              Upload and process a PCAP file to discover variables
            </p>
          </div>
        ) : (
          <VariableHeatmapTable 
            variables={variables} 
            allSourceIps={allSourceIps}
            onFilterBySourceIp={onFilterBySourceIp}
            isLoadingFiltered={loadingFiltered}
          />
        )}
      </CardContent>
    </Card>
  );
};