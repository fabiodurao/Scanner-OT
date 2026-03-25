import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { siteTypeConfig } from '@/pages/SitesManagement';
import { SITE_TYPE_ICONS } from '@/components/icons/SiteTypeIcon';
import { SiteDiscoveryStats } from '@/types/discovery';
import {
  MapPin,
  Server,
  Variable,
  CheckCircle,
  Clock,
  FileArchive,
  Loader2,
  Activity,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface SiteListItem {
  type: 'registered' | 'unregistered';
  id: string;
  identifier: string | null;
  name: string | null;
  site_type: string | null;
  city: string | null;
  state: string | null;
  latitude?: number | null;
  longitude?: number | null;
  stats: SiteDiscoveryStats | null;
  pcap: { fileCount: number; totalBytes: number } | null;
}

interface SiteListViewProps {
  sites: SiteListItem[];
  loadingStats: boolean;
  onRegisterSite: (identifier: string, e: React.MouseEvent) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
};

export const SiteListView = ({ sites, loadingStats, onRegisterSite }: SiteListViewProps) => {
  const navigate = useNavigate();

  const handleClick = (identifier: string | null, id: string) => {
    navigate(`/discovery/${identifier || id}`);
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <div className="col-span-3">Site</div>
        <div className="col-span-2 text-center">Equipment / Variables</div>
        <div className="col-span-3">Learning Progress</div>
        <div className="col-span-2 text-center">PCAPs</div>
        <div className="col-span-2 text-right">Last Activity</div>
      </div>

      {/* Rows */}
      <div className="divide-y">
        {sites.map((site) => {
          const typeConfig = site.site_type ? siteTypeConfig[site.site_type] : null;
          const IconComponent = site.site_type ? SITE_TYPE_ICONS[site.site_type] : null;
          const stats = site.stats;
          const isUnregistered = site.type === 'unregistered';
          const confirmed = stats ? stats.variablesByState.confirmed + stats.variablesByState.published : 0;
          const total = stats?.totalVariables || 0;
          const publishedPct = total > 0 ? (stats!.variablesByState.published / total) * 100 : 0;
          const confirmedPct = total > 0 ? (stats!.variablesByState.confirmed / total) * 100 : 0;
          const hypothesisPct = total > 0 ? (stats!.variablesByState.hypothesis / total) * 100 : 0;
          const pcap = site.pcap;

          return (
            <div
              key={site.id}
              onClick={() => handleClick(site.identifier, site.id)}
              className={cn(
                'grid grid-cols-12 gap-4 px-4 py-3 items-center cursor-pointer transition-colors hover:bg-slate-50 group',
                isUnregistered && 'bg-amber-50/40 hover:bg-amber-50'
              )}
            >
              {/* Site name + type */}
              <div className="col-span-3 flex items-center gap-3 min-w-0">
                {typeConfig && IconComponent ? (
                  <div className="p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: typeConfig.bgColor }}>
                    <IconComponent primaryColor={typeConfig.primaryColor} secondaryColor={typeConfig.secondaryColor} size={16} />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-lg bg-amber-100 flex-shrink-0">
                    <Activity className="h-4 w-4 text-amber-600" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-medium text-sm text-[#1a2744] truncate">
                    {isUnregistered ? (
                      <code className="font-mono text-xs">{site.identifier?.slice(0, 16)}...</code>
                    ) : (
                      site.name
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {typeConfig ? (
                      <Badge variant="outline" className={`${typeConfig.color} text-[10px] px-1.5 py-0 h-4`}>
                        {typeConfig.label}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0 h-4">
                        Unregistered
                      </Badge>
                    )}
                    {(site.city || site.state) && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                        <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                        {[site.city, site.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Equipment / Variables */}
              <div className="col-span-2 text-center">
                {loadingStats ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                ) : stats ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <Server className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold text-sm">{stats.totalEquipment}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Variable className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold text-sm">{stats.totalVariables}</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </div>

              {/* Learning Progress */}
              <div className="col-span-3">
                {loadingStats ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : stats && total > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle className="h-3 w-3" />
                        <span className="font-medium">{confirmed}/{total}</span>
                      </div>
                      <span className="text-muted-foreground text-[10px]">
                        {Math.round((confirmed / total) * 100)}%
                      </span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                      <div className="bg-emerald-500 transition-all" style={{ width: `${publishedPct}%` }} />
                      <div className="bg-blue-500 transition-all" style={{ width: `${confirmedPct}%` }} />
                      <div className="bg-amber-400 transition-all" style={{ width: `${hypothesisPct}%` }} />
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {stats.variablesByState.published}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {stats.variablesByState.confirmed}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                        {stats.variablesByState.hypothesis}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300" />
                        {stats.variablesByState.unknown}
                      </span>
                    </div>
                  </div>
                ) : isUnregistered && !loadingStats ? (
                  <Button
                    size="sm"
                    className="h-6 text-xs px-2 bg-[#2563EB] hover:bg-[#1d4ed8]"
                    onClick={(e) => onRegisterSite(site.identifier!, e)}
                  >
                    <Plus className="h-3 w-3 mr-1" />Register
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </div>

              {/* PCAPs */}
              <div className="col-span-2 text-center">
                {isUnregistered ? (
                  <span className="text-muted-foreground text-xs">—</span>
                ) : pcap && pcap.fileCount > 0 ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <FileArchive className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold text-sm">{pcap.fileCount}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatFileSize(pcap.totalBytes)}</span>
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs">0 PCAPs</span>
                )}
              </div>

              {/* Last Activity */}
              <div className="col-span-2 text-right flex items-center justify-end gap-2">
                {loadingStats ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : stats?.lastActivity ? (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{formatDistanceToNow(new Date(stats.lastActivity), { addSuffix: true })}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">No data</span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};