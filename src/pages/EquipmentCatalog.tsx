import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useEquipmentCatalog } from '@/hooks/useEquipmentCatalog';
import { EquipmentCatalog as EquipmentCatalogType } from '@/types/catalog';
import { CatalogForm } from '@/components/catalog/CatalogForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { BookOpen, Plus, Search, Pencil, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const EquipmentCatalogPage = () => {
  const navigate = useNavigate();
  const { fetchCatalogs, createCatalog, deleteCatalog } = useEquipmentCatalog();

  const [catalogs, setCatalogs] = useState<EquipmentCatalogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCatalogs = async () => {
    setLoading(true);
    try {
      const data = await fetchCatalogs();
      setCatalogs(data);
    } catch (error) {
      toast.error('Error loading catalogs');
    }
    setLoading(false);
  };

  useEffect(() => { loadCatalogs(); }, []);

  const handleCreate = async (data: { manufacturer: string; model: string; description?: string }) => {
    setSaving(true);
    try {
      const catalog = await createCatalog(data);
      toast.success('Catalog created!');
      setFormOpen(false);
      navigate(`/equipment-catalog/${catalog.id}`);
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.error('A catalog with this manufacturer and model already exists.');
      } else {
        toast.error('Error creating catalog: ' + (error?.message || 'Unknown error'));
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteCatalog(id);
      toast.success('Catalog deleted');
      setCatalogs(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      toast.error('Error deleting catalog');
    }
    setDeletingId(null);
  };

  const filtered = catalogs.filter(c => {
    const s = search.toLowerCase();
    return c.manufacturer.toLowerCase().includes(s) ||
      c.model.toLowerCase().includes(s) ||
      (c.description || '').toLowerCase().includes(s);
  });

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1a2744]">Equipment Catalog</h1>
            <p className="text-muted-foreground mt-1">
              Manage register maps for industrial equipment
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
            <Plus className="h-4 w-4 mr-2" />New Catalog
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by manufacturer, model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Catalogs ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">{search ? 'No catalogs match your search' : 'No catalogs yet'}</p>
                <p className="text-sm mt-1">Create a catalog to define register maps for your equipment.</p>
                {!search && (
                  <Button onClick={() => setFormOpen(true)} className="mt-4 bg-[#2563EB] hover:bg-[#1d4ed8]">
                    <Plus className="h-4 w-4 mr-2" />New Catalog
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Protocols</TableHead>
                      <TableHead>Registers</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((catalog) => (
                      <TableRow
                        key={catalog.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => navigate(`/equipment-catalog/${catalog.id}`)}
                      >
                        <TableCell className="font-medium">{catalog.manufacturer}</TableCell>
                        <TableCell>{catalog.model}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{catalog.protocol_count || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{catalog.total_registers || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                          {catalog.description || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => navigate(`/equipment-catalog/${catalog.id}`)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  disabled={deletingId === catalog.id}
                                >
                                  {deletingId === catalog.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete catalog?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{catalog.manufacturer} / {catalog.model}" and all its protocols. Equipment linked to this catalog will be unlinked, but applied semantics will be preserved.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(catalog.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
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

        <CatalogForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSave={handleCreate}
          saving={saving}
        />
      </div>
    </MainLayout>
  );
};

export default EquipmentCatalogPage;