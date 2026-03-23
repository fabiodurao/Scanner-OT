import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useDiscoveryData } from '@/hooks/useDiscoveryData';
import { supabase } from '@/integrations/supabase/client';
import { SiteDiscoveryStats } from '@/types/discovery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Server, 
  Variable, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  MapPin,
  Activity,
  Clock,
  HelpCircle,
  RefreshCw,
  Plus,
  BatteryCharging,
  Wind,
  Sun,
  Zap,
  Building,
  FileArchive,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const siteTypeConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  eolica: { label: 'Wind', color: 'bg-blue-100 text-blue-700', icon: Wind },
  fotovoltaica: { label: 'Solar', color: 'bg-amber-100 text-amber-700', icon: Sun },
  hibrida: { label: 'Hybrid', color: 'bg-purple-100 text-purple-700', icon: Zap },
  subestacao: { label: 'Substation', color: 'bg-slate-100 text-slate-700', icon: Building },
  bess: { label: 'BESS', color: 'bg-green-100 text-green-700', icon: BatteryCharging },
};

const formatFileSize = (bytes: number): string => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
};

interface PcapSummary {
  fileCount: number;
  totalBytes: number;
}

const Index = () => {
  const navigate = useNavigate();
  const { 
    sites, 
    sitesLoading, 
    unknownSites, 
    unknownSitesLoading,
    getSiteStats,
    refreshAll 
  } = useDiscoveryData();
  
  const [siteStats, setSiteStats] = useState<Record<string, SiteDiscoveryStats>>({});
  const [pcapSummaries, setPcapSummaries] = useState<Record<string, PcapSummary>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      if (sites.length === 0 && unknownSites.length === 0) return;
      
      setLoadingStats(true);
      const stats: Record<string, SiteDiscoveryStats> = {};
      
      for (const site of sites) {
        if (site.unique_id) {
          stats[site.unique_id] = await getSiteStats(site.unique_id);
        }
      }
      
      for (const unknown of unknownSites) {
        stats[unknown.identifier] = await getSiteStats(unknown.identifier);
      }
      
      setSiteStats(stats);
      setLoadingStats(false);
    };
    
    loadStats();
  }, [sites, unknownSites, getSiteStats]);

  // Fetch PCAP summaries for all registered sites
  useEffect(() => {
    const loadPcapSummaries = async () => {
      if (sites.length === 0) return;

      const siteIds = sites.map(s => s.id);

      const { data: sessions } = await supabase
        .from('upload_sessions')
        .select('id, site_id')
        .in('site_id', siteIds);

      if (!sessions || sessions.length === 0) return;

      const sessionIds = sessions.map(s => s.id);

      const { data: files } = await supabase
        .from('pcap_files')
        .select('session_id, size_bytes')
        .in('session_id', sessionIds)
        .eq('upload_status', 'completed');

      if (!files) return;

      const sessionToSite = new Map<string, string>();
      sessions.forEach(s => sessionToSite.set(s.id, s.site_id));

      const summaryBySiteId: Record<string, PcapSummary> = {};
      files.forEach(file => {
        const siteId = sessionToSite.get(file.session_id);
        if (!siteId) return;
        if (!summaryBySiteId[siteId]) {
          summaryBySiteId[siteId] = { fileCount: 0, totalBytes: 0 };
        }
        summaryBySiteId[siteId].fileCount += 1;
        summaryBySiteId[siteId].totalBytes += file.size_bytes || 0;
      });

      const summaryByUniqueId: Record<string, PcapSummary> = {};
      sites.forEach(site => {
        if (site.unique_id) {
          // Always set an entry, even if zero
          summaryByUniqueId[site.unique_id] = summaryBySiteId[site.id] || { fileCount: 0, totalBytes: 0 };
        }
      });

      setPcapSummaries(summaryByUniqueId);
    };

    loadPcapSummaries();
  }, [sites]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const handleRegisterSite = (identifier: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/sites-management?register=${encodeURIComponent(identifier)}`);
  };

  const handleCardClick = (identifier: string | null, id: string) => {
    const targetId = identifier || id;
    navigate(`/discovery/${targetId}`);
  };

  const totalEquipment = Object.values(siteStats).reduce((sum, s) => sum + s.totalEquipment, 0);
  const totalVariables = Object.values(siteStats).reduce((sum, s) => sum + s.totalVariables, 0);
  const confirmedVariables = Object.values(siteStats).reduce(
    (sum, s) => sum + s.variablesByState.confirmed + s.variablesByState.published, 0
  );
  const hypothesisVariables = Object.values(siteStats).reduce(
    (sum, s) => sum + s.variablesByState.hypothesis, 0
  );

  const isLoading = sitesLoading || unknownSitesLoading;

  const allSiteCards = [
    ...sites.map(site => ({
      type: 'registered' as const,
      id: site.id,
      identifier: site.unique_id,
      name: site.name,
      site_type: site.site_type,
      city: site.city,
      state: site.state,
      stats: site.unique_id ? siteStats[site.unique_id] : null,
      pcap: site.unique_id ? (pcapSummaries[site.unique_id] ?? null) : null,
    })),
    ...unknownSites.map(unknown => ({
      type: 'unregistered' as const,
      id: unknown.identifier,
      identifier: unknown.identifier,
      name: null,
      site_type: null,
      city: null,
      state: null,
      stats: siteStats[unknown.identifier] || null,
      pcap: null as PcapSummary | null,
    })),
  ];

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1a2744]">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              CyberEnergia OT Scanner Overview
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {!unknownSitesLoading && unknownSites.length > 0 && (
          <Card className="mb-6 border-amber-300 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900">
                    {unknownSites.length} Unregistered Site{unknownSites.length !== 1 ? 's' : ''} Detected
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Data is being received from site identifiers that are not registered in the system.
                    Register them to enable full monitoring and analysis.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sites</CardTitle>
              <div className="p-2 rounded-lg bg-blue-100">
                <Building2 className="h-4 w-4 text-[#2563EB]" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-3xl font-bold text-[#1a2744]">{sites.length + unknownSites.length}</div>
                  {unknownSites.length > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {unknownSites.length} pending registration
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Equipment</CardTitle>
              <div className="p-2 rounded-lg bg-purple-100">
                <Server className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-3xl font-bold text-[#1a2744]">{totalEquipment}</div>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Variables</CardTitle>
              <div className="p-2 rounded-lg bg-slate-100">
                <Variable className="h-4 w-4 text-slate-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-3xl font-bold text-[#1a2744]">{totalVariables}</div>
                  {hypothesisVariables > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {hypothesisVariables} with hypotheses
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed</CardTitle>
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
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

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#1a2744]">Sites</h2>
            <Link to="/sites-management">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Site
              </Button>
            </Link>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : allSiteCards.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No Sites Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by uploading a PCAP file or adding a site manually.
                </p>
                <div className="flex gap-2 justify-center">
                  <Link to="/upload">
                    <Button variant="outline">Upload PCAP</Button>
                  </Link>
                  <Link to="/sites-management">
                    <Button>
                      <Building2 className="h-4 w-4 mr-2" />
                      Add Site
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allSiteCards.map((siteCard) => {
                const stats = siteCard.stats;
                const typeConfig = siteCard.site_type ? siteTypeConfig[siteCard.site_type] : null;
                const TypeIcon = typeConfig?.icon;
                const isUnregistered = siteCard.type === 'unregistered';
                const pcap = siteCard.pcap;

                // PCAP line: always show for registered sites (even if 0)
                const pcapLine = !isUnregistered
                  ? pcap && pcap.fileCount > 0
                    ? `${pcap.fileCount} PCAP${pcap.fileCount !== 1 ? 's' : ''} · ${formatFileSize(pcap.totalBytes)}`
                    : '0 PCAPs'
                  : null;

                // Last activity line: show relative time or "Not processed yet"
                const lastActivityLine = stats?.lastActivity
                  ? formatDistanceToNow(new Date(stats.lastActivity), { addSuffix: true })
                  : 'Not processed yet';

                return (
                  <Card 
                    key={siteCard.id} 
                    className={`hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col ${
                      isUnregistered 
                        ? 'border-amber-300 bg-amber-50/30 hover:border-amber-400' 
                        : 'border-slate-200 hover:shadow-blue-500/10 hover:border-[#2563EB]/30'
                    }`}
                    onClick={() => handleCardClick(siteCard.identifier, siteCard.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {TypeIcon && typeConfig && (
                            <div className={`p-1.5 rounded-lg flex-shrink-0 ${typeConfig.color.split(' ')[0]}`}>
                              <TypeIcon className={`h-4 w-4 ${typeConfig.color.split(' ')[1]}`} />
                            </div>
                          )}
                          {isUnregistered && (
                            <Activity className="h-5 w-5 text-amber-500 flex-shrink-0" />
                          )}
                          {isUnregistered ? (
                            <CardTitle className="text-lg text-[#1a2744] truncate">
                              <code className="text-sm font-mono">{siteCard.identifier?.slice(0, 8)}...</code>
                            </CardTitle>
                          ) : (
                            <CardTitle className="text-lg text-[#1a2744] truncate">{siteCard.name}</CardTitle>
                          )}
                        </div>
                        {isUnregistered ? (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 flex-shrink-0">
                            Unregistered
                          </Badge>
                        ) : typeConfig ? (
                          <Badge className={`${typeConfig.color} flex-shrink-0`} variant="outline">
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
                        <p className="text-xs text-amber-700 mt-1">
                          Unregistered site identifier
                        </p>
                      )}
                    </CardHeader>

                    {/* Main content — grows to fill space */}
                    <CardContent className="flex flex-col flex-1 pb-0">
                      {loadingStats ? (
                        <div className="flex items-center justify-center py-4 flex-1">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : stats ? (
                        <div className="flex flex-col flex-1">
                          {/* Equipment & Variables */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-slate-100">
                                <Server className="h-4 w-4 text-slate-600" />
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-[#1a2744]">{stats.totalEquipment}</div>
                                <div className="text-xs text-muted-foreground">Equipment</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-slate-100">
                                <Variable className="h-4 w-4 text-slate-600" />
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-[#1a2744]">{stats.totalVariables}</div>
                                <div className="text-xs text-muted-foreground">Variables</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Learning progress */}
                          {stats.totalVariables > 0 && (
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Learning Progress</span>
                                <span className="font-medium">
                                  {stats.variablesByState.confirmed + stats.variablesByState.published}/{stats.totalVariables}
                                </span>
                              </div>
                              <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                                <div 
                                  className="bg-emerald-500" 
                                  style={{ width: `${(stats.variablesByState.published / stats.totalVariables) * 100}%` }}
                                />
                                <div 
                                  className="bg-blue-500" 
                                  style={{ width: `${(stats.variablesByState.confirmed / stats.totalVariables) * 100}%` }}
                                />
                                <div 
                                  className="bg-amber-400" 
                                  style={{ width: `${(stats.variablesByState.hypothesis / stats.totalVariables) * 100}%` }}
                                />
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  Published
                                </span>
                                <span className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                  Confirmed
                                </span>
                                <span className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                                  Hypothesis
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Spacer to push footer down */}
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

                      {/* Register button for unregistered sites */}
                      {isUnregistered && (
                        <div className="mt-4">
                          <Button 
                            size="sm" 
                            className="w-full bg-[#2563EB] hover:bg-[#1d4ed8]"
                            onClick={(e) => handleRegisterSite(siteCard.identifier!, e)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Register Site
                          </Button>
                        </div>
                      )}

                      {/* Footer — always two fixed lines at the bottom */}
                      <div className="mt-4 pt-3 border-t space-y-1 pb-4">
                        {/* PCAP line — only for registered sites */}
                        {!isUnregistered && (
                          <div className={`flex items-center gap-1.5 text-xs ${pcap && pcap.fileCount > 0 ? 'text-muted-foreground' : 'text-slate-400'}`}>
                            <FileArchive className="h-3 w-3 flex-shrink-0" />
                            <span>{pcapLine}</span>
                          </div>
                        )}
                        {/* Last activity line — always shown */}
                        <div className={`flex items-center gap-1.5 text-xs ${stats?.lastActivity ? 'text-muted-foreground' : 'text-slate-400'}`}>
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>
                            {stats?.lastActivity
                              ? `Last activity: ${lastActivityLine}`
                              : 'Last activity: not processed yet'
                            }
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;