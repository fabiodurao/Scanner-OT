import { useState, useEffect, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { JobStepsIndicator } from '@/components/processing/JobStepsIndicator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Play,
  Square,
  Loader2,
  FileArchive,
  XCircle,
  Cpu,
  Terminal,
  RefreshCw,
  Trash2,
  Building2,
  AlertCircle,
  Settings,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  Server,
  ListOrdered,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Site {
  id: string;
  name: string;
  unique_id: string | null;
}

interface PcapFile {
  id: string;
  session_id: string;
  original_filename: string;
  size_bytes: number;
  s3_key: string;
  s3_bucket: string;
  upload_status: string;
  completed_at: string;
}

interface ProcessingJob {
  id: string;
  pcap_file_id: string;
  site_id: string;
  n8n_webhook_url: string | null;
  status: 'pending' | 'downloading' | 'extracting' | 'running' | 'completed' | 'error' | 'cancelled';
  current_step: string;
  progress: number;
  output_log: string | null;
  error_message: string | null;
  created_by: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  pcap_filename: string;
  pcap_size_bytes: number;
  pcap_duration: number | null;
  pcap_packets: number | null;
  elapsed_seconds: number | null;
  total_duration: number | null;
  processing_time: number | null;
  mbsniffer_interval_batch?: number;
  mbsniffer_interval_min?: number;
  sequence_group?: string | null;
  sequence_order?: number | null;
}

interface UploadSession {
  id: string;
  site_id: string;
  name: string | null;
  created_at: string;
  total_files: number;
}

const MAX_CONCURRENT_JOBS = 3;

const formatFileSize = (bytes: number) => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' bytes';
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
};

