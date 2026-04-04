import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useEquipmentCatalog } from '@/hooks/useEquipmentCatalog';
import { EquipmentCatalog, CatalogRegister } from '@/types/catalog';
import { CatalogForm } from '@/components/catalog/CatalogForm';
import { RegisterEditTable } from '@/components/catalog/RegisterEditTable';
import { RegisterPreviewTable } from '@/components/catalog/RegisterPreviewTable';
import { JsonImportDialog } from '@/components/catalog/JsonImportDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChevronLeft, Pencil, Trash2, BookOpen, Network, Variable, Loader2, FileJson, X } from 'lucide-react';
import { toast } from 'sonner';

const EquipmentCatalogDetail = () => {
  const { catalogId } = useParams<{ catalogId: string }>();
  const navigate = useNavigate();
  const { fetchCatalogDetail, updateCatalog, deleteCatalog, updateProtocol, addProtocol } = useEquipmentCatalog();

  const [catalog, setCatalog] = useState<EquipmentCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingRegisters, setSavingRegisters] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [jsonImportOpen, setJsonImportOpen] = useState(false);
  const [jsonImporting, setJsonImporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const loadCatalog = async () => {
    if (!catalogId) return;
    setLoading(true);
    const data = await fetchCatalogDetail(catalogId);
    setCatalog(data);
    setLoading(false);
  };

  useEffect(() => { loadCatalog(); }, [catalogId]);

  const protocol = catalog?.protocols?.[0] || null;

  const handleUpdate = async (data: {
    manufacturer: string; model: string; description?: string;
    manufacturer_id: string; model_id: string;
    protocol_name: string; protocol_id: string;
  }) => {
    if (!catalogId) return;
    setSaving(true);
    try {
      await updateCatalog(catalogId, { manufacturer: data.manufacturer, model: data.model, description: data.description });
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('equipment_catalogs').update({ manufacturer_id: data.manufacturer_id, model_id: data.model_id }).eq('id', catalogId);

      // Update protocol if changed
      if (protocol && data.protocol_name && data.protocol_id) {
        await supabase.from('catalog_protocols')
          .update({ protocol: data.protocol_name, protocol_id: data.protocol_id })
          .eq('id', protocol.id);
      } else if (!protocol && data.protocol_name && data.protocol_id) {
        // Create protocol entry if none exists
        await addProtocol(catalogId, data.protocol_name, []);
        const { data: protos } = await supabase.from('catalog_protocols')
          .select('id').eq('catalog_id', catalogId).eq('protocol', data.protocol_name).single();
        if (protos) {
          await supabase.from('catalog_protocols').update({ protocol_id: data.protocol_id }).eq('id', protos.id);
        }
      }

      toast.success('Catalog updated!');
      setEditOpen(false);
      await loadCatalog();
    } catch (error: any) {
      toast.error(error?.code === '23505' ? 'Duplicate manufacturer/model' : 'Error updating catalog');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!catalogId) return;
    setDeleting(true);
    try { await deleteCatalog(catalogId); toast.success('Catalog deleted'); navigate('/equipment-catalog'); }
    catch { toast.error('Error deleting catalog'); }
    setDeleting(false);
  };

  const handleSaveRegisters = async (registers: CatalogRegister[]) => {
    if (!protocol) return;
    setSavingRegisters(true);
    try {
      await updateProtocol(protocol.id, registers);
      toast.success(`Saved ${registers.length} registers`);
      setIsEditing(false);
      await loadCatalog();
    } catch { toast.error('Error saving registers'); }
    setSavingRegisters(false);
  };

  const handleJsonImport = async (registers: CatalogRegister[]) => {
    if (!protocol) return;
    setJsonImporting(true);
    try {
      await updateProtocol(protocol.id, registers);
      toast.success(`Imported ${registers.length} registers`);
      setJsonImportOpen(false);
      await loadCatalog();
    } catch { toast.error('Error importing registers'); }
    setJsonImporting(false);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!catalog) {
    return (
      <MainLayout>
        <div className="p-8 text-center py-12">
          <h2 className="text-2xl font-bold">Catalog not found</h2>
          <Link to="/equipment-catalog" className="text-[#2563EB] hover:underline mt-2 inline-block">Back to Equipment Catalog</Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        <Link to="/equipment-catalog" className="inline-flex items-center text-sm text-muted-foreground hover:text-slate-900">
          <ChevronLeft className="h-4 w-4 mr-1" />Back to Equipment Catalog
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <BookOpen className="h-8 w-8 text-[#2563EB]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1a2744]">{catalog.manufacturer} / {catalog.model}</h1>
              <div className="flex items-center gap-2 mt-1">
                {protocol && (
                  <Badge variant="secondary" className="font-mono">
                    <Network className="h-3 w-3 mr-1" />{protocol.protocol}
                  </Badge>
                )}
                {catalog.description && <span className="text-muted-foreground text-sm">— {catalog.description}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />Edit Info
            </Button>
            <Button variant="outline" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Protocol</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-lg font-mono font-medium">{protocol?.protocol || '—'}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registers</CardTitle>
              <Variable className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{protocol?.register_count || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Manufacturer</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">{catalog.manufacturer}</div>
              <div className="text-sm text-muted-foreground">{catalog.model}</div>
            </CardContent>
          </Card>
        </div>

        {/* Register Definitions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Register Definitions</CardTitle>
                <CardDescription>{isEditing ? 'Edit registers or import via JSON' : 'View register map for this catalog'}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />Edit Registers
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setJsonImportOpen(true)}>
                      <FileJson className="h-4 w-4 mr-2" />Import JSON
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4 mr-2" />Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {protocol ? (
              isEditing ? (
                <RegisterEditTable
                  registers={protocol.registers || []}
                  onSave={handleSaveRegisters}
                  saving={savingRegisters}
                />
              ) : (
                <RegisterPreviewTable
                  registers={protocol.registers || []}
                  onAICategorize={async (updatedRegisters) => {
                    try {
                      await updateProtocol(protocol.id, updatedRegisters);
                      toast.success('AI categories saved!');
                      await loadCatalog();
                    } catch {
                      toast.error('Error saving AI categories');
                    }
                  }}
                />
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                No protocol defined for this catalog.
              </div>
            )}
          </CardContent>
        </Card>

        <CatalogForm open={editOpen} onOpenChange={setEditOpen} catalog={catalog} onSave={handleUpdate} saving={saving} />
        <JsonImportDialog open={jsonImportOpen} onOpenChange={setJsonImportOpen} onImport={handleJsonImport} isImporting={jsonImporting} title="Import Register Definitions" />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete catalog?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete "{catalog.manufacturer} / {catalog.model}" and all its register definitions.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
                {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default EquipmentCatalogDetail;