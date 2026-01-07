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
          <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as configurações do Middleware OT
          </p>
        </div>

        <div className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Configurações básicas do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Publicação Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Publicar automaticamente variáveis com alta confiança
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificações</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificações sobre novos equipamentos descobertos
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Inference Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Inferência</CardTitle>
              <CardDescription>
                Ajuste os parâmetros de inferência semântica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="confidence-threshold">
                  Limiar de Confiança para Confirmação Automática
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
                  <Label>Aprendizado Cruzado</Label>
                  <p className="text-sm text-muted-foreground">
                    Usar dados de outros sites para melhorar inferências
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Integration Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Integrações</CardTitle>
              <CardDescription>
                Configure integrações com sistemas externos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="saas-endpoint">
                  Endpoint SaaS CyberEnergia
                </Label>
                <Input
                  id="saas-endpoint"
                  placeholder="https://api.cyberenergia.com/v1"
                  defaultValue="https://api.cyberenergia.com/v1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="n8n-webhook">
                  Webhook n8n
                </Label>
                <Input
                  id="n8n-webhook"
                  placeholder="https://n8n.cyberenergia.com/webhook/..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button>Salvar Configurações</Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;