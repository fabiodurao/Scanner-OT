import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useDiscoveryData } from '@/hooks/useDiscoveryData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LearningSample, SiteDiscoveryStats, DiscoveredEquipment, DiscoveredVariable } from '@/types/discovery';
import { Site } from '@/types/upload';
import { VariableHeatmapTable } from '@/components/discovery/VariableHeatmapTable';
import { HistoricalHeatmapTable } from '@/components/variables/HistoricalHeatmapTable';
import { EquipmentList } from '@/components/discovery/EquipmentList';
import { SiteSettingsTab } from '@/components/discovery/SiteSettingsTab';
import { RunAnalysisButton } from '@/components/discovery/RunAnalysisButton';
import { PhotoAnalysisButton } from '@/components/discovery/PhotoAnalysisButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  Server, 
  Variable, 
  CheckCircle, 
  Lightbulb,
  HelpCircle,
  Loader2,
  MapPin,
  RefreshCw,
  Clock,
  Database,
  RefreshCcw,
  Settings,
  Grid3x3,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const countUniqueVariables = (variables: LearningSample[]): number => {
  const uniqueKeys = new Set<string>();
  for (const v of variables) {
    const key = `${v.SourceIp}-${v.DestinationIp}-${v.Address}-${v.FC}`;
    uniqueKeys.add(key);
  }
  return uniqueKeys.size;
};

