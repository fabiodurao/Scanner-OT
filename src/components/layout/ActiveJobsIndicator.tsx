import { Link } from 'react-router-dom';
import { useProcessingJobs } from '@/contexts/ProcessingJobsContext';
import { Progress } from '@/components/ui/progress';
import { Cpu, Loader2, Download, FileArchive, Search, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const getStepIcon = (status: string, currentStep: string) => {
  const step = currentStep || status;
  switch (step) {
    case 'downloading':
      return <Download className="h-3 w-3" />;
    case 'extracting':
      return <FileArchive className="h-3 w-3" />;
    case 'analyzing':
      return <Search className="h-3 w-3" />;
    case 'processing':
    case 'running':
      return <Cpu className="h-3 w-3" />;
    default:
      return <Loader2 className="h-3 w-3 animate-spin" />;
  }
};

const getStepLabel = (status: string, currentStep: string) => {
  const step = currentStep || status;
  switch (step) {
    case 'downloading':
      return 'Downloading';
    case 'extracting':
      return 'Extracting';
    case 'analyzing':
      return 'Analyzing';
    case 'processing':
    case 'running':
      return 'Processing';
    default:
      return 'Working...';
  }
};

export const ActiveJobsIndicator = () => {
  const { activeJobs, loading } = useProcessingJobs();

  // Filter to only show jobs that are actually running (not pending)
  const runningJobs = activeJobs.filter(job => 
    ['downloading', 'extracting', 'running'].includes(job.status)
  );

  // Count pending jobs (in queue)
  const pendingJobs = activeJobs.filter(job => job.status === 'pending');
  const queueCount = pendingJobs.length;

  // Don't show if no running jobs and no queue
  if (loading || (runningJobs.length === 0 && queueCount === 0)) {
    return null;
  }

  return (
    <div className="px-3 py-2 border-t border-[hsl(var(--sidebar-border))]">
      <Link 
        to="/processing"
        className="block hover:bg-[hsl(var(--sidebar-accent))] rounded-lg transition-colors"
      >
        {/* Header with running count and queue count */}
        <div className="flex items-center justify-between px-2 py-1.5 mb-1">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Cpu className="h-4 w-4 text-amber-400" />
              {runningJobs.length > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-400 rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-xs font-medium text-amber-400">
              {runningJobs.length > 0 
                ? `${runningJobs.length} running`
                : 'Agent idle'
              }
            </span>
          </div>
          
          {/* Queue indicator */}
          {queueCount > 0 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/20 rounded text-blue-400">
              <Clock className="h-3 w-3" />
              <span className="text-[10px] font-medium">
                {queueCount} queued
              </span>
            </div>
          )}
        </div>
        
        {/* Running jobs list */}
        {runningJobs.length > 0 && (
          <div className="space-y-2 px-1">
            {runningJobs.slice(0, 3).map(job => (
              <div 
                key={job.id} 
                className="p-2 rounded bg-[hsl(var(--sidebar-accent))]/50"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={cn(
                    "flex items-center justify-center w-5 h-5 rounded",
                    job.status === 'running' || job.current_step === 'processing' 
                      ? "bg-amber-500/20 text-amber-400" 
                      : "bg-blue-500/20 text-blue-400"
                  )}>
                    {getStepIcon(job.status, job.current_step)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate font-medium">
                      {job.pcap_filename}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {getStepLabel(job.status, job.current_step)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={job.progress} 
                    className="h-1 flex-1 bg-gray-700"
                  />
                  <span className="text-[10px] text-gray-400 w-8 text-right">
                    {job.progress}%
                  </span>
                </div>
              </div>
            ))}
            
            {runningJobs.length > 3 && (
              <div className="text-[10px] text-gray-500 text-center py-1">
                +{runningJobs.length - 3} more running
              </div>
            )}
          </div>
        )}
      </Link>
    </div>
  );
};