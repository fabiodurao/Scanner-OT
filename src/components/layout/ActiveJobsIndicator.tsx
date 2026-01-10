import { Link } from 'react-router-dom';
import { useProcessingJobs } from '@/contexts/ProcessingJobsContext';
import { Progress } from '@/components/ui/progress';
import { Cpu, Loader2, Download, FileArchive, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const getStepIcon = (status: string, currentStep: string) => {
  const step = currentStep || status;
  switch (step) {
    case 'pending':
      return <Loader2 className="h-3 w-3 animate-spin" />;
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
    case 'pending':
      return 'Waiting...';
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

  if (loading || activeJobs.length === 0) {
    return null;
  }

  return (
    <div className="px-3 py-2 border-t border-[hsl(var(--sidebar-border))]">
      <Link 
        to="/processing"
        className="block hover:bg-[hsl(var(--sidebar-accent))] rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
          <div className="relative">
            <Cpu className="h-4 w-4 text-amber-400" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-400 rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-medium text-amber-400">
            {activeJobs.length} job{activeJobs.length !== 1 ? 's' : ''} running
          </span>
        </div>
        
        <div className="space-y-2 px-1">
          {activeJobs.slice(0, 3).map(job => (
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
          
          {activeJobs.length > 3 && (
            <div className="text-[10px] text-gray-500 text-center py-1">
              +{activeJobs.length - 3} more job{activeJobs.length - 3 !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};