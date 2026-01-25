import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NetworkAsset } from '@/types/network';

export const useNetworkAssets = (siteIdentifier: string) => {
  const [assets, setAssets] = useState<NetworkAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!siteIdentifier) {
      setAssets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the most recent job_id for this site
      const { data: latestJob, error: jobError } = await supabase
        .from('network_assets')
        .select('job_id, job_created_at')
        .eq('site_identifier', siteIdentifier)
        .order('job_created_at', { ascending: false })
        .limit(1)
        .single();

      if (jobError && jobError.code !== 'PGRST116') {
        throw jobError;
      }

      if (!latestJob) {
        setAssets([]);
        setLoading(false);
        return;
      }

      // Fetch all assets from the latest job
      const { data, error: assetsError } = await supabase
        .from('network_assets')
        .select('*')
        .eq('site_identifier', siteIdentifier)
        .eq('job_id', latestJob.job_id)
        .order('risk_score', { ascending: false, nullsFirst: false });

      if (assetsError) {
        throw assetsError;
      }

      setAssets((data || []) as NetworkAsset[]);
    } catch (err) {
      console.error('Error fetching network assets:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [siteIdentifier]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Real-time subscription
  useEffect(() => {
    if (!siteIdentifier) return;

    const channel = supabase
      .channel(`network_assets_${siteIdentifier}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'network_assets',
          filter: `site_identifier=eq.${siteIdentifier}`,
        },
        () => {
          fetchAssets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [siteIdentifier, fetchAssets]);

  return {
    assets,
    loading,
    error,
    refresh: fetchAssets,
  };
};