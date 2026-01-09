import { FileUploadProgress } from '@/types/upload';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { FileArchive, CheckCircle, XCircle, Loader2, X, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadProgressProps {
  uploads: FileUploadProgress[];
  onCancelAll?: () => void;
  onCancelFile?: (fileName: string) => void;
  onRemoveFromQueue?: (fileName: string) => void;
  isUploading?: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' bytes';
};

export const UploadProgress = ({ 
  uploads, 
  onCancelAll, 
  onCancelFile, 
  onRemoveFromQueue,
  isUploading = false 
}: UploadProgressProps) => {
  const completedCount = uploads.filter(u => u.status === 'completed').length;
  const errorCount = uploads.filter(u => u.status === 'error').length;
  const cancelledCount = uploads.filter(u => u.status === 'cancelled').length;
  const pendingCount = uploads.filter(u => u.status === 'pending').length;
  const uploadingCount = uploads.filter(u => u.status === 'uploading').length;
  const totalProgress = uploads.length > 0 ? uploads.reduce((sum, u) => sum + u.progress, 0) / uploads.length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Upload Progress</div>
        <div className="text-sm text-muted-foreground">
          {completedCount}/{uploads.length} completed
          {errorCount > 0 && <span className="text-red-500 ml-2">({errorCount} errors)</span>}
          {cancelledCount > 0 && <span className="text-amber-500 ml-2">({cancelledCount} cancelled)</span>}
        </div>
      </div>
      
      <Progress value={totalProgress} className="h-2" />
      
      {/* Botão para cancelar todos */}
      {isUploading && (pendingCount > 0 || uploadingCount > 0) && onCancelAll && (
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={onCancelAll}
          className="w-full"
        >
          <StopCircle className="h-4 w-4 mr-2" />
          Cancel All Uploads
        </Button>
      )}

      <div className="max-h-80 overflow-y-auto space-y-2 border rounded-lg p-2">
        {uploads.map((upload, index) => (
          <div 
            key={`${upload.file.name}-${index}`} 
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg',
              upload.status === 'completed' && 'bg-emerald-50',
              upload.status === 'error' && 'bg-red-50',
              upload.status === 'uploading' && 'bg-blue-50',
              upload.status === 'pending' && 'bg-slate-50',
              upload.status === 'cancelled' && 'bg-amber-50'
            )}
          >
            <div className="flex-shrink-0">
              {upload.status === 'completed' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
              {upload.status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
              {upload.status === 'uploading' && <Loader2 className="h-5 w-5 text-[#2563EB] animate-spin" />}
              {upload.status === 'pending' && <FileArchive className="h-5 w-5 text-slate-400" />}
              {upload.status === 'cancelled' && <XCircle className="h-5 w-5 text-amber-500" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate">{upload.file.name}</span>
                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                  {formatFileSize(upload.file.size)}
                </span>
              </div>
              
              {upload.status === 'uploading' && (
                <div className="flex items-center gap-2">
                  <Progress value={upload.progress} className="h-1 flex-1" />
                  <span className="text-xs text-muted-foreground w-10 text-right">{upload.progress}%</span>
                </div>
              )}
              
              {upload.status === 'error' && upload.error && (
                <div className="text-xs text-red-600 truncate">{upload.error}</div>
              )}
              
              {upload.status === 'cancelled' && (
                <div className="text-xs text-amber-600">Cancelled</div>
              )}
            </div>

            {/* Botão X para cancelar/remover */}
            <div className="flex-shrink-0">
              {upload.status === 'pending' && onRemoveFromQueue && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFromQueue(upload.file.name)}
                  className="h-8 w-8 p-0 hover:bg-slate-200"
                  title="Remove from queue"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </Button>
              )}
              
              {upload.status === 'uploading' && onCancelFile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancelFile(upload.file.name)}
                  className="h-8 w-8 p-0 hover:bg-red-100"
                  title="Cancel upload"
                >
                  <StopCircle className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};