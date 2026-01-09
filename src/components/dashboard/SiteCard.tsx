import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Site, SiteStats } from '@/types';
import { MapPin, Server, Variable, CheckCircle, Upload } from 'lucide-react';

interface SiteCardProps {
  site: Site;
  stats: SiteStats;
}

const siteTypeLabels: Record<Site['type'], string> = {
  eolica: 'Wind',
  fotovoltaica: 'Solar',
  hibrida: 'Hybrid',
  subestacao: 'Substation',
};

const siteTypeColors: Record<Site['type'], string> = {
  eolica: 'bg-blue-100 text-blue-700 border-blue-200',
  fotovoltaica: 'bg-amber-100 text-amber-700 border-amber-200',
  hibrida: 'bg-purple-100 text-purple-700 border-purple-200',
  subestacao: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const SiteCard = ({ site, stats }: SiteCardProps) => {
  return (
    <Link to={`/sites/${site.id}`}>
      <Card className="hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer border-slate-200 hover:border-[#2563EB]/30">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg text-[#1a2744]">{site.name}</CardTitle>
            <Badge className={siteTypeColors[site.type]} variant="outline">
              {siteTypeLabels[site.type]}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {site.location}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-slate-100">
                <Server className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1a2744]">{stats.total_equipment}</div>
                <div className="text-xs text-muted-foreground">Equipment</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-slate-100">
                <Variable className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1a2744]">{stats.total_variables}</div>
                <div className="text-xs text-muted-foreground">Variables</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{stats.confirmed_variables}</div>
                <div className="text-xs text-muted-foreground">Confirmed</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <Upload className="h-4 w-4 text-[#2563EB]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#2563EB]">{stats.published_variables}</div>
                <div className="text-xs text-muted-foreground">Published</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};