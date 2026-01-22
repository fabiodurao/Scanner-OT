import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [activeJobs, setActiveJobs] = useState<ActiveAnalysisJob[]>([]);
  const [loading, setLoading] = useState(true);
  const previousJobsRef = useRef<Set<string>>(new Set());

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

  // Real-time subscription with completion detection
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
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newJob = payload.new as ActiveAnalysisJob;
            if (newJob.status === 'processing') {
              setActiveJobs(prev => [newJob, ...prev]);
              previousJobsRef.current.add(newJob.id);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedJob = payload.new as ActiveAnalysisJob;
            
            // Check if job just completed
            if (
              (updatedJob.status === 'completed' || updatedJob.status === 'error') &&
              previousJobsRef.current.has(updatedJob.id)
            ) {
              // Job completed! Show notification
              previousJobsRef.current.delete(updatedJob.id);
              
              // Fetch site name for notification
              const { data: site } = await supabase
                .from('sites')
                .select('name')
                .eq('unique_id', updatedJob.site_identifier)
                .single();
              
              const siteName = site?.name || `Site ${updatedJob.site_identifier.slice(0, 8)}...`;
              
              if (updatedJob.status === 'completed') {
                toast.success(
                  `Analysis complete for ${siteName}! ${updatedJob.suggestions_count || 0} suggestions for ${updatedJob.variables_analyzed || 0} variables`,
                  {
                    duration: 8000,
                    action: {
                      label: 'View Results',
                      onClick: () => {
                        // Navigate to historical analysis tab
                        navigate(`/discovery/${updatedJob.site_identifier}?tab=historical`);
                        // Force page reload to ensure fresh data
                        setTimeout(() => {
                          window.location.reload();
                        }, 100);
                      },
                    },
                  }
                );
              } else {
                toast.error(`Analysis failed for ${siteName}`);
              }
              
              // Remove from active jobs
              setActiveJobs(prev => prev.filter(job => job.id !== updatedJob.id));
            } else if (updatedJob.status === 'processing') {
              // Update existing job
              setActiveJobs(prev => prev.map(job => 
                job.id === updatedJob.id ? updatedJob : job
              ));
            } else {
              // Remove completed/error jobs
              setActiveJobs(prev => prev.filter(job => job.id !== updatedJob.id));
            }
          } else if (payload.eventType === 'DELETE') {
            setActiveJobs(prev => prev.filter(job => job.id !== payload.old.id));
            previousJobsRef.current.delete(payload.old.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

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