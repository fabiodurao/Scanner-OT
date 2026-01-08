import { useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { CustomerSelector } from '@/components/upload/CustomerSelector';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { UploadProgress } from '@/components/upload/UploadProgress';
import { SessionsList } from '@/components/upload/SessionsList';
import { useS3Upload } from '@/hooks/useS3Upload';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types/upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Upload as UploadIcon, Loader2, CheckCircle, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

const Upload = () => {
  const { user } = useAuth();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<'select' | 'upload' | 'progress' | 'complete'>('select');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = useCallback(async () => {
    if (sessionId) {
      // Mark session as completed
      await supabase
        .from('upload_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }
    setStep('complete');
    setRefreshTrigger(prev => prev + 1);
  }, [sessionId]);

  const { uploads, isUploading, uploadFiles, clearUploads } = useS3Upload({
    customerId: selectedCustomer?.id || '',
    sessionId: sessionId || '',
    onAllComplete: handleUploadComplete,
  });

  const handleStartUpload = async () => {
    if (!selectedCustomer || files.length === 0) {
      toast.error('Selecione um cliente e adicione arquivos');
      return;
    }

    // Create upload session
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
      toast.error('Erro ao criar sessão de upload: ' + error.message);
      return;
    }

    setSessionId(session.id);
    setStep('progress');

    // Start uploading
    await uploadFiles(files);
  };

  const handleReset = () => {
    setFiles([]);
    setSessionId(null);
    setSessionName('');
    setSessionDescription('');
    setStep('select');
    clearUploads();
  };

  const handleNewUpload = () => {
    handleReset();
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1a2744]">Upload PCAP</h1>
          <p className="text-muted-foreground mt-1">
            Faça upload de arquivos de captura de tráfego OT
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Upload Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UploadIcon className="h-5 w-5" />
                  Novo Upload
                </CardTitle>
                <CardDescription>
                  Selecione o cliente e adicione os arquivos PCAP para upload
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
                            <Label htmlFor="session-name">Nome da Sessão (opcional)</Label>
                            <Input
                              id="session-name"
                              placeholder="Ex: Captura Janeiro 2025"
                              value={sessionName}
                              onChange={(e) => setSessionName(e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="session-description">Descrição (opcional)</Label>
                            <Textarea
                              id="session-description"
                              placeholder="Observações sobre esta captura..."
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
                          Iniciar Upload ({files.length} arquivo{files.length !== 1 ? 's' : ''})
                        </Button>
                      </>
                    )}
                  </>
                )}

                {step === 'progress' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Cliente:</span>
                      <span className="font-medium text-foreground">{selectedCustomer?.name}</span>
                    </div>
                    
                    <UploadProgress uploads={uploads} />

                    {isUploading && (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando arquivos... Não feche esta página.
                      </div>
                    )}
                  </div>
                )}

                {step === 'complete' && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Upload Concluído!</h3>
                    <p className="text-muted-foreground mb-6">
                      Todos os arquivos foram enviados com sucesso.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={handleNewUpload}>
                        <UploadIcon className="mr-2 h-4 w-4" />
                        Novo Upload
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sessions List Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Uploads Anteriores
                </CardTitle>
                <CardDescription>
                  {selectedCustomer 
                    ? `Histórico de uploads para ${selectedCustomer.name}`
                    : 'Selecione um cliente para ver o histórico'
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
                    Selecione um cliente para ver os uploads anteriores
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