import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Server, Variable, CheckCircle, Loader2 } from 'lucide-react';

interface DashboardStatsRowProps {
  totalSites: number;
  totalEquipment: number;
  totalVariables: number;
  confirmedVariables: number;
  hypothesisVariables: number;
  isLoading: boolean;
  loadingStats: boolean;
  unknownSitesCount: number;
}

export const DashboardStatsRow = ({
  totalSites,
  totalEquipment,
  totalVariables,
  confirmedVariables,
  hypothesisVariables,
  isLoading,
  loadingStats,
  unknownSitesCount,
}: DashboardStatsRowProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Sites</CardTitle>
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
            <Building2 className="h-4 w-4 text-[#2563EB]" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
            <>
              <div className="text-3xl font-bold text-foreground">{totalSites}</div>
              {unknownSitesCount > 0 && (
                <p className="text-xs text-amber-600 mt-1">{unknownSitesCount} pending registration</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Equipment</CardTitle>
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
            <Server className="h-4 w-4 text-purple-600" />
          </div>
        </CardHeader>
        <CardContent>
          {loadingStats ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
            <div className="text-3xl font-bold text-foreground">{totalEquipment}</div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Variables</CardTitle>
          <div className="p-2 rounded-lg bg-secondary">
            <Variable className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {loadingStats ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
            <>
              <div className="text-3xl font-bold text-foreground">{totalVariables}</div>
              {hypothesisVariables > 0 && (
                <p className="text-xs text-amber-600 mt-1">{hypothesisVariables} with hypotheses</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed</CardTitle>
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </div>
        </CardHeader>
        <CardContent>
          {loadingStats ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
            <>
              <div className="text-3xl font-bold text-emerald-600">{confirmedVariables}</div>
              {totalVariables > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((confirmedVariables / totalVariables) * 100)}% of total
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};