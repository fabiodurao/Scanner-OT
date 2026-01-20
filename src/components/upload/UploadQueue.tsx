import { useState } from 'react';
import { useUpload } from '@/contexts/UploadContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  FileArchive, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  X, 
  StopCircle,
  Trash2,
  Play,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const formatFileSize = (bytes: number) => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' bytes';
};

export const UploadQueue = () => {
  const { queue, isUploading, cancelAll, cancelFile, removeFromQueue, clearCompleted, startUpload } = useUpload();
  const [isExpanded, setIsExpanded] = useState(true);

  const completedCount = queue.filter(q => q.status === 'completed').length;
  const errorCount = queue.filter(q => q.status === 'error').length;
  const cancelledCount = queue.filter(q => q.status === 'cancelled').length;
  const pendingCount = queue.filter(q => q.status === 'pending').length;
  const uploadingCount = queue.filter(q => q.status === 'uploading').length;
  const activeCount = pendingCount + uploadingCount;
  
  const totalProgress = queue.length > 0 
    ? queue.reduce((sum, q) => sum + q.progress, 0) / queue.length 
    : 0;

  const hasFinishedItems = completedCount + errorCount + cancelledCount > 0;

  if (queue.length === 0) {
    return null;
  }

  // Group queue items by site for display
  const groupedBySite = queue.reduce((acc, item) => {
    const key = `${item.siteId}-${item.sessionId}`;
    if (!acc[key]) {
      acc[key] = {
        siteId: item.siteId,
        siteName: item.siteName,
        sessionName: item.sessionName,
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { siteId: string; siteName: string; sessionName: string; items: typeof queue }>);

  return (
    <Card className="mb-6">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <CardTitle className="flex items-center gap-2 text-lg">
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                ) : activeCount > 0 ? (
                  <FileArchive className="h-5 w-5 text-amber-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                )}
                Upload Queue
                <Badge variant="secondary" className="ml-2">
                  {queue.length} file{queue.length !== 1 ? 's' : ''}
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Status badges */}
                {completedCount > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {completedCount}
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge className="bg-red-100 text-red-700">
                    <XCircle className="h-3 w-3 mr-1" />
                    {errorCount}
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          
          {/* Progress bar always visible */}
          {(isUploading || activeCount > 0) && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>
                  {uploadingCount > 0 ? 'Uploading...' : 'Ready to upload'}
                  {pendingCount > 0 && ` (${pendingCount} in queue)`}
                </span>
                <span>{Math.round(totalProgress)}%</span>
              </div>
              <Progress value={totalProgress} className="h-2" />
            </div>
          )}
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Action buttons */}
            <div className="flex items-center gap-2 mb-4">
              {pendingCount > 0 && !isUploading && (
                <Button size="sm" onClick={startUpload} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                  <Play className="h-4 w-4 mr-1" />
                  Start Upload
                </Button>
              )}
              {(isUploading || activeCount > 0) && (
                <Button size="sm" variant="destructive" onClick={cancelAll}>
                  <StopCircle className="h-4 w-4 mr-1" />
                  Cancel All
                </Button>
              )}
              {hasFinishedItems && (
                <Button size="sm" variant="outline" onClick={clearCompleted}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear Finished
                </Button>
              )}
            </div>

            {/* Queue items grouped by site */}
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {Object.entries(groupedBySite).map(([key, group]) => (
                <div key={key} className="space-y-2">
                  {/* Site/Session header */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground border-b pb-1">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium text-foreground">{group.siteName}</span>
                    <span>•</span>
                    <span>{group.sessionName}</span>
                  </div>
                  
                  {/* Files in this group */}
                  <div className="space-y-2 pl-2">
                    {group.items.map((item) => (
                      <div 
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg",
                          item.status === 'completed' && "bg-emerald-50",
                          item.status === 'error' && "bg-red-50",
                          item.status === 'uploading' && "bg-blue-50",
                          item.status === 'pending' && "bg-slate-50",
                          item.status === 'cancelled' && "bg-gray-50"
                        )}
                      >
                        {/* Status icon */}
                        <div className="flex-shrink-0">
                          {item.status === 'completed' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                          {item.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                          {item.status === 'uploading' && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />}
                          {item.status === 'pending' && <FileArchive className="h-4 w-4 text-slate-400" />}
                          {item.status === 'cancelled' && <XCircle className="h-4 w-4 text-gray-400" />}
                        </div>
                        
                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate">{item.file.name}</span>
                            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                              {formatFileSize(item.file.size)}
                            </span>
                          </div>
                          
                          {item.status === 'uploading' && (
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={item.progress} className="h-1 flex-1" />
                              <span className="text-xs text-muted-foreground w-8 text-right">{item.progress}%</span>
                            </div>
                          )}
                          
                          {item.status === 'error' && item.error && (
                            <div className="text-xs text-red-600 mt-1 truncate">{item.error}</div>
                          )}
                        </div>
                        
                        {/* Action button */}
                        <div className="flex-shrink-0">
                          {item.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromQueue(item.id)}
                              className="h-7 w-7 p-0 hover:bg-slate-200"
                            >
                              <X className="h-4 w-4 text-slate-500" />
                            </Button>
                          )}
                          {item.status === 'uploading' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelFile(item.id)}
                              className="h-7 w-7 p-0 hover:bg-red-100"
                            >
                              <StopCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};