import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SiteCard } from '@/hooks/useDashboardData';
import { siteTypeConfig } from '@/pages/SitesManagement';
import { SITE_TYPE_ICONS } from '@/components/icons/SiteTypeIcon';
import {
  Server, Variable, MapPin, Activity, Clock, HelpCircle,
  FileArchive, Plus, Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const formatFileSize = (bytes: number): string => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
};

interface SiteCardItemProps {
  siteCard: SiteCard;
  loadingStats: boolean;
  onRegisterSite: (identifier: string, e: React.MouseEvent) => void;
}

export const SiteCardItem = ({ siteCard, loadingStats, onRegisterSite }: SiteCardItemProps) => {
  const navigate = useNavigate();
  const stats = siteCard.stats;
  const typeConfig = siteCard.site_type ? siteTypeConfig[siteCard.site_type] : null;
  const IconComponent = siteCard.site_type ? SITE_TYPE_ICONS[siteCard.site_type] : null;
  const isUnregistered = siteCard.type === 'unregistered';
  const pcap = siteCard.pcap;
  const pcapLine = !isUnregistered
    ? (pcap && pcap.fileCount > 0
      ? `${pcap.fileCount} PCAP${pcap.fileCount !== 1 ? 's' : ''} · ${formatFileSize(pcap.totalBytes)}`
      : '0 PCAPs')
    : null;
  const lastActivityLine = stats?.lastActivity
    ? formatDistanceToNow(new Date(stats.lastActivity), { addSuffix: true })
    : 'Not processed yet';

  const handleClick = () => {
    navigate(`/discovery/${siteCard.identifier || siteCard.id}`);
  };

  return (
    <Card
      className={`hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col ${
        isUnregistered
          ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/20 hover:border-amber-400'
          : 'border-border hover:shadow-blue-500/10 hover:border-[#2563EB]/30'
      }`}
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {typeConfig && IconComponent && (
              <div className="p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: typeConfig.bgColor }}>
                <IconComponent primaryColor={typeConfig.primaryColor} secondaryColor={typeConfig.secondaryColor} size={16} />
              </div>
            )}
            {isUnregistered && <Activity className="h-5 w-5 text-amber-500 flex-shrink-0" />}
            {isUnregistered ? (
              <CardTitle className="text-lg text-foreground truncate">
                <code className="text-sm font-mono">{siteCard.identifier?.slice(0, 8)}...</code>
              </CardTitle>
            ) : (
              <CardTitle className="text-lg text-foreground truncate">{siteCard.name}</CardTitle>
            )}
          </div>
          {isUnregistered ? (
            <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 flex-shrink-0">
              Unregistered
            </Badge>
          ) : typeConfig && IconComponent ? (
            <Badge variant="outline" className={`${typeConfig.color} flex-shrink-0 gap-1.5`}>
              <IconComponent primaryColor={typeConfig.primaryColor} secondaryColor={typeConfig.secondaryColor} size={12} />
              {typeConfig.label}
            </Badge>
          ) : null}
        </div>
        {!isUnregistered && (siteCard.city || siteCard.state) && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="h-4 w-4" />
            {[siteCard.city, siteCard.state].filter(Boolean).join(', ')}
          </div>
        )}
        {isUnregistered && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Unregistered site identifier</p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col flex-1 pb-0">
        {loadingStats ? (
          <div className="flex items-center justify-center py-4 flex-1">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <div className="flex flex-col flex-1">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-secondary">
                  <Server className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.totalEquipment}</div>
                  <div className="text-xs text-muted-foreground">Equipment</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-secondary">
                  <Variable className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.totalVariables}</div>
                  <div className="text-xs text-muted-foreground">Variables</div>
                </div>
              </div>
            </div>
            {stats.totalVariables > 0 && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Learning Progress</span>
                  <span className="font-medium">
                    {stats.variablesByState.confirmed + stats.variablesByState.published}/{stats.totalVariables}
                  </span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-secondary">
                  <div className="bg-emerald-500" style={{ width: `${(stats.variablesByState.published / stats.totalVariables) * 100}%` }} />
                  <div className="bg-blue-500" style={{ width: `${(stats.variablesByState.confirmed / stats.totalVariables) * 100}%` }} />
                  <div className="bg-amber-400" style={{ width: `${(stats.variablesByState.hypothesis / stats.totalVariables) * 100}%` }} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" />Published</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" />Confirmed</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" />Hypothesis</span>
                </div>
              </div>
            )}
            <div className="flex-1" />
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            <div className="text-center py-4 text-muted-foreground text-sm flex-1 flex flex-col items-center justify-center">
              <HelpCircle className="h-8 w-8 mb-2 opacity-50" />
              No data yet
              <p className="text-xs mt-1">Upload a PCAP to start discovery</p>
            </div>
          </div>
        )}

        {isUnregistered && (
          <div className="mt-4">
            <Button
              size="sm"
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8]"
              onClick={(e) => { e.stopPropagation(); onRegisterSite(siteCard.identifier!, e); }}
            >
              <Plus className="h-4 w-4 mr-1" />Register Site
            </Button>
          </div>
        )}

        <div className="mt-4 pt-3 border-t space-y-1 pb-4">
          {!isUnregistered && (
            <div className={`flex items-center gap-1.5 text-xs ${pcap && pcap.fileCount > 0 ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
              <FileArchive className="h-3 w-3 flex-shrink-0" />
              <span>{pcapLine}</span>
            </div>
          )}
          <div className={`flex items-center gap-1.5 text-xs ${stats?.lastActivity ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>{stats?.lastActivity ? `Last activity: ${lastActivityLine}` : 'Last activity: not processed yet'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};