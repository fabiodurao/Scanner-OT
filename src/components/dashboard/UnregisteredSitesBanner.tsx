import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface UnregisteredSitesBannerProps {
  count: number;
}

export const UnregisteredSitesBanner = ({ count }: UnregisteredSitesBannerProps) => {
  if (count === 0) return null;

  return (
    <Card className="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">
              {count} Unregistered Site{count !== 1 ? 's' : ''} Detected
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Data is being received from site identifiers that are not registered in the system.
              Register them to enable full monitoring and analysis.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};