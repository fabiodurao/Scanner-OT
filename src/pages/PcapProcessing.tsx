import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Site {
  id: string;
  name: string;
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
}

interface UploadSession {
  id: string;
  site_id: string;
  name: string | null;
  created_at: string;
  total_files: number;
}

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
  
  // Dialog state
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PcapFile | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [intervalBatch, setIntervalBatch] = useState('1000');
  const [intervalMin, setIntervalMin] = useState('100');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Log viewer
  const [viewingJob, setViewingJob] = useState<ProcessingJob | null>(null);
  
  // Cancel dialog
  const [cancellingJob, setCancellingJob] = useState<ProcessingJob | null>(null);

  // Fetch sites
  const fetchSites = async () => {
    const { data, error } = await supabase
      .from('sites')
      .select('id, name')
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

  // Real-time subscription for job updates
  useEffect(() => {
    const channel = supabase
      .channel('processing_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processing_jobs',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setJobs(prev => [payload.new as ProcessingJob, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setJobs(prev => prev.map(job => 
              job.id === payload.new.id ? payload.new as ProcessingJob : job
            ));
            if (viewingJob?.id === payload.new.id) {
              setViewingJob(payload.new as ProcessingJob);
            }
          } else if (payload.eventType === 'DELETE') {
            setJobs(prev => prev.filter(job => job.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewingJob?.id]);

  // Open process dialog with defaults from settings
  const handleOpenProcessDialog = (file: PcapFile) => {
    setSelectedFile(file);
    setWebhookUrl(settings.n8n_webhook_url || '');
    setIntervalBatch(settings.mbsniffer_interval_batch.toString());
    setIntervalMin(settings.mbsniffer_interval_min.toString());
    setAdvancedOpen(false);
    setProcessDialogOpen(true);
  };

  // Submit new job
  const handleSubmitJob = async () => {
    if (!selectedFile || !selectedSiteId || !user) return;
    
    setSubmitting(true);
    
    const { error } = await supabase
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
        mbsniffer_interval_batch: parseInt(intervalBatch) || 1000,
        mbsniffer_interval_min: parseInt(intervalMin) || 100,
      });
    
    if (error) {
      toast.error('Error creating job: ' + error.message);
    } else {
      toast.success('Processing job created! The agent will pick it up shortly.');
      setProcessDialogOpen(false);
      setActiveTab('jobs');
    }
    
    setSubmitting(false);
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
  const handleDeleteJob = async (jobId: string) => {
    const { error } = await supabase
      .from('processing_jobs')
      .delete()
      .eq('id', jobId);
    
    if (error) {
      toast.error('Error deleting job: ' + error.message);
    } else {
      toast.success('Job deleted');
    }
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

  const getStatusBadge = (job: ProcessingJob) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'bg-slate-100 text-slate-700' },
      downloading: { label: 'Downloading', className: 'bg-blue-100 text-blue-700' },
      extracting: { label: 'Extracting', className: 'bg-purple-100 text-purple-700' },
      running: { label: 'Processing', className: 'bg-amber-100 text-amber-700' },
      completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700' },
      error: { label: 'Error', className: 'bg-red-100 text-red-700' },
      cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-700' },
    };
    const config = statusConfig[job.status] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Map status to step for the indicator
  const getStepFromStatus = (job: ProcessingJob): 'pending' | 'downloading' | 'extracting' | 'analyzing' | 'processing' | 'completed' | 'error' | 'cancelled' => {
    if (job.current_step) {
      return job.current_step as 'pending' | 'downloading' | 'extracting' | 'analyzing' | 'processing' | 'completed' | 'error' | 'cancelled';
    }
    // Fallback based on status
    if (job.status === 'running') return 'processing';
    return job.status as 'pending' | 'downloading' | 'extracting' | 'completed' | 'error' | 'cancelled';
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
                      
                      return (
                        <div 
                          key={job.id} 
                          className="border rounded-lg overflow-hidden"
                        >
                          {/* Job Header */}
                          <div 
                            className="p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => toggleJobExpanded(job.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <FileArchive className="h-5 w-5 text-slate-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-medium truncate">
                                    {job.pcap_filename}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatFileSize(job.pcap_size_bytes || 0)} • {format(new Date(job.created_at), 'MM/dd HH:mm')}
                                  </div>
                                </div>
                              </div>
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
                                  {!isActiveJob(job.status) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteJob(job.id);
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
                              {/* Steps Indicator */}
                              <JobStepsIndicator
                                currentStep={getStepFromStatus(job)}
                                progress={job.progress}
                                elapsedSeconds={job.elapsed_seconds || undefined}
                                totalDuration={job.total_duration || undefined}
                                pcapDuration={job.pcap_duration || undefined}
                                className="mb-4"
                              />
                              
                              {/* Error message */}
                              {job.error_message && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                                  <div className="flex gap-2">
                                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                    <div className="text-sm text-red-700">{job.error_message}</div>
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
                              {site.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Label>Available Files</Label>
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

                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div className="text-sm text-amber-800">
                        <strong>Note:</strong> The processing agent must be running on the EC2 instance for jobs to be executed.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Process Dialog */}
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
                        <Label htmlFor="interval-batch">Interval Batch (ms)</Label>
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
                        <Label htmlFor="interval-min">Interval Min (ms)</Label>
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
                <JobStepsIndicator
                  currentStep={getStepFromStatus(viewingJob)}
                  progress={viewingJob.progress}
                  elapsedSeconds={viewingJob.elapsed_seconds || undefined}
                  totalDuration={viewingJob.total_duration || undefined}
                  pcapDuration={viewingJob.pcap_duration || undefined}
                />

                {viewingJob.error_message && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex gap-2">
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <div className="text-sm text-red-700">{viewingJob.error_message}</div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Output Log</Label>
                  <ScrollArea className="h-48 w-full rounded-md border bg-slate-900 p-4">
                    <pre className="text-sm text-slate-100 font-mono whitespace-pre-wrap">
                      {viewingJob.output_log || 'No output yet...'}
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
      </div>
    </MainLayout>
  );
};

export default PcapProcessing;