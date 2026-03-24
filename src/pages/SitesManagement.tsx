import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useDiscoveryData } from '@/hooks/useDiscoveryData';
import { Site } from '@/types/upload';
import { generateUUIDv7, isValidUUID } from '@/utils/uuid';
import { AddressAutocomplete } from '@/components/maps/AddressAutocomplete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Search,
  ExternalLink,
  AlertTriangle,
  Activity,
  Server,
  Variable,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

// Inline SVG icon component
const FaIcon = ({
  svgPath,
  viewBox = '0 0 512 512',
  color,
  size = 16,
  className = '',
}: {
  svgPath: string;
  viewBox?: string;
  color: string;
  size?: number;
  className?: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={viewBox}
    width={size}
    height={size}
    fill={color}
    className={className}
    aria-hidden="true"
  >
    <path d={svgPath} />
  </svg>
);

// FA Pro SVG paths (inline, no package needed)
export const FA_PATHS = {
  windTurbine: {
    viewBox: '0 0 512 512',
    path: 'M256 32c-8.8 0-16 7.2-16 16l0 176.2-90.9-52.5c-7.6-4.4-17.4-1.8-21.8 5.9s-1.8 17.4 5.9 21.8L224 251.7l0 8.3c0 17.7 14.3 32 32 32s32-14.3 32-32l0-8.3 90.9-52.5c7.6-4.4 10.3-14.2 5.9-21.8s-14.2-10.3-21.8-5.9L272 224.2 272 48c0-8.8-7.2-16-16-16zM240 320l0 144-32 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l96 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-32 0 0-144c-5.2 .6-10.5 1-16 1s-10.8-.3-16-1z',
  },
  windSparkle: {
    viewBox: '0 0 512 512',
    path: 'M288 32c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64s14.3-32 32-32H288zM0 192c0-17.7 14.3-32 32-32H352c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zm32 96H224c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32zm352-96c0-17.7 14.3-32 32-32s32 14.3 32 32v32c0 17.7-14.3 32-32 32s-32-14.3-32-32V192zm32 128c17.7 0 32 14.3 32 32v32c0 17.7-14.3 32-32 32s-32-14.3-32-32V352c0-17.7 14.3-32 32-32zm-64-192c0-8.8 7.2-16 16-16s16 7.2 16 16v16c0 8.8-7.2 16-16 16s-16-7.2-16-16V128zm16 80c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16s-16-7.2-16-16V224c0-8.8 7.2-16 16-16z',
  },
  arrowUpFromGroundWater: {
    viewBox: '0 0 576 512',
    path: 'M288 0c-13.3 0-24 10.7-24 24V142.1l-35.7-35.7c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9L264 210.1c6.2 6.2 14.4 9.4 22.6 9.4H288h1.4c8.2 0 16.4-3.1 22.6-9.4l69.6-69.8c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0L312 142.1V24c0-13.3-10.7-24-24-24zM0 320c0 17.7 14.3 32 32 32H64v32c0 17.7 14.3 32 32 32s32-14.3 32-32V352h64v32c0 17.7 14.3 32 32 32s32-14.3 32-32V352h64v32c0 17.7 14.3 32 32 32s32-14.3 32-32V352h64v32c0 17.7 14.3 32 32 32s32-14.3 32-32V352h32c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32zm64 128v32c0 17.7 14.3 32 32 32s32-14.3 32-32V448H64zm128 0v32c0 17.7 14.3 32 32 32s32-14.3 32-32V448H192zm128 0v32c0 17.7 14.3 32 32 32s32-14.3 32-32V448H320zm128 0v32c0 17.7 14.3 32 32 32s32-14.3 32-32V448H448z',
  },
  batteryBolt: {
    viewBox: '0 0 576 512',
    path: 'M464 160c8.8 0 16 7.2 16 16V336c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V176c0-8.8 7.2-16 16-16H464zM80 96C35.8 96 0 131.8 0 176V336c0 44.2 35.8 80 80 80H464c44.2 0 80-35.8 80-80V320c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32V176c0-44.2-35.8-80-80-80H80zm208 88c-4.9-7.4-13.2-11.8-22-11.8s-17.1 4.4-22 11.8l-64 96c-5.3 8-5.6 18.2-.8 26.5S193.2 320 202.7 320H240v48c0 9.6 5.5 18.3 14.2 22.5s19 3.1 26.5-2.9l96-80c7.1-5.9 10.5-15.1 8.9-24.1s-8.1-16.4-17.1-19.1L320 256.4V208c0-10.4-6.3-19.8-15.9-23.8z',
  },
  solarPanel: {
    viewBox: '0 0 640 512',
    path: 'M32 0C14.3 0 0 14.3 0 32V352c0 17.7 14.3 32 32 32H244.4c-3.5 14.1-8.6 27.7-15.3 40.5c-5.8 11.1-4.1 24.6 4.3 33.9S254.3 472 266.7 472h106.7c12.3 0 23.9-5.4 31.6-14.8s10.1-22.8 4.3-33.9c-6.7-12.8-11.8-26.4-15.3-40.5H608c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H32zM192 96H448V288H192V96zM64 96H128V160H64V96zM128 224v64H64V224h64zM512 96h64v64H512V96zm64 128v64H512V224h64z',
  },
  fireFlameCurved: {
    viewBox: '0 0 384 512',
    path: 'M153.6 29.9l16-21.3C173.6 3.2 180 0 186.7 0C198.4 0 208 9.6 208 21.3V43.5c0 13.1 5.4 25.7 14.9 34.7L307.6 159C356.4 205.6 384 270.2 384 337.7C384 434 306 512 209.7 512H192C86 512 0 426 0 320v-3.8c0-48.8 19.4-95.6 53.9-130.1l3.5-3.5c4.2-4.2 10-6.6 16-6.6C85.9 176 96 186.1 96 198.6V288c0 35.3 28.7 64 64 64s64-28.7 64-64v-3.9c0-18-7.2-35.3-19.9-48l-38.6-38.6c-24-24-37.5-56.7-37.5-90.7c0-27.7 9-54.8 25.6-76.9z',
  },
  seedling: {
    viewBox: '0 0 512 512',
    path: 'M512 32c0 113.6-84.6 207.5-194.2 222c-7.1-53.4-30.6-101.6-65.3-139.3C290.8 46 364 0 448 0l32 0c17.7 0 32 14.3 32 32zM0 96C0 78.3 14.3 64 32 64l32 0c123.7 0 224 100.3 224 224l0 32 0 160c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-160C100.3 320 0 219.7 0 96z',
  },
  bolt: {
    viewBox: '0 0 448 512',
    path: 'M349.4 44.6c5.9-13.7 1.5-29.7-10.6-38.5s-28.6-8-39.9 1.8l-256 224c-10 8.8-13.6 22.9-8.9 35.3S50.7 288 64 288H175.5L98.6 467.4c-5.9 13.7-1.5 29.7 10.6 38.5s28.6 8 39.9-1.8l256-224c10-8.8 13.6-22.9 8.9-35.3s-16.6-20.7-30-20.7H272.5L349.4 44.6z',
  },
  building: {
    viewBox: '0 0 384 512',
    path: 'M48 0C21.5 0 0 21.5 0 48V464c0 26.5 21.5 48 48 48h96V432c0-26.5 21.5-48 48-48s48 21.5 48 48v80h96c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48H48zM64 240c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V240zm112-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V240c0-8.8 7.2-16 16-16zm112 16c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H304c-8.8 0-16-7.2-16-16V240zM64 96c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V96zm112-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16zm112 16c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H304c-8.8 0-16-7.2-16-16V96z',
  },
};

export const siteTypeConfig: Record<string, {
  label: string;
  svgPath: string;
  viewBox: string;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  eolica:          { label: 'Wind Turbine',  svgPath: FA_PATHS.windTurbine.path,            viewBox: FA_PATHS.windTurbine.viewBox,            color: 'bg-blue-100 text-blue-700',     bgColor: '#dbeafe', textColor: '#1d4ed8' },
  eolica_offshore: { label: 'Wind Offshore', svgPath: FA_PATHS.windSparkle.path,            viewBox: FA_PATHS.windSparkle.viewBox,            color: 'bg-cyan-100 text-cyan-700',     bgColor: '#cffafe', textColor: '#0e7490' },
  fotovoltaica:    { label: 'Solar',         svgPath: FA_PATHS.solarPanel.path,             viewBox: FA_PATHS.solarPanel.viewBox,             color: 'bg-amber-100 text-amber-700',   bgColor: '#fef3c7', textColor: '#b45309' },
  bess:            { label: 'BESS',          svgPath: FA_PATHS.batteryBolt.path,            viewBox: FA_PATHS.batteryBolt.viewBox,            color: 'bg-green-100 text-green-700',   bgColor: '#dcfce7', textColor: '#15803d' },
  hidreletrica:    { label: 'Hydropower',    svgPath: FA_PATHS.arrowUpFromGroundWater.path, viewBox: FA_PATHS.arrowUpFromGroundWater.viewBox, color: 'bg-indigo-100 text-indigo-700', bgColor: '#e0e7ff', textColor: '#4338ca' },
  biomassa:        { label: 'Biomass',       svgPath: FA_PATHS.fireFlameCurved.path,        viewBox: FA_PATHS.fireFlameCurved.viewBox,        color: 'bg-orange-100 text-orange-700', bgColor: '#ffedd5', textColor: '#c2410c' },
  biocombustivel:  { label: 'Biofuels',      svgPath: FA_PATHS.seedling.path,               viewBox: FA_PATHS.seedling.viewBox,               color: 'bg-lime-100 text-lime-700',     bgColor: '#f0fdf4', textColor: '#4d7c0f' },
  hibrida:         { label: 'Hybrid',        svgPath: FA_PATHS.bolt.path,                   viewBox: FA_PATHS.bolt.viewBox,                   color: 'bg-purple-100 text-purple-700', bgColor: '#ede9fe', textColor: '#7c3aed' },
  subestacao:      { label: 'Substation',    svgPath: FA_PATHS.building.path,               viewBox: FA_PATHS.building.viewBox,               color: 'bg-slate-100 text-slate-700',   bgColor: '#f1f5f9', textColor: '#475569' },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { unknownSites, unknownSitesLoading, getSiteStats, refreshAll } = useDiscoveryData();

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [formData, setFormData] = useState<SiteFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isUniqueIdLocked, setIsUniqueIdLocked] = useState(false);

  const [unknownSiteStats, setUnknownSiteStats] = useState<Record<string, { equipment: number; variables: number; samples: number }>>({});

  const fetchSites = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('sites').select('*').order('name');
    if (error) { toast.error('Error loading sites'); console.error(error); }
    else { setSites(data || []); }
    setLoading(false);
  };

  useEffect(() => {
    const loadUnknownStats = async () => {
      const stats: Record<string, { equipment: number; variables: number; samples: number }> = {};
      for (const unknown of unknownSites) {
        const siteStats = await getSiteStats(unknown.identifier);
        stats[unknown.identifier] = { equipment: siteStats.totalEquipment, variables: siteStats.totalVariables, samples: siteStats.sampleCount };
      }
      setUnknownSiteStats(stats);
    };
    if (unknownSites.length > 0) loadUnknownStats();
  }, [unknownSites, getSiteStats]);

  useEffect(() => { fetchSites(); }, []);

  useEffect(() => {
    const registerParam = searchParams.get('register');
    if (registerParam && !dialogOpen) {
      const unknownSite = unknownSites.find(u => u.identifier === registerParam);
      if (unknownSite) {
        setEditingSite(null);
        setFormData({ ...emptyFormData, unique_id: registerParam });
        setIsUniqueIdLocked(true);
        setDialogOpen(true);
        setSearchParams({});
      }
    }
  }, [searchParams, unknownSites, dialogOpen, setSearchParams]);

  const handleOpenCreate = () => {
    setEditingSite(null);
    setFormData({ ...emptyFormData, unique_id: generateUUIDv7() });
    setIsUniqueIdLocked(false);
    setDialogOpen(true);
  };

  const handleOpenEdit = (site: Site) => {
    setEditingSite(site);
    setFormData({
      name: site.name || '', unique_id: site.unique_id || '',
      latitude: site.latitude?.toString() || '', longitude: site.longitude?.toString() || '',
      address: site.address || '', city: site.city || '', state: site.state || '',
      country: site.country || '', site_type: site.site_type || 'fotovoltaica', description: site.description || '',
    });
    setIsUniqueIdLocked(false);
    setDialogOpen(true);
  };

  const handleOpenRegisterUnknown = (identifier: string) => {
    setEditingSite(null);
    setFormData({ ...emptyFormData, unique_id: identifier });
    setIsUniqueIdLocked(true);
    setDialogOpen(true);
  };

  const handleGenerateUUID = () => {
    if (!isUniqueIdLocked) { setFormData(prev => ({ ...prev, unique_id: generateUUIDv7() })); toast.success('New UUID v7 generated'); }
  };

  const handleCopyUUID = () => { navigator.clipboard.writeText(formData.unique_id); toast.success('UUID copied to clipboard'); };

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
    if (!formData.name.trim()) { toast.error('Site name is required'); return; }
    if (formData.unique_id && !isValidUUID(formData.unique_id)) { toast.error('Invalid UUID format'); return; }
    setSaving(true);
    const siteData = {
      name: formData.name.trim(), unique_id: formData.unique_id || null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      address: formData.address || null, city: formData.city || null,
      state: formData.state || null, country: formData.country || null,
      site_type: formData.site_type || null, description: formData.description || null,
    };
    if (editingSite) {
      const { error } = await supabase.from('sites').update(siteData).eq('id', editingSite.id);
      if (error) { toast.error(error.code === '23505' ? 'This UUID is already in use by another site' : 'Error updating site: ' + error.message); setSaving(false); return; }
      toast.success('Site updated successfully');
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('sites').insert({ ...siteData, created_by: user?.id });
      if (error) { toast.error(error.code === '23505' ? 'This UUID is already in use' : 'Error creating site: ' + error.message); setSaving(false); return; }
      toast.success('Site created successfully');
    }
    setSaving(false); setDialogOpen(false); setIsUniqueIdLocked(false);
    fetchSites(); refreshAll();
  };

  const handleDelete = async (siteId: string) => {
    setDeleting(siteId);
    const { error } = await supabase.from('sites').delete().eq('id', siteId);
    if (error) { toast.error('Error deleting site: ' + error.message); setDeleting(null); return; }
    toast.success('Site deleted successfully');
    await fetchSites(); setDeleting(null);
  };

  const openInGoogleMaps = (lat: number, lng: number) => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');

  const filteredSites = sites.filter(site => {
    const s = search.toLowerCase();
    return site.name.toLowerCase().includes(s) || site.city?.toLowerCase().includes(s) ||
      site.state?.toLowerCase().includes(s) || site.country?.toLowerCase().includes(s) ||
      site.unique_id?.toLowerCase().includes(s);
  });

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1a2744]">Sites Management</h1>
            <p className="text-muted-foreground mt-1">Manage site information and locations worldwide</p>
          </div>
          <Button onClick={handleOpenCreate} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
            <Plus className="h-4 w-4 mr-2" />New Site
          </Button>
        </div>

        {!unknownSitesLoading && unknownSites.length > 0 && (
          <Card className="mb-6 border-amber-300 bg-amber-50">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-amber-900">{unknownSites.length} Unregistered Site{unknownSites.length !== 1 ? 's' : ''} Detected</CardTitle>
                  <CardDescription className="text-amber-700 mt-1">Data is being received from site identifiers that are not registered. Register them to enable full monitoring.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {unknownSites.map((unknown) => {
                  const stats = unknownSiteStats[unknown.identifier];
                  return (
                    <div key={unknown.identifier} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                      <div className="flex items-center gap-4">
                        <Activity className="h-5 w-5 text-amber-500" />
                        <div>
                          <code className="text-sm font-mono font-medium">{unknown.identifier}</code>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            {stats ? (
                              <>
                                <span className="flex items-center gap-1"><Server className="h-3 w-3" />{stats.equipment} equipment</span>
                                <span className="flex items-center gap-1"><Variable className="h-3 w-3" />{stats.variables} variables</span>
                                <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{stats.samples.toLocaleString()} samples</span>
                              </>
                            ) : <Loader2 className="h-3 w-3 animate-spin" />}
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(unknown.lastSeen), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleOpenRegisterUnknown(unknown.identifier)} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                        <Plus className="h-4 w-4 mr-1" />Register
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, city, country or UUID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Registered Sites ({filteredSites.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
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
                      const typeConfig = site.site_type ? siteTypeConfig[site.site_type] : null;
                      return (
                        <TableRow key={site.id}>
                          <TableCell>
                            <div className="font-medium">{site.name}</div>
                            {site.description && <div className="text-xs text-muted-foreground truncate max-w-xs">{site.description}</div>}
                          </TableCell>
                          <TableCell>
                            {typeConfig ? (
                              <Badge className={`${typeConfig.color} gap-1.5`}>
                                <FaIcon svgPath={typeConfig.svgPath} viewBox={typeConfig.viewBox} color={typeConfig.textColor} size={12} />
                                {typeConfig.label}
                              </Badge>
                            ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {site.city || site.state || site.country ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span>{[site.city, site.state, site.country].filter(Boolean).join(', ')}</span>
                                {site.latitude && site.longitude && (
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1" onClick={() => openInGoogleMaps(site.latitude!, site.longitude!)} title="Open in Google Maps">
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {site.unique_id ? (
                              <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{site.unique_id.slice(0, 8)}...</code>
                            ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(site)} className="h-8 w-8 p-0"><Pencil className="h-4 w-4" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" disabled={deleting === site.id}>
                                    {deleting === site.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete site?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete "{site.name}" and all associated data. This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(site.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
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

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setIsUniqueIdLocked(false); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSite ? 'Edit Site' : isUniqueIdLocked ? 'Register Site' : 'New Site'}</DialogTitle>
              <DialogDescription>
                {editingSite ? 'Update site information and details' : isUniqueIdLocked ? 'Register this site identifier to enable full monitoring and analysis' : 'Register a new site with location information'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Basic Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="name">Site Name *</Label>
                    <Input id="name" placeholder="E.g.: Northeast Solar Plant I" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="site_type">Site Type</Label>
                    <Select value={formData.site_type} onValueChange={(value) => setFormData(prev => ({ ...prev, site_type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(siteTypeConfig).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <FaIcon svgPath={config.svgPath} viewBox={config.viewBox} color={config.textColor} size={14} />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" placeholder="Brief description..." value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Unique Identifier (UUID v7)</h3>
                <div className="space-y-2">
                  <Label htmlFor="unique_id">Unique ID</Label>
                  <div className="flex gap-2">
                    <Input id="unique_id" placeholder="019ba81c-7573-7bb3-8f99-c585fd61faa3" value={formData.unique_id} onChange={(e) => !isUniqueIdLocked && setFormData(prev => ({ ...prev, unique_id: e.target.value }))} className="font-mono text-sm" disabled={isUniqueIdLocked} />
                    <Button type="button" variant="outline" size="icon" onClick={handleGenerateUUID} title="Generate new UUID v7" disabled={isUniqueIdLocked}><RefreshCw className="h-4 w-4" /></Button>
                    <Button type="button" variant="outline" size="icon" onClick={handleCopyUUID} title="Copy UUID" disabled={!formData.unique_id}><Copy className="h-4 w-4" /></Button>
                  </div>
                  {isUniqueIdLocked ? (
                    <p className="text-xs text-amber-600">This UUID was detected from incoming data and cannot be changed.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">UUID v7 is time-ordered and globally unique.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Location</h3>
                <AddressAutocomplete value={formData.address} latitude={formData.latitude} longitude={formData.longitude} city={formData.city} state={formData.state} country={formData.country} onAddressChange={handleAddressChange} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : editingSite ? 'Save Changes' : 'Register Site'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default SitesManagement;