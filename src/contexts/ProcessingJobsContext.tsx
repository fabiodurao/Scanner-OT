import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ActiveJob {
  id: string;
  pcap_filename: string;
  status: 'pending' | 'downloading' | 'extracting' | 'running' | 'completed' | 'error' | 'cancelled';
  current_step: string;
  progress: number;
  created_at: string;
}

interface ProcessingJobsContextType {
  activeJobs: ActiveJob[];
  loading: boolean;
  refreshJobs: () => Promise<void>;
}

const ProcessingJobsContext = createContext<ProcessingJobsContextType | undefined>(undefined);

export const ProcessingJobsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStatusRef = useRef<Map<string, string>>(new Map());

  const fetchActiveJobs = useCallback(async () => {
    if (!user) {
      setActiveJobs([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('processing_jobs')
      .select('id, pcap_filename, status, current_step, progress, created_at')
      .in('status', ['pending', 'downloading', 'extracting', 'running'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setActiveJobs(data as ActiveJob[]);
      
      // Update status tracking for adaptive polling
      data.forEach(job => {
        lastStatusRef.current.set(job.id, job.status);
      });
    }
    setLoading(false);
  }, [user]);

  // Determine polling interval based on job statuses
  const getPollingInterval = useCallback(() => {
    if (activeJobs.length === 0) return 30000; // 30s when no active jobs
    
    const hasEarlyStageJob = activeJobs.some(job => 
      ['pending', 'downloading', 'extracting'].includes(job.status) ||
      ['pending', 'downloading', 'extracting', 'analyzing'].includes(job.current_step)
    );
    
    if (hasEarlyStageJob) {
      return 3000; // 3s for early stages (download, extract, analyze)
    }
    
    return 15000; // 15s for processing stage
  }, [activeJobs]);

  // Setup adaptive polling
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchActiveJobs();

    // Setup polling with adaptive interval
    const setupPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      const interval = getPollingInterval();
      pollingIntervalRef.current = setInterval(fetchActiveJobs, interval);
    };

    setupPolling();

    // Re-setup polling when interval should change
    const checkInterval = setInterval(() => {
      const newInterval = getPollingInterval();
      const currentInterval = activeJobs.length === 0 ? 30000 : 
        activeJobs.some(j => ['pending', 'downloading', 'extracting'].includes(j.status)) ? 3000 : 15000;
      
      if (newInterval !== currentInterval) {
        setupPolling();
      }
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      clearInterval(checkInterval);
    };
  }, [user, fetchActiveJobs, getPollingInterval, activeJobs]);

  // Real-time subscription for immediate updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('processing_jobs_sidebar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processing_jobs',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newJob = payload.new as ActiveJob;
            if (['pending', 'downloading', 'extracting', 'running'].includes(newJob.status)) {
              setActiveJobs(prev => [newJob, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedJob = payload.new as ActiveJob;
            
            if (['completed', 'error', 'cancelled'].includes(updatedJob.status)) {
              // Remove from active jobs
              setActiveJobs(prev => prev.filter(job => job.id !== updatedJob.id));
            } else {
              // Update existing job
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
    <ProcessingJobsContext.Provider value={{ activeJobs, loading, refreshJobs: fetchActiveJobs }}>
      {children}
    </ProcessingJobsContext.Provider>
  );
};

export const useProcessingJobs = () => {
  const context = useContext(ProcessingJobsContext);
  if (context === undefined) {
    throw new Error('useProcessingJobs must be used within a ProcessingJobsProvider');
  }
  return context;
};