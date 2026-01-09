import { Badge } from '@/components/ui/badge';
import { LearningState } from '@/types';
import { HelpCircle, Lightbulb, CheckCircle, Upload } from 'lucide-react';

interface LearningStateBadgeProps {
  state: LearningState;
}

const stateConfig: Record<LearningState, { label: string; className: string; icon: React.ElementType }> = {
  unknown: {
    label: 'Unknown',
    className: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
    icon: HelpCircle,
  },
  hypothesis: {
    label: 'Hypothesis',
    className: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
    icon: Lightbulb,
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    icon: CheckCircle,
  },
  published: {
    label: 'Published',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    icon: Upload,
  },
};

export const LearningStateBadge = ({ state }: LearningStateBadgeProps) => {
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <Badge className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
};