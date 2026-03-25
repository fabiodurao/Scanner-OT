import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useDiscoveryData } from './useDiscoveryData';
import { SiteDiscoveryStats, DiscoveredEquipment, DiscoveredVariable } from '@/types/discovery';
import { Site } from '@/types/upload';
import { toast } from 'sonner';

export const useDiscoveryPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const { getSiteStats, getSiteEquipment, syncSiteEquipment, getDiscoveredVariables } = useDiscoveryData();

  const [site, setSite] = useState<Site | null>(null);
  const [stats, setStats] = useState<SiteDiscoveryStats | null>(null);
  const [equipment, setEquipment] = useState<DiscoveredEquipment[]>([]);
  const [discoveredVariables, setDiscoveredVariables] = useState<DiscoveredVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'historical');

  const loadData = useCallback(async () => {
    if (!siteId) return;

    console.log('[Discovery] Loading data for site:', siteId);
    setLoading(true);

    const { data: siteData } = await supabase
      .from('sites')
      .select('*')
      .eq('unique_id', siteId)
      .single();

    if (siteData) setSite(siteData);

    const [siteStats, siteEquipment, discoveredVars] = await Promise.all([
      getSiteStats(siteId),
      getSiteEquipment(siteId),
      getDiscoveredVariables(siteId),
    ]);

    setStats(siteStats);
    setEquipment(siteEquipment);
    setDiscoveredVariables(discoveredVars);

    console.log('[Discovery] Data loading complete. Variables:', discoveredVars.length);
    setLoading(false);
  }, [siteId, getSiteStats, getSiteEquipment, getDiscoveredVariables]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleReloadData = (event: CustomEvent) => {
      if (event.detail.siteId === siteId) {
        console.log('[Discovery] Reloading data after analysis...');
        loadData();
      }
    };
    window.addEventListener('reload-discovery-data', handleReloadData as EventListener);
    return () => window.removeEventListener('reload-discovery-data', handleReloadData as EventListener);
  }, [siteId, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSyncEquipment = async () => {
    if (!siteId) return;
    setSyncing(true);
    try {
      const count = await syncSiteEquipment(siteId);
      toast.success(`Synced ${count} equipment`);
      const [siteEquipment, siteStats] = await Promise.all([
        getSiteEquipment(siteId),
        getSiteStats(siteId),
      ]);
      setEquipment(siteEquipment);
      setStats(siteStats);
    } catch (error) {
      console.error('Error syncing equipment:', error);
      toast.error('Error syncing equipment');
    }
    setSyncing(false);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'historical') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return {
    siteId,
    site,
    stats,
    equipment,
    discoveredVariables,
    loading,
    refreshing,
    syncing,
    activeTab,
    handleRefresh,
    handleSyncEquipment,
    handleTabChange,
    loadData,
  };
};