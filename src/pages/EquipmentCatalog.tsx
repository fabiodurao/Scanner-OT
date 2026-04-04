import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useEquipmentCatalog } from '@/hooks/useEquipmentCatalog';
import { EquipmentCatalog as EquipmentCatalogType } from '@/types/catalog';
import { CatalogForm } from '@/components/catalog/CatalogForm';
import { EntityManagement } from '@/components/catalog/EntityManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { BookOpen, Plus, Search, Trash2, Loader2, ExternalLink, Network } from 'lucide-react';
import { toast } from 'sonner';

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

  // Flatten catalogs into rows: one row per catalog+protocol
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

  // Unique values for filters
  const uniqueManufacturers = useMemo(() => [...new Set(rows.map(r => r.manufacturer))].sort(), [rows]);
  const uniqueProtocols = useMemo(() => [...new Set(rows.map(r => r.protocol).filter(p => p !== '—'))].sort(), [rows]);

  // Filtered rows
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
      setFormOpen(false);
      navigate(`/equipment-catalog/${catalog.id}`);
    } catch (error: any) {
      toast.error(error?.code === '23505' ? 'A catalog with this manufacturer and model already exists.' : 'Error creating catalog: ' + (error?.message || 'Unknown error'));
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try { await deleteCatalog(id); toast.success('Catalog deleted'); setCatalogs(prev => prev.filter(c => c.id !== id)); }
    catch { toast.error('Error deleting catalog'); }
    setDeletingId(null);
  };

  const hasActiveFilters = search || mfgFilter !== 'all' || protoFilter !== 'all';

  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1a2744]">Equipment Catalog</h1>
            <p className="text-muted-foreground mt-1">Manage register maps for industrial equipment</p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
            <Plus className="h-4 w-4 mr-2" />New Catalog
          </Button>
        </div>

        <EntityManagement />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />Catalogs ({filteredRows.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search manufacturer, model, protocol..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
              </div>
              <Select value={mfgFilter} onValueChange={setMfgFilter}>
                <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Manufacturer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Manufacturers</SelectItem>
                  {uniqueManufacturers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={protoFilter} onValueChange={setProtoFilter}>
                <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Protocol" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Protocols</SelectItem>
                  {uniqueProtocols.map(p => <SelectItem key={p} value={p}><span className="font-mono">{p}</span></SelectItem>)}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(''); setMfgFilter('all'); setProtoFilter('all'); }}>
                  Clear filters
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : filteredRows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">{hasActiveFilters ? 'No catalogs match your filters' : 'No catalogs yet'}</p>
                <p className="text-sm mt-1">Create a catalog to define register maps for your equipment.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Protocol</TableHead>
                      <TableHead className="text-center">Registers</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row, idx) => (
                      <TableRow key={`${row.catalogId}-${row.protocolId}-${idx}`} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/equipment-catalog/${row.catalogId}`)}>
                        <TableCell className="font-medium">{row.manufacturer}</TableCell>
                        <TableCell>{row.model}</TableCell>
                        <TableCell>
                          {row.protocol !== '—' ? (
                            <Badge variant="secondary" className="font-mono text-xs">
                              <Network className="h-3 w-3 mr-1" />{row.protocol}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{row.registerCount}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{row.description || '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/equipment-catalog/${row.catalogId}`)}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" disabled={deletingId === row.catalogId}>
                                  {deletingId === row.catalogId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete catalog?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{row.manufacturer} / {row.model}" and all its protocols.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(row.catalogId)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <CatalogForm open={formOpen} onOpenChange={setFormOpen} onSave={handleCreate} saving={saving} />
      </div>
    </MainLayout>
  );
};

export default EquipmentCatalogPage;