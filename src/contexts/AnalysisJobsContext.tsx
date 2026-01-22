import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ActiveAnalysisJob {
  id: string;
  site_identifier: string;
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

    if (!error && data) {
      setActiveJobs(data as ActiveAnalysisJob[]);
    }
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
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newJob = payload.new as ActiveAnalysisJob;
            if (newJob.status === 'processing') {
              setActiveJobs(prev => [newJob, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedJob = payload.new as ActiveAnalysisJob;
            
            if (updatedJob.status !== 'processing') {
              setActiveJobs(prev => prev.filter(job => job.id !== updatedJob.id));
            } else {
              setActiveJobs(prev => prev.map(job => 
                job.id === updatedJob.id ? updatedJob : job
              ));
            }
          } else if (payload.eventType === 'DELETE') {
            setActiveJobs(prev => prev.filter(job => job.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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