import { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QueuedFile } from '@/types/upload';

const SUPABASE_PROJECT_ID = 'jgclhfwigmxmqyhqngcm';

interface UploadContextType {
  queue: QueuedFile[];
  isUploading: boolean;
  lastCompletedSessionId: string | null;
  addToQueue: (files: File[], siteId: string, siteName: string, sessionId: string, sessionName: string) => void;
  removeFromQueue: (fileId: string) => void;
  cancelFile: (fileId: string) => void;
  cancelAll: () => void;
  clearCompleted: () => void;
  clearLastCompletedSession: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

// Generate unique ID for queue items
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const UploadProvider = ({ children }: { children: ReactNode }) => {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [lastCompletedSessionId, setLastCompletedSessionId] = useState<string | null>(null);
  
  const cancelledRef = useRef(false);
  const xhrMapRef = useRef<Map<string, XMLHttpRequest>>(new Map());
  const isProcessingRef = useRef(false);
  const queueRef = useRef<QueuedFile[]>([]);

  // Keep queueRef in sync with queue state
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const updateQueueItem = useCallback((fileId: string, update: Partial<QueuedFile>) => {
    setQueue(prev => {
      const updated = prev.map(item => item.id === fileId ? { ...item, ...update } : item);
      queueRef.current = updated;
      return updated;
    });
  }, []);

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

  // Get the next display_order for a session
  const getNextDisplayOrder = async (sessionId: string): Promise<number> => {
    const { data } = await supabase
      .from('pcap_files')
      .select('display_order')
      .eq('session_id', sessionId)
      .order('display_order', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0 && data[0].display_order !== null) {
      return data[0].display_order + 1;
    }
    return 1; // Start from 1 if no files exist
  };

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

      // Get the next display_order for this session
      const nextDisplayOrder = await getNextDisplayOrder(queueItem.sessionId);

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
          display_order: nextDisplayOrder,
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
            
            // Notify that a file was completed - this triggers refresh in UI
            setLastCompletedSessionId(queueItem.sessionId);
            
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

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) {
      console.log('[UploadContext] Already processing, skipping');
      return;
    }
    
    console.log('[UploadContext] Starting processQueue');
    isProcessingRef.current = true;
    setIsUploading(true);
    cancelledRef.current = false;

    while (!cancelledRef.current) {
      // Use ref to get current queue state
      const currentQueue = queueRef.current;
      const pendingItem = currentQueue.find(item => item.status === 'pending');
      
      if (!pendingItem) {
        console.log('[UploadContext] No more pending items');
        break;
      }
      
      console.log('[UploadContext] Uploading file:', pendingItem.file.name);
      await uploadFile(pendingItem);
    }

    console.log('[UploadContext] processQueue finished');
    isProcessingRef.current = false;
    setIsUploading(false);
  }, [uploadFile]);

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
    
    console.log('[UploadContext] Adding to queue:', newItems.length, 'files');
    
    setQueue(prev => {
      const updated = [...prev, ...newItems];
      queueRef.current = updated;
      return updated;
    });
    
    // Auto-start upload after a small delay to ensure state is updated
    setTimeout(() => {
      console.log('[UploadContext] Auto-starting upload');
      if (!isProcessingRef.current) {
        processQueue();
      }
    }, 100);
  }, [processQueue]);

  const removeFromQueue = useCallback((fileId: string) => {
    setQueue(prev => {
      const updated = prev.filter(item => item.id !== fileId);
      queueRef.current = updated;
      return updated;
    });
  }, []);

  const cancelFile = useCallback((fileId: string) => {
    const xhr = xhrMapRef.current.get(fileId);
    if (xhr) {
      xhr.abort();
    } else {
      // If not uploading, just mark as cancelled
      setQueue(prev => {
        const updated = prev.map(item => 
          item.id === fileId && item.status === 'pending' 
            ? { ...item, status: 'cancelled' as const } 
            : item
        );
        queueRef.current = updated;
        return updated;
      });
    }
  }, []);

  const cancelAll = useCallback(() => {
    console.log('[UploadContext] Cancelling all uploads');
    cancelledRef.current = true;
    
    // Abort all active uploads
    xhrMapRef.current.forEach((xhr) => {
      xhr.abort();
    });
    
    // Mark all pending as cancelled
    setQueue(prev => {
      const updated = prev.map(item => 
        item.status === 'pending' ? { ...item, status: 'cancelled' as const } : item
      );
      queueRef.current = updated;
      return updated;
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue(prev => {
      const updated = prev.filter(item => 
        item.status !== 'completed' && item.status !== 'cancelled' && item.status !== 'error'
      );
      queueRef.current = updated;
      return updated;
    });
  }, []);

  const clearLastCompletedSession = useCallback(() => {
    setLastCompletedSessionId(null);
  }, []);

  return (
    <UploadContext.Provider value={{
      queue,
      isUploading,
      lastCompletedSessionId,
      addToQueue,
      removeFromQueue,
      cancelFile,
      cancelAll,
      clearCompleted,
      clearLastCompletedSession,
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