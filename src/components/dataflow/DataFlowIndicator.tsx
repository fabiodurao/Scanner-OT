import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DataFlowIndicatorProps {
  type: 'receiving' | 'publishing';
  active?: boolean;
  source?: 'livescan' | 'pcap' | null;
  lastAt?: string | null;
  className?: string;
}

export const DataFlowIndicator = ({ type, active = true, source, lastAt, className }: DataFlowIndicatorProps) => {
  const isReceiving = type === 'receiving';

  const activeColor = isReceiving ? 'bg-emerald-500' : 'bg-blue-500';
  const activeRing = isReceiving ? 'bg-emerald-400' : 'bg-blue-400';
  const inactiveColor = 'bg-muted-foreground/30';

  const label = isReceiving ? 'Receiving' : 'Publishing';
  const tooltipLines: string[] = [];

  if (active) {
    tooltipLines.push(isReceiving
      ? `Receiving data${source ? ` (${source})` : ''}`
      : 'Publishing confirmed data');
  } else {
    tooltipLines.push(`${label}: Idle`);
  }

  if (lastAt) {
    const d = new Date(lastAt);
    tooltipLines.push(`Last: ${d.toLocaleDateString()} ${d.toLocaleTimeString()}`);
  } else {
    tooltipLines.push('No data yet');
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('relative flex h-2.5 w-2.5', className)}>
          {active && (
            <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', activeRing)} />
          )}
          <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', active ? activeColor : inactiveColor)} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        {tooltipLines.map((line, i) => (
          <p key={i} className="text-xs">{line}</p>
        ))}
      </TooltipContent>
    </Tooltip>
  );
};
