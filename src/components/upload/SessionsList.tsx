import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UploadSession, PcapFile } from '@/types/upload';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileArchive, Calendar, User, HardDrive, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const statusConfig = {
  in_progress: { label: 'Em andamento', icon: Loader2, color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Concluído', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700' },
  processing: { label: 'Processando', icon: Clock, color: 'bg-amber-100 text-amber-700' },
  error: { label: 'Erro', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
};

export const SessionsList = ({ customerId, refreshTrigger }: SessionsListProps) => {
  const [sessions, setSessions] = useState<UploadSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionFiles, setSessionFiles] = useState<Record<string, PcapFile[]>>({});

  useEffect(() => {
    if (customerId) {
      supabase.from('upload_sessions').select('*, profiles:uploaded_by (full_name, email)').eq('customer_id', customerId).order('created_at', { ascending: false })
        .then(({ data }) => { setSessions(data || []); setLoading(false); });
    }
  }, [customerId, refreshTrigger]);

  const loadSessionFiles = async (sessionId: string) => {
    if (sessionFiles[sessionId]) return;
    const { data } = await supabase.from('pcap_files').select('*').eq('session_id', sessionId).order('original_filename');
    if (data) setSessionFiles(prev => ({ ...prev, [sessionId]: data }));
  };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (sessions.length === 0) return <div className="text-center py-8 text-muted-foreground border rounded-lg"><FileArchive className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Nenhum upload realizado.</p></div>;

  return (
    <Accordion type="single" collapsible value={expandedSession || undefined} onValueChange={(v) => { setExpandedSession(v); if (v) loadSessionFiles(v); }}>
      {sessions.map((session) => {
        const status = statusConfig[session.status];
        const StatusIcon = status.icon;
        const files = sessionFiles[session.id] || [];
        const uploaderName = (session as any).profiles?.full_name || 'Usuário';
        return (
          <AccordionItem key={session.id} value={session.id} className="border rounded-lg mb-2">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="text-left">
                  <div className="font-medium">{session.name || `Upload de ${formatDistanceToNow(new Date(session.created_at), { addSuffix: true, locale: ptBR })}`}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(session.created_at).toLocaleDateString('pt-BR')}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{uploaderName}</span>
                    <span className="flex items-center gap-1"><FileArchive className="h-3 w-3" />{session.total_files} arquivos</span>
                    <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{formatFileSize(session.total_size_bytes)}</span>
                  </div>
                </div>
                <Badge className={status.color}><StatusIcon className={`h-3 w-3 mr-1 ${session.status === 'in_progress' ? 'animate-spin' : ''}`} />{status.label}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {files.length === 0 ? <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando...</div> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Arquivo</TableHead><TableHead>Tamanho</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-mono text-sm">{file.original_filename}</TableCell>
                        <TableCell>{formatFileSize(file.size_bytes)}</TableCell>
                        <TableCell><Badge className={file.upload_status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>{file.upload_status === 'completed' ? 'Concluído' : 'Erro'}</Badge></TableCell>
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