import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  DiscoveredVariable, 
  LearningSample, 
  SiteDiscoveryStats, 
  UnknownSite,
  DiscoveredEquipment 
} from '@/types/discovery';
import { Site } from '@/types/upload';

interface UseDiscoveryDataReturn {
  // Sites
  sites: Site[];
  sitesLoading: boolean;
  
  // Unknown sites (identifiers not in sites table)
  unknownSites: UnknownSite[];
  unknownSitesLoading: boolean;
  
  // Stats per site
  getSiteStats: (siteIdentifier: string) => Promise<SiteDiscoveryStats>;
  
  // Equipment per site (now from discovered_equipment table)
  getSiteEquipment: (siteIdentifier: string) => Promise<DiscoveredEquipment[]>;
  
  // Sync equipment for a site (consolidate from learning_samples)
  syncSiteEquipment: (siteIdentifier: string) => Promise<number>;
  
  // Variables
  getVariables: (siteIdentifier: string, filters?: VariableFilters) => Promise<LearningSample[]>;
  
  // Discovered variables (consolidated)
  getDiscoveredVariables: (siteIdentifier: string) => Promise<DiscoveredVariable[]>;
  
  // Refresh
  refreshAll: () => Promise<void>;
}

interface VariableFilters {
  sourceIp?: string;
  destinationIp?: string;
  learningState?: string;
  functionCode?: number;
}

