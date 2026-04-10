import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EndpointCard } from './EndpointCard';
import { PostmanExport } from './PostmanExport';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const SUPABASE_URL = 'https://jgclhfwigmxmqyhqngcm.supabase.co';

interface ActiveKey {
  id: string;
  name: string;
  key_prefix: string;
}

const errorCodes = [
  { code: '401', description: 'Unauthorized — Missing or invalid API key', example: '{ "error": "Missing X-API-Key header" }' },
  { code: '400', description: 'Bad Request — Invalid request body or parameters', example: '{ "error": "No valid fields to update. Allowed fields: name, slug" }' },
  { code: '404', description: 'Not Found — Resource or route not found', example: '{ "error": "Site not found" }' },
  { code: '409', description: 'Conflict — Resource conflict (e.g., duplicate slug)', example: '{ "error": "Slug already in use by another site" }' },
  { code: '500', description: 'Internal Server Error — Unexpected server error', example: '{ "error": "Internal server error" }' },
];

export function ApiDocumentation() {
  const { toast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeKeys, setActiveKeys] = useState<ActiveKey[]>([]);

  useEffect(() => {
    const fetchKeys = async () => {
      const { data } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix')
        .eq('is_active', true)
        .is('revoked_at', null);
      setActiveKeys(data || []);
    };
    fetchKeys();
  }, []);

  const baseUrl = SUPABASE_URL;
  const apiBaseUrl = `${baseUrl}/functions/v1/external-api`;

  const copyBaseUrl = async () => {
    await navigator.clipboard.writeText(apiBaseUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast({ title: 'Copied', description: 'Base URL copied to clipboard' });
  };

  return (
    <div className="space-y-8">
      {/* Header with Postman Export */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">API Reference</h3>
          <p className="text-sm text-muted-foreground">
            Complete documentation for the OT Scanner external API.
          </p>
        </div>
        <PostmanExport baseUrl={baseUrl} />
      </div>

      {/* Base URL */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-semibold mb-2">Base URL</h4>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono">
              {apiBaseUrl}
            </code>
            <Button variant="outline" size="icon" onClick={copyBaseUrl}>
              {copiedUrl ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h4 className="text-sm font-semibold">Authentication</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            All API requests must include a valid API key in the <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">X-API-Key</code> header.
          </p>
          <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg text-xs font-mono overflow-x-auto">
{`GET /functions/v1/external-api/sites/list
Host: ${baseUrl.replace('https://', '')}
X-API-Key: otsk_your_api_key_here`}
          </pre>
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              API keys are prefixed with <code className="font-mono">otsk_</code> for easy identification. Generate keys in the "API Keys" tab.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Endpoints</h3>
        <div className="space-y-6">
          <EndpointCard
            method="GET"
            path="/sites/list"
            description="Returns a list of all sites with their basic information."
            baseUrl={baseUrl}
            apiKeys={activeKeys}
            responseExample={JSON.stringify({
              sites: [
                {
                  id: "550e8400-e29b-41d4-a716-446655440000",
                  name: "Solar Farm Alpha",
                  slug: "solar-farm-alpha",
                  site_type: "fotovoltaica",
                  city: "São Paulo",
                  state: "SP",
                  country: "Brasil",
                  created_at: "2024-01-15T10:30:00Z"
                }
              ],
              count: 1
            }, null, 2)}
          />

          <EndpointCard
            method="PATCH"
            path="/sites/{siteId}"
            description="Update a site's name and/or slug. At least one field must be provided."
            baseUrl={baseUrl}
            apiKeys={activeKeys}
            parameters={[
              { name: 'siteId', type: 'uuid', required: true, description: 'The unique identifier of the site', location: 'path' },
              { name: 'name', type: 'string', required: false, description: 'New name for the site', location: 'body' },
              { name: 'slug', type: 'string', required: false, description: 'New slug for the site (must be unique)', location: 'body' },
            ]}
            requestBody={JSON.stringify({ name: "Updated Site Name", slug: "updated-slug" }, null, 2)}
            responseExample={JSON.stringify({
              site: {
                id: "550e8400-e29b-41d4-a716-446655440000",
                name: "Updated Site Name",
                slug: "updated-slug",
                site_type: "fotovoltaica",
                city: "São Paulo",
                state: "SP",
                country: "Brasil",
                created_at: "2024-01-15T10:30:00Z",
                updated_at: "2024-06-20T14:00:00Z"
              }
            }, null, 2)}
          />
        </div>
      </div>

      {/* Error Codes */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-semibold mb-4">Error Codes</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Description</th>
                  <th className="text-left px-4 py-2 font-medium">Example</th>
                </tr>
              </thead>
              <tbody>
                {errorCodes.map((err) => (
                  <tr key={err.code} className="border-t">
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono">{err.code}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{err.description}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{err.example}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
