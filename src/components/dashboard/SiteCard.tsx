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
  eolica: 'Eólica',
  fotovoltaica: 'Fotovoltaica',
  hibrida: 'Híbrida',
  subestacao: 'Subestação',
};

const siteTypeColors: Record<Site['type'], string> = {
  eolica: 'bg-blue-100 text-blue-800',
  fotovoltaica: 'bg-yellow-100 text-yellow-800',
  hibrida: 'bg-purple-100 text-purple-800',
  subestacao: 'bg-gray-100 text-gray-800',
};

export const SiteCard = ({ site, stats }: SiteCardProps) => {
  return (
    <Link to={`/sites/${site.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{site.name}</CardTitle>
            <Badge className={siteTypeColors[site.type]}>
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
              <Server className="h-4 w-4 text-slate-500" />
              <div>
                <div className="text-2xl font-bold">{stats.total_equipment}</div>
                <div className="text-xs text-muted-foreground">Equipamentos</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Variable className="h-4 w-4 text-slate-500" />
              <div>
                <div className="text-2xl font-bold">{stats.total_variables}</div>
                <div className="text-xs text-muted-foreground">Variáveis</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <div>
                <div className="text-2xl font-bold">{stats.confirmed_variables}</div>
                <div className="text-xs text-muted-foreground">Confirmadas</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.published_variables}</div>
                <div className="text-xs text-muted-foreground">Publicadas</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};