import { useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SiteSelector } from '@/components/upload/SiteSelector';
import { SessionSelector } from '@/components/upload/SessionSelector';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { UploadProgress } from '@/components/upload/UploadProgress';
import { SessionsList } from '@/components/upload/SessionsList';
import { useAuth } from '@/contexts/AuthContext';
import { useUpload } from '@/contexts/UploadContext';
import { supabase } from '@/integrations/supabase/client';
import { Site, UploadSession } from '@/types/upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Upload as UploadIcon, Loader2, CheckCircle, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const Upload = () => {
  const { user } = useAuth();
  const { 
    uploads, 
    isUploading, 
    currentSession,
    startUpload, 
    cancelAll, 
    cancelFile, 
    removeFromQueue,
    clearCompleted 
  } = useUpload();
  
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [sessionMode, setSessionMode] = useState<'new' | 'existing'>('new');
  const [selectedSession, setSelectedSession] = useState<UploadSession | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Determine current step based on state
  const hasActiveUpload = uploads.length > 0;
  const completedCount = uploads.filter(u => u.status === 'completed').length;
  const errorCount = uploads.filter(u => u.status === 'error').length;
  const cancelledCount = uploads.filter(u => u.status === 'cancelled').length;
  const isComplete = hasActiveUpload && !isUploading && (completedCount + errorCount + cancelledCount === uploads.length);

  const handleStartUpload = async () => {
    if (!selectedSite || files.length === 0) {
      toast.error('Select a site and add files');
      return;
    }

    if (sessionMode === 'existing' && !selectedSession) {
      toast.error('Select an existing session or create a new one');
      return;
    }

    let sessionId: string;
    let sessionDisplayName: string;

    if (sessionMode === 'existing' && selectedSession) {
      sessionId = selectedSession.id;
      sessionDisplayName = selectedSession.name || format(new Date(selectedSession.created_at), "MM/dd/yyyy 'at' HH:mm");
    } else {
      // Create new session with timestamp as default name
      const defaultName = sessionName || format(new Date(), "MM/dd/yyyy 'at' HH:mm");
      
      const { data: session, error } = await supabase
        .from('upload_sessions')
        .insert({
          site_id: selectedSite.id,
          name: defaultName,
          description: sessionDescription || null,
          uploaded_by: user?.id,
          status: 'in_progress',
        })
        .select()
        .single();

      if (error) {
        toast.error('Error creating upload session: ' + error.message);
        return;
      }

      sessionId = session.id;
      sessionDisplayName = defaultName;
    }

    // Start upload using the global context
    await startUpload(files, selectedSite.id, selectedSite.name, sessionId, sessionDisplayName);
    
    // Clear local file selection
    setFiles([]);
    triggerRefresh();
  };

  const handleReset = () => {
    clearCompleted();
    setFiles([]);
    setSessionName('');
    setSessionDescription('');
    setSessionMode('new');
    setSelectedSession(null);
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1a2744]">PCAP Upload</h1>
          <p className="text-muted-foreground mt-1">
            Upload OT traffic capture files
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Upload column - 2/5 width */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UploadIcon className="h-5 w-5" />
                  New Upload
                </CardTitle>
                <CardDescription>
                  Select the site and add PCAP files for upload
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Show upload progress if there's an active or completed upload */}
                {hasActiveUpload ? (
                  <div className="space-y-4">
                    {currentSession && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Site:</span>
                        <span className="font-medium text-foreground">{currentSession.siteName}</span>
                      </div>
                    )}
                    
                    <UploadProgress 
                      uploads={uploads} 
                      isUploading={isUploading}
                      onCancelAll={cancelAll}
                      onCancelFile={cancelFile}
                      onRemoveFromQueue={removeFromQueue}
                    />

                    {isUploading && (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading files... You can navigate away, the upload will continue.
                      </div>
                    )}

                    {isComplete && (
                      <div className="text-center py-4">
                        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold mb-1">Upload Complete!</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {completedCount} file{completedCount !== 1 ? 's' : ''} uploaded successfully.
                          {errorCount > 0 && ` ${errorCount} error${errorCount !== 1 ? 's' : ''}.`}
                          {cancelledCount > 0 && ` ${cancelledCount} cancelled.`}
                        </p>
                        <Button onClick={handleReset}>
                          <UploadIcon className="mr-2 h-4 w-4" />
                          New Upload
                        </Button>
                      </div>
                    )}

                    {!isUploading && !isComplete && (
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" onClick={handleReset}>
                          New Upload
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <SiteSelector
                      selectedSiteId={selectedSite?.id || null}
                      onSelectSite={setSelectedSite}
                    />

                    {selectedSite && (
                      <>
                        <Separator />
                        
                        <SessionSelector
                          siteId={selectedSite.id}
                          selectedSessionId={selectedSession?.id || null}
                          onSelectSession={setSelectedSession}
                          newSessionName={sessionName}
                          onNewSessionNameChange={setSessionName}
                          newSessionDescription={sessionDescription}
                          onNewSessionDescriptionChange={setSessionDescription}
                          mode={sessionMode}
                          onModeChange={setSessionMode}
                          refreshTrigger={refreshTrigger}
                        />

                        <Separator />

                        <FileDropzone
                          files={files}
                          onFilesChange={setFiles}
                        />

                        <Button
                          onClick={handleStartUpload}
                          disabled={files.length === 0 || (sessionMode === 'existing' && !selectedSession)}
                          className="w-full bg-[#2563EB] hover:bg-[#1d4ed8]"
                        >
                          <UploadIcon className="mr-2 h-4 w-4" />
                          {sessionMode === 'existing' 
                            ? `Add ${files.length} file${files.length !== 1 ? 's' : ''} to session`
                            : `Start Upload (${files.length} file${files.length !== 1 ? 's' : ''})`
                          }
                        </Button>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Previous uploads column - 3/5 width */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Previous Uploads
                </CardTitle>
                <CardDescription>
                  {selectedSite 
                    ? `Upload history for ${selectedSite.name}`
                    : 'Select a site to view history'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedSite ? (
                  <SessionsList 
                    siteId={selectedSite.id} 
                    refreshTrigger={refreshTrigger}
                    onSessionsChange={triggerRefresh}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    Select a site to view previous uploads
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Upload;