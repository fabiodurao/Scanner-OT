import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { EquipmentCard } from '@/components/equipment/EquipmentCard';
import { mockSites, mockEquipment, mockVariables, getSiteStats } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, MapPin, Server, Variable, CheckCircle, Upload, AlertCircle, Lightbulb } from 'lucide-react';

const siteTypeLabels: Record<string, string> = {
  eolica: 'Wind',
  fotovoltaica: 'Solar',
  hibrida: 'Hybrid',
  subestacao: 'Substation',
};

const SiteDetail = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const site = mockSites.find(s => s.id === siteId);
  const siteEquipment = mockEquipment.filter(eq => eq.site_id === siteId);
  const stats = siteId ? getSiteStats(siteId) : null;

  if (!site || !stats) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-slate-900">Site not found</h2>
            <Link to="/sites" className="text-emerald-600 hover:underline mt-2 inline-block">
              Back to Sites
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const getVariableCountForEquipment = (equipmentId: string) => {
    return mockVariables.filter(v => v.equipment_id === equipmentId).length;
  };

  return (
    <MainLayout>
      <div className="p-8">
        <Link
          to="/sites"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-slate-900 mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Sites
        </Link>

        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{site.name}</h1>
              <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {site.location}
              </div>
            </div>
            <Badge className="text-sm">{siteTypeLabels[site.type]}</Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Equipment</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_equipment}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Variables</CardTitle>
              <Variable className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_variables}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.confirmed_variables}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <Upload className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.published_variables}</div>
            </CardContent>
          </Card>
        </div>

        {/* Learning State Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Learning Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-8">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-slate-500" />
                <div>
                  <div className="text-xl font-bold">{stats.unknown_variables}</div>
                  <div className="text-xs text-muted-foreground">Unknown</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <div>
                  <div className="text-xl font-bold">{stats.hypothesis_variables}</div>
                  <div className="text-xs text-muted-foreground">Hypotheses</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <div>
                  <div className="text-xl font-bold">{stats.confirmed_variables}</div>
                  <div className="text-xs text-muted-foreground">Confirmed</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-xl font-bold">{stats.published_variables}</div>
                  <div className="text-xs text-muted-foreground">Published</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Equipment</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {siteEquipment.map((equipment) => (
              <EquipmentCard
                key={equipment.id}
                equipment={equipment}
                variableCount={getVariableCountForEquipment(equipment.id)}
                siteId={site.id}
              />
            ))}
          </div>
          {siteEquipment.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              No equipment discovered yet
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default SiteDetail;