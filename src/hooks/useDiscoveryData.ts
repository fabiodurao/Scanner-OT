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

  // Get stats for a specific site - NO LIMIT, fetches all data
  const getSiteStats = useCallback(async (siteIdentifier: string): Promise<SiteDiscoveryStats> => {
    // Get ALL samples for this site (no limit)
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
    
    // Count unique equipment - SourceIp is the equipment (slave) responding
    const equipmentIps = new Set<string>();
    samples.forEach(s => {
      // Only count SourceIp as equipment (the slave that responds with data)
      if (s.SourceIp) equipmentIps.add(s.SourceIp);
    });
    
    // Count unique variables (source IP (equipment) + address + FC)
    const uniqueVars = new Set(
      samples.map(s => `${s.SourceIp}-${s.Address}-${s.FC}`)
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

  // Get equipment for a site - fetches ALL unique IPs from database
  // In Modbus: SourceIp is the equipment (slave) that RESPONDS with register data
  // DestinationIp is the master/client that ASKS for data
  const getSiteEquipment = useCallback(async (siteIdentifier: string): Promise<DiscoveredEquipment[]> => {
    // First, get ALL unique Source IPs and Destination IPs from the database
    // We need to do this without limit to ensure we get all equipment
    const { data: allIpData, error: ipError } = await supabase
      .from('learning_samples')
      .select('SourceIp, SourceMac, DestinationIp, DestinationMac, Protocol')
      .eq('Identifier', siteIdentifier);
    
    if (ipError || !allIpData) {
      console.error('Error fetching IPs:', ipError);
      return [];
    }
    
    console.log(`[getSiteEquipment] Fetched ${allIpData.length} samples for ${siteIdentifier}`);
    
    // Build equipment map from ALL data
    const equipmentMap = new Map<string, {
      mac: string | null;
      role: 'master' | 'slave' | 'unknown';
      lastSeen: string;
      protocols: Set<string>;
      isSource: boolean; // Track if this IP appears as Source (slave)
      isDest: boolean;   // Track if this IP appears as Destination (master)
    }>();
    
    for (const sample of allIpData) {
      // Source IP is the SLAVE (equipment with registers that responds)
      if (sample.SourceIp) {
        if (!equipmentMap.has(sample.SourceIp)) {
          equipmentMap.set(sample.SourceIp, {
            mac: sample.SourceMac,
            role: 'slave',
            lastSeen: new Date().toISOString(),
            protocols: new Set(),
            isSource: true,
            isDest: false,
          });
        } else {
          const entry = equipmentMap.get(sample.SourceIp)!;
          entry.isSource = true;
          if (!entry.mac && sample.SourceMac) entry.mac = sample.SourceMac;
        }
        const entry = equipmentMap.get(sample.SourceIp)!;
        if (sample.Protocol) entry.protocols.add(sample.Protocol);
      }
      
      // Destination IP is the MASTER (SCADA/HMI that asks for data)
      if (sample.DestinationIp) {
        if (!equipmentMap.has(sample.DestinationIp)) {
          equipmentMap.set(sample.DestinationIp, {
            mac: sample.DestinationMac,
            role: 'master',
            lastSeen: new Date().toISOString(),
            protocols: new Set(),
            isSource: false,
            isDest: true,
          });
        } else {
          const entry = equipmentMap.get(sample.DestinationIp)!;
          entry.isDest = true;
          if (!entry.mac && sample.DestinationMac) entry.mac = sample.DestinationMac;
        }
        const entry = equipmentMap.get(sample.DestinationIp)!;
        if (sample.Protocol) entry.protocols.add(sample.Protocol);
      }
    }
    
    // Determine final role based on whether IP appears as source, dest, or both
    for (const [, data] of equipmentMap) {
      if (data.isSource && data.isDest) {
        // Appears as both - likely a gateway or complex device, treat as slave since it has data
        data.role = 'slave';
      } else if (data.isSource) {
        data.role = 'slave';
      } else if (data.isDest) {
        data.role = 'master';
      } else {
        data.role = 'unknown';
      }
    }
    
    // Now get variable counts for each Source IP (slave)
    // We need to count unique Address+FC combinations per SourceIp
    const { data: varData } = await supabase
      .from('learning_samples')
      .select('SourceIp, DestinationIp, Address, FC, time')
      .eq('Identifier', siteIdentifier);
    
    // Count variables per source IP
    const varCountMap = new Map<string, Set<string>>();
    const lastSeenMap = new Map<string, string>();
    
    if (varData) {
      for (const sample of varData) {
        if (sample.SourceIp) {
          if (!varCountMap.has(sample.SourceIp)) {
            varCountMap.set(sample.SourceIp, new Set());
          }
          varCountMap.get(sample.SourceIp)!.add(`${sample.Address}-${sample.FC}`);
          
          // Track last seen
          if (sample.time) {
            const current = lastSeenMap.get(sample.SourceIp);
            if (!current || sample.time > current) {
              lastSeenMap.set(sample.SourceIp, sample.time);
            }
          }
        }
        
        // Also track last seen for destination IPs
        if (sample.DestinationIp && sample.time) {
          const current = lastSeenMap.get(sample.DestinationIp);
          if (!current || sample.time > current) {
            lastSeenMap.set(sample.DestinationIp, sample.time);
          }
        }
      }
    }
    
    // Convert to array
    const equipment: DiscoveredEquipment[] = [];
    for (const [ip, data] of equipmentMap) {
      const varCount = varCountMap.get(ip)?.size || 0;
      const lastSeen = lastSeenMap.get(ip) || data.lastSeen;
      
      equipment.push({
        ip,
        mac: data.mac,
        role: data.role,
        variableCount: varCount,
        lastSeen,
        protocols: Array.from(data.protocols),
      });
    }
    
    console.log(`[getSiteEquipment] Found ${equipment.length} unique IPs:`, equipment.map(e => ({ ip: e.ip, role: e.role, vars: e.variableCount })));
    
    // Sort: slaves first (they have variables), then by variable count
    equipment.sort((a, b) => {
      if (a.role !== b.role) return a.role === 'slave' ? -1 : 1;
      return b.variableCount - a.variableCount;
    });
    
    return equipment;
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