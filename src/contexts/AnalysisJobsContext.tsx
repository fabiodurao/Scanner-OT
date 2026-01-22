import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ActiveAnalysisJob {
  id: string;
  site_identifier: string;
  site_name: string | null;
  status: 'processing' | 'completed' | 'error';
  started_at: string;
  variables_analyzed: number | null;
  suggestions_count: number | null;
}

interface AnalysisJobsContextType {
  activeJobs: ActiveAnalysisJob[];
  loading: boolean;
  refreshJobs: () => Promise<void>;
}

const AnalysisJobsContext = createContext<AnalysisJobsContextType | undefined>(undefined);

export const AnalysisJobsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [activeJobs, setActiveJobs] = useState<ActiveAnalysisJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveJobs = useCallback(async () => {
    if (!user) {
      setActiveJobs([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('analysis_jobs')
      .select('id, site_identifier, status, started_at, variables_analyzed, suggestions_count')
      .eq('status', 'processing')
      .order('started_at', { ascending: false });

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Fetch site names for each job
    const siteIdentifiers = [...new Set(data.map(job => job.site_identifier))];
    
    const { data: sites } = await supabase
      .from('sites')
      .select('unique_id, name')
      .in('unique_id', siteIdentifiers);

    const siteNameMap = new Map(
      (sites || []).map(s => [s.unique_id, s.name])
    );

    const jobsWithNames = data.map(job => ({
      ...job,
      site_name: siteNameMap.get(job.site_identifier) || null,
    }));

    setActiveJobs(jobsWithNames as ActiveAnalysisJob[]);
    setLoading(false);
  }, [user]);

  // Poll every 5 seconds for active jobs
  useEffect(() => {
    if (!user) return;

    fetchActiveJobs();
    const interval = setInterval(fetchActiveJobs, 5000);

    return () => clearInterval(interval);
  }, [user, fetchActiveJobs]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('analysis_jobs_sidebar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_jobs',
        },
        () => {
          // Refresh jobs when any change happens
          fetchActiveJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchActiveJobs]);

  return (
    <AnalysisJobsContext.Provider value={{ activeJobs, loading, refreshJobs: fetchActiveJobs }}>
      {children}
    </AnalysisJobsContext.Provider>
  );
};

export const useAnalysisJobs = () => {
  const context = useContext(AnalysisJobsContext);
  if (context === undefined) {
    throw new Error('useAnalysisJobs must be used within an AnalysisJobsProvider');
  }
  return context;
};