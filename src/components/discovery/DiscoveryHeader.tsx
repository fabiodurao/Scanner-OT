import { Link } from 'react-router-dom';
import { Site } from '@/types/upload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, MapPin, RefreshCw, RefreshCcw } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { siteTypeConfig } from '@/pages/SitesManagement';
import React from 'react';

interface DiscoveryHeaderProps {
  site: Site | null;
  siteId: string;
  refreshing: boolean;
  syncing: boolean;
  onRefresh: () => void;
  onSyncEquipment: () => void;
}

export const DiscoveryHeader = ({
  site,
  siteId,
  refreshing,
  syncing,
  onRefresh,
  onSyncEquipment,
}: DiscoveryHeaderProps) => {
  const typeConfig = site?.site_type ? siteTypeConfig[site.site_type] : null;

  return (
    <div className="mb-4 sm:mb-6">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-slate-900 mb-3 sm:mb-4"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {typeConfig && (
              <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: typeConfig.bgColor }}>
                <FontAwesomeIcon
                  icon={typeConfig.icon}
                  style={{ '--fa-primary-color': typeConfig.primaryColor, '--fa-secondary-color': typeConfig.secondaryColor, '--fa-secondary-opacity': 0.4 } as React.CSSProperties}
                  className="w-6 h-6"
                />
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl font-bold text-[#1a2744] truncate">
              {site?.name || `Site ${siteId?.slice(0, 8)}...`}
            </h1>

            {typeConfig && (
              <Badge variant="outline" className={`${typeConfig.color} gap-1.5`}>
                <FontAwesomeIcon
                  icon={typeConfig.icon}
                  style={{ '--fa-primary-color': typeConfig.primaryColor, '--fa-secondary-color': typeConfig.secondaryColor, '--fa-secondary-opacity': 0.4 } as React.CSSProperties}
                  className="w-3 h-3"
                />
                {typeConfig.label}
              </Badge>
            )}

            {!site && (
              <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 flex-shrink-0">
                Unregistered
              </Badge>
            )}
          </div>

          {site && (site.city || site.state) && (
            <div className="flex items-center gap-1 text-muted-foreground mt-1 text-sm">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{[site.city, site.state, site.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono truncate max-w-full">
              {siteId}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onSyncEquipment} 
            disabled={syncing}
            className="flex-1 sm:flex-none"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Equipment</span>
            <span className="sm:hidden">Sync</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRefresh} 
            disabled={refreshing}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Refresh</span>
          </Button>
        </div>
      </div>
    </div>
  );
};