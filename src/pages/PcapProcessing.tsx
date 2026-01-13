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
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Cpu, Play, Loader2, CheckCircle, XCircle, Clock, FileArchive, Building2, RefreshCw, Trash2, Eye, StopCircle, Layers, ChevronDown, ChevronRight, Terminal, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Site { id: string; name: string; unique_id: string | null; }
interface UploadSession { id: string; site_id: string; name: string | null; created_at: string; total_files: number; }
interface PcapFile { id: string; session_id: string; original_filename: string; size_bytes: number; upload_status: string; }
interface ProcessingJob {
  id: string; pcap_file_id: string; site_id: string; n8n_webhook_url: string | null;
  status: 'pending' | 'downloading' | 'extracting' | 'running' | 'completed' | 'error' | 'cancelled';
  current_step: string; progress: number; output_log: string | null; error_message: string | null;
  created_by: string | null; created_at: string; started_at: string | null; completed_at: string | null;
  pcap_filename: string; pcap_size_bytes: number | null; mbsniffer_interval_batch: number; mbsniffer_interval_min: number;
  pcap_duration: number | null; pcap_packets: number | null; pcap_start_time: string | null; pcap_end_time: string | null;
  elapsed_seconds: number | null; total_duration: number | null; processing_time: number | null;
  sequence_group: string | null; sequence_order: number | null;
}
interface JobGroup { id: string; isSequence: boolean; jobs: ProcessingJob[]; activeJob: ProcessingJob | null; pendingJobs: ProcessingJob[]; completedJobs: ProcessingJob[]; }

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

