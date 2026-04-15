import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDiscoveryData } from '@/hooks/useDiscoveryData';
import { SiteDiscoveryStats } from '@/types/discovery';

export interface PcapSummary {
  fileCount: number;
  totalBytes: number;
}

export interface SiteCard {
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
  pcap: PcapSummary | null;
}

export const useDashboardData = () => {
  const { sites, sitesLoading, unknownSites, unknownSitesLoading, getSiteStats, refreshAll } = useDiscoveryData();

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
        if (site.unique_id) stats[site.unique_id] = await getSiteStats(site.unique_id);
      }
      for (const unknown of unknownSites) {
        stats[unknown.identifier] = await getSiteStats(unknown.identifier);
      }
      setSiteStats(stats);
      setLoadingStats(false);
    };
    loadStats();
  }, [sites, unknownSites, getSiteStats]);

  useEffect(() => {
    const loadPcapSummaries = async () => {
      if (sites.length === 0) return;
      const siteIds = sites.map(s => s.id);
      const { data: sessions } = await supabase.from('upload_sessions').select('id, site_id').in('site_id', siteIds);
      if (!sessions || sessions.length === 0) return;
      const sessionIds = sessions.map(s => s.id);
      const { data: files } = await supabase.from('pcap_files').select('session_id, size_bytes').in('session_id', sessionIds).eq('upload_status', 'completed');
      if (!files) return;
      const sessionToSite: Record<string, string> = {};
      sessions.forEach(s => { sessionToSite[s.id] = s.site_id; });
      const summaryBySiteId: Record<string, PcapSummary> = {};
      files.forEach(file => {
        const siteId = sessionToSite[file.session_id];
        if (!siteId) return;
        if (!summaryBySiteId[siteId]) summaryBySiteId[siteId] = { fileCount: 0, totalBytes: 0 };
        summaryBySiteId[siteId].fileCount += 1;
        summaryBySiteId[siteId].totalBytes += file.size_bytes || 0;
      });
      const summaryByUniqueId: Record<string, PcapSummary> = {};
      sites.forEach(site => {
        if (site.unique_id) summaryByUniqueId[site.unique_id] = summaryBySiteId[site.id] || { fileCount: 0, totalBytes: 0 };
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

  const allSiteCards = useMemo<SiteCard[]>(() => [
    ...sites.map(site => ({
      type: 'registered' as const,
      id: site.id,
      identifier: site.unique_id,
      name: site.name,
      site_type: site.site_type,
      city: site.city,
      state: site.state,
      latitude: site.latitude,
      longitude: site.longitude,
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
      latitude: null,
      longitude: null,
      stats: siteStats[unknown.identifier] || null,
      pcap: null,
    })),
  ], [sites, unknownSites, siteStats, pcapSummaries]);

  const globalStats = useMemo(() => ({
    totalSites: sites.length + unknownSites.length,
    totalEquipment: Object.values(siteStats).reduce((sum, s) => sum + s.totalEquipment, 0),
    totalVariables: Object.values(siteStats).reduce((sum, s) => sum + s.totalVariables, 0),
    confirmedVariables: Object.values(siteStats).reduce((sum, s) => sum + s.variablesByState.confirmed + s.variablesByState.published, 0),
    hypothesisVariables: Object.values(siteStats).reduce((sum, s) => sum + s.variablesByState.hypothesis, 0),
  }), [siteStats, sites.length, unknownSites.length]);

  const allSiteIdentifiers = useMemo(() =>
    allSiteCards
      .map(c => c.identifier)
      .filter((id): id is string => id !== null),
    [allSiteCards]
  );

  return {
    sites,
    unknownSites,
    allSiteCards,
    allSiteIdentifiers,
    globalStats,
    loadingStats,
    isLoading: sitesLoading || unknownSitesLoading,
    refreshing,
    handleRefresh,
  };
};