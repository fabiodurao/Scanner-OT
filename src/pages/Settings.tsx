import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Save, Cpu, Link as LinkIcon, AlertTriangle, Trash2, Database, Server, Variable, History, RefreshCw, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AllDataCounts {
  learning_samples_count: number;
  equipment_count: number;
  variables_count: number;
}

interface AuditLog {
  id: string;
  action: string;
  target_type: string;
  target_identifier: string | null;
  details: {
    learning_samples_deleted?: number;
    equipment_deleted?: number;
    variables_deleted?: number;
  } | null;
  performed_by: string;
  performed_at: string;
  user_email?: string;
  site_name?: string;
}

const Settings = () => {
  const { settings, loading, saving, saveSettings } = useUserSettings();
  const { profile } = useAuth();
  
  const [formData, setFormData] = useState({
    auto_publish: false,
    notifications_enabled: true,
    confidence_threshold: '0.95',
    cross_site_learning: false,
    saas_endpoint: 'https://api.cyberenergia.com/v1',
    n8n_webhook_url: '',
    mbsniffer_interval_batch: '60',
    mbsniffer_interval_min: '5',
    analysis_webhook_url: '',
    sample_threshold_for_analysis: '50',
    auto_confirm_threshold: '0.95',
    photo_webhook_url: '',
  });

  const [dataCounts, setDataCounts] = useState<AllDataCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditPage, setAuditPage] = useState(0);
  const [auditTotalCount, setAuditTotalCount] = useState(0);
  const auditPageSize = 10;

  const isAdmin = profile?.is_admin === true;
  const confirmRequired = 'DELETE ALL';

  useEffect(() => {
    if (!loading) {
      setFormData({
        auto_publish: settings.auto_publish,
        notifications_enabled: settings.notifications_enabled,
        confidence_threshold: settings.confidence_threshold.toString(),
        cross_site_learning: settings.cross_site_learning,
        saas_endpoint: settings.saas_endpoint,
        n8n_webhook_url: settings.n8n_webhook_url || '',
        mbsniffer_interval_batch: settings.mbsniffer_interval_batch.toString(),
        mbsniffer_interval_min: settings.mbsniffer_interval_min.toString(),
        analysis_webhook_url: (settings as any).analysis_webhook_url || '',
        sample_threshold_for_analysis: ((settings as any).sample_threshold_for_analysis || 50).toString(),
        auto_confirm_threshold: ((settings as any).auto_confirm_threshold || 0.95).toString(),
        photo_webhook_url: settings.photo_webhook_url || '',
      });
    }
  }, [loading, settings]);

  const fetchDataCounts = async () => {
    if (!isAdmin) return;
    
    setLoadingCounts(true);
    
    const { data, error } = await supabase.rpc('get_all_discovery_data_counts');
    
    if (error) {
      console.error('Error fetching data counts:', error);
    } else if (data && data.length > 0) {
      setDataCounts(data[0]);
    }
    
    setLoadingCounts(false);
  };

  const fetchAuditLogs = async () => {
    if (!isAdmin) return;
    
    setLoadingAudit(true);
    
    const { count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });
    
    setAuditTotalCount(count || 0);
    
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('performed_at', { ascending: false })
      .range(auditPage * auditPageSize, (auditPage + 1) * auditPageSize - 1);
    
    if (error) {
      console.error('Error fetching audit logs:', error);
      setLoadingAudit(false);
      return;
    }
    
    const userIds = [...new Set((data || []).map(log => log.performed_by).filter(Boolean))];
    
    let emailMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);
      
      emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
    }
    
    const uniqueSiteIds = [...new Set((data || [])
      .filter(log => log.target_type === 'site' && log.target_identifier)
      .map(log => log.target_identifier)
      .filter((id): id is string => Boolean(id)))];
    
    let siteNameMap = new Map<string, string>();
    if (uniqueSiteIds.length > 0) {
      const { data: sites } = await supabase
        .from('sites')
        .select('unique_id, name')
        .in('unique_id', uniqueSiteIds);
      
      siteNameMap = new Map(sites?.map(s => [s.unique_id, s.name]) || []);
    }
    
    const logsWithDetails = (data || []).map(log => ({
      ...log,
      user_email: emailMap.get(log.performed_by) || 'Unknown',
      site_name: log.target_identifier ? siteNameMap.get(log.target_identifier) : undefined,
    }));
    
    setAuditLogs(logsWithDetails as AuditLog[]);
    setLoadingAudit(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchDataCounts();
      fetchAuditLogs();
    }
  }, [isAdmin, auditPage]);

  const handleSave = async () => {
    const success = await saveSettings({
      auto_publish: formData.auto_publish,
      notifications_enabled: formData.notifications_enabled,
      confidence_threshold: parseFloat(formData.confidence_threshold) || 0.95,
      cross_site_learning: formData.cross_site_learning,
      saas_endpoint: formData.saas_endpoint,
      n8n_webhook_url: formData.n8n_webhook_url || null,
      mbsniffer_interval_batch: parseInt(formData.mbsniffer_interval_batch) || 60,
      mbsniffer_interval_min: parseInt(formData.mbsniffer_interval_min) || 5,
      analysis_webhook_url: formData.analysis_webhook_url || null,
      sample_threshold_for_analysis: parseInt(formData.sample_threshold_for_analysis) || 50,
      auto_confirm_threshold: parseFloat(formData.auto_confirm_threshold) || 0.95,
      photo_webhook_url: formData.photo_webhook_url || null,
    } as any);

    if (success) {
      toast.success('Settings saved successfully!');
    } else {
      toast.error('Error saving settings');
    }
  };

  const handleClearAllData = async () => {
    if (confirmText !== confirmRequired) {
      toast.error('Confirmation text does not match');
      return;
    }

    setDeleting(true);

    const { data, error } = await supabase.rpc('clear_all_discovery_data');

    if (error) {
      console.error('Error clearing data:', error);
      toast.error('Error clearing data: ' + error.message);
      setDeleting(false);
      return;
    }

    const result = data?.[0];
    const totalDeleted = (result?.learning_samples_deleted || 0) + 
                         (result?.equipment_deleted || 0) + 
                         (result?.variables_deleted || 0);

    toast.success(`Successfully deleted ${totalDeleted.toLocaleString()} records from all sites`);
    
    setDialogOpen(false);
    setConfirmText('');
    setDeleting(false);
    
    await fetchDataCounts();
    await fetchAuditLogs();
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CLEAR_SITE_DATA':
        return <Badge variant="destructive">Clear Site</Badge>;
      case 'CLEAR_ALL_DISCOVERY_DATA':
        return <Badge variant="destructive" className="bg-red-700">Clear All</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatDetails = (details: AuditLog['details']) => {
    if (!details) return '-';
    
    const parts = [];
    if (details.learning_samples_deleted) {
      parts.push(`${details.learning_samples_deleted.toLocaleString()} samples`);
    }
    if (details.equipment_deleted) {
      parts.push(`${details.equipment_deleted.toLocaleString()} equipment`);
    }
    if (details.variables_deleted) {
      parts.push(`${details.variables_deleted.toLocaleString()} variables`);
    }
    
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const totalRecords = dataCounts 
    ? dataCounts.learning_samples_count + dataCounts.equipment_count + dataCounts.variables_count
    : 0;

  const totalAuditPages = Math.ceil(auditTotalCount / auditPageSize);

  if (loading) {
    return (
      <MainLayout>
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage OT Scanner settings
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic system settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Publish</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically publish variables with high confidence
                  </p>
                </div>
                <Switch 
                  checked={formData.auto_publish}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_publish: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications about newly discovered equipment
                  </p>
                </div>
                <Switch 
                  checked={formData.notifications_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notifications_enabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Analysis Settings</CardTitle>
              <CardDescription>
                Configure AI-powered variable type inference
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="analysis-webhook">
                  Historical Analysis Webhook URL
                </Label>
                <Input
                  id="analysis-webhook"
                  placeholder="https://n8n.otscanner.qzz.io/webhook/..."
                  value={formData.analysis_webhook_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, analysis_webhook_url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Webhook for temporal/statistical analysis (n8n workflow)
                </p>
              </div>
              <Separator />
              <div className="grid gap-2">
                <Label htmlFor="photo-webhook" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Photo Analysis Webhook URL
                </Label>
                <Input
                  id="photo-webhook"
                  placeholder="https://n8n.otscanner.qzz.io/webhook/..."
                  value={formData.photo_webhook_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, photo_webhook_url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Webhook for photo-based semantic analysis (OCR + matching)
                </p>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sample-threshold">
                    Minimum Samples for Analysis
                  </Label>
                  <Input
                    id="sample-threshold"
                    type="number"
                    value={formData.sample_threshold_for_analysis}
                    onChange={(e) => setFormData(prev => ({ ...prev, sample_threshold_for_analysis: e.target.value }))}
                    min="1"
                    placeholder="50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variables need at least this many samples to be analyzed
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auto-confirm-threshold">
                    Auto-Confirm Threshold
                  </Label>
                  <Input
                    id="auto-confirm-threshold"
                    type="number"
                    value={formData.auto_confirm_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, auto_confirm_threshold: e.target.value }))}
                    min="0"
                    max="1"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    AI suggestions above this confidence are auto-confirmed (0.0 - 1.0)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inference Settings</CardTitle>
              <CardDescription>
                Adjust semantic inference parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="confidence-threshold">
                  Confidence Threshold for Auto Confirmation
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="confidence-threshold"
                    type="number"
                    value={formData.confidence_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, confidence_threshold: e.target.value }))}
                    min="0"
                    max="1"
                    step="0.01"
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    (0.0 - 1.0)
                  </span>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Cross-Site Learning</Label>
                  <p className="text-sm text-muted-foreground">
                    Use data from other sites to improve inferences
                  </p>
                </div>
                <Switch 
                  checked={formData.cross_site_learning}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, cross_site_learning: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                mbsniffer Parameters
              </CardTitle>
              <CardDescription>
                Default parameters for PCAP processing. These can be overridden per job.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="interval-batch">
                    Interval Batch (seconds)
                  </Label>
                  <Input
                    id="interval-batch"
                    type="number"
                    value={formData.mbsniffer_interval_batch}
                    onChange={(e) => setFormData(prev => ({ ...prev, mbsniffer_interval_batch: e.target.value }))}
                    min="1"
                    placeholder="60"
                  />
                  <p className="text-xs text-muted-foreground">
                    Time window for grouping packets into batches
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval-min">
                    Interval Min (seconds)
                  </Label>
                  <Input
                    id="interval-min"
                    type="number"
                    value={formData.mbsniffer_interval_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, mbsniffer_interval_min: e.target.value }))}
                    min="1"
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum interval between batch outputs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Integrations
              </CardTitle>
              <CardDescription>
                Configure integrations with external systems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="saas-endpoint">
                  CyberEnergia SaaS Endpoint
                </Label>
                <Input
                  id="saas-endpoint"
                  placeholder="https://api.cyberenergia.com/v1"
                  value={formData.saas_endpoint}
                  onChange={(e) => setFormData(prev => ({ ...prev, saas_endpoint: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="n8n-webhook">
                  n8n Webhook (Default)
                </Label>
                <Input
                  id="n8n-webhook"
                  placeholder="https://n8n.cyberenergia.com/webhook/..."
                  value={formData.n8n_webhook_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, n8n_webhook_url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  This webhook will be used as default when processing PCAP files. You can override it per job.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>

          {isAdmin && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Audit Log
                    </CardTitle>
                    <CardDescription>
                      History of administrative actions ({auditTotalCount} total entries)
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={loadingAudit}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingAudit ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAudit ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No audit logs yet</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[140px]">Date</TableHead>
                            <TableHead className="w-[120px]">Action</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="w-[180px]">User</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {auditLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono text-xs">
                                <div>{format(new Date(log.performed_at), 'MMM d, yyyy')}</div>
                                <div className="text-muted-foreground">
                                  {format(new Date(log.performed_at), 'HH:mm:ss')}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getActionBadge(log.action)}
                              </TableCell>
                              <TableCell>
                                {log.target_type === 'all_sites' ? (
                                  <span className="text-red-600 font-medium">All Sites</span>
                                ) : log.target_identifier ? (
                                  <div>
                                    <div className="font-medium">
                                      {log.site_name || 'Unknown Site'}
                                    </div>
                                    <code className="text-[10px] text-muted-foreground font-mono">
                                      {log.target_identifier}
                                    </code>
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDetails(log.details)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {log.user_email || 'Unknown'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {totalAuditPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          Page {auditPage + 1} of {totalAuditPages}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAuditPage(p => Math.max(0, p - 1))}
                            disabled={auditPage === 0}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAuditPage(p => Math.min(totalAuditPages - 1, p + 1))}
                            disabled={auditPage >= totalAuditPages - 1}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-red-600">
                  Irreversible actions that permanently delete data from all sites
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingCounts ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : dataCounts && (
                  <div className="grid gap-3 md:grid-cols-3 mb-4">
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-red-100">
                      <Database className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="font-bold">{dataCounts.learning_samples_count.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Learning Samples</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-red-100">
                      <Server className="h-4 w-4 text-purple-600" />
                      <div>
                        <div className="font-bold">{dataCounts.equipment_count.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Equipment Records</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-red-100">
                      <Variable className="h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="font-bold">{dataCounts.variables_count.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Discovered Variables</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 border border-red-200 rounded-lg bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-medium text-red-900">Clear All Discovery Data</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Permanently delete all learning samples, discovered equipment, and discovered variables 
                        from <strong>ALL sites</strong>. This action cannot be undone.
                      </p>
                      {totalRecords > 0 && (
                        <p className="text-sm font-medium text-red-800 mt-2">
                          This will delete {totalRecords.toLocaleString()} records across all sites.
                        </p>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setDialogOpen(true)}
                      disabled={totalRecords === 0}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Clear All Discovery Data
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    You are about to permanently delete <strong>ALL</strong> discovery data from <strong>ALL sites</strong>.
                  </p>
                  
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                    <p className="font-medium text-red-800">This will delete:</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• {dataCounts?.learning_samples_count.toLocaleString() || 0} learning samples</li>
                      <li>• {dataCounts?.equipment_count.toLocaleString() || 0} equipment records</li>
                      <li>• {dataCounts?.variables_count.toLocaleString() || 0} discovered variables</li>
                    </ul>
                    <p className="text-sm font-medium text-red-800 pt-2 border-t border-red-200">
                      Total: {totalRecords.toLocaleString()} records
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-all-text" className="text-foreground">
                      Type <strong>{confirmRequired}</strong> to confirm:
                    </Label>
                    <Input
                      id="confirm-all-text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={confirmRequired}
                      className="font-mono"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearAllData}
                disabled={confirmText !== confirmRequired || deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All Data
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Settings;