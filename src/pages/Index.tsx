import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useDiscoveryData } from '@/hooks/useDiscoveryData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SiteDiscoveryStats } from '@/types/discovery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building2, 
  Server, 
  Variable, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  MapPin,
  Activity,
  Clock,
  HelpCircle,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const siteTypeConfig: Record<string, { label: string; color: string }> = {
  eolica: { label: 'Wind', color: 'bg-blue-100 text-blue-700' },
  fotovoltaica: { label: 'Solar', color: 'bg-amber-100 text-amber-700' },
  hibrida: { label: 'Hybrid', color: 'bg-purple-100 text-purple-700' },
  subestacao: { label: 'Substation', color: 'bg-slate-100 text-slate-700' },
};

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    sites, 
    sitesLoading, 
    unknownSites, 
    unknownSitesLoading,
    getSiteStats,
    refreshAll 
  } = useDiscoveryData();
  
  const [siteStats, setSiteStats] = useState<Record<string, SiteDiscoveryStats>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Register dialog state
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedUnknownId, setSelectedUnknownId] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    site_type: 'fotovoltaica',
    description: '',
    city: '',
    state: '',
    country: '',
  });

  // Load stats for all sites
  useEffect(() => {
    const loadStats = async () => {
      if (sites.length === 0 && unknownSites.length === 0) return;
      
      setLoadingStats(true);
      const stats: Record<string, SiteDiscoveryStats> = {};
      
      // Load stats for registered sites
      for (const site of sites) {
        if (site.unique_id) {
          stats[site.unique_id] = await getSiteStats(site.unique_id);
        }
      }
      
      // Load stats for unknown sites
      for (const unknown of unknownSites) {
        stats[unknown.identifier] = await getSiteStats(unknown.identifier);
      }
      
      setSiteStats(stats);
      setLoadingStats(false);
    };
    
    loadStats();
  }, [sites, unknownSites, getSiteStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const handleOpenRegister = (identifier: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    setSelectedUnknownId(identifier);
    setFormData({
      name: '',
      site_type: 'fotovoltaica',
      description: '',
      city: '',
      state: '',
      country: '',
    });
    setRegisterDialogOpen(true);
  };

  const handleCardClick = (identifier: string | null, id: string) => {
    const targetId = identifier || id;
    navigate(`/discovery/${targetId}`);
  };

  const handleRegister = async () => {
    if (!selectedUnknownId || !formData.name.trim()) {
      toast.error('Please enter a site name');
      return;
    }

    setRegistering(true);

    const { error } = await supabase.from('sites').insert({
      name: formData.name.trim(),
      unique_id: selectedUnknownId,
      site_type: formData.site_type,
      description: formData.description || null,
      city: formData.city || null,
      state: formData.state || null,
      country: formData.country || null,
      created_by: user?.id,
    });

    if (error) {
      toast.error('Error registering site: ' + error.message);
      setRegistering(false);
      return;
    }

    toast.success('Site registered successfully!');
    setRegisterDialogOpen(false);
    await refreshAll();
    setRegistering(false);
    
    // Navigate to the new site's discovery page
    navigate(`/discovery/${selectedUnknownId}`);
  };

  // Calculate totals
  const totalEquipment = Object.values(siteStats).reduce((sum, s) => sum + s.totalEquipment, 0);
  const totalVariables = Object.values(siteStats).reduce((sum, s) => sum + s.totalVariables, 0);
  const confirmedVariables = Object.values(siteStats).reduce(
    (sum, s) => sum + s.variablesByState.confirmed + s.variablesByState.published, 0
  );
  const hypothesisVariables = Object.values(siteStats).reduce(
    (sum, s) => sum + s.variablesByState.hypothesis, 0
  );

  const isLoading = sitesLoading || unknownSitesLoading;

  // Combine registered and unregistered sites for unified display
  const allSiteCards = [
    // Registered sites
    ...sites.map(site => ({
      type: 'registered' as const,
      id: site.id,
      identifier: site.unique_id,
      name: site.name,
      site_type: site.site_type,
      city: site.city,
      state: site.state,
      stats: site.unique_id ? siteStats[site.unique_id] : null,
    })),
    // Unregistered sites
    ...unknownSites.map(unknown => ({
      type: 'unregistered' as const,
      id: unknown.identifier,
      identifier: unknown.identifier,
      name: null,
      site_type: null,
      city: null,
      state: null,
      stats: siteStats[unknown.identifier] || null,
    })),
  ];

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1a2744]">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              CyberEnergia OT Scanner Overview
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Unknown Sites Alert */}
        {!unknownSitesLoading && unknownSites.length > 0 && (
          <Card className="mb-6 border-amber-300 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900">
                    {unknownSites.length} Unregistered Site{unknownSites.length !== 1 ? 's' : ''} Detected
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Data is being received from site identifiers that are not registered in the system.
                    Register them below to enable full monitoring and analysis.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sites</CardTitle>
              <div className="p-2 rounded-lg bg-blue-100">
                <Building2 className="h-4 w-4 text-[#2563EB]" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-3xl font-bold text-[#1a2744]">{sites.length + unknownSites.length}</div>
                  {unknownSites.length > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {unknownSites.length} pending registration
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Equipment</CardTitle>
              <div className="p-2 rounded-lg bg-purple-100">
                <Server className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-3xl font-bold text-[#1a2744]">{totalEquipment}</div>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Variables</CardTitle>
              <div className="p-2 rounded-lg bg-slate-100">
                <Variable className="h-4 w-4 text-slate-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-3xl font-bold text-[#1a2744]">{totalVariables}</div>
                  {hypothesisVariables > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {hypothesisVariables} with hypotheses
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed</CardTitle>
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-3xl font-bold text-emerald-600">{confirmedVariables}</div>
                  {totalVariables > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((confirmedVariables / totalVariables) * 100)}% of total
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sites Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#1a2744]">Sites</h2>
            <Link to="/sites-management">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Site
              </Button>
            </Link>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : allSiteCards.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No Sites Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by uploading a PCAP file or adding a site manually.
                </p>
                <div className="flex gap-2 justify-center">
                  <Link to="/upload">
                    <Button variant="outline">
                      Upload PCAP
                    </Button>
                  </Link>
                  <Link to="/sites-management">
                    <Button>
                      <Building2 className="h-4 w-4 mr-2" />
                      Add Site
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allSiteCards.map((siteCard) => {
                const stats = siteCard.stats;
                const typeConfig = siteCard.site_type ? siteTypeConfig[siteCard.site_type] : null;
                const isUnregistered = siteCard.type === 'unregistered';
                
                return (
                  <Card 
                    key={siteCard.id} 
                    className={`hover:shadow-lg transition-all duration-300 cursor-pointer h-full ${
                      isUnregistered 
                        ? 'border-amber-300 bg-amber-50/30 hover:border-amber-400' 
                        : 'border-slate-200 hover:shadow-blue-500/10 hover:border-[#2563EB]/30'
                    }`}
                    onClick={() => handleCardClick(siteCard.identifier, siteCard.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {isUnregistered ? (
                            <div className="flex items-center gap-2">
                              <Activity className="h-5 w-5 text-amber-500 flex-shrink-0" />
                              <CardTitle className="text-lg text-[#1a2744] truncate">
                                <code className="text-sm font-mono">{siteCard.identifier?.slice(0, 8)}...</code>
                              </CardTitle>
                            </div>
                          ) : (
                            <CardTitle className="text-lg text-[#1a2744]">{siteCard.name}</CardTitle>
                          )}
                        </div>
                        {isUnregistered ? (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 flex-shrink-0">
                            Unregistered
                          </Badge>
                        ) : typeConfig ? (
                          <Badge className={typeConfig.color} variant="outline">
                            {typeConfig.label}
                          </Badge>
                        ) : null}
                      </div>
                      {!isUnregistered && (siteCard.city || siteCard.state) && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {[siteCard.city, siteCard.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                      {isUnregistered && (
                        <p className="text-xs text-amber-700 mt-1">
                          Unregistered site identifier
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {loadingStats ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : stats ? (
                        <>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-slate-100">
                                <Server className="h-4 w-4 text-slate-600" />
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-[#1a2744]">{stats.totalEquipment}</div>
                                <div className="text-xs text-muted-foreground">Equipment</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-slate-100">
                                <Variable className="h-4 w-4 text-slate-600" />
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-[#1a2744]">{stats.totalVariables}</div>
                                <div className="text-xs text-muted-foreground">Variables</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Learning state progress */}
                          {stats.totalVariables > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Learning Progress</span>
                                <span className="font-medium">
                                  {stats.variablesByState.confirmed + stats.variablesByState.published}/{stats.totalVariables}
                                </span>
                              </div>
                              <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                                <div 
                                  className="bg-emerald-500" 
                                  style={{ width: `${(stats.variablesByState.published / stats.totalVariables) * 100}%` }}
                                  title={`Published: ${stats.variablesByState.published}`}
                                />
                                <div 
                                  className="bg-blue-500" 
                                  style={{ width: `${(stats.variablesByState.confirmed / stats.totalVariables) * 100}%` }}
                                  title={`Confirmed: ${stats.variablesByState.confirmed}`}
                                />
                                <div 
                                  className="bg-amber-400" 
                                  style={{ width: `${(stats.variablesByState.hypothesis / stats.totalVariables) * 100}%` }}
                                  title={`Hypothesis: ${stats.variablesByState.hypothesis}`}
                                />
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  Published
                                </span>
                                <span className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                  Confirmed
                                </span>
                                <span className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                                  Hypothesis
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {stats.lastActivity && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3 pt-3 border-t">
                              <Clock className="h-3 w-3" />
                              Last activity: {formatDistanceToNow(new Date(stats.lastActivity), { addSuffix: true })}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          No data yet
                          <p className="text-xs mt-1">Upload a PCAP to start discovery</p>
                        </div>
                      )}
                      
                      {/* Register button for unregistered sites */}
                      {isUnregistered && (
                        <div className="mt-4 pt-3 border-t">
                          <Button 
                            size="sm" 
                            className="w-full bg-[#2563EB] hover:bg-[#1d4ed8]"
                            onClick={(e) => handleOpenRegister(siteCard.identifier!, e)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Register Site
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Register Dialog */}
        <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Register Site</DialogTitle>
              <DialogDescription>
                Register this site identifier to enable full monitoring and analysis.
              </DialogDescription>
            </DialogHeader>

            {selectedUnknownId && (
              <div className="space-y-4 py-4">
                {/* Site identifier info */}
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <div className="text-xs text-muted-foreground mb-1">Site Identifier (UUID)</div>
                  <code className="text-sm font-mono font-medium break-all">{selectedUnknownId}</code>
                  {siteStats[selectedUnknownId] && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{siteStats[selectedUnknownId].sampleCount.toLocaleString()} samples</span>
                      <span>{siteStats[selectedUnknownId].totalEquipment} equipment</span>
                      <span>{siteStats[selectedUnknownId].totalVariables} variables</span>
                    </div>
                  )}
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="site-name">Site Name *</Label>
                    <Input
                      id="site-name"
                      placeholder="E.g.: Solar Plant Northeast I"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="site-type">Site Type</Label>
                    <Select 
                      value={formData.site_type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, site_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fotovoltaica">Solar</SelectItem>
                        <SelectItem value="eolica">Wind</SelectItem>
                        <SelectItem value="hibrida">Hybrid</SelectItem>
                        <SelectItem value="subestacao">Substation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="City"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        placeholder="State"
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      placeholder="Country"
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of the site..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setRegisterDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRegister} 
                disabled={registering || !formData.name.trim()}
                className="bg-[#2563EB] hover:bg-[#1d4ed8]"
              >
                {registering ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Register Site
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Index;