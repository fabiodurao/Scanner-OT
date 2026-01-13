import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import { JobStepsIndicator } from '@/components/processing/JobStepsIndicator';
import { SortableFileList, SortablePcapFile } from '@/components/processing/SortableFileList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Cpu,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileArchive,
  Building2,
  RefreshCw,
  Trash2,
  Eye,
  StopCircle,
  Layers,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Site {
  id: string;
  name: string;
  unique_id: string | null;
}

interface UploadSession {
  id: string;
  site_id: string;
  name: string | null;
  created_at: string;
  total_files: number;
}

interface PcapFile {
  id: string;
  session_id: string;
  original_filename: string;
  size_bytes: number;
  upload_status: string;
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
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  pcap_filename: string;
  pcap_size_bytes: number | null;
  mbsniffer_interval_batch: number;
  mbsniffer_interval_min: number;
  pcap_duration: number | null;
  pcap_packets: number | null;
  pcap_start_time: string | null;
  pcap_end_time: string | null;
  elapsed_seconds: number | null;
  total_duration: number | null;
  processing_time: number | null;
  sequence_group: string | null;
  sequence_order: number | null;
}

const formatFileSize = (bytes: number) => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' bytes';
};

const statusConfig: Record<string, { label: string; icon: typeof Loader2; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-slate-100 text-slate-700' },
  downloading: { label: 'Downloading', icon: Loader2, color: 'bg-blue-100 text-blue-700' },
  extracting: { label: 'Extracting', icon: Loader2, color: 'bg-blue-100 text-blue-700' },
  running: { label: 'Processing', icon: Loader2, color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700' },
  error: { label: 'Error', icon: XCircle, color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', icon: StopCircle, color: 'bg-gray-100 text-gray-700' },
};

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const PcapProcessing = () => {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<UploadSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionFiles, setSessionFiles] = useState<PcapFile[]>([]);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('create');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PcapFile | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [intervalBatch, setIntervalBatch] = useState('60');
  const [intervalMin, setIntervalMin] = useState('5');
  const [submitting, setSubmitting] = useState(false);
  
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchFiles, setBatchFiles] = useState<SortablePcapFile[]>([]);
  const [batchWebhookUrl, setBatchWebhookUrl] = useState('');
  const [batchIntervalBatch, setBatchIntervalBatch] = useState('60');
  const [batchIntervalMin, setBatchIntervalMin] = useState('5');
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  
  const [detailJob, setDetailJob] = useState<ProcessingJob | null>(null);

  const fetchSites = async () => {
    const { data } = await supabase.from('sites').select('id, name, unique_id').order('name');
    if (data) setSites(data);
  };

  const fetchSessions = async (siteId: string) => {
    const { data } = await supabase
      .from('upload_sessions')
      .select('id, site_id, name, created_at, total_files')
      .eq('site_id', siteId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    if (data) setSessions(data);
  };

  const fetchSessionFiles = async (sessionId: string) => {
    const { data } = await supabase
      .from('pcap_files')
      .select('id, session_id, original_filename, size_bytes, upload_status')
      .eq('session_id', sessionId)
      .eq('upload_status', 'completed')
      .order('original_filename');
    if (data) setSessionFiles(data);
  };

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from('processing_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setJobs(data as ProcessingJob[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSites(); fetchJobs(); }, [fetchJobs]);
  useEffect(() => { if (selectedSiteId) { fetchSessions(selectedSiteId); setSelectedSessionId(null); setSessionFiles([]); } }, [selectedSiteId]);
  useEffect(() => { if (selectedSessionId) fetchSessionFiles(selectedSessionId); }, [selectedSessionId]);

  useEffect(() => {
    const channel = supabase
      .channel('processing_jobs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'processing_jobs' }, (payload) => {
        if (payload.eventType === 'INSERT') setJobs(prev => [payload.new as ProcessingJob, ...prev]);
        else if (payload.eventType === 'UPDATE') {
          setJobs(prev => prev.map(job => job.id === payload.new.id ? payload.new as ProcessingJob : job));
          if (detailJob?.id === payload.new.id) setDetailJob(payload.new as ProcessingJob);
        } else if (payload.eventType === 'DELETE') setJobs(prev => prev.filter(job => job.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [detailJob?.id]);

  const handleOpenJobDialog = (file: PcapFile) => {
    setSelectedFile(file);
    setWebhookUrl(settings.n8n_webhook_url || '');
    setIntervalBatch(settings.mbsniffer_interval_batch?.toString() || '60');
    setIntervalMin(settings.mbsniffer_interval_min?.toString() || '5');
    setDialogOpen(true);
  };

  const handleOpenBatchDialog = () => {
    setBatchFiles(sessionFiles.map(f => ({ id: f.id, original_filename: f.original_filename, size_bytes: f.size_bytes })));
    setBatchWebhookUrl(settings.n8n_webhook_url || '');
    setBatchIntervalBatch(settings.mbsniffer_interval_batch?.toString() || '60');
    setBatchIntervalMin(settings.mbsniffer_interval_min?.toString() || '5');
    setBatchDialogOpen(true);
  };

  const handleSubmitJob = async () => {
    if (!selectedFile || !selectedSiteId || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from('processing_jobs').insert({
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
    });
    if (error) toast.error('Error creating job: ' + error.message);
    else { toast.success('Job created!'); setDialogOpen(false); setActiveTab('jobs'); }
    setSubmitting(false);
  };

  const handleSubmitBatchJobs = async () => {
    if (!selectedSiteId || !user || batchFiles.length === 0) return;
    setBatchSubmitting(true);
    const sequenceGroup = generateUUID();
    const jobsToInsert = batchFiles.map((file, index) => ({
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
      output_log: `[${new Date().toISOString().split('T')[1].split('.')[0]}] Job created (${index + 1}/${batchFiles.length}), waiting...`,
      sequence_group: sequenceGroup,
      sequence_order: index + 1,
    }));
    const { error } = await supabase.from('processing_jobs').insert(jobsToInsert);
    if (error) toast.error('Error creating batch jobs: ' + error.message);
    else { toast.success(`${batchFiles.length} jobs created!`); setBatchDialogOpen(false); setActiveTab('jobs'); }
    setBatchSubmitting(false);
  };

  const handleCancelJob = async (jobId: string) => {
    const { error } = await supabase.from('processing_jobs').update({ status: 'cancelled', current_step: 'cancelled', completed_at: new Date().toISOString() }).eq('id', jobId);
    if (error) toast.error('Error cancelling job'); else toast.success('Job cancelled');
  };

  const handleDeleteJob = async (jobId: string) => {
    const { error } = await supabase.from('processing_jobs').delete().eq('id', jobId);
    if (error) toast.error('Error deleting job'); else { toast.success('Job deleted'); if (detailJob?.id === jobId) setDetailJob(null); }
  };

  const formatSessionName = (session: UploadSession) => session.name || format(new Date(session.created_at), "MM/dd/yyyy 'at' HH:mm");

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1a2744]">PCAP Processing</h1>
          <p className="text-muted-foreground mt-1">Process PCAP files with mbsniffer</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="create"><Play className="h-4 w-4 mr-2" />Create Job</TabsTrigger>
            <TabsTrigger value="jobs"><Cpu className="h-4 w-4 mr-2" />Jobs ({jobs.filter(j => ['pending', 'downloading', 'extracting', 'running'].includes(j.status)).length} active)</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Select Files</CardTitle><CardDescription>Choose a site and session</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Site</Label>
                    <Select value={selectedSiteId || ''} onValueChange={setSelectedSiteId}>
                      <SelectTrigger><SelectValue placeholder="Select a site..." /></SelectTrigger>
                      <SelectContent>
                        {sites.map(site => (<SelectItem key={site.id} value={site.id}><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{site.name}</div></SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedSiteId && (
                    <div className="space-y-2">
                      <Label>Upload Session</Label>
                      <Select value={selectedSessionId || ''} onValueChange={setSelectedSessionId}>
                        <SelectTrigger><SelectValue placeholder="Select a session..." /></SelectTrigger>
                        <SelectContent>
                          {sessions.map(session => (<SelectItem key={session.id} value={session.id}><div className="flex flex-col"><span>{formatSessionName(session)}</span><span className="text-xs text-muted-foreground">{session.total_files} files</span></div></SelectItem>))}
                          {sessions.length === 0 && <div className="p-2 text-sm text-muted-foreground text-center">No completed sessions</div>}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div><CardTitle>Available Files</CardTitle><CardDescription>{sessionFiles.length} files ready</CardDescription></div>
                    {sessionFiles.length > 1 && <Button onClick={handleOpenBatchDialog} variant="outline" size="sm"><Layers className="h-4 w-4 mr-2" />Process All ({sessionFiles.length})</Button>}
                  </div>
                </CardHeader>
                <CardContent>
                  {sessionFiles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed"><FileArchive className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Select a session to see files</p></div>
                  ) : (
                    <ScrollArea className="h-80">
                      <div className="space-y-2">
                        {sessionFiles.map(file => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100">
                            <div className="flex items-center gap-3 min-w-0">
                              <FileArchive className="h-5 w-5 text-slate-400 flex-shrink-0" />
                              <div className="min-w-0"><div className="font-medium truncate">{file.original_filename}</div><div className="text-xs text-muted-foreground">{formatFileSize(file.size_bytes)}</div></div>
                            </div>
                            <Button size="sm" onClick={() => handleOpenJobDialog(file)}><Play className="h-4 w-4 mr-1" />Process</Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>Processing Jobs</CardTitle><CardDescription>Monitor and manage jobs</CardDescription></div>
                  <Button variant="outline" size="sm" onClick={fetchJobs}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed"><Cpu className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No jobs yet</p></div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {jobs.map(job => {
                        const status = statusConfig[job.status] || statusConfig.error;
                        const StatusIcon = status.icon;
                        const isActive = ['pending', 'downloading', 'extracting', 'running'].includes(job.status);
                        return (
                          <div key={job.id} className="p-4 border rounded-lg hover:bg-slate-50">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium truncate">{job.pcap_filename}</span>
                                  <Badge className={status.color}><StatusIcon className={`h-3 w-3 mr-1 ${isActive ? 'animate-spin' : ''}`} />{status.label}</Badge>
                                  {job.sequence_group && <Badge variant="outline" className="text-purple-600 border-purple-200"><GripVertical className="h-3 w-3 mr-1" />#{job.sequence_order}</Badge>}
                                </div>
                                {isActive && <JobStepsIndicator currentStep={job.current_step as 'pending' | 'downloading' | 'extracting' | 'analyzing' | 'processing' | 'completed' | 'error' | 'cancelled'} progress={job.progress} elapsedSeconds={job.elapsed_seconds || undefined} totalDuration={job.total_duration || undefined} pcapDuration={job.pcap_duration || undefined} className="mb-3" />}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>Created: {format(new Date(job.created_at), 'MM/dd HH:mm')}</span>
                                  {job.pcap_size_bytes && <span>{formatFileSize(job.pcap_size_bytes)}</span>}
                                  {job.processing_time && <span>Processed in {job.processing_time}s</span>}
                                </div>
                                {job.error_message && <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">{job.error_message}</div>}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button variant="ghost" size="sm" onClick={() => setDetailJob(job)} title="View details"><Eye className="h-4 w-4" /></Button>
                                {isActive && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-amber-500 hover:text-amber-700" title="Cancel"><StopCircle className="h-4 w-4" /></Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader><AlertDialogTitle>Cancel job?</AlertDialogTitle><AlertDialogDescription>This will stop processing.</AlertDialogDescription></AlertDialogHeader>
                                      <AlertDialogFooter><AlertDialogCancel>Keep Running</AlertDialogCancel><AlertDialogAction onClick={() => handleCancelJob(job.id)} className="bg-amber-600 hover:bg-amber-700">Cancel Job</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                                {!isActive && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" title="Delete"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader><AlertDialogTitle>Delete job?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the job.</AlertDialogDescription></AlertDialogHeader>
                                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteJob(job.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Process PCAP File</DialogTitle><DialogDescription>Configure parameters for {selectedFile?.original_filename}</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>n8n Webhook URL (optional)</Label><Input placeholder="https://n8n.example.com/webhook/..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Interval Batch (s)</Label><Input type="number" value={intervalBatch} onChange={(e) => setIntervalBatch(e.target.value)} min="1" /></div>
                <div className="space-y-2"><Label>Interval Min (s)</Label><Input type="number" value={intervalMin} onChange={(e) => setIntervalMin(e.target.value)} min="1" /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitJob} disabled={submitting}>{submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><Play className="h-4 w-4 mr-2" />Start Processing</>}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Process All Files</DialogTitle><DialogDescription>Create jobs for {batchFiles.length} files. Drag to reorder.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Processing Order</Label>
                <div className="border rounded-lg p-2 bg-slate-50 max-h-60 overflow-y-auto"><SortableFileList files={batchFiles} onReorder={setBatchFiles} /></div>
              </div>
              <div className="space-y-2"><Label>n8n Webhook URL (optional)</Label><Input placeholder="https://n8n.example.com/webhook/..." value={batchWebhookUrl} onChange={(e) => setBatchWebhookUrl(e.target.value)} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Interval Batch (s)</Label><Input type="number" value={batchIntervalBatch} onChange={(e) => setBatchIntervalBatch(e.target.value)} min="1" /></div>
                <div className="space-y-2"><Label>Interval Min (s)</Label><Input type="number" value={batchIntervalMin} onChange={(e) => setBatchIntervalMin(e.target.value)} min="1" /></div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2"><Layers className="h-4 w-4 text-purple-600 mt-0.5" /><div><div className="font-medium text-purple-900">Sequential Processing</div><div className="text-purple-700">Files will be processed one at a time in order.</div></div></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitBatchJobs} disabled={batchSubmitting}>{batchSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><Layers className="h-4 w-4 mr-2" />Create {batchFiles.length} Jobs</>}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!detailJob} onOpenChange={(open) => !open && setDetailJob(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader><DialogTitle>Job Details</DialogTitle><DialogDescription>{detailJob?.pcap_filename}</DialogDescription></DialogHeader>
            {detailJob && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><Badge className={statusConfig[detailJob.status]?.color}>{statusConfig[detailJob.status]?.label}</Badge></div></div>
                  <div><Label className="text-muted-foreground">Progress</Label><div className="mt-1 font-medium">{detailJob.progress}%</div></div>
                  {detailJob.pcap_duration && <div><Label className="text-muted-foreground">PCAP Duration</Label><div className="mt-1 font-medium">{Math.floor(detailJob.pcap_duration / 60)}m {Math.floor(detailJob.pcap_duration % 60)}s</div></div>}
                  {detailJob.pcap_packets && <div><Label className="text-muted-foreground">Packets</Label><div className="mt-1 font-medium">{detailJob.pcap_packets.toLocaleString()}</div></div>}
                  {detailJob.sequence_group && <div><Label className="text-muted-foreground">Sequence</Label><div className="mt-1 font-medium">#{detailJob.sequence_order} in batch</div></div>}
                </div>
                {detailJob.output_log && <div><Label className="text-muted-foreground">Output Log</Label><ScrollArea className="h-64 mt-2 border rounded-lg bg-slate-900 p-4"><pre className="text-xs text-slate-100 font-mono whitespace-pre-wrap">{detailJob.output_log}</pre></ScrollArea></div>}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default PcapProcessing;