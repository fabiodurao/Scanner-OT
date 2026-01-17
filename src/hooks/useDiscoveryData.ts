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
  
  // Equipment per site
  getSiteEquipment: (siteIdentifier: string) => Promise<DiscoveredEquipment[]>;
  
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
        if (sample.SourceIp) entry.sourceIps.add(sample.SourceIp);
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
        
        // Count unique variables (by destination IP + source IP combination)
        const uniqueVars = new Set(
          data.samples.map(s => `${s.DestinationIp}-${s.SourceIp}`)
        );
        
        unknown.push({
          identifier,
          sampleCount: data.samples.length,
          equipmentCount: data.sourceIps.size + data.destIps.size,
          variableCount: uniqueVars.size,
          firstSeen: times[0] || new Date().toISOString(),
          lastSeen: times[times.length - 1] || new Date().toISOString(),
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

  // Get stats for a specific site
  const getSiteStats = useCallback(async (siteIdentifier: string): Promise<SiteDiscoveryStats> => {
    // Get samples for this site
    const { data: samples, error } = await supabase
      .from('learning_samples')
      .select('SourceIp, DestinationIp, Address, FC, time')
      .eq('Identifier', siteIdentifier);
    
    if (error) {
      console.error('Error fetching site stats:', error);
    }
    
    if (!samples || samples.length === 0) {
      return {
        totalEquipment: 0,
        totalVariables: 0,
        variablesByState: { unknown: 0, hypothesis: 0, confirmed: 0, published: 0 },
        lastActivity: null,
        sampleCount: 0,
      };
    }
    
    // Get discovered variables for state counts
    const { data: discoveredVars } = await supabase
      .from('discovered_variables')
      .select('learning_state')
      .eq('site_identifier', siteIdentifier);
    
    // Count unique equipment (IPs)
    const equipmentIps = new Set<string>();
    samples.forEach(s => {
      if (s.SourceIp) equipmentIps.add(s.SourceIp);
      if (s.DestinationIp) equipmentIps.add(s.DestinationIp);
    });
    
    // Count unique variables (destination IP + address + FC)
    const uniqueVars = new Set(
      samples.map(s => `${s.DestinationIp}-${s.Address}-${s.FC}`)
    );
    
    // Count by state
    const stateCount = { unknown: 0, hypothesis: 0, confirmed: 0, published: 0 };
    if (discoveredVars && discoveredVars.length > 0) {
      discoveredVars.forEach(v => {
        const state = v.learning_state as keyof typeof stateCount;
        if (state in stateCount) stateCount[state]++;
      });
    } else {
      // If no discovered_variables yet, all are unknown
      stateCount.unknown = uniqueVars.size;
    }
    
    // Get last activity
    const times = samples
      .map(s => s.time)
      .filter((t): t is string => t !== null)
      .sort();
    const lastActivity = times.length > 0 ? times[times.length - 1] : null;
    
    return {
      totalEquipment: equipmentIps.size,
      totalVariables: uniqueVars.size,
      variablesByState: stateCount,
      lastActivity,
      sampleCount: samples.length,
    };
  }, []);

  // Get equipment for a site
  const getSiteEquipment = useCallback(async (siteIdentifier: string): Promise<DiscoveredEquipment[]> => {
    const { data: samples, error } = await supabase
      .from('learning_samples')
      .select('SourceIp, DestinationIp, SourceMac, DestinationMac, Protocol, Address, FC, time')
      .eq('Identifier', siteIdentifier);
    
    if (error || !samples) return [];
    
    // Group by IP
    const equipmentMap = new Map<string, {
      mac: string | null;
      role: 'master' | 'slave' | 'unknown';
      variables: Set<string>;
      lastSeen: string;
      protocols: Set<string>;
    }>();
    
    for (const sample of samples) {
      // Source IP (usually master/client)
      if (sample.SourceIp) {
        if (!equipmentMap.has(sample.SourceIp)) {
          equipmentMap.set(sample.SourceIp, {
            mac: sample.SourceMac,
            role: 'master',
            variables: new Set(),
            lastSeen: sample.time || new Date().toISOString(),
            protocols: new Set(),
          });
        }
        const entry = equipmentMap.get(sample.SourceIp)!;
        if (sample.time && sample.time > entry.lastSeen) entry.lastSeen = sample.time;
        if (sample.Protocol) entry.protocols.add(sample.Protocol);
      }
      
      // Destination IP (usually slave/server with registers)
      if (sample.DestinationIp) {
        if (!equipmentMap.has(sample.DestinationIp)) {
          equipmentMap.set(sample.DestinationIp, {
            mac: sample.DestinationMac,
            role: 'slave',
            variables: new Set(),
            lastSeen: sample.time || new Date().toISOString(),
            protocols: new Set(),
          });
        }
        const entry = equipmentMap.get(sample.DestinationIp)!;
        entry.variables.add(`${sample.Address}-${sample.FC}`);
        if (sample.time && sample.time > entry.lastSeen) entry.lastSeen = sample.time;
        if (sample.Protocol) entry.protocols.add(sample.Protocol);
      }
    }
    
    // Convert to array
    const equipment: DiscoveredEquipment[] = [];
    for (const [ip, data] of equipmentMap) {
      equipment.push({
        ip,
        mac: data.mac,
        role: data.role,
        variableCount: data.variables.size,
        lastSeen: data.lastSeen,
        protocols: Array.from(data.protocols),
      });
    }
    
    // Sort: slaves first (they have variables), then by variable count
    equipment.sort((a, b) => {
      if (a.role !== b.role) return a.role === 'slave' ? -1 : 1;
      return b.variableCount - a.variableCount;
    });
    
    return equipment;
  }, []);

  // Get raw learning samples for a site
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

  // Get consolidated discovered variables
  const getDiscoveredVariables = useCallback(async (siteIdentifier: string): Promise<DiscoveredVariable[]> => {
    const { data, error } = await supabase
      .from('discovered_variables')
      .select('*')
      .eq('site_identifier', siteIdentifier)
      .order('address', { ascending: true });
    
    if (error) {
      console.error('Error fetching discovered variables:', error);
      return [];
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
    getVariables,
    getDiscoveredVariables,
    refreshAll,
  };
};