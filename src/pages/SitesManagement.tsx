import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Site } from '@/types/upload';
import { generateUUIDv7, isValidUUID } from '@/utils/uuid';
import { AddressAutocomplete } from '@/components/maps/AddressAutocomplete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  MapPin, 
  Copy, 
  RefreshCw, 
  Loader2,
  Wind,
  Sun,
  Zap,
  Building,
  Search,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

const siteTypeConfig = {
  eolica: { label: 'Wind', icon: Wind, color: 'bg-blue-100 text-blue-700' },
  fotovoltaica: { label: 'Solar', icon: Sun, color: 'bg-amber-100 text-amber-700' },
  hibrida: { label: 'Hybrid', icon: Zap, color: 'bg-purple-100 text-purple-700' },
  subestacao: { label: 'Substation', icon: Building, color: 'bg-slate-100 text-slate-700' },
};

interface SiteFormData {
  name: string;
  unique_id: string;
  latitude: string;
  longitude: string;
  address: string;
  city: string;
  state: string;
  country: string;
  site_type: string;
  description: string;
}

const emptyFormData: SiteFormData = {
  name: '',
  unique_id: '',
  latitude: '',
  longitude: '',
  address: '',
  city: '',
  state: '',
  country: '',
  site_type: 'fotovoltaica',
  description: '',
};