const Discovery = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { profile } = useAuth();
  const { getSiteStats, getSiteEquipment, syncSiteEquipment, getVariables, getDiscoveredVariables } = useDiscoveryData();
  
  const [site, setSite] = useState<Site | null>(null);
  const [stats, setStats] = useState<SiteDiscoveryStats | null>(null);
  const [equipment, setEquipment] = useState<DiscoveredEquipment[]>([]);
  const [variables, setVariables] = useState<LearningSample[]>([]);
  const [discoveredVariables, setDiscoveredVariables] = useState<DiscoveredVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadingFiltered, setLoadingFiltered] = useState(false);
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'variables');
  
  const [activeSourceIpFilter, setActiveSourceIpFilter] = useState<string | null>(null);

  const isAdmin = profile?.is_admin === true;

  const loadData = useCallback(async () => {
    if (!siteId) return;
    
    console.log('[Discovery] Loading data for site:', siteId);
    setLoading(true);
    
    const { data: siteData } = await supabase
      .from('sites')
      .select('*')
      .eq('unique_id', siteId)
      .single();
    
    if (siteData) {
      setSite(siteData);
    }
    
    const siteStats = await getSiteStats(siteId);
    setStats(siteStats);
    
    const siteEquipment = await getSiteEquipment(siteId);
    setEquipment(siteEquipment);
    
    console.log(`[Discovery] Loaded ${siteEquipment.length} equipment from table`);
    
    const siteVariables = await getVariables(siteId);
    setVariables(siteVariables);
    
    const discoveredVars = await getDiscoveredVariables(siteId);
    setDiscoveredVariables(discoveredVars);
    
    console.log('[Discovery] Data loading complete');
    setLoading(false);
  }, [siteId, getSiteStats, getSiteEquipment, getVariables, getDiscoveredVariables]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for custom reload event from contexts
  useEffect(() => {
    const handleReloadData = (event: CustomEvent) => {
      console.log('[Discovery] 🔄 Received reload-discovery-data event:', event.detail);
      
      if (event.detail.siteId === siteId) {
        console.log('[Discovery] 🔄 Site matches, reloading data...');
        loadData();
      }
    };

    window.addEventListener('reload-discovery-data', handleReloadData as EventListener);

    return () => {
      window.removeEventListener('reload-discovery-data', handleReloadData as EventListener);
    };
  }, [siteId, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setActiveSourceIpFilter(null);
    await loadData();
    setRefreshing(false);
  };

  const handleSyncEquipment = async () => {
    if (!siteId) return;
    
    setSyncing(true);
    try {
      const count = await syncSiteEquipment(siteId);
      toast.success(`Synced ${count} equipment`);
      
      const siteEquipment = await getSiteEquipment(siteId);
      setEquipment(siteEquipment);
      
      const siteStats = await getSiteStats(siteId);
      setStats(siteStats);
    } catch (error) {
      console.error('Error syncing equipment:', error);
      toast.error('Error syncing equipment');
    }
    setSyncing(false);
  };

  const handleTableSourceIpFilter = async (ip: string | null) => {
    if (!siteId) return;
    
    if (!ip) {
      setActiveSourceIpFilter(null);
      const siteVariables = await getVariables(siteId);
      setVariables(siteVariables);
      return;
    }
    
    setLoadingFiltered(true);
    setActiveSourceIpFilter(ip);
    
    const { data, error } = await supabase
      .from('learning_samples')
      .select('*')
      .eq('Identifier', siteId)
      .ilike('SourceIp', `%${ip}%`)
      .order('time', { ascending: false })
      .limit(5000);
    
    if (error) {
      console.error('Error fetching filtered variables:', error);
    } else {
      setVariables((data || []) as LearningSample[]);
    }
    
    setLoadingFiltered(false);
  };

  const handleDataCleared = () => {
    loadData();
  };

  const handleVariableUpdated = () => {
    loadData();
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'variables') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const uniqueVariableCount = countUniqueVariables(variables);

  const slaveEquipment = equipment.filter(e => e.role === 'slave');
  
  const allSourceIps = slaveEquipment.map(e => e.ip).sort();

  if (loading) {
    return (
      <MainLayout>
        <div className="p-4 sm:p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#2563EB] mx-auto mb-4" />
            <p className="text-muted-foreground text-sm sm:text-base">Loading discovery data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 sm:p-8">
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
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1a2744] truncate">
                  {site?.name || `Site ${siteId?.slice(0, 8)}...`}
                </h1>
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
                onClick={handleSyncEquipment} 
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
                onClick={handleRefresh} 
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

        {stats && (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-4 sm:mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Equipment</CardTitle>
                <Server className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.totalEquipment}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  {slaveEquipment.length} slaves
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
        )}

        {stats && (
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
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="variables" className="text-xs sm:text-sm py-2 sm:py-1.5">
              <Variable className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Discovered Variables ({uniqueVariableCount})</span>
              <span className="sm:hidden">Variables</span>
            </TabsTrigger>
            <TabsTrigger value="historical" className="text-xs sm:text-sm py-2 sm:py-1.5">
              <Grid3x3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Historical Analysis</span>
              <span className="sm:hidden">Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="equipment" className="text-xs sm:text-sm py-2 sm:py-1.5">
              <Server className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Equipment ({equipment.length})</span>
              <span className="sm:hidden">Equipment</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="settings" className="text-xs sm:text-sm py-2 sm:py-1.5">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden">Settings</span>
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="variables">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg">Discovered Variables</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Modbus registers with type inference scores
                      {activeSourceIpFilter && (
                        <span className="ml-2 text-blue-600 block sm:inline mt-1 sm:mt-0">
                          (filtered by: {activeSourceIpFilter})
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {siteId && <RunAnalysisButton siteId={siteId} />}
                    {siteId && <PhotoAnalysisButton siteId={siteId} />}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {variables.length === 0 && !loadingFiltered ? (
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <Variable className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">No variables found</p>
                    <p className="text-xs sm:text-sm mt-2">
                      Upload and process a PCAP file to discover variables
                    </p>
                  </div>
                ) : (
                  <VariableHeatmapTable 
                    variables={variables} 
                    allSourceIps={allSourceIps}
                    onFilterBySourceIp={handleTableSourceIpFilter}
                    isLoadingFiltered={loadingFiltered}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="historical">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Grid3x3 className="h-4 w-4 sm:h-5 sm:w-5" />
                      Historical Analysis
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Detailed statistical analysis across all data types with AI winner selection
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {siteId && <RunAnalysisButton siteId={siteId} />}
                    {siteId && <PhotoAnalysisButton siteId={siteId} />}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <HistoricalHeatmapTable 
                  variables={discoveredVariables} 
                  onVariableUpdated={handleVariableUpdated}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="equipment">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg">Discovered Equipment</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Network devices identified in the OT traffic ({slaveEquipment.length} slave devices, {equipment.filter(e => e.role === 'master').length} master devices)
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSyncEquipment} 
                    disabled={syncing}
                    className="w-full sm:w-auto"
                  >
                    <RefreshCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Sync Equipment</span>
                    <span className="sm:hidden">Sync</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {equipment.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <Server className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">No equipment discovered yet</p>
                    <Button 
                      variant="outline" 
                      className="mt-4 w-full sm:w-auto" 
                      onClick={handleSyncEquipment} 
                      disabled={syncing}
                    >
                      <RefreshCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      Sync Equipment
                    </Button>
                  </div>
                ) : (
                  <EquipmentList equipment={equipment} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="settings">
              <SiteSettingsTab 
                siteIdentifier={siteId!}
                siteName={site?.name}
                onDataCleared={handleDataCleared}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Discovery;