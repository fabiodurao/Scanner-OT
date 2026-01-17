import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useDiscoveryData } from '@/hooks/useDiscoveryData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AlertTriangle, 
  Activity, 
  Server, 
  Variable, 
  Clock, 
  Loader2,
  Plus,
  Eye,
  RefreshCw,
  Building2,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

const UnknownSites = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unknownSites, unknownSitesLoading, sites, refreshAll } = useDiscoveryData();
  
  const [refreshing, setRefreshing] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedUnknown, setSelectedUnknown] = useState<typeof unknownSites[0] | null>(null);
  const [registering, setRegistering] = useState(false);
  
  // Form state
  const [siteName, setSiteName] = useState('');
  const [siteType, setSiteType] = useState('fotovoltaica');
  const [linkToExisting, setLinkToExisting] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const handleOpenRegister = (unknown: typeof unknownSites[0]) => {
    setSelectedUnknown(unknown);
    setSiteName('');
    setSiteType('fotovoltaica');
    setLinkToExisting(null);
    setRegisterDialogOpen(true);
  };

  const handleRegisterNew = async () => {
    if (!selectedUnknown || !siteName.trim()) {
      toast.error('Please enter a site name');
      return;
    }

    setRegistering(true);

    const { error } = await supabase.from('sites').insert({
      name: siteName.trim(),
      unique_id: selectedUnknown.identifier,
      site_type: siteType,
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
    navigate(`/discovery/${selectedUnknown.identifier}`);
  };

  const handleLinkToExisting = async () => {
    if (!selectedUnknown || !linkToExisting) {
      toast.error('Please select a site to link');
      return;
    }

    setRegistering(true);

    const { error } = await supabase
      .from('sites')
      .update({ unique_id: selectedUnknown.identifier })
      .eq('id', linkToExisting);

    if (error) {
      toast.error('Error linking site: ' + error.message);
      setRegistering(false);
      return;
    }

    toast.success('Site linked successfully!');
    setRegisterDialogOpen(false);
    await refreshAll();
    setRegistering(false);
    
    // Navigate to the site's discovery page
    navigate(`/discovery/${selectedUnknown.identifier}`);
  };

  const handleViewData = (identifier: string) => {
    navigate(`/discovery/${identifier}`);
  };

  // Sites without unique_id (can be linked)
  const sitesWithoutId = sites.filter(s => !s.unique_id);

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1a2744]">Unknown Sites</h1>
            <p className="text-muted-foreground mt-1">
              Sites sending data that are not yet registered in the system
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {unknownSitesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : unknownSites.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
              <h3 className="font-medium text-lg mb-2">All Sites Registered</h3>
              <p className="text-muted-foreground mb-4">
                There are no unknown sites at the moment. All incoming data is from registered sites.
              </p>
              <Button variant="outline" onClick={() => navigate('/')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Alert banner */}
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900">
                      {unknownSites.length} Unknown Site{unknownSites.length !== 1 ? 's' : ''} Detected
                    </h3>
                    <p className="text-sm text-amber-700 mt-1">
                      These site identifiers are receiving data but are not registered in the system.
                      Register them to enable full monitoring and analysis.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unknown sites list */}
            <div className="grid gap-4">
              {unknownSites.map((unknown) => (
                <Card key={unknown.identifier} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-amber-500" />
                          <code className="text-lg font-mono">{unknown.identifier}</code>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Unregistered site identifier
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                        Unregistered
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-100">
                          <Activity className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <div className="text-xl font-bold">{unknown.sampleCount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">Samples</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-100">
                          <Server className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <div className="text-xl font-bold">{unknown.equipmentCount}</div>
                          <div className="text-xs text-muted-foreground">Equipment</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-100">
                          <Variable className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <div className="text-xl font-bold">{unknown.variableCount}</div>
                          <div className="text-xs text-muted-foreground">Variables</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-100">
                          <Clock className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {formatDistanceToNow(new Date(unknown.lastSeen), { addSuffix: true })}
                          </div>
                          <div className="text-xs text-muted-foreground">Last activity</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-xs text-muted-foreground">
                        First seen: {format(new Date(unknown.firstSeen), 'MMM d, yyyy HH:mm')}
                        {unknown.sourceIps.length > 0 && (
                          <span className="ml-4">
                            Source IPs: {unknown.sourceIps.slice(0, 3).join(', ')}
                            {unknown.sourceIps.length > 3 && ` +${unknown.sourceIps.length - 3} more`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewData(unknown.identifier)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Data
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleOpenRegister(unknown)}
                          className="bg-[#2563EB] hover:bg-[#1d4ed8]"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Register Site
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Register Dialog */}
        <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Register Site</DialogTitle>
              <DialogDescription>
                Register this site identifier to enable full monitoring and analysis.
              </DialogDescription>
            </DialogHeader>

            {selectedUnknown && (
              <div className="space-y-6 py-4">
                {/* Site identifier info */}
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <div className="text-xs text-muted-foreground mb-1">Site Identifier</div>
                  <code className="text-sm font-mono font-medium">{selectedUnknown.identifier}</code>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{selectedUnknown.sampleCount.toLocaleString()} samples</span>
                    <span>{selectedUnknown.equipmentCount} equipment</span>
                    <span>{selectedUnknown.variableCount} variables</span>
                  </div>
                </div>

                {/* Option 1: Create new site */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#2563EB]" />
                    <span className="font-medium">Create New Site</span>
                  </div>
                  
                  <div className="space-y-3 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="site-name">Site Name *</Label>
                      <Input
                        id="site-name"
                        placeholder="E.g.: Solar Plant Northeast I"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="site-type">Site Type</Label>
                      <Select value={siteType} onValueChange={setSiteType}>
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

                    <Button 
                      onClick={handleRegisterNew} 
                      disabled={registering || !siteName.trim()}
                      className="w-full bg-[#2563EB] hover:bg-[#1d4ed8]"
                    >
                      {registering ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Create & Register
                    </Button>
                  </div>
                </div>

                {/* Option 2: Link to existing site */}
                {sitesWithoutId.length > 0 && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">Link to Existing Site</span>
                      </div>
                      
                      <div className="space-y-3 pl-6">
                        <div className="space-y-2">
                          <Label>Select Site</Label>
                          <Select value={linkToExisting || ''} onValueChange={setLinkToExisting}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a site without identifier..." />
                            </SelectTrigger>
                            <SelectContent>
                              {sitesWithoutId.map(site => (
                                <SelectItem key={site.id} value={site.id}>
                                  {site.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Only sites without a unique identifier are shown
                          </p>
                        </div>

                        <Button 
                          onClick={handleLinkToExisting} 
                          disabled={registering || !linkToExisting}
                          variant="outline"
                          className="w-full"
                        >
                          {registering ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4 mr-2" />
                          )}
                          Link to Selected Site
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setRegisterDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default UnknownSites;