import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const Settings = () => {
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
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications about newly discovered equipment
                  </p>
                </div>
                <Switch defaultChecked />
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
                    defaultValue="0.95"
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
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Integration Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
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
                  defaultValue="https://api.cyberenergia.com/v1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="n8n-webhook">
                  n8n Webhook
                </Label>
                <Input
                  id="n8n-webhook"
                  placeholder="https://n8n.cyberenergia.com/webhook/..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button>Save Settings</Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;