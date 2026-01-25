import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [activeJobs, setActiveJobs] = useState<ActiveAnalysisJob[]>([]);
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

    // IMPORTANT: Track all processing jobs
    jobsWithNames.forEach(job => {
      if (!previousJobsRef.current.has(job.id)) {
        console.log('[AnalysisJobsContext] 📌 Adding job to tracking:', job.id);
        previousJobsRef.current.add(job.id);
        lastCheckRef.current.set(job.id, 'processing');
      }
    });

    console.log('[AnalysisJobsContext] Currently tracking:', Array.from(previousJobsRef.current));

    setActiveJobs(jobsWithNames as ActiveAnalysisJob[]);
    setLoading(false);
  }, [user]);

  // Check for completed jobs by polling
  const checkForCompletedJobs = useCallback(async () => {
    if (!user || previousJobsRef.current.size === 0) {
      if (previousJobsRef.current.size === 0) {
        console.log('[AnalysisJobsContext] ⏭️ No jobs being tracked, skipping check');
      }
      return;
    }

    console.log('[AnalysisJobsContext] 🔍 Checking for completed jobs...');
    console.log('[AnalysisJobsContext] Tracking:', Array.from(previousJobsRef.current));

    // Check all tracked jobs
    const trackedIds = Array.from(previousJobsRef.current);
    
    const { data: jobs, error } = await supabase
      .from('analysis_jobs')
      .select('id, site_identifier, status, variables_analyzed, suggestions_count')
      .in('id', trackedIds);

    if (error || !jobs) {
      console.error('[AnalysisJobsContext] Error checking jobs:', error);
      return;
    }

    console.log('[AnalysisJobsContext] Found jobs:', jobs.length);

    for (const job of jobs) {
      const lastStatus = lastCheckRef.current.get(job.id);
      
      console.log('[AnalysisJobsContext] Job', job.id.slice(0, 8), '- Status:', job.status, '(was:', lastStatus, ')');
      
      // Detect status change from processing to completed/error
      if (lastStatus === 'processing' && (job.status === 'completed' || job.status === 'error')) {
        console.log('[AnalysisJobsContext] 🎯 COMPLETION DETECTED via polling!');
        console.log('[AnalysisJobsContext] Job ID:', job.id);
        console.log('[AnalysisJobsContext] New status:', job.status);
        
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
          console.log('[AnalysisJobsContext] ✅ SUCCESS!');
          
          const targetPath = `/discovery/${job.site_identifier}`;
          const isOnTargetPage = location.pathname === targetPath;
          
          console.log('[AnalysisJobsContext] Current path:', location.pathname);
          console.log('[AnalysisJobsContext] Target path:', targetPath);
          console.log('[AnalysisJobsContext] Is on target page?', isOnTargetPage);
          
          if (isOnTargetPage) {
            console.log('[AnalysisJobsContext] 🔄 ON TARGET PAGE - RELOADING NOW!');
            
            toast.success(
              `Analysis complete! ${job.suggestions_count || 0} suggestions for ${job.variables_analyzed || 0} variables`,
              { duration: 3000 }
            );
            
            setTimeout(() => {
              console.log('[AnalysisJobsContext] 🔄 Executing reload...');
              window.location.reload();
            }, 500);
          } else {
            console.log('[AnalysisJobsContext] 📍 Different page, showing notification');
            toast.success(
              `Analysis complete for ${siteName}! Click to view results.`,
              { duration: 10000 }
            );
          }
        } else {
          console.log('[AnalysisJobsContext] ❌ Job failed');
          toast.error(`Analysis failed for ${siteName}`);
        }
      }
      
      // Update last known status
      lastCheckRef.current.set(job.id, job.status);
    }
  }, [user, location.pathname]);

  // Poll every 3 seconds for active jobs AND check for completion
  useEffect(() => {
    if (!user) return;

    console.log('[AnalysisJobsContext] 🚀 Starting polling interval...');
    
    fetchActiveJobs();
    checkForCompletedJobs();
    
    const interval = setInterval(() => {
      fetchActiveJobs();
      checkForCompletedJobs();
    }, 3000);

    return () => {
      console.log('[AnalysisJobsContext] 🛑 Stopping polling interval');
      clearInterval(interval);
    };
  }, [user, fetchActiveJobs, checkForCompletedJobs]);

  // Real-time subscription (backup method)
  useEffect(() => {
    if (!user) return;

    console.log('[AnalysisJobsContext] 📡 Setting up real-time subscription...');

    const channel = supabase
      .channel('analysis_jobs_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_jobs',
        },
        async (payload) => {
          console.log('[AnalysisJobsContext] 📨 Real-time event:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const newJob = payload.new as ActiveAnalysisJob;
            if (newJob.status === 'processing') {
              console.log('[AnalysisJobsContext] ➕ New job via real-time:', newJob.id);
              previousJobsRef.current.add(newJob.id);
              lastCheckRef.current.set(newJob.id, 'processing');
              setActiveJobs(prev => [newJob, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedJob = payload.new as ActiveAnalysisJob;
            console.log('[AnalysisJobsContext] 🔄 Update via real-time:', updatedJob.id.slice(0, 8), updatedJob.status);
            
            // Trigger completion check
            checkForCompletedJobs();
          }
        }
      )
      .subscribe((status) => {
        console.log('[AnalysisJobsContext] Subscription status:', status);
      });

    return () => {
      console.log('[AnalysisJobsContext] 🔌 Unsubscribing from real-time...');
      supabase.removeChannel(channel);
    };
  }, [user, checkForCompletedJobs]);

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