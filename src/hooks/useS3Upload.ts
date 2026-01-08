import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileUploadProgress } from '@/types/upload';

const SUPABASE_PROJECT_ID = 'jgclhfwigmxmqyhqngcm';

interface UseS3UploadOptions {
  customerId: string;
  sessionId: string;
  onFileComplete?: (file: File, pcapFileId: string) => void;
  onAllComplete?: () => void;
}

export const useS3Upload = ({ customerId, sessionId, onFileComplete, onAllComplete }: UseS3UploadOptions) => {
  const [uploads, setUploads] = useState<Map<string, FileUploadProgress>>(new Map());
  const [isUploading, setIsUploading] = useState(false);

  const updateUpload = useCallback((fileName: string, update: Partial<FileUploadProgress>) => {
    setUploads(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(fileName);
      if (existing) newMap.set(fileName, { ...existing, ...update });
      return newMap;
    });
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<void> => {
    const fileName = file.name;
    try {
      updateUpload(fileName, { status: 'uploading', progress: 0 });
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const presignedResponse = await fetch(`https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/s3-presigned-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', customerId, sessionId }),
      });

      if (!presignedResponse.ok) throw new Error((await presignedResponse.json()).error || 'Erro ao gerar URL');

      const { presignedUrl, s3Key, bucket } = await presignedResponse.json();

      const { data: pcapFile, error: dbError } = await supabase.from('pcap_files').insert({
        session_id: sessionId, filename: s3Key.split('/').pop(), original_filename: file.name,
        size_bytes: file.size, s3_key: s3Key, s3_bucket: bucket, content_type: file.type || 'application/octet-stream', upload_status: 'uploading',
      }).select().single();

      if (dbError) throw new Error('Erro ao registrar arquivo: ' + dbError.message);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => { if (e.lengthComputable) updateUpload(fileName, { progress: Math.round((e.loaded / e.total) * 100) }); });
        xhr.addEventListener('load', async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            await supabase.from('pcap_files').update({ upload_status: 'completed', completed_at: new Date().toISOString() }).eq('id', pcapFile.id);
            updateUpload(fileName, { status: 'completed', progress: 100, pcapFileId: pcapFile.id });
            onFileComplete?.(file, pcapFile.id);
            resolve();
          } else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });
    } catch (error) {
      updateUpload(fileName, { status: 'error', error: error instanceof Error ? error.message : 'Erro desconhecido' });
      throw error;
    }
  }, [customerId, sessionId, updateUpload, onFileComplete]);

  const uploadFiles = useCallback(async (files: File[]) => {
    setIsUploading(true);
    const initialUploads = new Map<string, FileUploadProgress>();
    files.forEach(file => initialUploads.set(file.name, { file, progress: 0, status: 'pending' }));
    setUploads(initialUploads);

    for (const file of files) { try { await uploadFile(file); } catch (e) { console.error(e); } }

    const { data: sessionFiles } = await supabase.from('pcap_files').select('size_bytes').eq('session_id', sessionId).eq('upload_status', 'completed');
    if (sessionFiles) await supabase.from('upload_sessions').update({ total_files: sessionFiles.length, total_size_bytes: sessionFiles.reduce((s, f) => s + (f.size_bytes || 0), 0) }).eq('id', sessionId);

    setIsUploading(false);
    onAllComplete?.();
  }, [uploadFile, sessionId, onAllComplete]);

  const clearUploads = useCallback(() => setUploads(new Map()), []);

  return { uploads: Array.from(uploads.values()), isUploading, uploadFiles, clearUploads };
};