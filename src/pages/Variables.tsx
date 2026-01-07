import { MainLayout } from '@/components/layout/MainLayout';
import { VariablesTable } from '@/components/variables/VariablesTable';
import { mockSites, mockEquipment, mockVariables } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

const Variables = () => {
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');

  const getEquipmentSiteId = (equipmentId: string) => {
    const eq = mockEquipment.find(e => e.id === equipmentId);
    return eq?.site_id;
  };

  const filteredVariables = mockVariables.filter(v => {
    const siteId = getEquipmentSiteId(v.equipment_id);
    if (siteFilter !== 'all' && siteId !== siteFilter) return false;
    if (stateFilter !== 'all' && v.learning_state !== stateFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesAddress = v.register_address.toString().includes(search);
      const matchesHypothesis = v.semantic_hypothesis?.toLowerCase().includes(searchLower);
      if (!matchesAddress && !matchesHypothesis) return false;
    }
    return true;
  });

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Variáveis</h1>
          <p className="text-muted-foreground mt-1">
            Visão consolidada de todas as variáveis do sistema
          </p>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por endereço ou hipótese..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os sites</SelectItem>
              {mockSites.map(site => (
                <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>

        <div className="mb-4 text-sm text-muted-foreground">
          {filteredVariables.length} variáveis encontradas
        </div>

        <VariablesTable 
          variables={filteredVariables} 
          equipment={mockEquipment}
          showEquipment 
        />
      </div>
    </MainLayout>
  );
};

export default Variables;