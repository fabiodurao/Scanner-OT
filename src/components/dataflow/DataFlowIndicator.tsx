import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DataFlowIndicatorProps {
  type: 'receiving' | 'publishing';
  source?: 'livescan' | 'pcap' | null;
  className?: string;
}

export const DataFlowIndicator = ({ type, source, className }: DataFlowIndicatorProps) => {
  const isReceiving = type === 'receiving';
  const color = isReceiving ? 'bg-emerald-500' : 'bg-blue-500';
  const ringColor = isReceiving ? 'bg-emerald-400' : 'bg-blue-400';

  const tooltipText = isReceiving
    ? `Receiving data${source ? ` (${source})` : ''}`
    : 'Publishing confirmed data';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('relative flex h-2.5 w-2.5', className)}>
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', ringColor)} />
          <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', color)} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs">{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
};
