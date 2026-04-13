import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DataFlowStatus {
  receiving: boolean;
  source: 'livescan' | 'pcap' | null;
  publishing: boolean;
  lastSampleAt: string | null;
  lastPublishAt: string | null;
}

const POLL_INTERVAL = 30_000; // 30 seconds
const ACTIVE_WINDOW_MINUTES = 2;

export const useDataFlowStatus = (siteIdentifiers: string[]) => {
  const [statusMap, setStatusMap] = useState<Map<string, DataFlowStatus>>(new Map());
  const identifiersRef = useRef(siteIdentifiers);
  identifiersRef.current = siteIdentifiers;

  const fetchStatus = useCallback(async () => {
    const identifiers = identifiersRef.current;
    if (identifiers.length === 0) return;

    const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60 * 1000).toISOString();
    const newMap = new Map<string, DataFlowStatus>();

    // Initialize all sites
    for (const id of identifiers) {
      newMap.set(id, {
        receiving: false,
        source: null,
        publishing: false,
        lastSampleAt: null,
        lastPublishAt: null,
      });
    }

    // Batch query: get latest sample per site from learning_samples
    // We query for samples with time > cutoff for each identifier
    const { data: recentSamples, error: samplesError } = await supabase
      .from('learning_samples')
      .select('Identifier, time, data_source')
      .in('Identifier', identifiers)
      .gte('time', cutoff)
      .order('time', { ascending: false })
      .limit(100);

    if (samplesError) {
      console.error('[useDataFlowStatus] Error fetching learning_samples:', samplesError);
    }

    if (recentSamples) {
      // Group by identifier, take the most recent
      const seen = new Set<string>();
      for (const sample of recentSamples) {
        const id = sample.Identifier;
        if (seen.has(id)) continue;
        seen.add(id);
        const existing = newMap.get(id);
        if (existing) {
          existing.receiving = true;
          existing.source = (sample.data_source as 'livescan' | 'pcap') || 'pcap';
          existing.lastSampleAt = sample.time;
        }
      }
    }

    // Batch query: get recent publishing events
    const { data: recentPublishing, error: publishError } = await supabase
      .from('publishing_events')
      .select('site_identifier, status, created_at, completed_at')
      .in('site_identifier', identifiers)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(100);

    if (publishError) {
      console.error('[useDataFlowStatus] Error fetching publishing_events:', publishError);
    }

    if (recentPublishing) {
      const seen = new Set<string>();
      for (const event of recentPublishing) {
        const id = event.site_identifier;
        if (seen.has(id)) continue;
        seen.add(id);
        const existing = newMap.get(id);
        if (existing) {
          existing.publishing = true;
          existing.lastPublishAt = event.completed_at || event.created_at;
        }
      }
    }

    setStatusMap(newMap);
  }, []);

  useEffect(() => {
    if (siteIdentifiers.length === 0) return;

    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [siteIdentifiers.join(','), fetchStatus]);

  // Derived counts
  const receivingCount = Array.from(statusMap.values()).filter(s => s.receiving).length;
  const publishingCount = Array.from(statusMap.values()).filter(s => s.publishing).length;

  return { statusMap, receivingCount, publishingCount, refresh: fetchStatus };
};
