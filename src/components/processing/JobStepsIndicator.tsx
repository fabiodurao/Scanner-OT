import { cn } from '@/lib/utils';
import { Download, FileArchive, Search, Cpu, CheckCircle, XCircle, Square, Clock } from 'lucide-react';

type Step = 'pending' | 'downloading' | 'extracting' | 'analyzing' | 'processing' | 'completed' | 'error' | 'cancelled';

interface JobStepsIndicatorProps {
  currentStep: Step;
  progress: number;
  elapsedSeconds?: number;
  totalDuration?: number;
  pcapDuration?: number;
  className?: string;
}

const steps = [
  { key: 'downloading', label: 'Download', icon: Download },
  { key: 'extracting', label: 'Extract', icon: FileArchive },
  { key: 'analyzing', label: 'Analyze', icon: Search },
  { key: 'processing', label: 'Process', icon: Cpu },
  { key: 'completed', label: 'Complete', icon: CheckCircle },
] as const;

const getStepIndex = (step: Step): number => {
  if (step === 'pending') return -1;
  if (step === 'error' || step === 'cancelled') return -2;
  return steps.findIndex(s => s.key === step);
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins < 60) return `${mins}:${secs.toString().padStart(2, '0')}`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const JobStepsIndicator = ({
  currentStep,
  progress,
  elapsedSeconds,
  totalDuration,
  pcapDuration,
  className,
}: JobStepsIndicatorProps) => {
  const currentIndex = getStepIndex(currentStep);
  const isError = currentStep === 'error';
  const isCancelled = currentStep === 'cancelled';
  const isPending = currentStep === 'pending';

  return (
    <div className={cn('space-y-3', className)}>
      {/* Steps indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = currentIndex > index || currentStep === 'completed';
          const isCurrent = currentIndex === index;
          
          // Determine icon and colors
          let iconColor = 'text-slate-300';
          let bgColor = 'bg-slate-100';
          let ringColor = '';
          
          if (isError && isCurrent) {
            iconColor = 'text-red-500';
            bgColor = 'bg-red-100';
          } else if (isCancelled && isCurrent) {
            iconColor = 'text-amber-500';
            bgColor = 'bg-amber-100';
          } else if (isCompleted) {
            iconColor = 'text-emerald-500';
            bgColor = 'bg-emerald-100';
          } else if (isCurrent) {
            iconColor = 'text-blue-500';
            bgColor = 'bg-blue-100';
            ringColor = 'ring-2 ring-blue-500 ring-offset-2';
          }
          
          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {/* Connector line before */}
                {index > 0 && (
                  <div 
                    className={cn(
                      'h-0.5 flex-1',
                      isCompleted || isCurrent ? 'bg-emerald-500' : 'bg-slate-200'
                    )}
                  />
                )}
                
                {/* Icon */}
                <div 
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    bgColor,
                    ringColor
                  )}
                >
                  {isError && isCurrent ? (
                    <XCircle className={cn('h-5 w-5', iconColor)} />
                  ) : isCancelled && isCurrent ? (
                    <Square className={cn('h-5 w-5', iconColor)} />
                  ) : isPending && index === 0 ? (
                    <Clock className={cn('h-5 w-5', iconColor)} />
                  ) : (
                    <Icon className={cn('h-5 w-5', iconColor)} />
                  )}
                </div>
                
                {/* Connector line after */}
                {index < steps.length - 1 && (
                  <div 
                    className={cn(
                      'h-0.5 flex-1',
                      isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                    )}
                  />
                )}
              </div>
              
              {/* Label */}
              <span 
                className={cn(
                  'text-xs mt-1.5 font-medium',
                  isCompleted ? 'text-emerald-600' : 
                  isCurrent ? (isError ? 'text-red-600' : isCancelled ? 'text-amber-600' : 'text-blue-600') : 
                  'text-slate-400'
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar for processing step */}
      {currentStep === 'processing' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Processing...</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Time display */}
          {(elapsedSeconds !== undefined || totalDuration !== undefined || pcapDuration !== undefined) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {elapsedSeconds !== undefined && `Elapsed: ${formatDuration(elapsedSeconds)}`}
              </span>
              <span>
                {(totalDuration || pcapDuration) && 
                  `Est. total: ${formatDuration(totalDuration || pcapDuration || 0)}`
                }
              </span>
            </div>
          )}
        </div>
      )}

      {/* Status messages */}
      {isPending && (
        <div className="text-xs text-center text-muted-foreground">
          Waiting for agent to pick up job...
        </div>
      )}
      
      {isError && (
        <div className="text-xs text-center text-red-600 font-medium">
          Processing failed
        </div>
      )}
      
      {isCancelled && (
        <div className="text-xs text-center text-amber-600 font-medium">
          Cancelled by user
        </div>
      )}
      
      {currentStep === 'completed' && (
        <div className="text-xs text-center text-emerald-600 font-medium">
          Processing completed successfully
        </div>
      )}
    </div>
  );
};