const generateUUID = (): string => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
const isActiveStatus = (status: string) => ['pending', 'downloading', 'extracting', 'running'].includes(status);
const isRunningStatus = (status: string) => ['downloading', 'extracting', 'running'].includes(status);

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
  const [activeTab, setActiveTab] = useState('jobs');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
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

  const groupJobs = useCallback((jobsList: ProcessingJob[]): JobGroup[] => {
    const groups = new Map<string, ProcessingJob[]>();
    const individualJobs: ProcessingJob[] = [];
    jobsList.forEach(job => {
      if (job.sequence_group) {
        const existing = groups.get(job.sequence_group) || [];
        existing.push(job);
        groups.set(job.sequence_group, existing);
      } else {
        individualJobs.push(job);
      }
    });
    const result: JobGroup[] = [];
    groups.forEach((groupJobs, groupId) => {
      groupJobs.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
      const activeJob = groupJobs.find(j => isRunningStatus(j.status)) || null;
      const pendingJobs = groupJobs.filter(j => j.status === 'pending');
      const completedJobs = groupJobs.filter(j => ['completed', 'error', 'cancelled'].includes(j.status));
      result.push({ id: groupId, isSequence: true, jobs: groupJobs, activeJob, pendingJobs, completedJobs });
    });
    individualJobs.forEach(job => {
      result.push({ id: job.id, isSequence: false, jobs: [job], activeJob: isRunningStatus(job.status) ? job : null, pendingJobs: job.status === 'pending' ? [job] : [], completedJobs: ['completed', 'error', 'cancelled'].includes(job.status) ? [job] : [] });
    });
    result.sort((a, b) => {
      if (a.activeJob && !b.activeJob) return -1;
      if (!a.activeJob && b.activeJob) return 1;
      if (a.pendingJobs.length > 0 && b.pendingJobs.length === 0) return -1;
      if (a.pendingJobs.length === 0 && b.pendingJobs.length > 0) return 1;
      return Math.max(...b.jobs.map(j => new Date(j.created_at).getTime())) - Math.max(...a.jobs.map(j => new Date(j.created_at).getTime()));
    });
    return result;
  }, []);

  const jobGroups = groupJobs(jobs);

  const fetchSites = async () => { const { data } = await supabase.from('sites').select('id, name, unique_id').order('name'); if (data) setSites(data); };
  const fetchSessions = async (siteId: string) => { const { data } = await supabase.from('upload_sessions').select('id, site_id, name, created_at, total_files').eq('site_id', siteId).eq('status', 'completed').order('created_at', { ascending: false }); if (data) setSessions(data); };
  const fetchSessionFiles = async (sessionId: string) => { const { data } = await supabase.from('pcap_files').select('id, session_id, original_filename, size_bytes, upload_status').eq('session_id', sessionId).eq('upload_status', 'completed').order('original_filename'); if (data) setSessionFiles(data); };
  const fetchJobs = useCallback(async () => { const { data } = await supabase.from('processing_jobs').select('*').order('created_at', { ascending: false }).limit(100); if (data) setJobs(data as ProcessingJob[]); setLoading(false); }, []);

  useEffect(() => { fetchSites(); fetchJobs(); }, [fetchJobs]);
  useEffect(() => { if (selectedSiteId) { fetchSessions(selectedSiteId); setSelectedSessionId(null); setSessionFiles([]); } }, [selectedSiteId]);
  useEffect(() => { if (selectedSessionId) fetchSessionFiles(selectedSessionId); }, [selectedSessionId]);

  useEffect(() => {
    const channel = supabase.channel('processing_jobs_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'processing_jobs' }, (payload) => {
      if (payload.eventType === 'INSERT') setJobs(prev => [payload.new as ProcessingJob, ...prev]);
      else if (payload.eventType === 'UPDATE') { setJobs(prev => prev.map(job => job.id === payload.new.id ? payload.new as ProcessingJob : job)); if (detailJob?.id === payload.new.id) setDetailJob(payload.new as ProcessingJob); }
      else if (payload.eventType === 'DELETE') setJobs(prev => prev.filter(job => job.id !== payload.old.id));
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [detailJob?.id]);

  const handleOpenJobDialog = (file: PcapFile) => { setSelectedFile(file); setWebhookUrl(settings.n8n_webhook_url || ''); setIntervalBatch(settings.mbsniffer_interval_batch?.toString() || '60'); setIntervalMin(settings.mbsniffer_interval_min?.toString() || '5'); setDialogOpen(true); };
  const handleOpenBatchDialog = () => { setBatchFiles(sessionFiles.map(f => ({ id: f.id, original_filename: f.original_filename, size_bytes: f.size_bytes }))); setBatchWebhookUrl(settings.n8n_webhook_url || ''); setBatchIntervalBatch(settings.mbsniffer_interval_batch?.toString() || '60'); setBatchIntervalMin(settings.mbsniffer_interval_min?.toString() || '5'); setBatchDialogOpen(true); };

  const handleSubmitJob = async () => {
    if (!selectedFile || !selectedSiteId || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from('processing_jobs').insert({ pcap_file_id: selectedFile.id, site_id: selectedSiteId, n8n_webhook_url: webhookUrl || null, status: 'pending', current_step: 'pending', progress: 0, created_by: user.id, pcap_filename: selectedFile.original_filename, pcap_size_bytes: selectedFile.size_bytes, mbsniffer_interval_batch: parseInt(intervalBatch) || 60, mbsniffer_interval_min: parseInt(intervalMin) || 5, output_log: `[${new Date().toISOString().split('T')[1].split('.')[0]}] Job created, waiting for agent...` });
    if (error) toast.error('Error: ' + error.message); else { toast.success('Job created!'); setDialogOpen(false); setActiveTab('jobs'); }
    setSubmitting(false);
  };

  const handleSubmitBatchJobs = async () => {
    if (!selectedSiteId || !user || batchFiles.length === 0) return;
    setBatchSubmitting(true);
    const sequenceGroup = generateUUID();
    const jobsToInsert = batchFiles.map((file, index) => ({ pcap_file_id: file.id, site_id: selectedSiteId, n8n_webhook_url: batchWebhookUrl || null, status: 'pending', current_step: 'pending', progress: 0, created_by: user.id, pcap_filename: file.original_filename, pcap_size_bytes: file.size_bytes, mbsniffer_interval_batch: parseInt(batchIntervalBatch) || 60, mbsniffer_interval_min: parseInt(batchIntervalMin) || 5, output_log: `[${new Date().toISOString().split('T')[1].split('.')[0]}] Job ${index + 1}/${batchFiles.length}`, sequence_group: sequenceGroup, sequence_order: index + 1 }));
    const { error } = await supabase.from('processing_jobs').insert(jobsToInsert);
    if (error) toast.error('Error: ' + error.message); else { toast.success(`${batchFiles.length} jobs created!`); setBatchDialogOpen(false); setActiveTab('jobs'); }
    setBatchSubmitting(false);
  };

  const handleCancelJob = async (jobId: string) => { await supabase.from('processing_jobs').update({ status: 'cancelled', current_step: 'cancelled', completed_at: new Date().toISOString() }).eq('id', jobId); toast.success('Job cancelled'); };
  const handleDeleteJob = async (jobId: string) => { await supabase.from('processing_jobs').delete().eq('id', jobId); toast.success('Job deleted'); if (detailJob?.id === jobId) setDetailJob(null); };
  const handleCancelSequence = async (groupId: string) => { const group = jobGroups.find(g => g.id === groupId); if (!group) return; const ids = [...group.pendingJobs.map(j => j.id), ...(group.activeJob ? [group.activeJob.id] : [])]; await supabase.from('processing_jobs').update({ status: 'cancelled', current_step: 'cancelled', completed_at: new Date().toISOString() }).in('id', ids); toast.success(`${ids.length} jobs cancelled`); };
  const toggleGroupExpanded = (groupId: string) => { setExpandedGroups(prev => { const s = new Set(prev); if (s.has(groupId)) s.delete(groupId); else s.add(groupId); return s; }); };
  const formatSessionName = (session: UploadSession) => session.name || format(new Date(session.created_at), "MM/dd/yyyy 'at' HH:mm");

  // Render individual job row - always white background with shadow for contrast
  const renderJobRow = (job: ProcessingJob, showSeq = false) => {
    const status = statusConfig[job.status] || statusConfig.error;
    const StatusIcon = status.icon;
    const isActive = isActiveStatus(job.status);
    const isRunning = isRunningStatus(job.status);
    return (
      <div key={job.id} className="p-3 rounded-lg border bg-white shadow-sm border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <FileArchive className={cn("h-4 w-4", isRunning ? "text-amber-600" : "text-slate-400")} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn("font-medium truncate text-sm", isRunning && "text-amber-900")}>{job.pcap_filename}</span>
                {showSeq && job.sequence_order && <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">#{job.sequence_order}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">{job.pcap_size_bytes && formatFileSize(job.pcap_size_bytes)} • {format(new Date(job.created_at), 'MM/dd HH:mm')}</div>
            </div>
          </div>
          {isRunning && (
            <div className="flex items-center gap-2 w-32">
              <Progress value={job.progress} className="h-2 flex-1" />
              <span className="text-xs font-medium text-amber-700 w-8 text-right">{job.progress}%</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Badge className={cn(status.color, "text-xs")}>
              <StatusIcon className={cn("h-3 w-3 mr-1", isActive && "animate-spin")} />
              {status.label}
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetailJob(job)}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            {isActive && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-amber-500"><StopCircle className="h-3.5 w-3.5" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Cancel?</AlertDialogTitle></AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleCancelJob(job.id)} className="bg-amber-600">Yes</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {!isActive && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle></AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteJob(job.id)} className="bg-red-600">Yes</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        {isRunning && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <JobStepsIndicator 
              currentStep={job.current_step as 'pending' | 'downloading' | 'extracting' | 'analyzing' | 'processing' | 'completed' | 'error' | 'cancelled'} 
              progress={job.progress} 
              elapsedSeconds={job.elapsed_seconds || undefined} 
              totalDuration={job.total_duration || undefined} 
              pcapDuration={job.pcap_duration || undefined} 
            />
          </div>
        )}
        {job.error_message && <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded">{job.error_message}</div>}
      </div>
    );
  };

  const renderJobGroup = (group: JobGroup) => {
    if (!group.isSequence) return renderJobRow(group.jobs[0]);
    const isExpanded = expandedGroups.has(group.id);
    const total = group.jobs.length;
    const completed = group.completedJobs.length;
    const pending = group.pendingJobs.length;
    const hasActive = !!group.activeJob;
    const allDone = completed === total;
    const hasErr = group.jobs.some(j => j.status === 'error');
    
    return (
      <div key={group.id} className={cn(
        "border rounded-lg overflow-hidden",
        hasActive && "border-amber-300 shadow-md",
        !hasActive && pending > 0 && "border-blue-200",
        allDone && !hasErr && "border-emerald-200",
        hasErr && "border-red-200"
      )}>
        {/* Group header */}
        <div 
          className={cn(
            "p-3 cursor-pointer",
            hasActive && "bg-amber-100 hover:bg-amber-150",
            !hasActive && pending > 0 && "bg-blue-100 hover:bg-blue-150",
            allDone && !hasErr && "bg-emerald-100 hover:bg-emerald-150",
            hasErr && "bg-red-100 hover:bg-red-150"
          )} 
          onClick={() => toggleGroupExpanded(group.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <Layers className={cn("h-5 w-5", hasActive ? "text-amber-600" : "text-purple-600")} />
              <div>
                <div className="font-medium text-sm flex items-center gap-2">
                  Batch
                  <Badge variant="outline" className="text-xs">{total} files</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {completed} done • {pending} pending{hasActive && " • 1 running"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-24">
                <Progress value={(completed / total) * 100} className={cn("h-2", hasErr && "[&>div]:bg-red-500")} />
                <span className="text-xs text-muted-foreground w-12 text-right">{completed}/{total}</span>
              </div>
              {(hasActive || pending > 0) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-amber-500" onClick={e => e.stopPropagation()}>
                      <StopCircle className="h-4 w-4 mr-1" />Cancel All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Cancel all?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>No</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleCancelSequence(group.id)} className="bg-amber-600">Yes</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
        
        {/* Active job - shown outside collapsible */}
        {group.activeJob && (
          <div className="px-3 pb-3 pt-2 bg-amber-50">
            <div className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />Running
            </div>
            {renderJobRow(group.activeJob, true)}
          </div>
        )}
        
        {/* Collapsible content for queue and completed */}
        <Collapsible open={isExpanded}>
          <CollapsibleContent>
            <div className="px-3 pb-3 space-y-3 bg-slate-100">
              {group.pendingJobs.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />Queue ({group.pendingJobs.length})
                  </div>
                  <div className="space-y-2">
                    {group.pendingJobs.map(j => renderJobRow(j, true))}
                  </div>
                </div>
              )}
              {group.completedJobs.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-medium text-emerald-700 mb-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />Done ({group.completedJobs.length})
                  </div>
                  <div className="space-y-2">
                    {group.completedJobs.map(j => renderJobRow(j, true))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  const steps = [
    { n: 1, t: 'Select a PCAP file', d: 'Choose from uploaded files' },
    { n: 2, t: 'Configure parameters', d: 'Set webhook URL and options' },
    { n: 3, t: 'Agent processes', d: 'Downloads, extracts, runs mbsniffer' },
    { n: 4, t: 'Results sent', d: 'Data sent to n8n workflow' }
  ];

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1a2744]">PCAP Processing</h1>
          <p className="text-muted-foreground mt-1">Process PCAP files with mbsniffer</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="jobs"><Cpu className="h-4 w-4 mr-2" />Jobs ({jobs.filter(j => isActiveStatus(j.status)).length} active)</TabsTrigger>
            <TabsTrigger value="create"><Play className="h-4 w-4 mr-2" />New Job</TabsTrigger>
          </TabsList>
          
          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Processing Jobs</CardTitle>
                    <CardDescription>Monitor jobs</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchJobs}>
                    <RefreshCw className="h-4 w-4 mr-2" />Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : jobGroups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    <Cpu className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No jobs</p>
                    <Button variant="outline" className="mt-4" onClick={() => setActiveTab('create')}>
                      <Play className="h-4 w-4 mr-2" />New Job
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {jobGroups.map(g => renderJobGroup(g))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="create">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileArchive className="h-5 w-5" />Select PCAP File</CardTitle>
                  <CardDescription>Choose site and session</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Site</Label>
                    <Select value={selectedSiteId || ''} onValueChange={setSelectedSiteId}>
                      <SelectTrigger><SelectValue placeholder="Select site..." /></SelectTrigger>
                      <SelectContent>
                        {sites.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{s.name}</div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedSiteId && (
                    <div className="space-y-2">
                      <Label>Session</Label>
                      <Select value={selectedSessionId || ''} onValueChange={setSelectedSessionId}>
                        <SelectTrigger><SelectValue placeholder="Select session..." /></SelectTrigger>
                        <SelectContent>
                          {sessions.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex flex-col">
                                <span>{formatSessionName(s)}</span>
                                <span className="text-xs text-muted-foreground">{s.total_files} files</span>
                              </div>
                            </SelectItem>
                          ))}
                          {sessions.length === 0 && <div className="p-2 text-sm text-muted-foreground text-center">No sessions</div>}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {selectedSessionId && (
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <Label>Files</Label>
                        {sessionFiles.length > 1 && (
                          <Button onClick={handleOpenBatchDialog} variant="outline" size="sm">
                            <Layers className="h-4 w-4 mr-2" />All ({sessionFiles.length})
                          </Button>
                        )}
                      </div>
                      {sessionFiles.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">No files</div>
                      ) : (
                        <ScrollArea className="h-64">
                          <div className="space-y-2">
                            {sessionFiles.map(f => (
                              <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100">
                                <div className="flex items-center gap-3 min-w-0">
                                  <FileArchive className="h-5 w-5 text-[#2563EB]" />
                                  <div className="min-w-0">
                                    <div className="font-medium truncate text-sm">{f.original_filename}</div>
                                    <div className="text-xs text-muted-foreground">{formatFileSize(f.size_bytes)}</div>
                                  </div>
                                </div>
                                <Button size="sm" onClick={() => handleOpenJobDialog(f)} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                                  <Play className="h-4 w-4 mr-1" />Process
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5" />How it Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {steps.map(s => (
                    <div key={s.n} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-sm font-medium">{s.n}</div>
                      <div>
                        <div className="font-medium text-sm">{s.t}</div>
                        <div className="text-xs text-muted-foreground">{s.d}</div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <span className="font-medium">Note:</span> Agent must be running on EC2. Max 3 concurrent jobs.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Single file dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process File</DialogTitle>
              <DialogDescription>{selectedFile?.original_filename}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input placeholder="https://..." value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Interval Batch (s)</Label>
                  <Input type="number" value={intervalBatch} onChange={e => setIntervalBatch(e.target.value)} min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Interval Min (s)</Label>
                  <Input type="number" value={intervalMin} onChange={e => setIntervalMin(e.target.value)} min="1" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitJob} disabled={submitting} className="bg-[#2563EB]">
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}Start
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Batch dialog */}
        <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Process All</DialogTitle>
              <DialogDescription>{batchFiles.length} files. Drag to reorder.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Order</Label>
                <div className="border rounded-lg p-2 bg-slate-50 max-h-60 overflow-y-auto">
                  <SortableFileList files={batchFiles} onReorder={setBatchFiles} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input placeholder="https://..." value={batchWebhookUrl} onChange={e => setBatchWebhookUrl(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Interval Batch (s)</Label>
                  <Input type="number" value={batchIntervalBatch} onChange={e => setBatchIntervalBatch(e.target.value)} min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Interval Min (s)</Label>
                  <Input type="number" value={batchIntervalMin} onChange={e => setBatchIntervalMin(e.target.value)} min="1" />
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2">
                  <Layers className="h-4 w-4 text-purple-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-purple-900">Sequential</div>
                    <div className="text-purple-700">One at a time.</div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitBatchJobs} disabled={batchSubmitting} className="bg-[#2563EB]">
                {batchSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Layers className="h-4 w-4 mr-2" />}
                Create {batchFiles.length}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Detail dialog */}
        <Dialog open={!!detailJob} onOpenChange={o => !o && setDetailJob(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Details</DialogTitle>
              <DialogDescription>{detailJob?.pcap_filename}</DialogDescription>
            </DialogHeader>
            {detailJob && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1"><Badge className={statusConfig[detailJob.status]?.color}>{statusConfig[detailJob.status]?.label}</Badge></div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Progress</Label>
                    <div className="mt-1 font-medium">{detailJob.progress}%</div>
                  </div>
                  {detailJob.pcap_duration && (
                    <div>
                      <Label className="text-muted-foreground">Duration</Label>
                      <div className="mt-1 font-medium">{Math.floor(detailJob.pcap_duration / 60)}m {Math.floor(detailJob.pcap_duration % 60)}s</div>
                    </div>
                  )}
                  {detailJob.pcap_packets && (
                    <div>
                      <Label className="text-muted-foreground">Packets</Label>
                      <div className="mt-1 font-medium">{detailJob.pcap_packets.toLocaleString()}</div>
                    </div>
                  )}
                  {detailJob.sequence_group && (
                    <div>
                      <Label className="text-muted-foreground">Sequence</Label>
                      <div className="mt-1 font-medium">#{detailJob.sequence_order}</div>
                    </div>
                  )}
                </div>
                {detailJob.output_log && (
                  <div>
                    <Label className="text-muted-foreground">Log</Label>
                    <ScrollArea className="h-64 mt-2 border rounded-lg bg-slate-900 p-4">
                      <pre className="text-xs text-slate-100 font-mono whitespace-pre-wrap">{detailJob.output_log}</pre>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default PcapProcessing;