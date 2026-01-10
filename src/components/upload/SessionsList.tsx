import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UploadSession, PcapFile } from '@/types/upload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileArchive, Calendar, HardDrive, CheckCircle, Clock, AlertCircle, Loader2, Trash2, Download, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const SUPABASE_PROJECT_ID = 'jgclhfwigmxmqyhqngcm';

interface SessionsListProps {
  siteId: string;
  refreshTrigger?: number;
  onSessionsChange?: () => void;
}

const formatFileSize = (bytes: number) => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' bytes';
};

const statusConfig: Record<string, { label: string; icon: typeof Loader2; color: string }> = {
  in_progress: { label: 'In progress', icon: Loader2, color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700' },
  processing: { label: 'Processing', icon: Clock, color: 'bg-amber-100 text-amber-700' },
  error: { label: 'Error', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
};

export const SessionsList = ({ siteId, refreshTrigger, onSessionsChange }: SessionsListProps) => {
  const [sessions, setSessions] = useState<UploadSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionFiles, setSessionFiles] = useState<Record<string, PcapFile[]>>({});
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  
  // Edit session state
  const [editingSession, setEditingSession] = useState<UploadSession | null>(null);
  const [editSessionName, setEditSessionName] = useState('');
  const [editSessionDescription, setEditSessionDescription] = useState('');
  const [savingSession, setSavingSession] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (siteId) {
      fetchSessions();
    }
  }, [siteId, refreshTrigger]);

  const loadSessionFiles = async (sessionId: string) => {
    if (sessionFiles[sessionId]) return;
    
    const { data, error } = await supabase
      .from('pcap_files')
      .select('*')
      .eq('session_id', sessionId)
      .order('original_filename');
    
    if (!error && data) {
      setSessionFiles(prev => ({ ...prev, [sessionId]: data }));
    }
  };

  const handleAccordionChange = (value: string) => {
    setExpandedSession(value);
    if (value) {
      loadSessionFiles(value);
    }
  };

  const deleteFileFromS3 = async (file: PcapFile, showToast: boolean = true): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (showToast) toast.error('Not authenticated');
        return false;
      }

      const response = await fetch(
        `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/s3-delete-file`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            s3Key: file.s3_key,
            bucket: file.s3_bucket,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('S3 delete error:', errorData);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting from S3:', error);
      return false;
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setDeletingSession(sessionId);
    
    try {
      // First, fetch all files for this session directly from the database
      const { data: files, error: filesQueryError } = await supabase
        .from('pcap_files')
        .select('*')
        .eq('session_id', sessionId);

      if (filesQueryError) {
        console.error('Error fetching session files:', filesQueryError);
        toast.error('Error fetching session files');
        setDeletingSession(null);
        return;
      }

      // Delete all files from S3
      if (files && files.length > 0) {
        for (const file of files) {
          if (file.upload_status === 'completed') {
            await deleteFileFromS3(file, false);
          }
        }
      }

      // Delete all file records from database
      const { error: filesDeleteError } = await supabase
        .from('pcap_files')
        .delete()
        .eq('session_id', sessionId);

      if (filesDeleteError) {
        console.error('Error deleting file records:', filesDeleteError);
        toast.error('Error deleting session files');
        setDeletingSession(null);
        return;
      }

      // Delete the session
      const { error: sessionError } = await supabase
        .from('upload_sessions')
        .delete()
        .eq('id', sessionId);

      if (sessionError) {
        console.error('Error deleting session:', sessionError);
        toast.error('Error deleting session: ' + sessionError.message);
        setDeletingSession(null);
        return;
      }

      toast.success('Session deleted successfully');
      
      // Update local state
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setSessionFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[sessionId];
        return newFiles;
      });
      
      // Notify parent to refresh session selector
      onSessionsChange?.();
      
    } catch (error) {
      console.error('Error in handleDeleteSession:', error);
      toast.error('Error deleting session');
    }
    
    setDeletingSession(null);
  };

  const handleDeleteFile = async (file: PcapFile, sessionId: string) => {
    setDeletingFile(file.id);

    // Delete from S3
    const s3Deleted = await deleteFileFromS3(file);
    
    if (!s3Deleted) {
      toast.error('Error deleting file from S3');
      setDeletingFile(null);
      return;
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('pcap_files')
      .delete()
      .eq('id', file.id);

    if (dbError) {
      toast.error('Error deleting file record');
      setDeletingFile(null);
      return;
    }

    // Update session statistics
    const remainingFiles = (sessionFiles[sessionId] || []).filter(f => f.id !== file.id);
    const totalSize = remainingFiles.reduce((sum, f) => sum + (f.size_bytes || 0), 0);

    await supabase
      .from('upload_sessions')
      .update({
        total_files: remainingFiles.length,
        total_size_bytes: totalSize,
      })
      .eq('id', sessionId);

    // Update local state
    setSessionFiles(prev => ({
      ...prev,
      [sessionId]: remainingFiles,
    }));

    // Update session in list
    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { ...s, total_files: remainingFiles.length, total_size_bytes: totalSize }
        : s
    ));

    toast.success('File deleted successfully');
    setDeletingFile(null);
  };

  const handleDownloadFile = async (file: PcapFile) => {
    setDownloadingFile(file.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        setDownloadingFile(null);
        return;
      }

      const response = await fetch(
        `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/s3-download-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            s3Key: file.s3_key,
            bucket: file.s3_bucket,
            originalFilename: file.original_filename,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        toast.error('Error generating download URL: ' + (errorData.error || 'Unknown error'));
        setDownloadingFile(null);
        return;
      }

      const { downloadUrl } = await response.json();
      
      // Open download in new tab
      window.open(downloadUrl, '_blank');
      
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Error downloading file');
    }

    setDownloadingFile(null);
  };

  const handleEditSession = (session: UploadSession) => {
    setEditingSession(session);
    setEditSessionName(session.name || '');
    setEditSessionDescription(session.description || '');
  };

  const handleSaveSession = async () => {
    if (!editingSession) return;
    
    setSavingSession(true);
    
    const { error } = await supabase
      .from('upload_sessions')
      .update({
        name: editSessionName || null,
        description: editSessionDescription || null,
      })
      .eq('id', editingSession.id);

    if (error) {
      toast.error('Error updating session: ' + error.message);
      setSavingSession(false);
      return;
    }

    // Update local state
    setSessions(prev => prev.map(s => 
      s.id === editingSession.id 
        ? { ...s, name: editSessionName || null, description: editSessionDescription || null }
        : s
    ));

    toast.success('Session updated successfully');
    setEditingSession(null);
    setSavingSession(false);
    
    // Notify parent to refresh session selector
    onSessionsChange?.();
  };

  const formatSessionName = (session: UploadSession) => {
    if (session.name) {
      return session.name;
    }
    return format(new Date(session.created_at), "MM/dd/yyyy 'at' HH:mm");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
        <FileArchive className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No uploads yet for this site.</p>
      </div>
    );
  }

  return (
    <>
      <Accordion 
        type="single" 
        collapsible 
        value={expandedSession || undefined} 
        onValueChange={handleAccordionChange}
      >
        {sessions.map((session) => {
          const status = statusConfig[session.status] || statusConfig.error;
          const StatusIcon = status.icon;
          const files = sessionFiles[session.id] || [];
          const isDeleting = deletingSession === session.id;
          
          return (
            <AccordionItem key={session.id} value={session.id} className="border rounded-lg mb-2">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="text-left">
                    <div className="font-medium">
                      {formatSessionName(session)}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(session.created_at), 'MM/dd/yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileArchive className="h-3 w-3" />
                        {session.total_files} file{session.total_files !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatFileSize(session.total_size_bytes || 0)}
                      </span>
                    </div>
                  </div>
                  <Badge className={status.color}>
                    <StatusIcon className={`h-3 w-3 mr-1 ${session.status === 'in_progress' ? 'animate-spin' : ''}`} />
                    {status.label}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {session.description && (
                  <p className="text-sm text-muted-foreground mb-4 italic">
                    {session.description}
                  </p>
                )}
                
                {files.length === 0 && !sessionFiles[session.id] ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading files...
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No files in this session
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div 
                        key={file.id} 
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm truncate" title={file.original_filename}>
                            {file.original_filename}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{formatFileSize(file.size_bytes)}</span>
                            <Badge 
                              variant="secondary"
                              className={
                                file.upload_status === 'completed' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : file.upload_status === 'uploading'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-red-100 text-red-700'
                              }
                            >
                              {file.upload_status === 'completed' ? 'Completed' : 
                               file.upload_status === 'uploading' ? 'Uploading' : 'Error'}
                            </Badge>
                            {file.completed_at && (
                              <span>{format(new Date(file.completed_at), 'MM/dd/yyyy HH:mm')}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {file.upload_status === 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadFile(file)}
                              disabled={downloadingFile === file.id}
                              className="h-8 w-8 p-0"
                              title="Download file"
                            >
                              {downloadingFile === file.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingFile === file.id}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Delete file"
                              >
                                {deletingFile === file.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete file?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{file.original_filename}" from S3 storage and the database. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteFile(file, session.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Session actions */}
                <div className="mt-4 pt-4 border-t flex justify-between">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditSession(session)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Session
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={isDeleting}>
                        {isDeleting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Session
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete session?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this upload session, all file records, AND all files from S3 storage. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteSession(session.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Edit Session Dialog */}
      <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
            <DialogDescription>
              Update the session name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-session-name" className="text-sm font-medium">
                Session Name
              </label>
              <Input
                id="edit-session-name"
                placeholder="E.g.: January 2025 Capture"
                value={editSessionName}
                onChange={(e) => setEditSessionName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If left empty, the date and time will be displayed
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-session-description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Input
                id="edit-session-description"
                placeholder="Notes about this capture..."
                value={editSessionDescription}
                onChange={(e) => setEditSessionDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSession(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSession} disabled={savingSession}>
              {savingSession ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};