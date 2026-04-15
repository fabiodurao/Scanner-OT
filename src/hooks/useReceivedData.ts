import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReceivedDataRecord {
  id: string;
  site_identifier: string | null;
  payload: Record<string, unknown>;
  headers: Record<string, string> | null;
  source_ip: string | null;
  received_at: string;
}

const POLL_INTERVAL = 5_000; // 5 seconds
const PAGE_SIZE = 100;

export const useReceivedData = (siteIdentifier?: string) => {
  const [records, setRecords] = useState<ReceivedDataRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const filterRef = useRef(siteIdentifier);
  filterRef.current = siteIdentifier;

  const fetchData = useCallback(async () => {
    let query = supabase
      .from('received_data')
      .select('*', { count: 'exact' })
      .order('received_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (filterRef.current) {
      query = query.eq('site_identifier', filterRef.current);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching received data:', error);
      return;
    }

    setRecords((data || []) as ReceivedDataRecord[]);
    setTotalCount(count || 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [siteIdentifier, fetchData]);

  const clearData = useCallback(async () => {
    setClearing(true);
    let query = supabase.from('received_data').delete();

    if (filterRef.current) {
      query = query.eq('site_identifier', filterRef.current);
    } else {
      // Delete all - need a condition that matches everything
      query = query.gte('received_at', '1970-01-01');
    }

    const { error } = await query;
    if (error) {
      console.error('Error clearing received data:', error);
    } else {
      setRecords([]);
      setTotalCount(0);
    }
    setClearing(false);
  }, []);

  return { records, totalCount, loading, clearing, clearData, refresh: fetchData };
};
