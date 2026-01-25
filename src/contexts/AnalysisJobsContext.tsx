import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
  const location = useLocation();
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
          console.log('[AnalysisJobsContext] ========================================');
          console.log('[AnalysisJobsContext] Received event:', payload.eventType);
          console.log('[AnalysisJobsContext] Payload:', JSON.stringify(payload, null, 2));
          
          if (payload.eventType === 'INSERT') {
            const newJob = payload.new as ActiveAnalysisJob;
            if (newJob.status === 'processing') {
              console.log('[AnalysisJobsContext] ✅ New job started:', newJob.id);
              setActiveJobs(prev => [newJob, ...prev]);
              previousJobsRef.current.add(newJob.id);
              console.log('[AnalysisJobsContext] Added to tracking. Total tracked:', previousJobsRef.current.size);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedJob = payload.new as ActiveAnalysisJob;
            
            console.log('[AnalysisJobsContext] UPDATE event received:');
            console.log('[AnalysisJobsContext]   - Job ID:', updatedJob.id);
            console.log('[AnalysisJobsContext]   - Status:', updatedJob.status);
            console.log('[AnalysisJobsContext]   - Was tracking?', previousJobsRef.current.has(updatedJob.id));
            console.log('[AnalysisJobsContext]   - Current location:', location.pathname);
            console.log('[AnalysisJobsContext]   - Site identifier:', updatedJob.site_identifier);
            
            // Check if job just completed
            if (
              (updatedJob.status === 'completed' || updatedJob.status === 'error') &&
              previousJobsRef.current.has(updatedJob.id)
            ) {
              console.log('[AnalysisJobsContext] 🎯 JOB COMPLETION DETECTED!');
              console.log('[AnalysisJobsContext] Status:', updatedJob.status);
              
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
                console.log('[AnalysisJobsContext] ✅ SUCCESS - Analysis completed!');
                console.log('[AnalysisJobsContext] Site:', siteName);
                console.log('[AnalysisJobsContext] Variables analyzed:', updatedJob.variables_analyzed);
                console.log('[AnalysisJobsContext] Suggestions:', updatedJob.suggestions_count);
                
                const targetPath = `/discovery/${updatedJob.site_identifier}`;
                const isOnTargetPage = location.pathname === targetPath;
                
                console.log('[AnalysisJobsContext] Target path:', targetPath);
                console.log('[AnalysisJobsContext] Current path:', location.pathname);
                console.log('[AnalysisJobsContext] Is on target page?', isOnTargetPage);
                
                if (isOnTargetPage) {
                  console.log('[AnalysisJobsContext] 🔄 RELOADING PAGE NOW!');
                  
                  toast.success(
                    `Analysis complete! ${updatedJob.suggestions_count || 0} suggestions for ${updatedJob.variables_analyzed || 0} variables`,
                    { duration: 5000 }
                  );
                  
                  // Small delay to ensure toast is visible, then reload
                  setTimeout(() => {
                    console.log('[AnalysisJobsContext] 🔄 Executing window.location.reload()...');
                    window.location.reload();
                  }, 500);
                } else {
                  console.log('[AnalysisJobsContext] 🚀 Different page - will navigate');
                  
                  const targetUrl = `${targetPath}?tab=historical`;
                  
                  toast.success(
                    `Analysis complete for ${siteName}! ${updatedJob.suggestions_count || 0} suggestions for ${updatedJob.variables_analyzed || 0} variables`,
                    {
                      duration: 10000,
                      action: {
                        label: 'View Results',
                        onClick: () => {
                          console.log('[AnalysisJobsContext] 🖱️ User clicked View Results');
                          navigate(targetUrl, { replace: true });
                          setTimeout(() => window.location.reload(), 100);
                        },
                      },
                    }
                  );
                  
                  // Auto-navigate after 3 seconds
                  setTimeout(() => {
                    console.log('[AnalysisJobsContext] 🚀 Auto-navigating to:', targetUrl);
                    navigate(targetUrl, { replace: true });
                    setTimeout(() => {
                      console.log('[AnalysisJobsContext] 🔄 Reloading after navigation...');
                      window.location.reload();
                    }, 100);
                  }, 3000);
                }
                
              } else {
                console.log('[AnalysisJobsContext] ❌ Analysis failed');
                toast.error(`Analysis failed for ${siteName}`);
              }
              
              // Remove from active jobs
              setActiveJobs(prev => prev.filter(job => job.id !== updatedJob.id));
            } else if (updatedJob.status === 'processing') {
              console.log('[AnalysisJobsContext] Still processing, updating job state');
              // Update existing job
              setActiveJobs(prev => prev.map(job => 
                job.id === updatedJob.id ? updatedJob : job
              ));
            } else {
              console.log('[AnalysisJobsContext] Job finished but was not tracked, removing');
              // Remove completed/error jobs
              setActiveJobs(prev => prev.filter(job => job.id !== updatedJob.id));
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('[AnalysisJobsContext] DELETE event for job:', payload.old.id);
            setActiveJobs(prev => prev.filter(job => job.id !== payload.old.id));
            previousJobsRef.current.delete(payload.old.id);
          }
          
          console.log('[AnalysisJobsContext] ========================================');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate, location.pathname]);

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