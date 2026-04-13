import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataFlowBadgeProps {
  type: 'receiving' | 'publishing';
  source?: 'livescan' | 'pcap' | null;
  lastAt?: string | null;
  className?: string;
}

export const DataFlowBadge = ({ type, source, lastAt, className }: DataFlowBadgeProps) => {
  const isReceiving = type === 'receiving';
  const Icon = isReceiving ? Download : Upload;
  const label = isReceiving
    ? `Receiving${source ? ` (${source})` : ''}`
    : 'Publishing';

  const badgeClass = isReceiving
    ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700'
    : 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700';

  const dotColor = isReceiving ? 'bg-emerald-500' : 'bg-blue-500';
  const dotRing = isReceiving ? 'bg-emerald-400' : 'bg-blue-400';

  const tooltipText = lastAt
    ? `Last: ${new Date(lastAt).toLocaleString()}`
    : 'Active now';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn(badgeClass, 'gap-1.5 cursor-default', className)}>
          <span className="relative flex h-2 w-2">
            <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', dotRing)} />
            <span className={cn('relative inline-flex rounded-full h-2 w-2', dotColor)} />
          </span>
          <Icon className="h-3 w-3" />
          <span className="text-xs">{label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
};
