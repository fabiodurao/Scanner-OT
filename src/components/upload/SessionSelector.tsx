import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UploadSession } from '@/types/upload';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FolderPlus, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface SessionSelectorProps {
  siteId: string;
  selectedSessionId: string | null;
  onSelectSession: (session: UploadSession | null) => void;
  newSessionName: string;
  onNewSessionNameChange: (name: string) => void;
  newSessionDescription: string;
  onNewSessionDescriptionChange: (description: string) => void;
  mode: 'new' | 'existing';
  onModeChange: (mode: 'new' | 'existing') => void;
  refreshTrigger?: number;
}

export const SessionSelector = ({
  siteId,
  selectedSessionId,
  onSelectSession,
  newSessionName,
  onNewSessionNameChange,
  newSessionDescription,
  onNewSessionDescriptionChange,
  mode,
  onModeChange,
  refreshTrigger,
}: SessionSelectorProps) => {
  const [sessions, setSessions] = useState<UploadSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSessions(data);
      
      // If selected session was deleted, clear selection
      if (selectedSessionId && !data.find(s => s.id === selectedSessionId)) {
        onSelectSession(null);
        if (mode === 'existing') {
          onModeChange('new');
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (siteId) {
      fetchSessions();
    }
  }, [siteId, refreshTrigger]);

  const formatSessionName = (session: UploadSession) => {
    if (session.name) {
      return session.name;
    }
    return format(new Date(session.created_at), "MM/dd/yyyy 'at' HH:mm");
  };

  const handleModeChange = (value: string) => {
    if (value === 'new') {
      onModeChange('new');
      onSelectSession(null);
    } else {
      onModeChange('existing');
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    onSelectSession(session || null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading sessions...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Upload Destination</Label>
        <Select value={mode} onValueChange={handleModeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-[#2563EB]" />
                Create new session
              </div>
            </SelectItem>
            {sessions.length > 0 && (
              <SelectItem value="existing">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Add to existing session
                </div>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {mode === 'new' && (
        <div className="space-y-4 pl-4 border-l-2 border-[#2563EB]/20">
          <div className="space-y-2">
            <Label htmlFor="session-name">Session Name (optional)</Label>
            <Input
              id="session-name"
              placeholder="E.g.: January 2025 Capture"
              value={newSessionName}
              onChange={(e) => onNewSessionNameChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              If left empty, the date and time will be used
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="session-description">Description (optional)</Label>
            <Textarea
              id="session-description"
              placeholder="Notes about this capture..."
              value={newSessionDescription}
              onChange={(e) => onNewSessionDescriptionChange(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      )}

      {mode === 'existing' && (
        <div className="space-y-2 pl-4 border-l-2 border-slate-200">
          <Label>Select Session</Label>
          <Select 
            value={selectedSessionId || ''} 
            onValueChange={handleSessionSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a session..." />
            </SelectTrigger>
            <SelectContent>
              {sessions.map(session => (
                <SelectItem key={session.id} value={session.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{formatSessionName(session)}</span>
                    <span className="text-xs text-muted-foreground">
                      {session.total_files} file{session.total_files !== 1 ? 's' : ''} • {formatFileSize(session.total_size_bytes || 0)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

const formatFileSize = (bytes: number) => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' bytes';
};