import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { siteTypeConfig } from '@/pages/SitesManagement';
import { SITE_TYPE_ICONS } from '@/components/icons/SiteTypeIcon';
import { cn } from '@/lib/utils';

interface SiteTypeFilterProps {
  typeCounts: Record<string, number>;
  selectedTypes: Set<string>;
  onToggleType: (type: string) => void;
}

export const SiteTypeFilter = ({ typeCounts, selectedTypes, onToggleType }: SiteTypeFilterProps) => {
  // Only show types that have at least 1 site
  const activeTypes = Object.entries(typeCounts).filter(([, count]) => count > 0);

  if (activeTypes.length === 0) return null;

  return (
    <div className="flex items-center gap-1 bg-secondary/80 dark:bg-muted/60 rounded-lg p-1 border border-border">
      {activeTypes.map(([type, count]) => {
        const config = siteTypeConfig[type];
        const IconComponent = SITE_TYPE_ICONS[type];
        if (!config || !IconComponent) return null;

        const isSelected = selectedTypes.has(type);

        return (
          <Tooltip key={type} delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onToggleType(type)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-150 select-none border',
                  isSelected
                    ? 'shadow-sm border-border dark:border-white/10'
                    : 'opacity-40 hover:opacity-70 border-transparent'
                )}
                style={
                  isSelected
                    ? { backgroundColor: config.bgColor, color: config.primaryColor }
                    : { backgroundColor: 'transparent', color: 'hsl(var(--muted-foreground))' }
                }
              >
                <IconComponent
                  primaryColor={isSelected ? config.primaryColor : 'hsl(var(--muted-foreground))'}
                  secondaryColor={isSelected ? config.secondaryColor : 'hsl(var(--muted-foreground))'}
                  size={14}
                />
                <span>{count}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <span className="font-medium">{config.label}</span>
              <span className="text-muted-foreground ml-1">({count} site{count !== 1 ? 's' : ''})</span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};