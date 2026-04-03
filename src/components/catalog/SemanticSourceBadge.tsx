import { Badge } from '@/components/ui/badge';
import { BookOpen, Bot, Pencil } from 'lucide-react';

interface SemanticSourceBadgeProps {
  source: string | null;
  className?: string;
}

const sourceConfig: Record<string, { label: string; icon: typeof BookOpen; color: string }> = {
  catalog: { label: 'Catalog', icon: BookOpen, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  ai: { label: 'AI', icon: Bot, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  manual: { label: 'Manual', icon: Pencil, color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

export const SemanticSourceBadge = ({ source, className }: SemanticSourceBadgeProps) => {
  if (!source) return null;

  const config = sourceConfig[source];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} text-[10px] px-1.5 py-0 h-4 gap-1 ${className || ''}`}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </Badge>
  );
};