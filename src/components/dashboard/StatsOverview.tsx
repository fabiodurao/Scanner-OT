import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, Variable, CheckCircle, Building2 } from 'lucide-react';

interface StatsOverviewProps {
  totalSites: number;
  totalEquipment: number;
  totalVariables: number;
  confirmedVariables: number;
}

export const StatsOverview = ({
  totalSites,
  totalEquipment,
  totalVariables,
  confirmedVariables,
}: StatsOverviewProps) => {
  const stats = [
    {
      title: 'Sites Ativos',
      value: totalSites,
      icon: Building2,
      color: 'text-[#2563EB]',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Equipamentos',
      value: totalEquipment,
      icon: Server,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Variáveis Totais',
      value: totalVariables,
      icon: Variable,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
    },
    {
      title: 'Variáveis Confirmadas',
      value: confirmedVariables,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1a2744]">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};