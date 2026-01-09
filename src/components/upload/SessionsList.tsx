import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UploadSession, PcapFile } from '@/types/upload';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileArchive, Calendar, HardDrive, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface SessionsListProps {
  customerId: string;
  refreshTrigger?: number;
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

interface SessionWithProfile extends UploadSession {
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export const SessionsList = ({ customerId, refreshTrigger }: SessionsListProps) => {
  const [sessions, setSessions] = useState<SessionWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionFiles, setSessionFiles] = useState<Record<string, PcapFile[]>>({});

  const fetchSessions = async () => {
    setLoading(true);
    console.log('Fetching sessions for customer:', customerId);
    
    const { data, error } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
    } else {
      console.log('Sessions fetched:', data);
      setSessions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (customerId) {
      fetchSessions();
    }
  }, [customerId, refreshTrigger]);

  const loadSessionFiles = async (sessionId: string) => {
    if (sessionFiles[sessionId]) return;
    
    console.log('Loading files for session:', sessionId);
    const { data, error } = await supabase
      .from('pcap_files')
      .select('*')
      .eq('session_id', sessionId)
      .order('original_filename');
    
    if (error) {
      console.error('Error loading session files:', error);
    } else {
      console.log('Files loaded:', data);
      if (data) setSessionFiles(prev => ({ ...prev, [sessionId]: data }));
    }
  };

  const handleAccordionChange = (value: string) => {
    setExpandedSession(value);
    if (value) {
      loadSessionFiles(value);
    }
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
        <p>No uploads yet for this customer.</p>
      </div>
    );
  }

  return (
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
        
        return (
          <AccordionItem key={session.id} value={session.id} className="border rounded-lg mb-2">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="text-left">
                  <div className="font-medium">
                    {session.name || `Upload from ${formatDistanceToNow(new Date(session.created_at), { addSuffix: true, locale: enUS })}`}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(session.created_at).toLocaleDateString('en-US')}
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
              
              {files.length === 0 ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading files...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-mono text-sm max-w-xs truncate">
                          {file.original_filename}
                        </TableCell>
                        <TableCell>{formatFileSize(file.size_bytes)}</TableCell>
                        <TableCell>
                          <Badge 
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
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {file.completed_at 
                            ? new Date(file.completed_at).toLocaleString('en-US')
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};