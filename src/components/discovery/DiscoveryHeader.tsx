import { Link } from 'react-router-dom';
import { Site } from '@/types/upload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, MapPin, RefreshCw, RefreshCcw, ExternalLink } from 'lucide-react';
import { siteTypeConfig } from '@/pages/SitesManagement';
import { SITE_TYPE_ICONS } from '@/components/icons/SiteTypeIcon';
import { DataFlowBadge } from '@/components/dataflow/DataFlowBadge';
import { DataFlowStatus } from '@/hooks/useDataFlowStatus';

interface DiscoveryHeaderProps {
  site: Site | null;
  siteId: string;
  refreshing: boolean;
  syncing: boolean;
  onRefresh: () => void;
  onSyncEquipment: () => void;
  dataFlowStatus?: DataFlowStatus;
}

export const DiscoveryHeader = ({
  site, siteId, refreshing, syncing, onRefresh, onSyncEquipment, dataFlowStatus,
}: DiscoveryHeaderProps) => {
  const typeConfig = site?.site_type ? siteTypeConfig[site.site_type] : null;
  const IconComponent = site?.site_type ? SITE_TYPE_ICONS[site.site_type] : null;

  return (
    <div className="mb-4 sm:mb-6">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3 sm:mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {typeConfig && IconComponent && (
              <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: typeConfig.bgColor }}>
                <IconComponent primaryColor={typeConfig.primaryColor} secondaryColor={typeConfig.secondaryColor} size={24} />
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">
              {site?.name || `Site ${siteId?.slice(0, 8)}...`}
            </h1>

            {typeConfig && IconComponent && (
              <Badge variant="outline" className={`${typeConfig.color} gap-1.5`}>
                <IconComponent primaryColor={typeConfig.primaryColor} secondaryColor={typeConfig.secondaryColor} size={12} />
                {typeConfig.label}
              </Badge>
            )}

            {!site && (
              <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 flex-shrink-0">
                Unregistered
              </Badge>
            )}

            {dataFlowStatus?.receiving && (
              <DataFlowBadge type="receiving" source={dataFlowStatus.source} lastAt={dataFlowStatus.lastSampleAt} />
            )}
            {dataFlowStatus?.publishing && (
              <DataFlowBadge type="publishing" lastAt={dataFlowStatus.lastPublishAt} />
            )}
          </div>

          {site && (site.city || site.state) && (
            <div className="flex items-center gap-1 text-muted-foreground mt-1 text-sm">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{[site.city, site.state, site.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-full">{siteId}</code>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => window.open(`/receiver?site=${encodeURIComponent(siteId)}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Open Receiver</span>
                <span className="sm:hidden">Receiver</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open test data receiver in new tab</TooltipContent>
          </Tooltip>
          <Button variant="outline" size="sm" onClick={onSyncEquipment} disabled={syncing} className="flex-1 sm:flex-none">
            <RefreshCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Equipment</span>
            <span className="sm:hidden">Sync</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="flex-1 sm:flex-none">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Refresh</span>
          </Button>
        </div>
      </div>
    </div>
  );
};