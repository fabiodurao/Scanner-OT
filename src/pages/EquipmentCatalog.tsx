import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useEquipmentCatalog } from '@/hooks/useEquipmentCatalog';
import { EquipmentCatalog as EquipmentCatalogType } from '@/types/catalog';
import { CatalogForm } from '@/components/catalog/CatalogForm';
import { EntityManagement } from '@/components/catalog/EntityManagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { BookOpen, Plus, Search, Trash2, Loader2, Network, Factory, Box, Database, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { logAudit } from '@/utils/auditLog';

interface CatalogRow {
  catalogId: string;
  protocolId: string;
  manufacturer: string;
  model: string;
  protocol: string;
  registerCount: number;
  description: string | null;
}

const EquipmentCatalogPage = () => {
  const navigate = useNavigate();
  const { fetchCatalogs, createCatalog, deleteCatalog, addProtocol } = useEquipmentCatalog();

  const [catalogs, setCatalogs] = useState<EquipmentCatalogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mfgFilter, setMfgFilter] = useState('all');
  const [protoFilter, setProtoFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCatalogs = async () => {
    setLoading(true);
    try {
      const data = await fetchCatalogs();
      setCatalogs(data);
    } catch {
      toast.error('Error loading catalogs');
    }
    setLoading(false);
  };

  useEffect(() => { loadCatalogs(); }, []);

  const rows = useMemo((): CatalogRow[] => {
    const result: CatalogRow[] = [];
    for (const catalog of catalogs) {
      if (catalog.protocols && catalog.protocols.length > 0) {
        for (const proto of catalog.protocols) {
          result.push({
            catalogId: catalog.id,
            protocolId: proto.id,
            manufacturer: catalog.manufacturer,
            model: catalog.model,
            protocol: proto.protocol,
            registerCount: proto.register_count || 0,
            description: catalog.description,
          });
        }
      } else {
        result.push({
          catalogId: catalog.id,
          protocolId: '',
          manufacturer: catalog.manufacturer,
          model: catalog.model,
          protocol: '—',
          registerCount: 0,
          description: catalog.description,
        });
      }
    }
    return result;
  }, [catalogs]);

  const uniqueManufacturers = useMemo(() => [...new Set(rows.map(r => r.manufacturer))].sort(), [rows]);
  const uniqueProtocols = useMemo(() => [...new Set(rows.map(r => r.protocol).filter(p => p !== '—'))].sort(), [rows]);

  const filteredRows = useMemo(() => rows.filter(r => {
    if (mfgFilter !== 'all' && r.manufacturer !== mfgFilter) return false;
    if (protoFilter !== 'all' && r.protocol !== protoFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.manufacturer.toLowerCase().includes(s) && !r.model.toLowerCase().includes(s) && !r.protocol.toLowerCase().includes(s) && !(r.description || '').toLowerCase().includes(s)) return false;
    }
    return true;
  }), [rows, mfgFilter, protoFilter, search]);

  const handleCreate = async (data: {
    manufacturer: string; model: string; description?: string;
    manufacturer_id: string; model_id: string;
    protocol_name: string; protocol_id: string;
  }) => {
    setSaving(true);
    try {
      const catalog = await createCatalog({ manufacturer: data.manufacturer, model: data.model, description: data.description });

      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('equipment_catalogs').update({ manufacturer_id: data.manufacturer_id, model_id: data.model_id }).eq('id', catalog.id);

      if (data.protocol_name && data.protocol_id) {
        await addProtocol(catalog.id, data.protocol_name, []);
        const { data: protos } = await supabase.from('catalog_protocols').select('id').eq('catalog_id', catalog.id).eq('protocol', data.protocol_name).single();
        if (protos) await supabase.from('catalog_protocols').update({ protocol_id: data.protocol_id }).eq('id', protos.id);
      }

      toast.success('Catalog created!');
      logAudit({ action: 'CATALOG_CREATED', target_type: 'catalog', target_identifier: catalog.id, details: { manufacturer: data.manufacturer, model: data.model } });
      setFormOpen(false);
      navigate(`/equipment-catalog/${catalog.id}`);
    } catch (error: any) {
      toast.error(error?.code === '23505' ? 'A catalog with this manufacturer and model already exists.' : 'Error creating catalog: ' + (error?.message || 'Unknown error'));
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try { await deleteCatalog(id); toast.success('Catalog deleted'); logAudit({ action: 'CATALOG_DELETED', target_type: 'catalog', target_identifier: id }); setCatalogs(prev => prev.filter(c => c.id !== id)); }
    catch { toast.error('Error deleting catalog'); }
    setDeletingId(null);
  };

  const hasActiveFilters = search || mfgFilter !== 'all' || protoFilter !== 'all';

  const totalManufacturers = new Set(rows.map(r => r.manufacturer)).size;
  const totalModels = new Set(rows.map(r => `${r.manufacturer}/${r.model}`)).size;
  const totalRegisters = rows.reduce((sum, r) => sum + r.registerCount, 0);

  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Equipment Catalog</h1>
            <p className="text-muted-foreground mt-1">Register maps for industrial equipment</p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
            <Plus className="h-4 w-4 mr-2" />New Catalog
          </Button>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/50">
              <Factory className="h-4 w-4 text-blue-600" />
            </div>
            <span className="font-semibold text-foreground">{totalManufacturers}</span>
            <span className="text-muted-foreground">manufacturers</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/50">
              <Box className="h-4 w-4 text-purple-600" />
            </div>
            <span className="font-semibold text-foreground">{totalModels}</span>
            <span className="text-muted-foreground">models</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50">
              <Database className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="font-semibold text-foreground">{totalRegisters.toLocaleString()}</span>
            <span className="text-muted-foreground">registers</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/50">
              <BookOpen className="h-4 w-4 text-amber-600" />
            </div>
            <span className="font-semibold text-foreground">{catalogs.length}</span>
            <span className="text-muted-foreground">catalogs</span>
          </div>
        </div>

        {/* Reference Data — collapsible, full width */}
        <EntityManagement />

        {/* Filters bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search manufacturer, model, protocol..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <Select value={mfgFilter} onValueChange={setMfgFilter}>
            <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Manufacturer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Manufacturers</SelectItem>
              {uniqueManufacturers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={protoFilter} onValueChange={setProtoFilter}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Protocol" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Protocols</SelectItem>
              {uniqueProtocols.map(p => <SelectItem key={p} value={p}><span className="font-mono">{p}</span></SelectItem>)}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setSearch(''); setMfgFilter('all'); setProtoFilter('all'); }}>
              Clear
            </Button>
          )}
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">
            {filteredRows.length} catalog{filteredRows.length !== 1 ? 's' : ''}
            {hasActiveFilters && ` of ${rows.length}`}
          </span>
        </div>

        {/* Catalog table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl border-dashed">
            <BookOpen className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
            <p className="font-medium text-foreground">
              {hasActiveFilters ? 'No catalogs match your filters' : 'No catalogs yet'}
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {hasActiveFilters ? 'Try adjusting your search or filters' : 'Create a catalog to define register maps for your equipment'}
            </p>
            {!hasActiveFilters && (
              <Button onClick={() => setFormOpen(true)} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                <Plus className="h-4 w-4 mr-2" />New Catalog
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            {/* Table header */}
            <div className="grid grid-cols-[1.2fr_1.2fr_180px_100px_1fr_80px] gap-4 px-5 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <div>Manufacturer</div>
              <div>Model</div>
              <div>Protocol</div>
              <div className="text-center">Registers</div>
              <div>Description</div>
              <div />
            </div>

            {/* Table rows */}
            <div className="divide-y divide-border">
              {filteredRows.map((row, idx) => (
                <div
                  key={`${row.catalogId}-${row.protocolId}-${idx}`}
                  className="grid grid-cols-[1.2fr_1.2fr_180px_100px_1fr_80px] gap-4 px-5 py-3.5 items-center cursor-pointer hover:bg-muted/50 group transition-colors"
                  onClick={() => navigate(`/equipment-catalog/${row.catalogId}`)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/30 flex-shrink-0">
                      <Factory className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-sm text-foreground truncate">{row.manufacturer}</span>
                  </div>

                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-900/30 flex-shrink-0">
                      <Box className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-sm text-foreground truncate">{row.model}</span>
                  </div>

                  <div>
                    {row.protocol !== '—' ? (
                      <Badge variant="secondary" className="font-mono text-xs gap-1">
                        <Network className="h-3 w-3" />{row.protocol}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">No protocol</span>
                    )}
                  </div>

                  <div className="text-center">
                    <span className={`text-sm font-semibold ${row.registerCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {row.registerCount > 0 ? row.registerCount.toLocaleString() : '—'}
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground truncate">
                    {row.description || <span className="italic opacity-50">—</span>}
                  </div>

                  <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigate(`/equipment-catalog/${row.catalogId}`)}
                      title="Open catalog"
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          disabled={deletingId === row.catalogId}
                          title="Delete catalog"
                        >
                          {deletingId === row.catalogId
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />
                          }
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete catalog?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{row.manufacturer} / {row.model}" and all its protocols.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(row.catalogId)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <CatalogForm open={formOpen} onOpenChange={setFormOpen} onSave={handleCreate} saving={saving} />
    </MainLayout>
  );
};

export default EquipmentCatalogPage;