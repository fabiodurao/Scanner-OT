import { useState, useEffect } from 'react';
import { useSitePublishUrl } from '@/hooks/useSitePublishUrl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Globe, Wrench, Save, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SitePublishUrlConfigProps {
  siteIdentifier: string;
}

export const SitePublishUrlConfig = ({ siteIdentifier }: SitePublishUrlConfigProps) => {
  const {
    publishUrl,
    useCustomPublishUrl,
    globalUrl,
    loading,
    saving,
    effectiveUrl,
    savePublishUrl,
    resetToGlobal,
  } = useSitePublishUrl(siteIdentifier);

  const [useCustom, setUseCustom] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setUseCustom(useCustomPublishUrl);
    setCustomUrl(publishUrl || '');
    setDirty(false);
  }, [useCustomPublishUrl, publishUrl]);

  const handleToggleCustom = (checked: boolean) => {
    setUseCustom(checked);
    if (!checked) {
      setCustomUrl('');
    }
    setDirty(true);
  };

  const handleUrlChange = (value: string) => {
    setCustomUrl(value);
    setDirty(true);
  };

  const handleSave = async () => {
    const success = await savePublishUrl(useCustom, useCustom ? customUrl : null);
    if (success) {
      toast.success('Publishing URL saved');
      setDirty(false);
    } else {
      toast.error('Failed to save publishing URL');
    }
  };

  const handleReset = async () => {
    const success = await resetToGlobal();
    if (success) {
      toast.success('Reset to global URL');
      setUseCustom(false);
      setCustomUrl('');
      setDirty(false);
    } else {
      toast.error('Failed to reset URL');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Publishing Configuration</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Publishing Configuration
          {useCustom ? (
            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700 gap-1">
              <Wrench className="h-3 w-3" />
              Custom URL
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700 gap-1">
              <Globe className="h-3 w-3" />
              Global URL
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure the publishing endpoint for this site's data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current effective URL */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <Label className="text-xs text-muted-foreground">Effective URL</Label>
          <p className="text-sm font-mono mt-1 break-all">{effectiveUrl || '(not set)'}</p>
        </div>

        {/* Global URL (read-only) */}
        {!useCustom && (
          <div className="space-y-1.5">
            <Label className="text-sm">Global URL (from Settings)</Label>
            <Input value={globalUrl} readOnly className="bg-muted/50 font-mono text-sm" />
            <p className="text-xs text-muted-foreground">
              Changes to global settings will apply here automatically
            </p>
          </div>
        )}

        {/* Toggle */}
        <div className="flex items-center justify-between py-2">
          <div>
            <Label htmlFor="custom-url-toggle" className="text-sm font-medium">Use custom URL</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Override the global publishing URL for this site
            </p>
          </div>
          <Switch
            id="custom-url-toggle"
            checked={useCustom}
            onCheckedChange={handleToggleCustom}
          />
        </div>

        {/* Custom URL input */}
        {useCustom && (
          <div className="space-y-1.5">
            <Label htmlFor="custom-url" className="text-sm">Custom URL</Label>
            <Input
              id="custom-url"
              value={customUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://your-endpoint.com/api/data"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Changes to the global URL will NOT affect this site
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={!dirty || saving} size="sm">
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
          {useCustomPublishUrl && (
            <Button variant="outline" onClick={handleReset} disabled={saving} size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Global
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
