import { Link } from 'react-router-dom';
import { useUpload } from '@/contexts/UploadContext';
import { Progress } from '@/components/ui/progress';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ActiveUploadsIndicator = () => {
  const { uploads, isUploading, currentSession } = useUpload();

  // Calculate stats
  const completedCount = uploads.filter(u => u.status === 'completed').length;
  const errorCount = uploads.filter(u => u.status === 'error').length;
  const uploadingCount = uploads.filter(u => u.status === 'uploading').length;
  const pendingCount = uploads.filter(u => u.status === 'pending').length;
  const totalCount = uploads.length;
  
  // Calculate overall progress
  const totalProgress = totalCount > 0 
    ? uploads.reduce((sum, u) => sum + u.progress, 0) / totalCount 
    : 0;

  // Don't show if no uploads
  if (totalCount === 0) {
    return null;
  }

  const isComplete = !isUploading && completedCount + errorCount === totalCount;

  return (
    <div className="px-3 py-2 border-t border-[hsl(var(--sidebar-border))]">
      <Link 
        to="/upload"
        className="block hover:bg-[hsl(var(--sidebar-accent))] rounded-lg transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1.5 mb-1">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Upload className={cn(
                "h-4 w-4",
                isUploading ? "text-blue-400" : isComplete ? "text-emerald-400" : "text-gray-400"
              )} />
              {isUploading && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-400 rounded-full animate-pulse" />
              )}
            </div>
            <span className={cn(
              "text-xs font-medium",
              isUploading ? "text-blue-400" : isComplete ? "text-emerald-400" : "text-gray-400"
            )}>
              {isUploading 
                ? `Uploading ${uploadingCount + pendingCount} file${uploadingCount + pendingCount !== 1 ? 's' : ''}`
                : isComplete 
                  ? `Upload complete`
                  : 'Upload'
              }
            </span>
          </div>
          
          {/* Status badges */}
          <div className="flex items-center gap-1">
            {completedCount > 0 && (
              <div className="flex items-center gap-0.5 text-emerald-400">
                <CheckCircle className="h-3 w-3" />
                <span className="text-[10px]">{completedCount}</span>
              </div>
            )}
            {errorCount > 0 && (
              <div className="flex items-center gap-0.5 text-red-400">
                <XCircle className="h-3 w-3" />
                <span className="text-[10px]">{errorCount}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Progress section */}
        {isUploading && (
          <div className="px-2 pb-2">
            {/* Current session info */}
            {currentSession && (
              <div className="text-[10px] text-gray-400 mb-1.5 truncate">
                {currentSession.siteName}
              </div>
            )}
            
            {/* Overall progress bar */}
            <div className="flex items-center gap-2">
              <Progress 
                value={totalProgress} 
                className="h-1.5 flex-1 bg-gray-700"
              />
              <span className="text-[10px] text-gray-400 w-8 text-right">
                {Math.round(totalProgress)}%
              </span>
            </div>
            
            {/* File being uploaded */}
            {uploads.find(u => u.status === 'uploading') && (
              <div className="mt-1.5 flex items-center gap-2">
                <Loader2 className="h-3 w-3 text-blue-400 animate-spin flex-shrink-0" />
                <span className="text-[10px] text-gray-400 truncate">
                  {uploads.find(u => u.status === 'uploading')?.file.name}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Completed state */}
        {isComplete && (
          <div className="px-2 pb-2">
            <div className="text-[10px] text-gray-400">
              {completedCount}/{totalCount} files uploaded
              {errorCount > 0 && ` • ${errorCount} failed`}
            </div>
          </div>
        )}
      </Link>
    </div>
  );
};