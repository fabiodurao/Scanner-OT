import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QueuedFile } from '@/types/upload';

const SUPABASE_PROJECT_ID = 'jgclhfwigmxmqyhqngcm';

interface UploadContextType {
  queue: QueuedFile[];
  isUploading: boolean;
  addToQueue: (files: File[], siteId: string, siteName: string, sessionId: string, sessionName: string) => void;
  removeFromQueue: (fileId: string) => void;
  cancelFile: (fileId: string) => void;
  cancelAll: () => void;
  clearCompleted: () => void;
  startUpload: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

// Generate unique ID for queue items
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const UploadProvider = ({ children }: { children: ReactNode }) => {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const cancelledRef = useRef(false);
  const xhrMapRef = useRef<Map<string, XMLHttpRequest>>(new Map());
  const isProcessingRef = useRef(false);

  const updateQueueItem = useCallback((fileId: string, update: Partial<QueuedFile>) => {
    setQueue(prev => prev.map(item => item.id === fileId ? { ...item, ...update } : item));
  }, []);

  const uploadFile = useCallback(async (queueItem: QueuedFile): Promise<boolean> => {
    if (cancelledRef.current) {
      updateQueueItem(queueItem.id, { status: 'cancelled' });
      return false;
    }
    
    try {
      updateQueueItem(queueItem.id, { status: 'uploading', progress: 0 });

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
            filename: queueItem.file.name,
            contentType: queueItem.file.type || 'application/octet-stream',
            customerId: queueItem.siteId,
            sessionId: queueItem.sessionId,
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
          session_id: queueItem.sessionId,
          filename: s3Key.split('/').pop(),
          original_filename: queueItem.file.name,
          size_bytes: queueItem.file.size,
          s3_key: s3Key,
          s3_bucket: bucket,
          content_type: queueItem.file.type || 'application/octet-stream',
          upload_status: 'uploading',
        })
        .select()
        .single();

      if (dbError) throw new Error('Error registering file: ' + dbError.message);

      const success = await new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhrMapRef.current.set(queueItem.id, xhr);
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            updateQueueItem(queueItem.id, { progress: Math.round((event.loaded / event.total) * 100) });
          }
        });

        xhr.addEventListener('load', async () => {
          xhrMapRef.current.delete(queueItem.id);
          if (xhr.status >= 200 && xhr.status < 300) {
            await supabase
              .from('pcap_files')
              .update({ upload_status: 'completed', completed_at: new Date().toISOString() })
              .eq('id', pcapFile.id);
            updateQueueItem(queueItem.id, { status: 'completed', progress: 100, pcapFileId: pcapFile.id });
            
            // Update session statistics
            await updateSessionStats(queueItem.sessionId);
            
            resolve(true);
          } else {
            await supabase
              .from('pcap_files')
              .update({ upload_status: 'error', error_message: `HTTP ${xhr.status}` })
              .eq('id', pcapFile.id);
            updateQueueItem(queueItem.id, { status: 'error', error: `Upload failed with status ${xhr.status}` });
            resolve(false);
          }
        });

        xhr.addEventListener('error', async () => {
          xhrMapRef.current.delete(queueItem.id);
          await supabase
            .from('pcap_files')
            .update({ upload_status: 'error', error_message: 'Network error' })
            .eq('id', pcapFile.id);
          updateQueueItem(queueItem.id, { status: 'error', error: 'Network error' });
          resolve(false);
        });

        xhr.addEventListener('abort', async () => {
          xhrMapRef.current.delete(queueItem.id);
          await supabase
            .from('pcap_files')
            .delete()
            .eq('id', pcapFile.id);
          updateQueueItem(queueItem.id, { status: 'cancelled' });
          resolve(false);
        });

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', queueItem.file.type || 'application/octet-stream');
        xhr.send(queueItem.file);
      });

      return success;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateQueueItem(queueItem.id, { status: 'error', error: errorMessage });
      return false;
    }
  }, [updateQueueItem]);

  const updateSessionStats = async (sessionId: string) => {
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
        status: completedFiles.length > 0 ? 'completed' : 'in_progress',
      })
      .eq('id', sessionId);
  };

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsUploading(true);

    // Get current queue state
    let currentQueue = [...queue];
    
    while (!cancelledRef.current) {
      // Find next pending item
      const pendingItem = currentQueue.find(item => item.status === 'pending');
      if (!pendingItem) break;
      
      await uploadFile(pendingItem);
      
      // Refresh queue state
      setQueue(prev => {
        currentQueue = prev;
        return prev;
      });
    }

    isProcessingRef.current = false;
    setIsUploading(false);
    cancelledRef.current = false;
  }, [queue, uploadFile]);

  const addToQueue = useCallback((
    files: File[], 
    siteId: string, 
    siteName: string,
    sessionId: string, 
    sessionName: string
  ) => {
    const newItems: QueuedFile[] = files.map(file => ({
      id: generateId(),
      file,
      siteId,
      siteName,
      sessionId,
      sessionName,
      progress: 0,
      status: 'pending',
    }));
    
    setQueue(prev => [...prev, ...newItems]);
  }, []);

  const startUpload = useCallback(() => {
    if (!isProcessingRef.current && queue.some(item => item.status === 'pending')) {
      processQueue();
    }
  }, [queue, processQueue]);

  const removeFromQueue = useCallback((fileId: string) => {
    setQueue(prev => prev.filter(item => item.id !== fileId));
  }, []);

  const cancelFile = useCallback((fileId: string) => {
    const xhr = xhrMapRef.current.get(fileId);
    if (xhr) {
      xhr.abort();
    } else {
      // If not uploading, just mark as cancelled or remove
      setQueue(prev => prev.map(item => 
        item.id === fileId && item.status === 'pending' 
          ? { ...item, status: 'cancelled' as const } 
          : item
      ));
    }
  }, []);

  const cancelAll = useCallback(() => {
    cancelledRef.current = true;
    
    // Abort all active uploads
    xhrMapRef.current.forEach((xhr) => {
      xhr.abort();
    });
    
    // Mark all pending as cancelled
    setQueue(prev => prev.map(item => 
      item.status === 'pending' ? { ...item, status: 'cancelled' as const } : item
    ));
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(item => 
      item.status !== 'completed' && item.status !== 'cancelled' && item.status !== 'error'
    ));
  }, []);

  return (
    <UploadContext.Provider value={{
      queue,
      isUploading,
      addToQueue,
      removeFromQueue,
      cancelFile,
      cancelAll,
      clearCompleted,
      startUpload,
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