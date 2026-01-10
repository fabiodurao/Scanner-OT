import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types/upload';
import { generateUUIDv7, isValidUUID } from '@/utils/uuid';
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

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface CustomerFormData {
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

const emptyFormData: CustomerFormData = {
  name: '',
  unique_id: '',
  latitude: '',
  longitude: '',
  address: '',
  city: '',
  state: '',
  country: 'Brasil',
  site_type: 'fotovoltaica',
  description: '',
};

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Error loading customers');
      console.error(error);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData({
      ...emptyFormData,
      unique_id: generateUUIDv7(),
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      unique_id: customer.unique_id || '',
      latitude: customer.latitude?.toString() || '',
      longitude: customer.longitude?.toString() || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || 'Brasil',
      site_type: customer.site_type || 'fotovoltaica',
      description: customer.description || '',
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

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    if (formData.unique_id && !isValidUUID(formData.unique_id)) {
      toast.error('Invalid UUID format');
      return;
    }

    setSaving(true);

    const customerData = {
      name: formData.name.trim(),
      unique_id: formData.unique_id || null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      country: formData.country || 'Brasil',
      site_type: formData.site_type || null,
      description: formData.description || null,
    };

    if (editingCustomer) {
      const { error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', editingCustomer.id);

      if (error) {
        if (error.code === '23505') {
          toast.error('This UUID is already in use by another customer');
        } else {
          toast.error('Error updating customer: ' + error.message);
        }
        setSaving(false);
        return;
      }

      toast.success('Customer updated successfully');
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('customers')
        .insert({
          ...customerData,
          created_by: user?.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This UUID is already in use');
        } else {
          toast.error('Error creating customer: ' + error.message);
        }
        setSaving(false);
        return;
      }

      toast.success('Customer created successfully');
    }

    setSaving(false);
    setDialogOpen(false);
    fetchCustomers();
  };

  const handleDelete = async (customerId: string) => {
    setDeleting(customerId);

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) {
      toast.error('Error deleting customer: ' + error.message);
    } else {
      toast.success('Customer deleted successfully');
      setCustomers(prev => prev.filter(c => c.id !== customerId));
    }

    setDeleting(null);
  };

  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = search.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.city?.toLowerCase().includes(searchLower) ||
      customer.state?.toLowerCase().includes(searchLower) ||
      customer.unique_id?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1a2744]">Customers / Sites</h1>
            <p className="text-muted-foreground mt-1">
              Manage customer information and site locations
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
            <Plus className="h-4 w-4 mr-2" />
            New Customer
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, city, state or UUID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Registered Customers ({filteredCustomers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{search ? 'No customers found' : 'No customers registered yet'}</p>
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
                    {filteredCustomers.map((customer) => {
                      const typeConfig = customer.site_type ? siteTypeConfig[customer.site_type as keyof typeof siteTypeConfig] : null;
                      const TypeIcon = typeConfig?.icon || Building2;
                      
                      return (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div className="font-medium">{customer.name}</div>
                            {customer.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {customer.description}
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
                            {customer.city || customer.state ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span>
                                  {[customer.city, customer.state].filter(Boolean).join(', ')}
                                </span>
                                {customer.latitude && customer.longitude && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 ml-1"
                                    onClick={() => openInGoogleMaps(customer.latitude!, customer.longitude!)}
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
                            {customer.unique_id ? (
                              <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                                {customer.unique_id.slice(0, 8)}...
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
                                onClick={() => handleOpenEdit(customer)}
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
                                    disabled={deleting === customer.id}
                                  >
                                    {deleting === customer.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete customer?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete "{customer.name}" and all associated data. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(customer.id)}
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Edit Customer' : 'New Customer'}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer 
                  ? 'Update customer information and site details'
                  : 'Register a new customer with site information'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="name">Customer / Site Name *</Label>
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
                <h3 className="text-sm font-medium text-muted-foreground">Unique Identifier (UUID v7)</h3>
                
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

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="Street, number, neighborhood..."
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="E.g.: Petrolina"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select 
                      value={formData.state} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {brazilianStates.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      placeholder="-9.389866"
                      value={formData.latitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      placeholder="-40.502782"
                      value={formData.longitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                    />
                  </div>
                </div>

                {formData.latitude && formData.longitude && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openInGoogleMaps(parseFloat(formData.latitude), parseFloat(formData.longitude))}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    View on Google Maps
                  </Button>
                )}
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
                  editingCustomer ? 'Save Changes' : 'Create Customer'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Customers;