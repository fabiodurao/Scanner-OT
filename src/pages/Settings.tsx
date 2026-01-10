import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useUserSettings } from '@/hooks/useUserSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Cpu, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const { settings, loading, saving, saveSettings } = useUserSettings();
  
  // Local form state
  const [formData, setFormData] = useState({
    auto_publish: false,
    notifications_enabled: true,
    confidence_threshold: '0.95',
    cross_site_learning: false,
    saas_endpoint: 'https://api.cyberenergia.com/v1',
    n8n_webhook_url: '',
    mbsniffer_interval_batch: '1000',
    mbsniffer_interval_min: '100',
  });

  // Update form when settings load
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
      });
    }
  }, [loading, settings]);

  const handleSave = async () => {
    const success = await saveSettings({
      auto_publish: formData.auto_publish,
      notifications_enabled: formData.notifications_enabled,
      confidence_threshold: parseFloat(formData.confidence_threshold) || 0.95,
      cross_site_learning: formData.cross_site_learning,
      saas_endpoint: formData.saas_endpoint,
      n8n_webhook_url: formData.n8n_webhook_url || null,
      mbsniffer_interval_batch: parseInt(formData.mbsniffer_interval_batch) || 1000,
      mbsniffer_interval_min: parseInt(formData.mbsniffer_interval_min) || 100,
    });

    if (success) {
      toast.success('Settings saved successfully!');
    } else {
      toast.error('Error saving settings');
    }
  };

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
          {/* General Settings */}
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

          {/* Inference Settings */}
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

          {/* mbsniffer Settings */}
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
                    Interval Batch
                  </Label>
                  <Input
                    id="interval-batch"
                    type="number"
                    value={formData.mbsniffer_interval_batch}
                    onChange={(e) => setFormData(prev => ({ ...prev, mbsniffer_interval_batch: e.target.value }))}
                    min="1"
                    placeholder="1000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of packets to process in each batch
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval-min">
                    Interval Min (ms)
                  </Label>
                  <Input
                    id="interval-min"
                    type="number"
                    value={formData.mbsniffer_interval_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, mbsniffer_interval_min: e.target.value }))}
                    min="1"
                    placeholder="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum interval between batches in milliseconds
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integration Settings */}
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
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;