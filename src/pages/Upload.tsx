import { useState, useCallback, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SiteSelector } from '@/components/upload/SiteSelector';
import { SessionSelector } from '@/components/upload/SessionSelector';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { UploadQueue } from '@/components/upload/UploadQueue';
import { SessionsList } from '@/components/upload/SessionsList';
import { useAuth } from '@/contexts/AuthContext';
import { useUpload } from '@/contexts/UploadContext';
import { supabase } from '@/integrations/supabase/client';
import { Site, UploadSession } from '@/types/upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, FolderOpen, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const Upload = () => {
  const { user } = useAuth();
  const { queue, addToQueue, completedCount } = useUpload();
  
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [sessionMode, setSessionMode] = useState<'new' | 'existing'>('new');
  const [selectedSession, setSelectedSession] = useState<UploadSession | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [addingToQueue, setAddingToQueue] = useState(false);

  const [displaySiteId, setDisplaySiteId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSite) {
      setDisplaySiteId(selectedSite.id);
    } else if (queue.length > 0) {
      setDisplaySiteId(queue[queue.length - 1].siteId);
    }
  }, [selectedSite, queue]);

  useEffect(() => {
    if (completedCount > 0) {
      console.log('[Upload] completedCount changed to:', completedCount, '- triggering refresh');
      setRefreshTrigger(prev => prev + 1);
    }
  }, [completedCount]);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleAddToQueue = async () => {
    if (!selectedSite || files.length === 0) {
      toast.error('Select a site and add files');
      return;
    }

    if (sessionMode === 'existing' && !selectedSession) {
      toast.error('Select an existing session or create a new one');
      return;
    }

    setAddingToQueue(true);

    let sessionId: string;
    let sessionDisplayName: string;

    if (sessionMode === 'existing' && selectedSession) {
      sessionId = selectedSession.id;
      sessionDisplayName = selectedSession.name || format(new Date(selectedSession.created_at), "MM/dd/yyyy 'at' HH:mm");
    } else {
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
        setAddingToQueue(false);
        return;
      }

      sessionId = session.id;
      sessionDisplayName = defaultName;
      
      setSessionName('');
      setSessionDescription('');
      
      triggerRefresh();
    }

    addToQueue(files, selectedSite.id, selectedSite.name, sessionId, sessionDisplayName);
    
    toast.success(`Added ${files.length} file${files.length !== 1 ? 's' : ''} to queue`);
    
    setFiles([]);
    setAddingToQueue(false);
  };

  const getDisplaySiteName = () => {
    if (selectedSite) return selectedSite.name;
    if (queue.length > 0) {
      const lastItem = queue[queue.length - 1];
      return lastItem.siteName;
    }
    return null;
  };

  const displaySiteName = getDisplaySiteName();

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">PCAP Upload</h1>
          <p className="text-muted-foreground mt-1">
            Upload OT traffic capture files
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Files to Queue
                </CardTitle>
                <CardDescription>
                  Select site, session and files to add to the upload queue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                      onClick={handleAddToQueue}
                      disabled={files.length === 0 || (sessionMode === 'existing' && !selectedSession) || addingToQueue}
                      className="w-full bg-[#2563EB] hover:bg-[#1d4ed8]"
                    >
                      {addingToQueue ? (
                        <>Adding...</>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add {files.length} file{files.length !== 1 ? 's' : ''} to Queue
                        </>
                      )}
                    </Button>
                  </>
                )}

                {!selectedSite && (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a site to start adding files</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <UploadQueue />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Previous Uploads
                </CardTitle>
                <CardDescription>
                  {displaySiteName 
                    ? `Upload history for ${displaySiteName}`
                    : 'Select a site to view history'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {displaySiteId ? (
                  <SessionsList 
                    siteId={displaySiteId} 
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