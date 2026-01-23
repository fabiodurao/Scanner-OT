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
      // Get all unique identifiers from learning_samples
      const { data: samples, error: samplesError } = await supabase
        .from('learning_samples')
        .select('Identifier, SourceIp, DestinationIp, time');
      
      if (samplesError) {
        console.error('Error fetching learning_samples:', samplesError);
        setUnknownSitesLoading(false);
        return;
      }

      console.log('Fetched learning_samples:', samples?.length || 0);

      if (!samples || samples.length === 0) {
        console.log('No learning samples found');
        setUnknownSites([]);
        setUnknownSitesLoading(false);
        return;
      }

      // Get all registered site unique_ids
      const { data: registeredSites, error: sitesError } = await supabase
        .from('sites')
        .select('unique_id');
      
      if (sitesError) {
        console.error('Error fetching sites for comparison:', sitesError);
      }
      
      const registeredIds = new Set(
        (registeredSites || [])
          .map(s => s.unique_id)
          .filter(Boolean)
      );
      
      console.log('Registered site unique_ids:', Array.from(registeredIds));
      
      // Get unique identifiers from samples
      const uniqueIdentifiers = new Set(
        samples
          .map(s => s.Identifier)
          .filter(Boolean)
      );
      
      console.log('Unique identifiers in learning_samples:', Array.from(uniqueIdentifiers));
      
      // Group samples by identifier and filter out registered ones
      const identifierMap = new Map<string, {
        samples: typeof samples;
        sourceIps: Set<string>;
        destIps: Set<string>;
      }>();
      
      for (const sample of samples) {
        if (!sample.Identifier) continue;
        
        // Check if this identifier is NOT registered
        if (registeredIds.has(sample.Identifier)) {
          continue; // Skip registered sites
        }
        
        if (!identifierMap.has(sample.Identifier)) {
          identifierMap.set(sample.Identifier, {
            samples: [],
            sourceIps: new Set(),
            destIps: new Set(),
          });
        }
        
        const entry = identifierMap.get(sample.Identifier)!;
        entry.samples.push(sample);
        // SourceIp is the equipment (slave) responding
        if (sample.SourceIp) entry.sourceIps.add(sample.SourceIp);
        // DestinationIp is the master asking
        if (sample.DestinationIp) entry.destIps.add(sample.DestinationIp);
      }
      
      console.log('Unknown identifiers found:', identifierMap.size);
      
      // Convert to UnknownSite array
      const unknown: UnknownSite[] = [];
      
      for (const [identifier, data] of identifierMap) {
        const times = data.samples
          .map(s => s.time)
          .filter((t): t is string => t !== null)
          .sort();
        
        // Count unique variables (by source IP (equipment) + address combination would be better, but we don't have address here)
        const uniqueVars = new Set(
          data.samples.map(s => `${s.SourceIp}`)
        );
        
        unknown.push({
          identifier,
          sampleCount: data.samples.length,
          // Equipment count is the number of unique source IPs (slaves responding)
          equipmentCount: data.sourceIps.size,
          variableCount: uniqueVars.size,
          firstSeen: times[0] || new Date().toISOString(),
          lastSeen: times[times.length - 1] || new Date().toISOString(),
          // Source IPs are the equipment (slaves)
          sourceIps: Array.from(data.sourceIps),
        });
      }
      
      // Sort by last seen (most recent first)
      unknown.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
      
      console.log('Unknown sites to display:', unknown);
      
      setUnknownSites(unknown);
    } catch (error) {
      console.error('Error in fetchUnknownSites:', error);
    }
    
    setUnknownSitesLoading(false);
  }, []);

  // Get stats for a specific site - uses discovered_equipment for equipment count
  const getSiteStats = useCallback(async (siteIdentifier: string): Promise<SiteDiscoveryStats> => {
    // Get equipment count from discovered_equipment table (fast!)
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
  const calculateStatsFromEquipment = async (
    equipmentData: Array<{ ip_address: string; role: string; variable_count: number; sample_count: number; last_seen_at: string }>,
    siteIdentifier: string
  ): Promise<SiteDiscoveryStats> => {
    // Count slaves (equipment with registers)
    const slaves = equipmentData.filter(e => e.role === 'slave');
    const totalEquipment = equipmentData.length;
    const totalVariables = slaves.reduce((sum, e) => sum + (e.variable_count || 0), 0);
    const totalSamples = equipmentData.reduce((sum, e) => sum + (e.sample_count || 0), 0);
    
    // Get last activity
    const lastSeenDates = equipmentData
      .map(e => e.last_seen_at)
      .filter(Boolean)
      .sort();
    const lastActivity = lastSeenDates.length > 0 ? lastSeenDates[lastSeenDates.length - 1] : null;
    
    // Get discovered variables for state counts
    const { data: discoveredVars } = await supabase
      .from('discovered_variables')
      .select('learning_state')
      .eq('site_identifier', siteIdentifier);
    
    // Count by state
    const stateCount = { unknown: 0, hypothesis: 0, confirmed: 0, published: 0 };
    if (discoveredVars && discoveredVars.length > 0) {
      discoveredVars.forEach(v => {
        const state = v.learning_state as keyof typeof stateCount;
        if (state in stateCount) stateCount[state]++;
      });
    } else {
      // If no discovered_variables yet, all are unknown
      stateCount.unknown = totalVariables;
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
      .select('*') // Busca TODAS as colunas
      .eq('site_identifier', siteIdentifier)
      .order('address', { ascending: true });
    
    if (error) {
      console.error('Error fetching discovered variables:', error);
      return [];
    }
    
    console.log(`[getDiscoveredVariables] Fetched ${data?.length || 0} variables`);
    if (data && data.length > 0) {
      console.log('[getDiscoveredVariables] Sample variable:', data[0]);
      console.log('[getDiscoveredVariables] Has UINT16?', 'UINT16' in data[0], data[0].UINT16);
      console.log('[getDiscoveredVariables] Has winner?', data[0].winner);
      console.log('[getDiscoveredVariables] Has scale?', data[0].scale);
    }
    
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