import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Loader2 } from 'lucide-react';

interface DataFlowCardProps {
  receivingCount: number;
  publishingCount: number;
  isLoading: boolean;
}

export const DataFlowCard = ({ receivingCount, publishingCount, isLoading }: DataFlowCardProps) => {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Data Flow</CardTitle>
        <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/50">
          <Activity className="h-4 w-4 text-cyan-600" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              {receivingCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-2xl font-bold text-emerald-600">{receivingCount}</span>
                </div>
              )}
              {publishingCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                  </span>
                  <span className="text-2xl font-bold text-blue-600">{publishingCount}</span>
                </div>
              )}
              {receivingCount === 0 && publishingCount === 0 && (
                <span className="text-2xl font-bold text-muted-foreground">Idle</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              {receivingCount > 0 && (
                <p className="text-xs text-emerald-600">{receivingCount} receiving</p>
              )}
              {publishingCount > 0 && (
                <p className="text-xs text-blue-600">{publishingCount} publishing</p>
              )}
              {receivingCount === 0 && publishingCount === 0 && (
                <p className="text-xs text-muted-foreground">No active data flow</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