// Generate UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const PcapProcessing = () => {
  const { user } = useAuth();
  const { settings, loading: loadingSettings } = useUserSettings();
  const [activeTab, setActiveTab] = useState('jobs');
  
  // Sites and files
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<UploadSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [pcapFiles, setPcapFiles] = useState<PcapFile[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  // Jobs
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  
  // Single file dialog state
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PcapFile | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [intervalBatch, setIntervalBatch] = useState('60');
  const [intervalMin, setIntervalMin] = useState('5');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Batch processing dialog state
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchWebhookUrl, setBatchWebhookUrl] = useState('');
  const [batchIntervalBatch, setBatchIntervalBatch] = useState('60');
  const [batchIntervalMin, setBatchIntervalMin] = useState('5');
  const [batchAdvancedOpen, setBatchAdvancedOpen] = useState(false);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  
  // Log viewer
  const [viewingJob, setViewingJob] = useState<ProcessingJob | null>(null);
  
  // Cancel dialog
  const [cancellingJob, setCancellingJob] = useState<ProcessingJob | null>(null);
  
  // Delete dialog
  const [deletingJob, setDeletingJob] = useState<ProcessingJob | null>(null);

  // Polling interval ref
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Log scroll ref
  const logScrollRef = useRef<HTMLDivElement>(null);

  // Calculate queue statistics
  const activeProcessingJobs = jobs.filter(j => 
    ['downloading', 'extracting', 'running'].includes(j.status)
  );
  const pendingJobs = jobs.filter(j => j.status === 'pending');
  const processingSlots = activeProcessingJobs.length;
  const availableSlots = MAX_CONCURRENT_JOBS - processingSlots;
  const queueLength = pendingJobs.length;

  // Get queue position for a pending job
  const getQueuePosition = (jobId: string): number => {
    const sortedPendingJobs = [...pendingJobs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const position = sortedPendingJobs.findIndex(j => j.id === jobId);
    return position + 1;
  };

  // Fetch sites
  const fetchSites = async () => {
    const { data, error } = await supabase
      .from('sites')
      .select('id, name, unique_id')
      .order('name');
    
    if (!error && data) {
      setSites(data);
    }
    setLoadingSites(false);
  };

  // Fetch sessions for selected site
  const fetchSessions = async (siteId: string) => {
    const { data, error } = await supabase
      .from('upload_sessions')
      .select('id, site_id, name, created_at, total_files')
      .eq('site_id', siteId)
      .gt('total_files', 0)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setSessions(data);
    }
  };

  // Fetch PCAP files for selected session
  const fetchPcapFiles = async (sessionId: string) => {
    setLoadingFiles(true);
    const { data, error } = await supabase
      .from('pcap_files')
      .select('*')
      .eq('session_id', sessionId)
      .eq('upload_status', 'completed')
      .order('original_filename');
    
    if (!error && data) {
      setPcapFiles(data);
    }
    setLoadingFiles(false);
  };

  // Fetch all jobs
  const fetchJobs = useCallback(async () => {
    const { data, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!error && data) {
      setJobs(data as ProcessingJob[]);
    }
    setLoadingJobs(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchSites();
    fetchJobs();
  }, [fetchJobs]);

  // Load sessions when site changes
  useEffect(() => {
    if (selectedSiteId) {
      fetchSessions(selectedSiteId);
      setSelectedSessionId(null);
      setPcapFiles([]);
    }
  }, [selectedSiteId]);

  // Load files when session changes
  useEffect(() => {
    if (selectedSessionId) {
      fetchPcapFiles(selectedSessionId);
    }
  }, [selectedSessionId]);

  // Real-time subscription + polling fallback for job updates
  useEffect(() => {
    const channelName = `processing_jobs_page_${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'processing_jobs',
        },
        (payload) => {
          console.log('[PcapProcessing] INSERT:', payload.new);
          setJobs(prev => {
            if (prev.some(j => j.id === payload.new.id)) {
              return prev;
            }
            return [payload.new as ProcessingJob, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'processing_jobs',
        },
        (payload) => {
          console.log('[PcapProcessing] UPDATE:', payload.new);
          setJobs(prev => prev.map(job => 
            job.id === payload.new.id ? payload.new as ProcessingJob : job
          ));
          setViewingJob(current => 
            current?.id === payload.new.id ? payload.new as ProcessingJob : current
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'processing_jobs',
        },
        (payload) => {
          console.log('[PcapProcessing] DELETE:', payload.old);
          setJobs(prev => prev.filter(job => job.id !== payload.old.id));
        }
      )
      .subscribe((status, err) => {
        console.log('[PcapProcessing] Subscription status:', status, err);
      });

    pollingIntervalRef.current = setInterval(() => {
      fetchJobs();
    }, 3000);

    return () => {
      console.log('[PcapProcessing] Cleaning up subscription');
      supabase.removeChannel(channel);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchJobs]);

  // Auto-scroll logs when viewing job updates
  useEffect(() => {
    if (viewingJob && logScrollRef.current) {
      const scrollArea = logScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [viewingJob?.output_log]);

  // Open process dialog with defaults from settings
  const handleOpenProcessDialog = (file: PcapFile) => {
    setSelectedFile(file);
    setWebhookUrl(settings.n8n_webhook_url || '');
    setIntervalBatch(settings.mbsniffer_interval_batch.toString());
    setIntervalMin(settings.mbsniffer_interval_min.toString());
    setAdvancedOpen(false);
    setProcessDialogOpen(true);
  };

  // Open batch process dialog
  const handleOpenBatchDialog = () => {
    setBatchWebhookUrl(settings.n8n_webhook_url || '');
    setBatchIntervalBatch(settings.mbsniffer_interval_batch.toString());
    setBatchIntervalMin(settings.mbsniffer_interval_min.toString());
    setBatchAdvancedOpen(false);
    setBatchDialogOpen(true);
  };

  // Submit single job
  const handleSubmitJob = async () => {
    if (!selectedFile || !selectedSiteId || !user) return;
    
    setSubmitting(true);
    
    const { data, error } = await supabase
      .from('processing_jobs')
      .insert({
        pcap_file_id: selectedFile.id,
        site_id: selectedSiteId,
        n8n_webhook_url: webhookUrl || null,
        status: 'pending',
        current_step: 'pending',
        progress: 0,
        created_by: user.id,
        pcap_filename: selectedFile.original_filename,
        pcap_size_bytes: selectedFile.size_bytes,
        mbsniffer_interval_batch: parseInt(intervalBatch) || 60,
        mbsniffer_interval_min: parseInt(intervalMin) || 5,
        output_log: `[${new Date().toISOString().split('T')[1].split('.')[0]}] Job created, waiting for agent...`,
        sequence_group: null, // Individual job - no sequence group
        sequence_order: null,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Error creating job: ' + error.message);
    } else {
      toast.success('Processing job created! The agent will pick it up shortly.');
      if (data) {
        setJobs(prev => {
          if (prev.some(j => j.id === data.id)) {
            return prev;
          }
          return [data as ProcessingJob, ...prev];
        });
      }
      setProcessDialogOpen(false);
      setActiveTab('jobs');
    }
    
    setSubmitting(false);
  };

  // Submit batch jobs (all files in session)
  const handleSubmitBatchJobs = async () => {
    if (!selectedSiteId || !user || pcapFiles.length === 0) return;
    
    setBatchSubmitting(true);
    
    // Generate a unique sequence_group for this batch
    const sequenceGroup = generateUUID();
    
    // Sort files by name to ensure consistent order
    const sortedFiles = [...pcapFiles].sort((a, b) => 
      a.original_filename.localeCompare(b.original_filename)
    );
    
    const jobsToInsert = sortedFiles.map((file, index) => ({
      pcap_file_id: file.id,
      site_id: selectedSiteId,
      n8n_webhook_url: batchWebhookUrl || null,
      status: 'pending',
      current_step: 'pending',
      progress: 0,
      created_by: user.id,
      pcap_filename: file.original_filename,
      pcap_size_bytes: file.size_bytes,
      mbsniffer_interval_batch: parseInt(batchIntervalBatch) || 60,
      mbsniffer_interval_min: parseInt(batchIntervalMin) || 5,
      output_log: `[${new Date().toISOString().split('T')[1].split('.')[0]}] Job created (${index + 1}/${sortedFiles.length} in sequence), waiting for agent...`,
      sequence_group: sequenceGroup,
      sequence_order: index + 1,
    }));
    
    const { data, error } = await supabase
      .from('processing_jobs')
      .insert(jobsToInsert)
      .select();
    
    if (error) {
      toast.error('Error creating batch jobs: ' + error.message);
    } else {
      toast.success(`${sortedFiles.length} jobs created! They will be processed sequentially.`);
      if (data) {
        setJobs(prev => {
          const existingIds = new Set(prev.map(j => j.id));
          const newJobs = data.filter(j => !existingIds.has(j.id)) as ProcessingJob[];
          return [...newJobs, ...prev];
        });
      }
      setBatchDialogOpen(false);
      setActiveTab('jobs');
    }
    
    setBatchSubmitting(false);
  };

  // Cancel job
  const handleCancelJob = async () => {
    if (!cancellingJob) return;
    
    const { error } = await supabase
      .from('processing_jobs')
      .update({ status: 'cancelled', current_step: 'cancelled' })
      .eq('id', cancellingJob.id);
    
    if (error) {
      toast.error('Error cancelling job: ' + error.message);
    } else {
      toast.success('Cancel request sent to agent');
    }
    
    setCancellingJob(null);
  };

  // Delete job
  const handleConfirmDeleteJob = async () => {
    if (!deletingJob) return;
    
    const { error } = await supabase
      .from('processing_jobs')
      .delete()
      .eq('id', deletingJob.id);
    
    if (error) {
      toast.error('Error deleting job: ' + error.message);
    } else {
      toast.success('Job deleted');
      setJobs(prev => prev.filter(j => j.id !== deletingJob.id));
    }
    
    setDeletingJob(null);
  };

  const formatSessionName = (session: UploadSession) => {
    if (session.name) return session.name;
    return format(new Date(session.created_at), "MM/dd/yyyy 'at' HH:mm");
  };

  const canCancel = (status: ProcessingJob['status']) => {
    return ['pending', 'downloading', 'extracting', 'running'].includes(status);
  };

  const isActiveJob = (status: ProcessingJob['status']) => {
    return ['pending', 'downloading', 'extracting', 'running'].includes(status);
  };

  // Check if job was interrupted (error with progress > 0 and < 100)
  const isInterruptedJob = (job: ProcessingJob) => {
    return job.status === 'error' && job.progress > 0 && job.progress < 100;
  };

  const toggleJobExpanded = (jobId: string) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  // Should show progress bar (for active, interrupted, or error jobs with progress)
  const shouldShowProgress = (job: ProcessingJob) => {
    return isActiveJob(job.status) || isInterruptedJob(job) || (job.status === 'error' && job.progress > 0);
  };

  const getStatusBadge = (job: ProcessingJob) => {
    const isActive = isActiveJob(job.status);
    const isInterrupted = isInterruptedJob(job);
    
    if (isInterrupted) {
      return (
        <Badge className="bg-amber-100 text-amber-700 border border-amber-300">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Interrupted ({job.progress}%)
        </Badge>
      );
    }
    
    // Special badge for pending jobs showing queue position
    if (job.status === 'pending') {
      const queuePos = getQueuePosition(job.id);
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
          {queuePos > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
              #{queuePos} in queue
            </Badge>
          )}
        </div>
      );
    }
    
    const statusConfig: Record<string, { label: string; className: string; icon?: React.ElementType; shouldSpin?: boolean }> = {
      downloading: { label: 'Downloading', className: 'bg-blue-100 text-blue-700 animate-pulse', icon: Loader2, shouldSpin: true },
      extracting: { label: 'Extracting', className: 'bg-purple-100 text-purple-700 animate-pulse', icon: Loader2, shouldSpin: true },
      running: { label: 'Processing', className: 'bg-amber-100 text-amber-700 animate-pulse', icon: Loader2, shouldSpin: true },
      completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, shouldSpin: false },
      error: { label: 'Error', className: 'bg-red-100 text-red-700', icon: XCircle, shouldSpin: false },
      cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-700', icon: Square, shouldSpin: false },
    };
    
    const config = statusConfig[job.status] || { label: 'Unknown', className: 'bg-slate-100 text-slate-700' };
    const Icon = config.icon;
    
    return (
      <Badge className={cn(config.className, isActive && 'border border-current')}>
        {Icon && <Icon className={cn("h-3 w-3 mr-1", config.shouldSpin && "animate-spin")} />}
        {config.label}
      </Badge>
    );
  };

  const getStepFromStatus = (job: ProcessingJob): 'pending' | 'downloading' | 'extracting' | 'analyzing' | 'processing' | 'completed' | 'error' | 'cancelled' => {
    if (isInterruptedJob(job)) {
      return 'error';
    }
    
    if (job.current_step) {
      return job.current_step as 'pending' | 'downloading' | 'extracting' | 'analyzing' | 'processing' | 'completed' | 'error' | 'cancelled';
    }
    if (job.status === 'running') return 'processing';
    return job.status as 'pending' | 'downloading' | 'extracting' | 'completed' | 'error' | 'cancelled';
  };

  // Get progress bar color based on status
  const getProgressBarColor = (job: ProcessingJob) => {
    if (isInterruptedJob(job)) return 'bg-amber-500';
    if (job.status === 'error') return 'bg-red-500';
    if (job.status === 'completed') return 'bg-emerald-500';
    return 'bg-blue-500';
  };

  // Get selected site info
  const selectedSite = sites.find(s => s.id === selectedSiteId);

  // Render Agent Status Card
  const renderAgentStatusCard = () => {
    return (
      <div className="mb-6 p-4 rounded-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Server className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Agent Status</h3>
              <p className="text-sm text-muted-foreground">
                {processingSlots === MAX_CONCURRENT_JOBS 
                  ? 'Full capacity — jobs will queue'
                  : processingSlots > 0 
                    ? `${availableSlots} slot${availableSlots !== 1 ? 's' : ''} available`
                    : 'Agent idle — ready to process'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Processing Slots Visualization */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">Slots:</span>
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all",
                    index < processingSlots
                      ? "bg-amber-500 border-amber-600 animate-pulse"
                      : "bg-slate-100 border-slate-300"
                  )}
                  title={index < processingSlots ? `Slot ${index + 1}: Active` : `Slot ${index + 1}: Available`}
                />
              ))}
            </div>
            
            {/* Queue indicator */}
            {queueLength > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-full">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  {queueLength} in queue
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1a2744]">PCAP Processing</h1>
          <p className="text-muted-foreground mt-1">
            Process PCAP files with mbsniffer and send results to n8n
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="jobs" className="gap-2">
              <Cpu className="h-4 w-4" />
              Jobs
              {jobs.filter(j => isActiveJob(j.status)).length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">
                  {jobs.filter(j => isActiveJob(j.status)).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="start" className="gap-2">
              <Play className="h-4 w-4" />
              New Job
            </TabsTrigger>
          </TabsList>

          {/* Jobs Tab */}
          <TabsContent value="jobs">
            {/* Agent Status Card - Always visible */}
            {renderAgentStatusCard()}
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    Processing Jobs
                  </CardTitle>
                  <CardDescription>
                    Monitor and manage your processing jobs
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchJobs}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {loadingJobs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    <Cpu className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No processing jobs yet</p>
                    <p className="text-sm">Start by selecting a PCAP file to process</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setActiveTab('start')}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Create New Job
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.map(job => {
                      const isExpanded = expandedJobs.has(job.id);
                      const isActive = isActiveJob(job.status);
                      const isInterrupted = isInterruptedJob(job);
                      const showProgress = shouldShowProgress(job);
                      const isPending = job.status === 'pending';
                      const isSequential = !!job.sequence_group;
                      
                      return (
                        <div 
                          key={job.id} 
                          className={cn(
                            "border rounded-lg overflow-hidden transition-all",
                            isPending && "border-blue-300 shadow-md shadow-blue-100",
                            isActive && !isPending && "border-amber-300 shadow-md shadow-amber-100",
                            isInterrupted && "border-amber-300",
                            job.status === 'error' && !isInterrupted && "border-red-300",
                            job.status === 'completed' && "border-emerald-200"
                          )}
                        >
                          {/* Job Header */}
                          <div 
                            className={cn(
                              "p-4 cursor-pointer transition-colors",
                              isPending ? "bg-blue-50 hover:bg-blue-100" : 
                              isActive ? "bg-amber-50 hover:bg-amber-100" : "bg-slate-50 hover:bg-slate-100",
                              isInterrupted && "bg-amber-50 hover:bg-amber-100",
                              job.status === 'error' && !isInterrupted && "bg-red-50 hover:bg-red-100",
                              job.status === 'completed' && "bg-emerald-50 hover:bg-emerald-100"
                            )}
                            onClick={() => toggleJobExpanded(job.id)}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                
                                <div className={cn(
                                  "w-3 h-3 rounded-full flex-shrink-0",
                                  isPending && "bg-blue-500 animate-pulse",
                                  isActive && !isPending && "bg-amber-500 animate-pulse",
                                  job.status === 'completed' && "bg-emerald-500",
                                  job.status === 'error' && "bg-red-500",
                                  job.status === 'cancelled' && "bg-slate-400",
                                  isInterrupted && "bg-amber-500"
                                )} />
                                
                                <FileArchive className="h-5 w-5 text-slate-500 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium truncate flex items-center gap-2">
                                    {job.pcap_filename}
                                    {isSequential && (
                                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                                        <ListOrdered className="h-3 w-3 mr-1" />
                                        #{job.sequence_order}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatFileSize(job.pcap_size_bytes || 0)} • {format(new Date(job.created_at), 'MM/dd HH:mm')}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Progress bar in collapsed view */}
                              {!isExpanded && showProgress && !isPending && (
                                <div className="flex items-center gap-2 w-32 flex-shrink-0">
                                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                      className={cn("h-full rounded-full transition-all", getProgressBarColor(job))}
                                      style={{ width: `${job.progress}%` }}
                                    />
                                  </div>
                                  <span className={cn(
                                    "text-xs font-medium w-10 text-right",
                                    isActive && "text-amber-700",
                                    isInterrupted && "text-amber-700",
                                    job.status === 'error' && !isInterrupted && "text-red-700"
                                  )}>
                                    {job.progress}%
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {getStatusBadge(job)}
                                <div className="flex items-center gap-1">
                                  {canCancel(job.status) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCancellingJob(job);
                                      }}
                                      className="h-8 w-8 p-0 text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                                      title="Cancel job"
                                    >
                                      <Square className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {!isActive && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingJob(job);
                                      }}
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      title="Delete job"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Job Details (Expanded) */}
                          {isExpanded && (
                            <div className="p-4 border-t bg-white">
                              {/* Progress bar in expanded view */}
                              {showProgress && (
                                <div className="mb-4">
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className={cn(
                                      "font-medium",
                                      isActive && "text-amber-700",
                                      isInterrupted && "text-amber-700",
                                      job.status === 'error' && !isInterrupted && "text-red-700"
                                    )}>
                                      {job.progress}%
                                    </span>
                                  </div>
                                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                      className={cn("h-full rounded-full transition-all", getProgressBarColor(job))}
                                      style={{ width: `${job.progress}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {/* Steps Indicator */}
                              <JobStepsIndicator
                                currentStep={getStepFromStatus(job)}
                                progress={job.progress}
                                elapsedSeconds={job.elapsed_seconds || undefined}
                                totalDuration={job.total_duration || undefined}
                                pcapDuration={job.pcap_duration || undefined}
                                className="mb-4"
                              />
                              
                              {/* Sequence info */}
                              {isSequential && (
                                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg mb-4">
                                  <div className="flex items-center gap-2 text-sm text-purple-700">
                                    <ListOrdered className="h-4 w-4" />
                                    <span>
                                      Part of sequential batch • Position #{job.sequence_order}
                                    </span>
                                  </div>
                                  <p className="text-xs text-purple-600 mt-1">
                                    This job will only start after previous jobs in the sequence complete.
                                  </p>
                                </div>
                              )}
                              
                              {/* Error message */}
                              {job.error_message && (
                                <div className={cn(
                                  "p-3 border rounded-lg mb-4",
                                  isInterrupted ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"
                                )}>
                                  <div className="flex gap-2">
                                    {isInterrupted ? (
                                      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                    ) : (
                                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                    )}
                                    <div className={cn(
                                      "text-sm",
                                      isInterrupted ? "text-amber-700" : "text-red-700"
                                    )}>
                                      {job.error_message}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Job metadata */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                {job.pcap_duration && (
                                  <div>
                                    <span className="text-muted-foreground">PCAP Duration:</span>
                                    <div className="font-medium">{formatDuration(job.pcap_duration)}</div>
                                  </div>
                                )}
                                {job.pcap_packets && (
                                  <div>
                                    <span className="text-muted-foreground">Packets:</span>
                                    <div className="font-medium">{job.pcap_packets.toLocaleString()}</div>
                                  </div>
                                )}
                                {job.processing_time && (
                                  <div>
                                    <span className="text-muted-foreground">Processing Time:</span>
                                    <div className="font-medium">{formatDuration(parseFloat(job.processing_time.toString()))}</div>
                                  </div>
                                )}
                                {job.n8n_webhook_url && (
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">Webhook:</span>
                                    <div className="font-mono text-xs truncate">{job.n8n_webhook_url}</div>
                                  </div>
                                )}
                              </div>
                              
                              {/* View logs button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingJob(job)}
                              >
                                <Terminal className="h-4 w-4 mr-2" />
                                View Logs
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Start Processing Tab */}
          <TabsContent value="start">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* File Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileArchive className="h-5 w-5" />
                    Select PCAP File
                  </CardTitle>
                  <CardDescription>
                    Choose a site and session to see available PCAP files
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Site selector */}
                  <div className="space-y-2">
                    <Label>Site</Label>
                    <Select 
                      value={selectedSiteId || ''} 
                      onValueChange={setSelectedSiteId}
                      disabled={loadingSites}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a site..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sites.map(site => (
                          <SelectItem key={site.id} value={site.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{site.name}</span>
                              {site.unique_id && (
                                <span className="text-xs text-muted-foreground">
                                  ({site.unique_id.slice(0, 8)}...)
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedSite && !selectedSite.unique_id && (
                      <p className="text-xs text-amber-600">
                        ⚠️ This site has no Unique ID configured. The -k parameter won't be sent to mbsniffer.
                      </p>
                    )}
                  </div>

                  {/* Session selector */}
                  {selectedSiteId && (
                    <div className="space-y-2">
                      <Label>Upload Session</Label>
                      <Select 
                        value={selectedSessionId || ''} 
                        onValueChange={setSelectedSessionId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a session..." />
                        </SelectTrigger>
                        <SelectContent>
                          {sessions.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No sessions with files
                            </SelectItem>
                          ) : (
                            sessions.map(session => (
                              <SelectItem key={session.id} value={session.id}>
                                <div className="flex flex-col">
                                  <span>{formatSessionName(session)}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {session.total_files} file{session.total_files !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Files list */}
                  {selectedSessionId && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Available Files ({pcapFiles.length})</Label>
                        {pcapFiles.length > 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleOpenBatchDialog}
                            disabled={loadingSettings}
                            className="gap-2"
                          >
                            <Layers className="h-4 w-4" />
                            Process All ({pcapFiles.length})
                          </Button>
                        )}
                      </div>
                      {loadingFiles ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : pcapFiles.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                          No completed PCAP files in this session
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {pcapFiles.map(file => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border hover:border-[#2563EB]/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <FileArchive className="h-5 w-5 text-slate-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {file.original_filename}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatFileSize(file.size_bytes)}
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleOpenProcessDialog(file)}
                                className="bg-[#2563EB] hover:bg-[#1d4ed8] flex-shrink-0"
                                disabled={loadingSettings}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Process
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    How it Works
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium">
                        1
                      </div>
                      <div>
                        <div className="font-medium">Select a PCAP file</div>
                        <div className="text-sm text-muted-foreground">
                          Choose from your uploaded files
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium">
                        2
                      </div>
                      <div>
                        <div className="font-medium">Configure parameters</div>
                        <div className="text-sm text-muted-foreground">
                          Set webhook URL and mbsniffer options
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium">
                        3
                      </div>
                      <div>
                        <div className="font-medium">Agent processes the file</div>
                        <div className="text-sm text-muted-foreground">
                          Downloads, extracts, analyzes, and runs mbsniffer
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium">
                        4
                      </div>
                      <div>
                        <div className="font-medium">Results sent to webhook</div>
                        <div className="text-sm text-muted-foreground">
                          Data is sent to your n8n workflow
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Batch processing info */}
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex gap-2">
                      <Layers className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      <div className="text-sm text-purple-800">
                        <strong>Process All:</strong> When you click "Process All", all files in the session will be queued for sequential processing. 
                        They will use only <strong>1 slot</strong> at a time, leaving the other 2 slots free for other sites.
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div className="text-sm text-amber-800">
                        <strong>Note:</strong> The processing agent must be running on the EC2 instance for jobs to be executed. 
                        The agent can process up to 3 jobs simultaneously.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Single File Process Dialog */}
        <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Process PCAP File</DialogTitle>
              <DialogDescription>
                Configure the processing job for this file
              </DialogDescription>
            </DialogHeader>
            
            {selectedFile && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileArchive className="h-5 w-5 text-slate-500" />
                    <div>
                      <div className="font-medium">{selectedFile.original_filename}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size_bytes)}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedSite?.unique_id && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-700">
                      <strong>Site Key:</strong> {selectedSite.unique_id}
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      This will be sent to mbsniffer via the -k parameter
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="webhook">n8n Webhook URL</Label>
                  <Input
                    id="webhook"
                    placeholder="https://n8n.example.com/webhook/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Results will be sent to this webhook when processing completes
                  </p>
                </div>

                {/* Advanced Options */}
                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Advanced Options
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4">
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="interval-batch">Interval Batch (s)</Label>
                        <Input
                          id="interval-batch"
                          type="number"
                          value={intervalBatch}
                          onChange={(e) => setIntervalBatch(e.target.value)}
                          min="1"
                        />
                        <p className="text-xs text-muted-foreground">
                          Time window for grouping packets
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="interval-min">Interval Min (s)</Label>
                        <Input
                          id="interval-min"
                          type="number"
                          value={intervalMin}
                          onChange={(e) => setIntervalMin(e.target.value)}
                          min="1"
                        />
                        <p className="text-xs text-muted-foreground">
                          Min interval between outputs
                        </p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitJob} 
                disabled={submitting}
                className="bg-[#2563EB] hover:bg-[#1d4ed8]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Processing
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Batch Process Dialog */}
        <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Process All Session Files
              </DialogTitle>
              <DialogDescription>
                Process all {pcapFiles.length} files sequentially (one at a time)
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ListOrdered className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-purple-800">Sequential Processing</span>
                </div>
                <p className="text-sm text-purple-700">
                  All {pcapFiles.length} files will be processed one after another, using only <strong>1 slot</strong>. 
                  This leaves 2 slots available for other sites.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg max-h-40 overflow-y-auto">
                <div className="text-sm font-medium mb-2">Files to process:</div>
                <div className="space-y-1">
                  {[...pcapFiles].sort((a, b) => a.original_filename.localeCompare(b.original_filename)).map((file, index) => (
                    <div key={file.id} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-6">#{index + 1}</span>
                      <FileArchive className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{file.original_filename}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatFileSize(file.size_bytes)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedSite?.unique_id && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-700">
                    <strong>Site Key:</strong> {selectedSite.unique_id}
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    This will be sent to mbsniffer via the -k parameter for all jobs
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="batch-webhook">n8n Webhook URL</Label>
                <Input
                  id="batch-webhook"
                  placeholder="https://n8n.example.com/webhook/..."
                  value={batchWebhookUrl}
                  onChange={(e) => setBatchWebhookUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Results from each file will be sent to this webhook
                </p>
              </div>

              {/* Advanced Options */}
              <Collapsible open={batchAdvancedOpen} onOpenChange={setBatchAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Advanced Options
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${batchAdvancedOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="batch-interval-batch">Interval Batch (s)</Label>
                      <Input
                        id="batch-interval-batch"
                        type="number"
                        value={batchIntervalBatch}
                        onChange={(e) => setBatchIntervalBatch(e.target.value)}
                        min="1"
                      />
                      <p className="text-xs text-muted-foreground">
                        Time window for grouping packets
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batch-interval-min">Interval Min (s)</Label>
                      <Input
                        id="batch-interval-min"
                        type="number"
                        value={batchIntervalMin}
                        onChange={(e) => setBatchIntervalMin(e.target.value)}
                        min="1"
                      />
                      <p className="text-xs text-muted-foreground">
                        Min interval between outputs
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitBatchJobs} 
                disabled={batchSubmitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {batchSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating {pcapFiles.length} jobs...
                  </>
                ) : (
                  <>
                    <Layers className="h-4 w-4 mr-2" />
                    Process All ({pcapFiles.length} files)
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Log Viewer Dialog */}
        <Dialog open={!!viewingJob} onOpenChange={(open) => !open && setViewingJob(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Job Logs
              </DialogTitle>
              <DialogDescription>
                {viewingJob?.pcap_filename}
              </DialogDescription>
            </DialogHeader>
            
            {viewingJob && (
              <div className="space-y-4">
                {/* Progress bar in log viewer */}
                {shouldShowProgress(viewingJob) && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{viewingJob.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all", getProgressBarColor(viewingJob))}
                        style={{ width: `${viewingJob.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <JobStepsIndicator
                  currentStep={getStepFromStatus(viewingJob)}
                  progress={viewingJob.progress}
                  elapsedSeconds={viewingJob.elapsed_seconds || undefined}
                  totalDuration={viewingJob.total_duration || undefined}
                  pcapDuration={viewingJob.pcap_duration || undefined}
                />

                {viewingJob.error_message && (
                  <div className={cn(
                    "p-3 border rounded-lg",
                    isInterruptedJob(viewingJob) ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"
                  )}>
                    <div className="flex gap-2">
                      {isInterruptedJob(viewingJob) ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      )}
                      <div className={cn(
                        "text-sm",
                        isInterruptedJob(viewingJob) ? "text-amber-700" : "text-red-700"
                      )}>
                        {viewingJob.error_message}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Output Log</Label>
                  <ScrollArea ref={logScrollRef} className="h-64 w-full rounded-md border bg-slate-900 p-4">
                    <pre className="text-sm text-slate-100 font-mono whitespace-pre-wrap">
                      {viewingJob.output_log || 'Waiting for agent to start processing...'}
                    </pre>
                  </ScrollArea>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created:</span>{' '}
                    {format(new Date(viewingJob.created_at), 'MM/dd/yyyy HH:mm:ss')}
                  </div>
                  {viewingJob.started_at && (
                    <div>
                      <span className="text-muted-foreground">Started:</span>{' '}
                      {format(new Date(viewingJob.started_at), 'MM/dd/yyyy HH:mm:ss')}
                    </div>
                  )}
                  {viewingJob.completed_at && (
                    <div>
                      <span className="text-muted-foreground">Completed:</span>{' '}
                      {format(new Date(viewingJob.completed_at), 'MM/dd/yyyy HH:mm:ss')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={!!cancellingJob} onOpenChange={(open) => !open && setCancellingJob(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Processing Job?</AlertDialogTitle>
              <AlertDialogDescription>
                This will send a cancel request to the agent. If the job is currently running, 
                the mbsniffer process will be terminated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Running</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelJob}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Cancel Job
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingJob} onOpenChange={(open) => !open && setDeletingJob(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Processing Job?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the job record for "{deletingJob?.pcap_filename}". 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteJob}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Job
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default PcapProcessing;