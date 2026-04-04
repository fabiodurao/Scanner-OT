import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, Eye, EyeOff, Loader2, CheckCircle, XCircle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'custom', label: 'Custom (OpenAI-compatible)' },
];

const MODELS: Record<string, { value: string; label: string }[]> = {
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ],
  custom: [
    { value: 'custom', label: 'Custom Model' },
  ],
};

interface AIProviderSettingsProps {
  provider: string;
  apiKey: string;
  model: string;
  customBaseUrl: string;
  onProviderChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onCustomBaseUrlChange: (value: string) => void;
}

export const AIProviderSettings = ({
  provider,
  apiKey,
  model,
  customBaseUrl,
  onProviderChange,
  onApiKeyChange,
  onModelChange,
  onCustomBaseUrlChange,
}: AIProviderSettingsProps) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast.error('Please enter an API key first');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        setTesting(false);
        return;
      }

      const response = await fetch(
        'https://jgclhfwigmxmqyhqngcm.supabase.co/functions/v1/ai-categorize',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ task: 'test_connection', registers: [] }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setTestResult({ success: true, message: `Connected to ${data.provider} (${data.model})` });
        toast.success('AI connection test successful!');
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed' });
        toast.error(data.error || 'Connection test failed');
      }
    } catch (error) {
      const msg = (error as Error).message;
      setTestResult({ success: false, message: msg });
      toast.error('Connection test failed: ' + msg);
    }

    setTesting(false);
  };

  const availableModels = MODELS[provider] || MODELS.custom;

  const handleProviderChange = (value: string) => {
    onProviderChange(value);
    // Set default model for the new provider
    const defaultModel = MODELS[value]?.[0]?.value || 'custom';
    onModelChange(defaultModel);
    setTestResult(null);
  };

  const maskedKey = apiKey
    ? apiKey.length > 8
      ? apiKey.substring(0, 4) + '•'.repeat(Math.min(apiKey.length - 8, 20)) + apiKey.substring(apiKey.length - 4)
      : '•'.repeat(apiKey.length)
    : '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Provider Configuration
        </CardTitle>
        <CardDescription>
          Configure your AI provider for automatic register categorization and other AI features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            {provider === 'custom' ? (
              <Input
                value={model}
                onChange={e => onModelChange(e.target.value)}
                placeholder="model-name"
                className="font-mono text-sm"
              />
            ) : (
              <Select value={model} onValueChange={onModelChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>API Key</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={showApiKey ? apiKey : maskedKey}
                onChange={e => {
                  onApiKeyChange(e.target.value);
                  setTestResult(null);
                }}
                onFocus={() => setShowApiKey(true)}
                placeholder={provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
                className="font-mono text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing || !apiKey}
              className="whitespace-nowrap"
            >
              {testing ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Testing...</>
              ) : (
                <><Zap className="h-3.5 w-3.5 mr-1" />Test Connection</>
              )}
            </Button>
          </div>
          {testResult && (
            <div className={`flex items-center gap-1.5 text-xs ${testResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
              {testResult.success ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {testResult.message}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Your API key is stored securely and only accessed server-side via Edge Functions.
          </p>
        </div>

        {provider === 'custom' && (
          <div className="space-y-2">
            <Label>Custom Base URL</Label>
            <Input
              value={customBaseUrl}
              onChange={e => onCustomBaseUrlChange(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Base URL for OpenAI-compatible API. The endpoint <code>/chat/completions</code> will be appended.
            </p>
          </div>
        )}

        {apiKey && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Bot className="h-3 w-3 mr-1" />
              {PROVIDERS.find(p => p.value === provider)?.label || provider}
            </Badge>
            <Badge variant="outline" className="text-xs font-mono">
              {model}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
