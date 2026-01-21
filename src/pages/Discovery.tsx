import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// Helper function to count unique variables (same logic as in the table)
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
  
  // Filters - now filtering by Source IP (equipment/slave)
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [selectedFC, setSelectedFC] = useState<string>('all');
  
  // Track if we're showing filtered data
  const [activeSourceIpFilter, setActiveSourceIpFilter] = useState<string | null>(null);

  const isAdmin = profile?.is_admin === true;

  const loadData = useCallback(async () => {
    if (!siteId) return;
    
    setLoading(true);
    
    // Fetch site details
    const { data: siteData } = await supabase
      .from('sites')
      .select('*')
      .eq('unique_id', siteId)
      .single();
    
    if (siteData) {
      setSite(siteData);
    }
    
    // Fetch stats (uses discovered_equipment table)
    const siteStats = await getSiteStats(siteId);
    setStats(siteStats);
    
    // Fetch equipment from discovered_equipment table (fast!)
    const siteEquipment = await getSiteEquipment(siteId);
    setEquipment(siteEquipment);
    
    console.log(`[Discovery] Loaded ${siteEquipment.length} equipment from table`);
    
    // Fetch variables (limited for display)
    const siteVariables = await getVariables(siteId);
    setVariables(siteVariables);
    
    // Fetch discovered variables for historical heatmap
    const discoveredVars = await getDiscoveredVariables(siteId);
    setDiscoveredVariables(discoveredVars);
    
    setLoading(false);
  }, [siteId, getSiteStats, getSiteEquipment, getVariables, getDiscoveredVariables]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setActiveSourceIpFilter(null);
    setSelectedEquipment('all');
    setSelectedFC('all');
    await loadData();
    setRefreshing(false);
  };

  // Sync equipment from learning_samples to discovered_equipment table
  const handleSyncEquipment = async () => {
    if (!siteId) return;
    
    setSyncing(true);
    try {
      const count = await syncSiteEquipment(siteId);
      toast.success(`Synced ${count} equipment`);
      
      // Reload equipment
      const siteEquipment = await getSiteEquipment(siteId);
      setEquipment(siteEquipment);
      
      // Reload stats
      const siteStats = await getSiteStats(siteId);
      setStats(siteStats);
    } catch (error) {
      console.error('Error syncing equipment:', error);
      toast.error('Error syncing equipment');
    }
    setSyncing(false);
  };

  // Handle equipment dropdown filter change
  const handleEquipmentFilterChange = async (value: string) => {
    setSelectedEquipment(value);
    
    if (value === 'all') {
      // Reset to default data
      setActiveSourceIpFilter(null);
      const siteVariables = await getVariables(siteId!);
      setVariables(siteVariables);
    } else {
      // Fetch data specifically for this Source IP
      setLoadingFiltered(true);
      setActiveSourceIpFilter(value);
      
      const { data, error } = await supabase
        .from('learning_samples')
        .select('*')
        .eq('Identifier', siteId)
        .eq('SourceIp', value)
        .order('time', { ascending: false })
        .limit(5000); // Higher limit for specific IP
      
      if (error) {
        console.error('Error fetching filtered variables:', error);
      } else {
        setVariables((data || []) as LearningSample[]);
      }
      
      setLoadingFiltered(false);
    }
  };

  // Handle table's internal Source IP filter (from column filter)
  const handleTableSourceIpFilter = async (ip: string | null) => {
    if (!siteId) return;
    
    if (!ip) {
      // Reset to default or current equipment filter
      if (selectedEquipment === 'all') {
        setActiveSourceIpFilter(null);
        const siteVariables = await getVariables(siteId);
        setVariables(siteVariables);
      } else {
        // Keep the equipment dropdown filter
        handleEquipmentFilterChange(selectedEquipment);
      }
      return;
    }
    
    // Fetch data specifically for this Source IP
    setLoadingFiltered(true);
    setActiveSourceIpFilter(ip);
    
    const { data, error } = await supabase
      .from('learning_samples')
      .select('*')
      .eq('Identifier', siteId)
      .ilike('SourceIp', `%${ip}%`) // Use ilike for partial match
      .order('time', { ascending: false })
      .limit(5000);
    
    if (error) {
      console.error('Error fetching filtered variables:', error);
    } else {
      setVariables((data || []) as LearningSample[]);
    }
    
    setLoadingFiltered(false);
  };

  // Handle data cleared from settings tab
  const handleDataCleared = () => {
    // Reload all data
    loadData();
  };

  // Filter variables by FC (client-side since it's fast)
  const filteredVariables = variables.filter(v => {
    if (selectedFC !== 'all' && v.FC?.toString() !== selectedFC) return false;
    return true;
  });

  // Count unique variables after filtering
  const uniqueVariableCount = countUniqueVariables(filteredVariables);

  // Get unique function codes for filter
  const functionCodes = [...new Set(variables.map(v => v.FC).filter(Boolean))].sort((a, b) => (a || 0) - (b || 0));

  // Get slave equipment (those with variables) - Source IP is the slave
  const slaveEquipment = equipment.filter(e => e.role === 'slave');
  
  // All source IPs from equipment table
  const allSourceIps = slaveEquipment.map(e => e.ip).sort();

  if (loading) {
    return (
      <MainLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#2563EB] mx-auto mb-4" />
            <p className="text-muted-foreground">Loading discovery data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-slate-900 mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-[#1a2744]">
                  {site?.name || `Site ${siteId?.slice(0, 8)}...`}
                </h1>
                {!site && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                    Unregistered
                  </Badge>
                )}
              </div>
              {site && (site.city || site.state) && (
                <div className="flex items-center gap-1 text-muted-foreground mt-1">
                  <MapPin className="h-4 w-4" />
                  {[site.city, site.state, site.country].filter(Boolean).join(', ')}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                  {siteId}
                </code>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {siteId && <RunAnalysisButton siteId={siteId} />}
              <Button variant="outline" onClick={handleSyncEquipment} disabled={syncing}>
                <RefreshCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sync Equipment
              </Button>
              <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Equipment</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEquipment}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {slaveEquipment.length} slave devices
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Variables</CardTitle>
                <Variable className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalVariables}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unknown</CardTitle>
                <HelpCircle className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-600">{stats.variablesByState.unknown}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hypothesis</CardTitle>
                <Lightbulb className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{stats.variablesByState.hypothesis}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {stats.variablesByState.confirmed + stats.variablesByState.published}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Activity info */}
        {stats && (
          <div className="flex items-center gap-6 mb-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>{stats.sampleCount.toLocaleString()} samples collected</span>
            </div>
            {stats.lastActivity && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Last activity: {formatDistanceToNow(new Date(stats.lastActivity), { addSuffix: true })}</span>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="variables" className="space-y-4">
          <TabsList>
            <TabsTrigger value="variables">
              <Variable className="h-4 w-4 mr-2" />
              Variables ({uniqueVariableCount})
            </TabsTrigger>
            <TabsTrigger value="historical">
              <Grid3x3 className="h-4 w-4 mr-2" />
              Historical Heatmap
            </TabsTrigger>
            <TabsTrigger value="equipment">
              <Server className="h-4 w-4 mr-2" />
              Equipment ({equipment.length})
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="variables">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Discovered Variables</CardTitle>
                    <CardDescription>
                      Modbus registers with type inference scores
                      {activeSourceIpFilter && (
                        <span className="ml-2 text-blue-600">
                          (filtered by: {activeSourceIpFilter})
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedEquipment} onValueChange={handleEquipmentFilterChange}>
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Filter by equipment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Equipment ({allSourceIps.length} IPs)</SelectItem>
                        {slaveEquipment.map(eq => (
                          <SelectItem key={eq.ip} value={eq.ip}>
                            {eq.ip} ({eq.variableCount} vars)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={selectedFC} onValueChange={setSelectedFC}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Function" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All FC</SelectItem>
                        {functionCodes.map(fc => (
                          <SelectItem key={fc} value={fc?.toString() || ''}>
                            FC {fc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredVariables.length === 0 && !loadingFiltered ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Variable className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No variables found</p>
                    {variables.length === 0 && (
                      <p className="text-sm mt-2">
                        Upload and process a PCAP file to discover variables
                      </p>
                    )}
                  </div>
                ) : (
                  <VariableHeatmapTable 
                    variables={filteredVariables} 
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
                <CardTitle className="flex items-center gap-2">
                  <Grid3x3 className="h-5 w-5" />
                  Historical Analysis Heatmap
                </CardTitle>
                <CardDescription>
                  Detailed statistical analysis across all data types with AI winner selection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HistoricalHeatmapTable variables={discoveredVariables} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="equipment">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Discovered Equipment</CardTitle>
                    <CardDescription>
                      Network devices identified in the OT traffic ({slaveEquipment.length} slave devices, {equipment.filter(e => e.role === 'master').length} master devices)
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSyncEquipment} disabled={syncing}>
                    <RefreshCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Sync from Samples
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {equipment.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No equipment discovered yet</p>
                    <Button variant="outline" className="mt-4" onClick={handleSyncEquipment} disabled={syncing}>
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