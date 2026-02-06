import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useDiscoveryData } from './useDiscoveryData';
import { useNetworkAssets } from './useNetworkAssets';
import { LearningSample, SiteDiscoveryStats, DiscoveredEquipment, DiscoveredVariable } from '@/types/discovery';
import { NetworkAsset } from '@/types/network';
import { Site } from '@/types/upload';
import { toast } from 'sonner';

export const useDiscoveryPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { getSiteStats, getSiteEquipment, syncSiteEquipment, getVariables, getDiscoveredVariables } = useDiscoveryData();
  const { assets: networkAssets, loading: networkLoading, refresh: refreshNetwork } = useNetworkAssets(siteId || '');
  
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
  
  const [selectedAsset, setSelectedAsset] = useState<NetworkAsset | null>(null);
  const [assetSheetOpen, setAssetSheetOpen] = useState(false);

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
    await Promise.all([loadData(), refreshNetwork()]);
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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'variables') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleAssetClick = (asset: NetworkAsset) => {
    setSelectedAsset(asset);
    setAssetSheetOpen(true);
  };

  return {
    siteId,
    site,
    stats,
    equipment,
    variables,
    discoveredVariables,
    networkAssets,
    loading,
    refreshing,
    syncing,
    loadingFiltered,
    networkLoading,
    activeTab,
    activeSourceIpFilter,
    selectedAsset,
    assetSheetOpen,
    handleRefresh,
    handleSyncEquipment,
    handleTableSourceIpFilter,
    handleTabChange,
    handleAssetClick,
    setAssetSheetOpen,
    loadData,
    refreshNetwork,
  };
};