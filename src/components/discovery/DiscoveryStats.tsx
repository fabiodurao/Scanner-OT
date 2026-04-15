import { SiteDiscoveryStats } from '@/types/discovery';
import { DataFlowStatus } from '@/hooks/useDataFlowStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, Variable, CheckCircle, Lightbulb, HelpCircle, Clock, Database, Activity, Download, Upload } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DiscoveryStatsProps {
  stats: SiteDiscoveryStats;
  slaveEquipmentCount: number;
  dataFlowStatus?: DataFlowStatus;
}

export const DiscoveryStats = ({ stats, slaveEquipmentCount, dataFlowStatus }: DiscoveryStatsProps) => {
  return (
    <>
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-4 sm:mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Equipment</CardTitle>
            <Server className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalEquipment}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              {slaveEquipmentCount} slaves
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Variables</CardTitle>
            <Variable className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalVariables}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Unknown</CardTitle>
            <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-slate-600">{stats.variablesByState.unknown}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Hypothesis</CardTitle>
            <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-amber-600">{stats.variablesByState.hypothesis}</div>
          </CardContent>
        </Card>
        
        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600">
              {stats.variablesByState.confirmed + stats.variablesByState.published}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Data Flow</CardTitle>
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Receiving */}
              <div className="flex items-center gap-1.5">
                <Download className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                {dataFlowStatus?.receiving ? (
                  <>
                    <span className="relative flex h-2 w-2 flex-shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-xs font-medium text-emerald-600">
                      Receiving ({dataFlowStatus.source || 'unknown'})
                    </span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2 w-2 flex-shrink-0">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/30" />
                    </span>
                    <span className="text-xs text-muted-foreground">Idle</span>
                  </>
                )}
              </div>
              {dataFlowStatus?.lastSampleAt && (
                <p className="text-[10px] text-muted-foreground pl-[18px]">
                  Last: {formatDistanceToNow(new Date(dataFlowStatus.lastSampleAt), { addSuffix: true })}
                  {dataFlowStatus.lastSampleSource && ` (${dataFlowStatus.lastSampleSource})`}
                </p>
              )}

              {/* Publishing */}
              <div className="flex items-center gap-1.5">
                <Upload className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                {dataFlowStatus?.publishing ? (
                  <>
                    <span className="relative flex h-2 w-2 flex-shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                    </span>
                    <span className="text-xs font-medium text-blue-600">Publishing</span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2 w-2 flex-shrink-0">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/30" />
                    </span>
                    <span className="text-xs text-muted-foreground">Idle</span>
                  </>
                )}
              </div>
              {dataFlowStatus?.lastPublishAt && (
                <p className="text-[10px] text-muted-foreground pl-[18px]">
                  Last: {formatDistanceToNow(new Date(dataFlowStatus.lastPublishAt), { addSuffix: true })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-4 sm:mb-6 text-xs sm:text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 flex-shrink-0" />
          <span>{stats.sampleCount.toLocaleString()} samples</span>
        </div>
        {stats.lastActivity && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Last: {formatDistanceToNow(new Date(stats.lastActivity), { addSuffix: true })}</span>
          </div>
        )}
      </div>
    </>
  );
};