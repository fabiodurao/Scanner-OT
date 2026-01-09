import { useState, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { CustomerSelector } from '@/components/upload/CustomerSelector';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { UploadProgress } from '@/components/upload/UploadProgress';
import { SessionsList } from '@/components/upload/SessionsList';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Customer, FileUploadProgress } from '@/types/upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Upload as UploadIcon, Loader2, CheckCircle, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_PROJECT_ID = 'jgclhfwigmxmqyhqngcm';

const Upload = () => {
  const { user } = useAuth();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<'select' | 'progress' | 'complete'>('select');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [uploads, setUploads] = useState<FileUploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const cancelledRef = useRef(false);
  const xhrMapRef = useRef<Map<string, XMLHttpRequest>>(new Map());

  const updateUpload = useCallback((fileName: string, update: Partial<FileUploadProgress>) => {
    setUploads(prev => prev.map(u => u.file.name === fileName ? { ...u, ...update } : u));
  }, []);

  const uploadFile = useCallback(async (file: File, customerId: string, sessionId: string): Promise<boolean> => {
    const fileName = file.name;
    
    // Verificar se foi cancelado
    if (cancelledRef.current) {
      updateUpload(fileName, { status: 'cancelled' });
      return false;
    }

    // Verificar se este arquivo específico foi removido da fila
    const currentUpload = uploads.find(u => u.file.name === fileName);
    if (currentUpload?.status === 'cancelled') {
      return false;
    }
    
    try {
      updateUpload(fileName, { status: 'uploading', progress: 0 });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      console.log('Uploading file:', fileName, 'to session:', sessionId, 'customer:', customerId);

      const presignedResponse = await fetch(
        `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/s3-presigned-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            customerId,
            sessionId,
          }),
        }
      );

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.error || 'Error generating upload URL');
      }

      const { presignedUrl, s3Key, bucket } = await presignedResponse.json();

      console.log('Got presigned URL for:', fileName);

      const { data: pcapFile, error: dbError } = await supabase
        .from('pcap_files')
        .insert({
          session_id: sessionId,
          filename: s3Key.split('/').pop(),
          original_filename: file.name,
          size_bytes: file.size,
          s3_key: s3Key,
          s3_bucket: bucket,
          content_type: file.type || 'application/octet-stream',
          upload_status: 'uploading',
        })
        .select()
        .single();

      if (dbError) throw new Error('Error registering file: ' + dbError.message);

      const success = await new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhrMapRef.current.set(fileName, xhr);
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            updateUpload(fileName, { progress: Math.round((event.loaded / event.total) * 100) });
          }
        });

        xhr.addEventListener('load', async () => {
          xhrMapRef.current.delete(fileName);
          if (xhr.status >= 200 && xhr.status < 300) {
            await supabase
              .from('pcap_files')
              .update({ upload_status: 'completed', completed_at: new Date().toISOString() })
              .eq('id', pcapFile.id);
            updateUpload(fileName, { status: 'completed', progress: 100, pcapFileId: pcapFile.id });
            console.log('Upload completed:', fileName);
            resolve(true);
          } else {
            await supabase
              .from('pcap_files')
              .update({ upload_status: 'error', error_message: `HTTP ${xhr.status}` })
              .eq('id', pcapFile.id);
            updateUpload(fileName, { status: 'error', error: `Upload failed with status ${xhr.status}` });
            resolve(false);
          }
        });

        xhr.addEventListener('error', async () => {
          xhrMapRef.current.delete(fileName);
          await supabase
            .from('pcap_files')
            .update({ upload_status: 'error', error_message: 'Network error' })
            .eq('id', pcapFile.id);
          updateUpload(fileName, { status: 'error', error: 'Network error' });
          resolve(false);
        });

        xhr.addEventListener('abort', async () => {
          xhrMapRef.current.delete(fileName);
          await supabase
            .from('pcap_files')
            .delete()
            .eq('id', pcapFile.id);
          updateUpload(fileName, { status: 'cancelled' });
          console.log('Upload cancelled:', fileName);
          resolve(false);
        });

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });

      return success;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateUpload(fileName, { status: 'error', error: errorMessage });
      console.error('Upload error for', fileName, ':', errorMessage);
      return false;
    }
  }, [updateUpload, uploads]);

  const handleCancelAll = useCallback(() => {
    cancelledRef.current = true;
    
    // Cancelar todos os uploads em andamento
    xhrMapRef.current.forEach((xhr, fileName) => {
      xhr.abort();
      console.log('Aborting upload:', fileName);
    });
    
    // Marcar todos os pendentes como cancelados
    setUploads(prev => prev.map(u => 
      u.status === 'pending' ? { ...u, status: 'cancelled' as const } : u
    ));
    
    toast.info('All uploads cancelled');
  }, []);

  const handleCancelFile = useCallback((fileName: string) => {
    const xhr = xhrMapRef.current.get(fileName);
    if (xhr) {
      xhr.abort();
      toast.info(`Upload of "${fileName}" cancelled`);
    }
  }, []);

  const handleRemoveFromQueue = useCallback((fileName: string) => {
    setUploads(prev => prev.map(u => 
      u.file.name === fileName ? { ...u, status: 'cancelled' as const } : u
    ));
    toast.info(`"${fileName}" removed from queue`);
  }, []);

  const handleStartUpload = async () => {
    if (!selectedCustomer || files.length === 0) {
      toast.error('Select a customer and add files');
      return;
    }

    cancelledRef.current = false;
    xhrMapRef.current.clear();

    const initialUploads: FileUploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'pending',
    }));
    setUploads(initialUploads);
    setStep('progress');
    setIsUploading(true);

    const { data: session, error } = await supabase
      .from('upload_sessions')
      .insert({
        customer_id: selectedCustomer.id,
        name: sessionName || null,
        description: sessionDescription || null,
        uploaded_by: user?.id,
        status: 'in_progress',
      })
      .select()
      .single();

    if (error) {
      toast.error('Error creating upload session: ' + error.message);
      setStep('select');
      setIsUploading(false);
      return;
    }

    console.log('Created session:', session.id);

    const customerId = selectedCustomer.id;
    const sessionId = session.id;

    for (const file of files) {
      // Verificar se foi cancelado globalmente
      if (cancelledRef.current) {
        break;
      }
      
      // Verificar se este arquivo foi removido da fila
      const currentStatus = uploads.find(u => u.file.name === file.name)?.status;
      if (currentStatus === 'cancelled') {
        continue;
      }

      await uploadFile(file, customerId, sessionId);
    }

    // Atualizar estatísticas da sessão
    const { data: sessionFiles } = await supabase
      .from('pcap_files')
      .select('size_bytes')
      .eq('session_id', sessionId)
      .eq('upload_status', 'completed');

    const completedFiles = sessionFiles || [];
    const totalSize = completedFiles.reduce((sum, f) => sum + (f.size_bytes || 0), 0);

    await supabase
      .from('upload_sessions')
      .update({
        total_files: completedFiles.length,
        total_size_bytes: totalSize,
        status: completedFiles.length > 0 ? 'completed' : 'error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    setIsUploading(false);
    setStep('complete');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleReset = () => {
    setFiles([]);
    setSessionName('');
    setSessionDescription('');
    setStep('select');
    setUploads([]);
    cancelledRef.current = false;
    xhrMapRef.current.clear();
  };

  const handleNewUpload = () => {
    handleReset();
  };

  const completedCount = uploads.filter(u => u.status === 'completed').length;
  const errorCount = uploads.filter(u => u.status === 'error').length;
  const cancelledCount = uploads.filter(u => u.status === 'cancelled').length;

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1a2744]">PCAP Upload</h1>
          <p className="text-muted-foreground mt-1">
            Upload OT traffic capture files
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UploadIcon className="h-5 w-5" />
                  New Upload
                </CardTitle>
                <CardDescription>
                  Select the customer and add PCAP files for upload
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {step === 'select' && (
                  <>
                    <CustomerSelector
                      selectedCustomerId={selectedCustomer?.id || null}
                      onSelectCustomer={setSelectedCustomer}
                    />

                    {selectedCustomer && (
                      <>
                        <Separator />
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="session-name">Session Name (optional)</Label>
                            <Input
                              id="session-name"
                              placeholder="E.g.: January 2025 Capture"
                              value={sessionName}
                              onChange={(e) => setSessionName(e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="session-description">Description (optional)</Label>
                            <Textarea
                              id="session-description"
                              placeholder="Notes about this capture..."
                              value={sessionDescription}
                              onChange={(e) => setSessionDescription(e.target.value)}
                              rows={2}
                            />
                          </div>
                        </div>

                        <Separator />

                        <FileDropzone
                          files={files}
                          onFilesChange={setFiles}
                        />

                        <Button
                          onClick={handleStartUpload}
                          disabled={files.length === 0}
                          className="w-full bg-[#2563EB] hover:bg-[#1d4ed8]"
                        >
                          <UploadIcon className="mr-2 h-4 w-4" />
                          Start Upload ({files.length} file{files.length !== 1 ? 's' : ''})
                        </Button>
                      </>
                    )}
                  </>
                )}

                {step === 'progress' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Customer:</span>
                      <span className="font-medium text-foreground">{selectedCustomer?.name}</span>
                    </div>
                    
                    <UploadProgress 
                      uploads={uploads} 
                      isUploading={isUploading}
                      onCancelAll={handleCancelAll}
                      onCancelFile={handleCancelFile}
                      onRemoveFromQueue={handleRemoveFromQueue}
                    />

                    {isUploading && (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading files... Do not close this page.
                      </div>
                    )}

                    {!isUploading && (
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" onClick={handleNewUpload}>
                          New Upload
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {step === 'complete' && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Upload Complete!</h3>
                    <p className="text-muted-foreground mb-6">
                      {completedCount} file{completedCount !== 1 ? 's' : ''} uploaded successfully.
                      {errorCount > 0 && ` ${errorCount} error${errorCount !== 1 ? 's' : ''}.`}
                      {cancelledCount > 0 && ` ${cancelledCount} cancelled.`}
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={handleNewUpload}>
                        <UploadIcon className="mr-2 h-4 w-4" />
                        New Upload
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Previous Uploads
                </CardTitle>
                <CardDescription>
                  {selectedCustomer 
                    ? `Upload history for ${selectedCustomer.name}`
                    : 'Select a customer to view history'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedCustomer ? (
                  <SessionsList 
                    customerId={selectedCustomer.id} 
                    refreshTrigger={refreshTrigger}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    Select a customer to view previous uploads
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