const SitesManagement = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [formData, setFormData] = useState<SiteFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSites = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Error loading sites');
      console.error(error);
    } else {
      setSites(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleOpenCreate = () => {
    setEditingSite(null);
    setFormData({
      ...emptyFormData,
      unique_id: generateUUIDv7(),
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (site: Site) => {
    setEditingSite(site);
    setFormData({
      name: site.name || '',
      unique_id: site.unique_id || '',
      latitude: site.latitude?.toString() || '',
      longitude: site.longitude?.toString() || '',
      address: site.address || '',
      city: site.city || '',
      state: site.state || '',
      country: site.country || '',
      site_type: site.site_type || 'fotovoltaica',
      description: site.description || '',
    });
    setDialogOpen(true);
  };

  const handleGenerateUUID = () => {
    setFormData(prev => ({ ...prev, unique_id: generateUUIDv7() }));
    toast.success('New UUID v7 generated');
  };

  const handleCopyUUID = () => {
    navigator.clipboard.writeText(formData.unique_id);
    toast.success('UUID copied to clipboard');
  };

  const handleAddressChange = (data: Record<string, unknown>) => {
    setFormData(prev => ({
      ...prev,
      address: data.address !== undefined ? String(data.address || '') : prev.address,
      latitude: data.latitude !== undefined ? String(data.latitude || '') : prev.latitude,
      longitude: data.longitude !== undefined ? String(data.longitude || '') : prev.longitude,
      city: data.city !== undefined ? String(data.city || '') : prev.city,
      state: data.state !== undefined ? String(data.state || '') : prev.state,
      country: data.country !== undefined ? String(data.country || '') : prev.country,
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Site name is required');
      return;
    }

    if (formData.unique_id && !isValidUUID(formData.unique_id)) {
      toast.error('Invalid UUID format');
      return;
    }

    setSaving(true);

    const siteData = {
      name: formData.name.trim(),
      unique_id: formData.unique_id || null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      country: formData.country || null,
      site_type: formData.site_type || null,
      description: formData.description || null,
    };

    if (editingSite) {
      const { error } = await supabase
        .from('customers')
        .update(siteData)
        .eq('id', editingSite.id);

      if (error) {
        if (error.code === '23505') {
          toast.error('This UUID is already in use by another site');
        } else {
          toast.error('Error updating site: ' + error.message);
        }
        setSaving(false);
        return;
      }

      toast.success('Site updated successfully');
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('customers')
        .insert({
          ...siteData,
          created_by: user?.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This UUID is already in use');
        } else {
          toast.error('Error creating site: ' + error.message);
        }
        setSaving(false);
        return;
      }

      toast.success('Site created successfully');
    }

    setSaving(false);
    setDialogOpen(false);
    fetchSites();
  };

  const handleDelete = async (siteId: string) => {
    setDeleting(siteId);

    console.log('Attempting to delete site:', siteId);

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', siteId);

    if (error) {
      console.error('Delete error:', error);
      toast.error('Error deleting site: ' + error.message);
      setDeleting(null);
      return;
    }

    console.log('Site deleted successfully');
    toast.success('Site deleted successfully');
    
    // Refresh the list from the database to ensure consistency
    await fetchSites();
    setDeleting(null);
  };

  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const filteredSites = sites.filter(site => {
    const searchLower = search.toLowerCase();
    return (
      site.name.toLowerCase().includes(searchLower) ||
      site.city?.toLowerCase().includes(searchLower) ||
      site.state?.toLowerCase().includes(searchLower) ||
      site.country?.toLowerCase().includes(searchLower) ||
      site.unique_id?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1a2744]">Sites Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage site information and locations worldwide
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
            <Plus className="h-4 w-4 mr-2" />
            New Site
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, city, country or UUID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Sites Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Registered Sites ({filteredSites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredSites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{search ? 'No sites found' : 'No sites registered yet'}</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Unique ID</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSites.map((site) => {
                      const typeConfig = site.site_type ? siteTypeConfig[site.site_type as keyof typeof siteTypeConfig] : null;
                      const TypeIcon = typeConfig?.icon || Building2;
                      
                      return (
                        <TableRow key={site.id}>
                          <TableCell>
                            <div className="font-medium">{site.name}</div>
                            {site.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {site.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {typeConfig ? (
                              <Badge className={typeConfig.color}>
                                <TypeIcon className="h-3 w-3 mr-1" />
                                {typeConfig.label}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {site.city || site.state || site.country ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span>
                                  {[site.city, site.state, site.country].filter(Boolean).join(', ')}
                                </span>
                                {site.latitude && site.longitude && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 ml-1"
                                    onClick={() => openInGoogleMaps(site.latitude!, site.longitude!)}
                                    title="Open in Google Maps"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {site.unique_id ? (
                              <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                                {site.unique_id.slice(0, 8)}...
                              </code>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(site)}
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    disabled={deleting === site.id}
                                  >
                                    {deleting === site.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete site?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete "{site.name}" and all associated data. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(site.id)}
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSite ? 'Edit Site' : 'New Site'}
              </DialogTitle>
              <DialogDescription>
                {editingSite 
                  ? 'Update site information and details'
                  : 'Register a new site with location information'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Basic Information</h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="name">Site Name *</Label>
                    <Input
                      id="name"
                      placeholder="E.g.: Northeast Solar Plant I"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="site_type">Site Type</Label>
                    <Select 
                      value={formData.site_type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, site_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fotovoltaica">
                          <div className="flex items-center gap-2">
                            <Sun className="h-4 w-4 text-amber-500" />
                            Solar
                          </div>
                        </SelectItem>
                        <SelectItem value="eolica">
                          <div className="flex items-center gap-2">
                            <Wind className="h-4 w-4 text-blue-500" />
                            Wind
                          </div>
                        </SelectItem>
                        <SelectItem value="hibrida">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-purple-500" />
                            Hybrid
                          </div>
                        </SelectItem>
                        <SelectItem value="subestacao">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-slate-500" />
                            Substation
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Brief description..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Unique ID */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Unique Identifier (UUID v7)</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="unique_id">Unique ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="unique_id"
                      placeholder="019ba81c-7573-7bb3-8f99-c585fd61faa3"
                      value={formData.unique_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, unique_id: e.target.value }))}
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleGenerateUUID}
                      title="Generate new UUID v7"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopyUUID}
                      title="Copy UUID"
                      disabled={!formData.unique_id}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    UUID v7 is time-ordered and globally unique. 
                    <a 
                      href="https://www.uuidgenerator.net/version7" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#2563EB] hover:underline ml-1"
                    >
                      Learn more
                    </a>
                  </p>
                </div>
              </div>

              {/* Location with Autocomplete and Map */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Location</h3>
                
                <AddressAutocomplete
                  value={formData.address}
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  city={formData.city}
                  state={formData.state}
                  country={formData.country}
                  onAddressChange={handleAddressChange}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingSite ? 'Save Changes' : 'Create Site'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default SitesManagement;