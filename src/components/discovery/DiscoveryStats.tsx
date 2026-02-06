import { SiteDiscoveryStats } from '@/types/discovery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, Variable, CheckCircle, Lightbulb, HelpCircle, Clock, Database } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DiscoveryStatsProps {
  stats: SiteDiscoveryStats;
  slaveEquipmentCount: number;
}

export const DiscoveryStats = ({ stats, slaveEquipmentCount }: DiscoveryStatsProps) => {
  return (
    <>
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-4 sm:mb-6">
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