import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Square,
  Loader2,
  FileArchive,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Cpu,
  Terminal,
  RefreshCw,
  Trash2,
  Building2,
  AlertCircle,
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
  progress: number;
  output_log: string | null;
  error_message: string | null;
  created_by: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  pcap_filename: string;
  pcap_size_bytes: number;
}

interface UploadSession {
  id: string;
  site_id: string;
  name: string | null;
  created_at: string;
  total_files: number;
}

const statusConfig: Record<ProcessingJob['status'], { label: string; icon: typeof Loader2; color: string; bgColor: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  downloading: { label: 'Downloading', icon: Download, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  extracting: { label: 'Extracting', icon: FileArchive, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  running: { label: 'Processing', icon: Cpu, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  error: { label: 'Error', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  cancelled: { label: 'Cancelled', icon: Square, color: 'text-slate-600', bgColor: 'bg-slate-100' },
};

const formatFileSize = (bytes: number) => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' bytes';
};

const PcapProcessing = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('start');
  
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
  
  // Dialog state
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PcapFile | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
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
            // Update viewing job if it's the one being updated
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

  // Open process dialog
  const handleOpenProcessDialog = (file: PcapFile) => {
    setSelectedFile(file);
    setWebhookUrl('');
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
        progress: 0,
        created_by: user.id,
        pcap_filename: selectedFile.original_filename,
        pcap_size_bytes: selectedFile.size_bytes,
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
      .update({ status: 'cancelled' })
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
            <TabsTrigger value="start" className="gap-2">
              <Play className="h-4 w-4" />
              Start Processing
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Cpu className="h-4 w-4" />
              Jobs
              {jobs.filter(j => isActiveJob(j.status)).length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">
                  {jobs.filter(j => isActiveJob(j.status)).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

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
                        <div className="font-medium">Configure webhook (optional)</div>
                        <div className="text-sm text-muted-foreground">
                          Set the n8n webhook URL to receive results
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
                          Downloads, extracts, and runs mbsniffer
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium">
                        4
                      </div>
                      <div>
                        <div className="font-medium">View results</div>
                        <div className="text-sm text-muted-foreground">
                          Check logs and output in the Jobs tab
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
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobs.map(job => {
                          const status = statusConfig[job.status];
                          const StatusIcon = status.icon;
                          
                          return (
                            <TableRow key={job.id}>
                              <TableCell>
                                <div className="font-medium truncate max-w-xs">
                                  {job.pcap_filename}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatFileSize(job.pcap_size_bytes || 0)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${status.bgColor} ${status.color}`}>
                                  <StatusIcon className={`h-3 w-3 mr-1 ${isActiveJob(job.status) ? 'animate-spin' : ''}`} />
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 min-w-32">
                                  <Progress value={job.progress} className="h-2" />
                                  <span className="text-xs text-muted-foreground w-8">
                                    {job.progress}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {format(new Date(job.created_at), 'MM/dd HH:mm')}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewingJob(job)}
                                    className="h-8 w-8 p-0"
                                    title="View logs"
                                  >
                                    <Terminal className="h-4 w-4" />
                                  </Button>
                                  {canCancel(job.status) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setCancellingJob(job)}
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
                                      onClick={() => handleDeleteJob(job.id)}
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      title="Delete job"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Process Dialog */}
        <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
          <DialogContent>
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
                  <Label htmlFor="webhook">n8n Webhook URL (optional)</Label>
                  <Input
                    id="webhook"
                    placeholder="https://n8n.example.com/webhook/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    If provided, results will be sent to this webhook when processing completes
                  </p>
                </div>
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
                <div className="flex items-center gap-4">
                  <Badge className={`${statusConfig[viewingJob.status].bgColor} ${statusConfig[viewingJob.status].color}`}>
                    {statusConfig[viewingJob.status].label}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Progress value={viewingJob.progress} className="w-32 h-2" />
                    <span className="text-sm text-muted-foreground">{viewingJob.progress}%</span>
                  </div>
                </div>

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
                  <ScrollArea className="h-64 w-full rounded-md border bg-slate-900 p-4">
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
                  {viewingJob.n8n_webhook_url && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Webhook:</span>{' '}
                      <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                        {viewingJob.n8n_webhook_url}
                      </code>
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
                the mbsniffer process will be terminated (equivalent to Ctrl+C).
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