import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SiteReviewCount {
  siteId: string;
  siteName: string;
  siteIdentifier: string;
  count: number;
}

export const useVariablesNeedingReview = () => {
  const { user } = useAuth();
  const [totalCount, setTotalCount] = useState(0);
  const [bySite, setBySite] = useState<SiteReviewCount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get all variables with AI suggestions that are not confirmed/published
    const { data: variables, error } = await supabase
      .from('discovered_variables')
      .select('site_identifier, ai_suggested_type, learning_state')
      .not('ai_suggested_type', 'is', null)
      .not('learning_state', 'in', '(confirmed,published)');

    if (error) {
      console.error('Error fetching variables needing review:', error);
      setLoading(false);
      return;
    }

    // Count total
    setTotalCount(variables?.length || 0);

    // Group by site
    const siteCounts = new Map<string, number>();
    (variables || []).forEach(v => {
      const current = siteCounts.get(v.site_identifier) || 0;
      siteCounts.set(v.site_identifier, current + 1);
    });

    // Get site names
    const siteIdentifiers = Array.from(siteCounts.keys());
    const { data: sites } = await supabase
      .from('sites')
      .select('id, name, unique_id')
      .in('unique_id', siteIdentifiers);

    const siteMap = new Map((sites || []).map(s => [s.unique_id, { id: s.id, name: s.name }]));

    const result: SiteReviewCount[] = [];
    siteCounts.forEach((count, identifier) => {
      const site = siteMap.get(identifier);
      result.push({
        siteId: site?.id || identifier,
        siteName: site?.name || `Site ${identifier.slice(0, 8)}...`,
        siteIdentifier: identifier,
        count,
      });
    });

    // Sort by count descending
    result.sort((a, b) => b.count - a.count);

    setBySite(result);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCounts();

    // Subscribe to changes in discovered_variables
    const channel = supabase
      .channel('variables_review_counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discovered_variables',
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCounts]);

  return {
    totalCount,
    bySite,
    loading,
    refresh: fetchCounts,
  };
};