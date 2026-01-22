import { useAnalysisJobs } from '@/contexts/AnalysisJobsContext';
import { Sparkles, Loader2 } from 'lucide-react';

export const ActiveAnalysisIndicator = () => {
  const { activeJobs, loading } = useAnalysisJobs();

  if (loading || activeJobs.length === 0) {
    return null;
  }

  return (
    <div className="px-3 py-2 border-t border-[hsl(var(--sidebar-border))]">
      <div className="block rounded-lg transition-colors">
        <div className="flex items-center justify-between px-2 py-1.5 mb-1">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-purple-400 rounded-full animate-pulse" />
            </div>
            <span className="text-xs font-medium text-purple-400">
              AI Analysis Running
            </span>
          </div>
        </div>
        
        <div className="space-y-2 px-1">
          {activeJobs.slice(0, 2).map(job => (
            <div 
              key={job.id} 
              className="p-2 rounded bg-[hsl(var(--sidebar-accent))]/50"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex items-center justify-center w-5 h-5 rounded bg-purple-500/20">
                  <Loader2 className="h-3 w-3 text-purple-400 animate-spin" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate font-medium">
                    {job.site_name || `Site ${job.site_identifier.slice(0, 8)}...`}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Analyzing variables...
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {activeJobs.length > 2 && (
            <div className="text-[10px] text-gray-500 text-center py-1">
              +{activeJobs.length - 2} more analyzing
            </div>
          )}
        </div>
      </div>
    </div>
  );
};