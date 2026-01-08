import { FileUploadProgress } from '@/types/upload';
import { Progress } from '@/components/ui/progress';
import { FileArchive, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadProgressProps {
  uploads: FileUploadProgress[];
}

const formatFileSize = (bytes: number) => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' bytes';
};

export const UploadProgress = ({ uploads }: UploadProgressProps) => {
  const completedCount = uploads.filter(u => u.status === 'completed').length;
  const errorCount = uploads.filter(u => u.status === 'error').length;
  const totalProgress = uploads.length > 0 ? uploads.reduce((sum, u) => sum + u.progress, 0) / uploads.length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Progresso do Upload</div>
        <div className="text-sm text-muted-foreground">
          {completedCount}/{uploads.length} concluídos
          {errorCount > 0 && <span className="text-red-500 ml-2">({errorCount} erros)</span>}
        </div>
      </div>
      <Progress value={totalProgress} className="h-2" />
      <div className="max-h-80 overflow-y-auto space-y-2 border rounded-lg p-2">
        {uploads.map((upload, index) => (
          <div key={`${upload.file.name}-${index}`} className={cn('flex items-center gap-3 p-3 rounded-lg', upload.status === 'completed' && 'bg-emerald-50', upload.status === 'error' && 'bg-red-50', upload.status === 'uploading' && 'bg-blue-50', upload.status === 'pending' && 'bg-slate-50')}>
            <div className="flex-shrink-0">
              {upload.status === 'completed' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
              {upload.status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
              {upload.status === 'uploading' && <Loader2 className="h-5 w-5 text-[#2563EB] animate-spin" />}
              {upload.status === 'pending' && <FileArchive className="h-5 w-5 text-slate-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate">{upload.file.name}</span>
                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{formatFileSize(upload.file.size)}</span>
              </div>
              {upload.status === 'uploading' && (
                <div className="flex items-center gap-2">
                  <Progress value={upload.progress} className="h-1 flex-1" />
                  <span className="text-xs text-muted-foreground w-10 text-right">{upload.progress}%</span>
                </div>
              )}
              {upload.status === 'error' && upload.error && <div className="text-xs text-red-600 truncate">{upload.error}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};