import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { VariablesTable } from '@/components/variables/VariablesTable';
import { mockSites, mockEquipment, mockVariables } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Server, Cpu, Zap, Gauge, Activity, Network } from 'lucide-react';
import { EquipmentType } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

const equipmentTypeConfig: Record<EquipmentType, { label: string; icon: React.ElementType; color: string }> = {
  scada: { label: 'SCADA', icon: Server, color: 'bg-blue-100 text-blue-700' },
  clp: { label: 'CLP', icon: Cpu, color: 'bg-purple-100 text-purple-700' },
  inversor: { label: 'Inversor', icon: Zap, color: 'bg-yellow-100 text-yellow-700' },
  gerador: { label: 'Gerador', icon: Activity, color: 'bg-green-100 text-green-700' },
  multimedidor: { label: 'Multimedidor', icon: Gauge, color: 'bg-orange-100 text-orange-700' },
  gateway: { label: 'Gateway', icon: Network, color: 'bg-slate-100 text-slate-700' },
  unknown: { label: 'Desconhecido', icon: Server, color: 'bg-gray-100 text-gray-700' },
};

const EquipmentDetail = () => {
  const { siteId, equipmentId } = useParams<{ siteId: string; equipmentId: string }>();
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const site = mockSites.find(s => s.id === siteId);
  const equipment = mockEquipment.find(eq => eq.id === equipmentId);
  const equipmentVariables = mockVariables.filter(v => v.equipment_id === equipmentId);

  if (!site || !equipment) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-slate-900">Equipamento não encontrado</h2>
            <Link to="/sites" className="text-emerald-600 hover:underline mt-2 inline-block">
              Voltar para Sites
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const config = equipmentTypeConfig[equipment.type];
  const Icon = config.icon;

  const filteredVariables = equipmentVariables.filter(v => {
    if (stateFilter !== 'all' && v.learning_state !== stateFilter) return false;
    if (typeFilter !== 'all' && v.data_type !== typeFilter) return false;
    return true;
  });

  const dataTypes = [...new Set(equipmentVariables.map(v => v.data_type))];

  return (
    <MainLayout>
      <div className="p-8">
        <Link
          to={`/sites/${siteId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-slate-900 mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar para {site.name}
        </Link>

        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${config.color}`}>
                <Icon className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{equipment.name}</h1>
                <div className="text-muted-foreground mt-1">
                  {equipment.manufacturer || 'Fabricante desconhecido'}
                </div>
              </div>
            </div>
            <Badge className={config.color}>{config.label}</Badge>
          </div>
        </div>

        {/* Equipment Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Informações do Equipamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Endereço IP</div>
                <div className="font-mono">{equipment.ip_address}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">MAC Address</div>
                <div className="font-mono text-sm">{equipment.mac_address}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Descoberto em</div>
                <div>{new Date(equipment.discovered_at).toLocaleDateString('pt-BR')}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Última atividade</div>
                <div>{new Date(equipment.last_seen).toLocaleDateString('pt-BR')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variables Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Variáveis ({filteredVariables.length})
            </h2>
            <div className="flex gap-2">
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  <SelectItem value="unknown">Desconhecido</SelectItem>
                  <SelectItem value="hypothesis">Hipótese</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tipo de dado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {dataTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <VariablesTable variables={filteredVariables} />
        </div>
      </div>
    </MainLayout>
  );
};

export default EquipmentDetail;