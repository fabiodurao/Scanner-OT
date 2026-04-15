import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy, Check, Play, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  location: 'path' | 'body' | 'query';
}

interface EndpointProps {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  parameters?: Parameter[];
  requestBody?: string;
  responseExample: string;
  baseUrl: string;
}

const methodColors: Record<string, string> = {
  GET: 'bg-green-600 hover:bg-green-700',
  POST: 'bg-blue-600 hover:bg-blue-700',
  PATCH: 'bg-amber-600 hover:bg-amber-700',
  PUT: 'bg-orange-600 hover:bg-orange-700',
  DELETE: 'bg-red-600 hover:bg-red-700',
};

export function EndpointCard({
  method,
  path,
  description,
  parameters,
  requestBody,
  responseExample,
  baseUrl,
}: EndpointProps) {
  const { toast } = useToast();
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [tryResult, setTryResult] = useState<string | null>(null);
  const [tryLoading, setTryLoading] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const fullUrl = `${baseUrl}/functions/v1/external-api${path}`;

  const curlExample = method === 'GET'
    ? `curl -X ${method} "${fullUrl}" \\\n  -H "X-API-Key: YOUR_API_KEY"`
    : `curl -X ${method} "${fullUrl}" \\\n  -H "X-API-Key: YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody || '{}'}'`;

  const copyCurl = async () => {
    await navigator.clipboard.writeText(curlExample);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
    toast({ title: 'Copied', description: 'cURL command copied to clipboard' });
  };

  const handleTryIt = async () => {
    if (!apiKeyInput.trim()) {
      toast({ title: 'Enter your API key', description: 'Paste your full API key (otsk_...) to test', variant: 'destructive' });
      return;
    }

    setTryLoading(true);
    setTryResult(null);

    try {
      const headers: Record<string, string> = {
        'X-API-Key': apiKeyInput.trim(),
        'Content-Type': 'application/json',
      };

      const options: RequestInit = {
        method,
        headers,
      };

      if (method !== 'GET' && requestBody) {
        options.body = requestBody;
      }

      const response = await fetch(fullUrl, options);
      const data = await response.json();
      setTryResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setTryResult(`Error: ${err instanceof Error ? err.message : 'Request failed'}`);
    } finally {
      setTryLoading(false);
    }
  };

  return (
    <Card className="border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <Badge className={`${methodColors[method]} text-white font-mono text-xs px-2.5 py-1`}>
                {method}
              </Badge>
              <code className="text-sm font-mono font-semibold">{path}</code>
              <span className="text-sm text-muted-foreground ml-2 hidden sm:inline">— {description}</span>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <p className="text-sm text-muted-foreground sm:hidden">{description}</p>

            {/* Parameters */}
            {parameters && parameters.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Parameters</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">Type</th>
                        <th className="text-left px-3 py-2 font-medium">In</th>
                        <th className="text-left px-3 py-2 font-medium">Required</th>
                        <th className="text-left px-3 py-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parameters.map((param) => (
                        <tr key={param.name} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs">{param.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{param.type}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-xs">{param.location}</Badge>
                          </td>
                          <td className="px-3 py-2">
                            {param.required ? (
                              <Badge variant="default" className="text-xs bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">Required</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Optional</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{param.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* cURL Example */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">cURL Example</h4>
                <Button variant="ghost" size="sm" onClick={copyCurl}>
                  {copiedCurl ? <Check className="h-3 w-3 mr-1 text-green-600" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copiedCurl ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre">
                {curlExample}
              </pre>
            </div>

            {/* Response Example */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Response Example</h4>
              <pre className="bg-slate-950 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre">
                {responseExample}
              </pre>
            </div>

            {/* Try It */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-2">Try It</h4>
              <div className="flex items-center gap-3">
                <Input
                  type="password"
                  placeholder="Paste your full API key (otsk_...)"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="flex-1 font-mono text-sm"
                />
                <Button onClick={handleTryIt} disabled={tryLoading || !apiKeyInput.trim()}>
                  {tryLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Send Request
                </Button>
              </div>
              {tryResult && (
                <pre className="mt-3 bg-slate-950 text-slate-50 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre max-h-64 overflow-y-auto">
                  {tryResult}
                </pre>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
