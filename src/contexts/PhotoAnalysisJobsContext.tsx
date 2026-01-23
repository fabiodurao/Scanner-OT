import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ActivePhotoJob {
  id: string;
  site_identifier: string;
  site_name: string | null;
  status: 'processing' | 'completed' | 'error';
  started_at: string;
  variables_identified: number | null;
  variables_updated: number | null;
}

interface PhotoAnalysisJobsContextType {
  activeJobs: ActivePhotoJob[];
  loading: boolean;
  refreshJobs: () => Promise<void>;
}

const PhotoAnalysisJobsContext = createContext<PhotoAnalysisJobsContextType | undefined>(undefined);

export const PhotoAnalysisJobsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [activeJobs, setActiveJobs] = useState<ActivePhotoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const previousJobsRef = useRef<Set<string>>(new Set());

  const fetchActiveJobs = useCallback(async () => {
    if (!user) {
      setActiveJobs([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('photo_analysis_jobs')
      .select('id, site_identifier, status, created_at, variables_identified, variables_updated')
      .eq('status', 'processing')
      .order('created_at', { ascending: false });

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Fetch site names
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
      started_at: job.created_at,
      site_name: siteNameMap.get(job.site_identifier) || null,
    }));

    setActiveJobs(jobsWithNames as ActivePhotoJob[]);
    setLoading(false);
  }, [user]);

  // Poll every 5 seconds
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
      .channel('photo_jobs_sidebar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photo_analysis_jobs',
        },
        async (payload) => {
          console.log('[PhotoAnalysisJobsContext] Received event:', payload.eventType, payload);
          
          if (payload.eventType === 'INSERT') {
            const newJob = payload.new as ActivePhotoJob;
            if (newJob.status === 'processing') {
              console.log('[PhotoAnalysisJobsContext] New photo job started:', newJob.id);
              setActiveJobs(prev => [newJob, ...prev]);
              previousJobsRef.current.add(newJob.id);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedJob = payload.new as ActivePhotoJob;
            
            console.log('[PhotoAnalysisJobsContext] Job updated:', {
              id: updatedJob.id,
              status: updatedJob.status,
              wasTracking: previousJobsRef.current.has(updatedJob.id),
            });
            
            // Check if job just completed
            if (
              (updatedJob.status === 'completed' || updatedJob.status === 'error') &&
              previousJobsRef.current.has(updatedJob.id)
            ) {
              console.log('[PhotoAnalysisJobsContext] ✅ Photo job completed! Status:', updatedJob.status);
              
              previousJobsRef.current.delete(updatedJob.id);
              
              // Fetch site name
              const { data: site } = await supabase
                .from('sites')
                .select('name')
                .eq('unique_id', updatedJob.site_identifier)
                .single();
              
              const siteName = site?.name || `Site ${updatedJob.site_identifier.slice(0, 8)}...`;
              
              if (updatedJob.status === 'completed') {
                console.log('[PhotoAnalysisJobsContext] 🎉 Photo analysis completed successfully!');
                console.log('[PhotoAnalysisJobsContext] Site:', siteName);
                console.log('[PhotoAnalysisJobsContext] Variables identified:', updatedJob.variables_identified);
                console.log('[PhotoAnalysisJobsContext] Variables updated:', updatedJob.variables_updated);
                
                const targetUrl = `/discovery/${updatedJob.site_identifier}?tab=historical`;
                console.log('[PhotoAnalysisJobsContext] Target URL:', targetUrl);
                
                toast.success(
                  `Photo analysis complete for ${siteName}! ${updatedJob.variables_updated || 0} variables updated`,
                  {
                    duration: 10000,
                    action: {
                      label: 'View Results',
                      onClick: () => {
                        console.log('[PhotoAnalysisJobsContext] 🖱️ User clicked View Results');
                        window.location.href = targetUrl;
                      },
                    },
                  }
                );
                
                // Auto-navigate after 3 seconds
                console.log('[PhotoAnalysisJobsContext] ⏱️ Starting 3-second countdown for auto-navigation...');
                setTimeout(() => {
                  console.log('[PhotoAnalysisJobsContext] 🚀 Auto-navigating NOW to:', targetUrl);
                  window.location.href = targetUrl;
                }, 3000);
                
              } else {
                console.log('[PhotoAnalysisJobsContext] ❌ Photo analysis failed');
                toast.error(`Photo analysis failed for ${siteName}`);
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
  }, [user]);

  return (
    <PhotoAnalysisJobsContext.Provider value={{ activeJobs, loading, refreshJobs: fetchActiveJobs }}>
      {children}
    </PhotoAnalysisJobsContext.Provider>
  );
};

export const usePhotoAnalysisJobs = () => {
  const context = useContext(PhotoAnalysisJobsContext);
  if (context === undefined) {
    throw new Error('usePhotoAnalysisJobs must be used within a PhotoAnalysisJobsProvider');
  }
  return context;
};