import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [activeJobs, setActiveJobs] = useState<ActivePhotoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const previousJobsRef = useRef<Set<string>>(new Set());
  const lastCheckRef = useRef<Map<string, string>>(new Map());

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

  // Check for completed jobs by polling
  const checkForCompletedJobs = useCallback(async () => {
    if (!user || previousJobsRef.current.size === 0) return;

    console.log('[PhotoAnalysisJobsContext] 🔍 Checking for completed jobs...');
    console.log('[PhotoAnalysisJobsContext] Tracking:', Array.from(previousJobsRef.current));

    // Check all tracked jobs
    const trackedIds = Array.from(previousJobsRef.current);
    
    const { data: jobs, error } = await supabase
      .from('photo_analysis_jobs')
      .select('id, site_identifier, status, variables_identified, variables_updated')
      .in('id', trackedIds);

    if (error || !jobs) {
      console.error('[PhotoAnalysisJobsContext] Error checking jobs:', error);
      return;
    }

    console.log('[PhotoAnalysisJobsContext] Found jobs:', jobs.length);

    for (const job of jobs) {
      const lastStatus = lastCheckRef.current.get(job.id);
      
      console.log('[PhotoAnalysisJobsContext] Job', job.id, '- Status:', job.status, '(was:', lastStatus, ')');
      
      // Detect status change from processing to completed/error
      if (lastStatus === 'processing' && (job.status === 'completed' || job.status === 'error')) {
        console.log('[PhotoAnalysisJobsContext] 🎯 COMPLETION DETECTED via polling!');
        console.log('[PhotoAnalysisJobsContext] Job ID:', job.id);
        console.log('[PhotoAnalysisJobsContext] New status:', job.status);
        
        previousJobsRef.current.delete(job.id);
        lastCheckRef.current.delete(job.id);
        
        // Fetch site name
        const { data: site } = await supabase
          .from('sites')
          .select('name')
          .eq('unique_id', job.site_identifier)
          .single();
        
        const siteName = site?.name || `Site ${job.site_identifier.slice(0, 8)}...`;
        
        if (job.status === 'completed') {
          console.log('[PhotoAnalysisJobsContext] ✅ SUCCESS!');
          
          const targetPath = `/discovery/${job.site_identifier}`;
          const isOnTargetPage = location.pathname === targetPath;
          
          console.log('[PhotoAnalysisJobsContext] Current path:', location.pathname);
          console.log('[PhotoAnalysisJobsContext] Target path:', targetPath);
          console.log('[PhotoAnalysisJobsContext] Is on target page?', isOnTargetPage);
          
          if (isOnTargetPage) {
            console.log('[PhotoAnalysisJobsContext] 🔄 ON TARGET PAGE - RELOADING NOW!');
            
            toast.success(
              `Photo analysis complete! ${job.variables_updated || 0} variables updated`,
              { duration: 3000 }
            );
            
            setTimeout(() => {
              console.log('[PhotoAnalysisJobsContext] 🔄 Executing reload...');
              window.location.reload();
            }, 500);
          } else {
            console.log('[PhotoAnalysisJobsContext] 📍 Different page, showing notification');
            toast.success(
              `Photo analysis complete for ${siteName}! Click to view results.`,
              { duration: 10000 }
            );
          }
        } else {
          console.log('[PhotoAnalysisJobsContext] ❌ Job failed');
          toast.error(`Photo analysis failed for ${siteName}`);
        }
      }
      
      // Update last known status
      lastCheckRef.current.set(job.id, job.status);
    }
  }, [user, location.pathname]);

  // Poll every 3 seconds for active jobs AND check for completion
  useEffect(() => {
    if (!user) return;

    fetchActiveJobs();
    checkForCompletedJobs();
    
    const interval = setInterval(() => {
      fetchActiveJobs();
      checkForCompletedJobs();
    }, 3000);

    return () => clearInterval(interval);
  }, [user, fetchActiveJobs, checkForCompletedJobs]);

  // Real-time subscription (backup method)
  useEffect(() => {
    if (!user) return;

    console.log('[PhotoAnalysisJobsContext] 📡 Setting up real-time subscription...');

    const channel = supabase
      .channel('photo_jobs_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photo_analysis_jobs',
        },
        async (payload) => {
          console.log('[PhotoAnalysisJobsContext] 📨 Real-time event:', payload.eventType);
          console.log('[PhotoAnalysisJobsContext] Payload:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newJob = payload.new as ActivePhotoJob;
            if (newJob.status === 'processing') {
              console.log('[PhotoAnalysisJobsContext] ➕ New job via real-time:', newJob.id);
              previousJobsRef.current.add(newJob.id);
              lastCheckRef.current.set(newJob.id, 'processing');
              setActiveJobs(prev => [newJob, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedJob = payload.new as ActivePhotoJob;
            console.log('[PhotoAnalysisJobsContext] 🔄 Update via real-time:', updatedJob.id, updatedJob.status);
            
            // Trigger completion check
            checkForCompletedJobs();
          }
        }
      )
      .subscribe((status) => {
        console.log('[PhotoAnalysisJobsContext] Subscription status:', status);
      });

    return () => {
      console.log('[PhotoAnalysisJobsContext] 🔌 Unsubscribing from real-time...');
      supabase.removeChannel(channel);
    };
  }, [user, checkForCompletedJobs]);

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