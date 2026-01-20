import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileUploadProgress } from '@/types/upload';

const SUPABASE_PROJECT_ID = 'jgclhfwigmxmqyhqngcm';

interface UploadSession {
  sessionId: string;
  siteId: string;
  siteName: string;
  sessionName: string;
}

interface UploadContextType {
  uploads: FileUploadProgress[];
  isUploading: boolean;
  currentSession: UploadSession | null;
  startUpload: (files: File[], siteId: string, siteName: string, sessionId: string, sessionName: string) => Promise<void>;
  addFilesToQueue: (files: File[]) => void;
  cancelAll: () => void;
  cancelFile: (fileName: string) => void;
  removeFromQueue: (fileName: string) => void;
  clearCompleted: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const UploadProvider = ({ children }: { children: ReactNode }) => {
  const [uploads, setUploads] = useState<FileUploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentSession, setCurrentSession] = useState<UploadSession | null>(null);
  
  const cancelledRef = useRef(false);
  const xhrMapRef = useRef<Map<string, XMLHttpRequest>>(new Map());
  const queueRef = useRef<File[]>([]);
  const isProcessingRef = useRef(false);

  const updateUpload = useCallback((fileName: string, update: Partial<FileUploadProgress>) => {
    setUploads(prev => prev.map(u => u.file.name === fileName ? { ...u, ...update } : u));
  }, []);

  const uploadFile = useCallback(async (file: File, siteId: string, sessionId: string): Promise<boolean> => {
    const fileName = file.name;
    
    if (cancelledRef.current) {
      updateUpload(fileName, { status: 'cancelled' });
      return false;
    }
    
    try {
      updateUpload(fileName, { status: 'uploading', progress: 0 });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

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
            customerId: siteId,
            sessionId,
          }),
        }
      );

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.error || 'Error generating upload URL');
      }

      const { presignedUrl, s3Key, bucket } = await presignedResponse.json();

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
      return false;
    }
  }, [updateUpload]);

  const processQueue = useCallback(async (siteId: string, sessionId: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    while (queueRef.current.length > 0 && !cancelledRef.current) {
      const file = queueRef.current.shift();
      if (file) {
        await uploadFile(file, siteId, sessionId);
      }
    }

    // Update session statistics when queue is empty
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

    isProcessingRef.current = false;
    setIsUploading(false);
  }, [uploadFile]);

  const startUpload = useCallback(async (
    files: File[], 
    siteId: string, 
    siteName: string,
    sessionId: string, 
    sessionName: string
  ) => {
    cancelledRef.current = false;
    xhrMapRef.current.clear();
    queueRef.current = [...files];

    const initialUploads: FileUploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'pending',
    }));
    
    setUploads(initialUploads);
    setIsUploading(true);
    setCurrentSession({ sessionId, siteId, siteName, sessionName });

    processQueue(siteId, sessionId);
  }, [processQueue]);

  const addFilesToQueue = useCallback((files: File[]) => {
    if (!currentSession) return;

    // Add new files to the queue
    queueRef.current.push(...files);

    // Add to uploads state
    const newUploads: FileUploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'pending',
    }));
    
    setUploads(prev => [...prev, ...newUploads]);
    setIsUploading(true);

    // Start processing if not already running
    if (!isProcessingRef.current) {
      processQueue(currentSession.siteId, currentSession.sessionId);
    }
  }, [currentSession, processQueue]);

  const cancelAll = useCallback(() => {
    cancelledRef.current = true;
    queueRef.current = [];
    
    xhrMapRef.current.forEach((xhr) => {
      xhr.abort();
    });
    
    setUploads(prev => prev.map(u => 
      u.status === 'pending' ? { ...u, status: 'cancelled' as const } : u
    ));
  }, []);

  const cancelFile = useCallback((fileName: string) => {
    // Remove from queue if pending
    queueRef.current = queueRef.current.filter(f => f.name !== fileName);
    
    // Abort if currently uploading
    const xhr = xhrMapRef.current.get(fileName);
    if (xhr) {
      xhr.abort();
    } else {
      // If not uploading, just mark as cancelled
      setUploads(prev => prev.map(u => 
        u.file.name === fileName && u.status === 'pending' 
          ? { ...u, status: 'cancelled' as const } 
          : u
      ));
    }
  }, []);

  const removeFromQueue = useCallback((fileName: string) => {
    queueRef.current = queueRef.current.filter(f => f.name !== fileName);
    setUploads(prev => prev.map(u => 
      u.file.name === fileName ? { ...u, status: 'cancelled' as const } : u
    ));
  }, []);

  const clearCompleted = useCallback(() => {
    setUploads([]);
    setCurrentSession(null);
    cancelledRef.current = false;
    xhrMapRef.current.clear();
    queueRef.current = [];
    isProcessingRef.current = false;
  }, []);

  return (
    <UploadContext.Provider value={{
      uploads,
      isUploading,
      currentSession,
      startUpload,
      addFilesToQueue,
      cancelAll,
      cancelFile,
      removeFromQueue,
      clearCompleted,
    }}>
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};