export const useDiscoveryData = (): UseDiscoveryDataReturn => {
  const [sites, setSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [unknownSites, setUnknownSites] = useState<UnknownSite[]>([]);
  const [unknownSitesLoading, setUnknownSitesLoading] = useState(true);

  // Fetch registered sites
  const fetchSites = useCallback(async () => {
    setSitesLoading(true);
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching sites:', error);
    }
    
    if (data) {
      setSites(data);
      console.log('Fetched sites:', data.length, data.map(s => ({ name: s.name, unique_id: s.unique_id })));
    }
    setSitesLoading(false);
  }, []);

  // Fetch unknown sites (identifiers in learning_samples but not in sites)
  const fetchUnknownSites = useCallback(async () => {
    setUnknownSitesLoading(true);
    
    try {
      // Use RPC to get distinct identifiers (bypasses row limits)
      const { data: distinctIdentifiersData, error: identifiersError } = await supabase
        .rpc('get_distinct_identifiers');
      
      if (identifiersError) {
        console.error('[fetchUnknownSites] Error fetching distinct identifiers:', identifiersError);
        setUnknownSitesLoading(false);
        return;
      }

      console.log('[fetchUnknownSites] Fetched distinct identifiers:', distinctIdentifiersData?.length || 0);

      if (!distinctIdentifiersData || distinctIdentifiersData.length === 0) {
        console.log('[fetchUnknownSites] No identifiers found');
        setUnknownSites([]);
        setUnknownSitesLoading(false);
        return;
      }
      
      // Extract identifiers from the result - ensure they are strings
      const uniqueIdentifiers = new Set<string>(
        distinctIdentifiersData
          .map((row: { identifier: string }) => row.identifier)
          .filter((id: string): id is string => typeof id === 'string' && id.length > 0)
      );
      
      console.log('[fetchUnknownSites] Unique identifiers found:', uniqueIdentifiers.size);

      // Get all registered site unique_ids
      const { data: registeredSites, error: sitesError } = await supabase
        .from('sites')
        .select('unique_id');
      
      if (sitesError) {
        console.error('[fetchUnknownSites] Error fetching sites for comparison:', sitesError);
      }
      
      const registeredIds = new Set<string>(
        (registeredSites || [])
          .map(s => s.unique_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      );
      
      // Filter out registered identifiers
      const unregisteredIdentifiers = Array.from(uniqueIdentifiers).filter(
        (id: string) => !registeredIds.has(id)
      );
      
      console.log('[fetchUnknownSites] Unregistered identifiers:', unregisteredIdentifiers.length);
      
      // Now fetch detailed data for each unregistered identifier
      const unknown: UnknownSite[] = [];
      
      for (const identifier of unregisteredIdentifiers) {
        // Get samples for this identifier
        const { data: identifierSamples, error: samplesError } = await supabase
          .from('learning_samples')
          .select('SourceIp, DestinationIp, time')
          .eq('Identifier', identifier)
          .order('time', { ascending: true });
        
        if (samplesError) {
          console.error(`[fetchUnknownSites] Error fetching samples for ${identifier}:`, samplesError);
          continue;
        }
        
        if (!identifierSamples || identifierSamples.length === 0) {
          continue;
        }
        
        // Collect source IPs (equipment)
        const sourceIps = new Set<string>();
        const times: string[] = [];
        
        for (const sample of identifierSamples) {
          if (sample.SourceIp) sourceIps.add(sample.SourceIp);
          if (sample.time) times.push(sample.time);
        }
        
        times.sort();
        
        unknown.push({
          identifier,
          sampleCount: identifierSamples.length,
          equipmentCount: sourceIps.size,
          variableCount: sourceIps.size,
          firstSeen: times[0] || new Date().toISOString(),
          lastSeen: times[times.length - 1] || new Date().toISOString(),
          sourceIps: Array.from(sourceIps),
        });
      }
      
      // Sort by last seen (most recent first)
      unknown.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
      
      setUnknownSites(unknown);
    } catch (error) {
      console.error('Error in fetchUnknownSites:', error);
    }
    
    setUnknownSitesLoading(false);
  }, []);

  // Get stats for a specific site - uses discovered_variables for accurate variable count
  const getSiteStats = useCallback(async (siteIdentifier: string): Promise<SiteDiscoveryStats> => {
    // Fetch equipment count from discovered_equipment table
    const { data: equipmentData, error: eqError } = await supabase
      .from('discovered_equipment')
      .select('ip_address, role, variable_count, sample_count, last_seen_at')
      .eq('site_identifier', siteIdentifier);
    
    if (eqError) {
      console.error('Error fetching equipment:', eqError);
    }
    
    // If no equipment in table, try to sync first
    if (!equipmentData || equipmentData.length === 0) {
      console.log(`No equipment found for ${siteIdentifier}, attempting sync...`);
      await syncSiteEquipment(siteIdentifier);
      
      // Retry fetch
      const { data: retryData } = await supabase
        .from('discovered_equipment')
        .select('ip_address, role, variable_count, sample_count, last_seen_at')
        .eq('site_identifier', siteIdentifier);
      
      if (retryData && retryData.length > 0) {
        return calculateStatsFromEquipment(retryData, siteIdentifier);
      }
    } else {
      return calculateStatsFromEquipment(equipmentData, siteIdentifier);
    }
    
    // Fallback: no data
    return {
      totalEquipment: 0,
      totalVariables: 0,
      variablesByState: { unknown: 0, hypothesis: 0, confirmed: 0, published: 0 },
      lastActivity: null,
      sampleCount: 0,
    };
  }, []);

  // Helper to calculate stats from equipment data
  // Now uses discovered_variables for accurate variable count
  const calculateStatsFromEquipment = async (
    equipmentData: Array<{ ip_address: string; role: string; variable_count: number; sample_count: number; last_seen_at: string }>,
    siteIdentifier: string
  ): Promise<SiteDiscoveryStats> => {
    const totalEquipment = equipmentData.length;
    const totalSamples = equipmentData.reduce((sum, e) => sum + (e.sample_count || 0), 0);
    
    // Get last activity
    const lastSeenDates = equipmentData
      .map(e => e.last_seen_at)
      .filter(Boolean)
      .sort();
    const lastActivity = lastSeenDates.length > 0 ? lastSeenDates[lastSeenDates.length - 1] : null;
    
    // Get discovered variables for ACCURATE count and state counts
    const { data: discoveredVars, error: varsError } = await supabase
      .from('discovered_variables')
      .select('learning_state')
      .eq('site_identifier', siteIdentifier);
    
    if (varsError) {
      console.error('Error fetching discovered variables for stats:', varsError);
    }
    
    // Count by state from discovered_variables (the source of truth)
    const stateCount = { unknown: 0, hypothesis: 0, confirmed: 0, published: 0 };
    const totalVariables = discoveredVars?.length || 0;
    
    if (discoveredVars && discoveredVars.length > 0) {
      discoveredVars.forEach(v => {
        const state = (v.learning_state || 'unknown') as keyof typeof stateCount;
        if (state in stateCount) stateCount[state]++;
      });
    }
    
    return {
      totalEquipment,
      totalVariables,
      variablesByState: stateCount,
      lastActivity,
      sampleCount: totalSamples,
    };
  };

  // Get equipment for a site - now from discovered_equipment table (fast!)
  const getSiteEquipment = useCallback(async (siteIdentifier: string): Promise<DiscoveredEquipment[]> => {
    console.log(`[getSiteEquipment] Fetching from discovered_equipment for ${siteIdentifier}`);
    
    const { data, error } = await supabase
      .from('discovered_equipment')
      .select('*')
      .eq('site_identifier', siteIdentifier)
      .order('role', { ascending: false })
      .order('variable_count', { ascending: false });
    
    if (error) {
      console.error('Error fetching equipment:', error);
      return [];
    }
    
    // If no data, try to sync first
    if (!data || data.length === 0) {
      console.log(`No equipment in table for ${siteIdentifier}, syncing...`);
      const count = await syncSiteEquipment(siteIdentifier);
      console.log(`Synced ${count} equipment for ${siteIdentifier}`);
      
      // Retry fetch
      const { data: retryData, error: retryError } = await supabase
        .from('discovered_equipment')
        .select('*')
        .eq('site_identifier', siteIdentifier)
        .order('role', { ascending: false })
        .order('variable_count', { ascending: false });
      
      if (retryError || !retryData) {
        return [];
      }
      
      return mapEquipmentData(retryData);
    }
    
    return mapEquipmentData(data);
  }, []);

  // Helper to map database equipment to DiscoveredEquipment type
  const mapEquipmentData = (data: Array<{
    ip_address: string;
    mac_address: string | null;
    role: string;
    variable_count: number;
    sample_count: number;
    protocols: string[] | null;
    last_seen_at: string;
  }>): DiscoveredEquipment[] => {
    return data.map(eq => ({
      ip: eq.ip_address,
      mac: eq.mac_address,
      role: eq.role as 'master' | 'slave' | 'unknown',
      variableCount: eq.variable_count || 0,
      lastSeen: eq.last_seen_at,
      protocols: eq.protocols || [],
    }));
  };

  // Sync equipment for a site (call the database function)
  const syncSiteEquipment = useCallback(async (siteIdentifier: string): Promise<number> => {
    console.log(`[syncSiteEquipment] Syncing equipment for ${siteIdentifier}`);
    
    const { data, error } = await supabase
      .rpc('sync_site_equipment', { p_site_identifier: siteIdentifier });
    
    if (error) {
      console.error('Error syncing equipment:', error);
      return 0;
    }
    
    console.log(`[syncSiteEquipment] Synced ${data} equipment for ${siteIdentifier}`);
    return data || 0;
  }, []);

  // Get raw learning samples for a site (with limit for display)
  const getVariables = useCallback(async (
    siteIdentifier: string, 
    filters?: VariableFilters
  ): Promise<LearningSample[]> => {
    let query = supabase
      .from('learning_samples')
      .select('*')
      .eq('Identifier', siteIdentifier)
      .order('time', { ascending: false })
      .limit(1000);
    
    if (filters?.sourceIp) {
      query = query.eq('SourceIp', filters.sourceIp);
    }
    if (filters?.destinationIp) {
      query = query.eq('DestinationIp', filters.destinationIp);
    }
    if (filters?.functionCode) {
      query = query.eq('FC', filters.functionCode);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching variables:', error);
      return [];
    }
    
    return (data || []) as LearningSample[];
  }, []);

  // Get consolidated discovered variables - BUSCAR TODAS AS COLUNAS
  const getDiscoveredVariables = useCallback(async (siteIdentifier: string): Promise<DiscoveredVariable[]> => {
    console.log(`[getDiscoveredVariables] Fetching ALL columns for ${siteIdentifier}`);
    
    const { data, error } = await supabase
      .from('discovered_variables')
      .select('*')
      .eq('site_identifier', siteIdentifier)
      .order('address', { ascending: true });
    
    if (error) {
      console.error('Error fetching discovered variables:', error);
      return [];
    }
    
    console.log(`[getDiscoveredVariables] Fetched ${data?.length || 0} variables`);
    
    return (data || []) as DiscoveredVariable[];
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    console.log('Refreshing all discovery data...');
    await Promise.all([fetchSites(), fetchUnknownSites()]);
  }, [fetchSites, fetchUnknownSites]);

  // Initial load
  useEffect(() => {
    fetchSites();
    fetchUnknownSites();
  }, [fetchSites, fetchUnknownSites]);

  return {
    sites,
    sitesLoading,
    unknownSites,
    unknownSitesLoading,
    getSiteStats,
    getSiteEquipment,
    syncSiteEquipment,
    getVariables,
    getDiscoveredVariables,
    refreshAll,
  };
};