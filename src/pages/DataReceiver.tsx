import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReceivedData, ReceivedDataRecord } from '@/hooks/useReceivedData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { Radio, Trash2, Loader2, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const SUPABASE_PROJECT_ID = 'jgclhfwigmxmqyhqngcm';
const RECEIVER_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/data-receiver`;

const DataReceiver = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSite = searchParams.get('site') || '';
  const [selectedSite, setSelectedSite] = useState(initialSite);
  const [availableSites, setAvailableSites] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const tableEndRef = useRef<HTMLDivElement>(null);

  const { records, totalCount, loading, clearing, clearData } = useReceivedData(
    selectedSite || undefined
  );

  // Fetch available site identifiers from received_data
  useEffect(() => {
    const fetchSites = async () => {
      const { data } = await supabase
        .from('received_data')
        .select('site_identifier')
        .not('site_identifier', 'is', null)
        .order('site_identifier');

      if (data) {
        const unique = [...new Set(data.map(d => d.site_identifier).filter(Boolean))] as string[];
        setAvailableSites(unique);
      }
    };
    fetchSites();
    const interval = setInterval(fetchSites, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && tableEndRef.current) {
      tableEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [records, autoScroll]);

  const handleSiteChange = (value: string) => {
    const site = value === '__all__' ? '' : value;
    setSelectedSite(site);
    if (site) {
      searchParams.set('site', site);
    } else {
      searchParams.delete('site');
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleClear = async () => {
    await clearData();
    setClearDialogOpen(false);
    toast.success('Data cleared');
  };

  const copyUrl = () => {
    const url = selectedSite
      ? `${RECEIVER_URL}?site=${encodeURIComponent(selectedSite)}`
      : RECEIVER_URL;
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  const copyCurl = () => {
    const url = selectedSite
      ? `${RECEIVER_URL}?site=${encodeURIComponent(selectedSite)}`
      : RECEIVER_URL;
    const cmd = `curl -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"site_identifier":"${selectedSite || 'test-site'}","data":[{"source_ip":"192.168.1.1","dest_ip":"192.168.1.2","address":100,"FC":3,"value":42.5}]}'`;
    navigator.clipboard.writeText(cmd);
    toast.success('cURL command copied to clipboard');
  };

  const isListening = records.length > 0 || totalCount > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/50">
                <Radio className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Data Receiver</h1>
                <p className="text-sm text-muted-foreground">Test endpoint for incoming data</p>
              </div>
              {isListening ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700 gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Listening
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">Idle</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Switch id="auto-scroll" checked={autoScroll} onCheckedChange={setAutoScroll} />
                <Label htmlFor="auto-scroll" className="text-sm">Auto-scroll</Label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Endpoint Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Endpoint URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono break-all">
                {selectedSite
                  ? `${RECEIVER_URL}?site=${encodeURIComponent(selectedSite)}`
                  : RECEIVER_URL}
              </code>
              <Button variant="outline" size="sm" onClick={copyUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={copyCurl} className="text-xs">
              <Copy className="h-3 w-3 mr-1.5" />
              Copy cURL example
            </Button>
          </CardContent>
        </Card>

        {/* Filters & Actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">Filter by site:</Label>
            <Select value={selectedSite || '__all__'} onValueChange={handleSiteChange}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="All sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All sites</SelectItem>
                {availableSites.map(site => (
                  <SelectItem key={site} value={site}>
                    <code className="text-xs">{site.length > 30 ? site.slice(0, 30) + '...' : site}</code>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary">{totalCount} records</Badge>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setClearDialogOpen(true)}
            disabled={totalCount === 0 || clearing}
          >
            {clearing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Clear Data
          </Button>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : records.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-40" />
              <h3 className="font-medium text-lg mb-2">No data received yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Send a POST request to the endpoint above to start receiving data.
              </p>
              <div className="max-w-lg mx-auto text-left">
                <p className="text-xs text-muted-foreground mb-2">Example:</p>
                <pre className="text-xs bg-muted p-3 rounded font-mono overflow-x-auto whitespace-pre-wrap">
{`curl -X POST "${RECEIVER_URL}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "site_identifier": "my-site-id",
    "data": [{
      "source_ip": "192.168.1.1",
      "dest_ip": "192.168.1.2",
      "address": 100,
      "FC": 3,
      "value": 42.5
    }]
  }'`}
                </pre>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Received At</TableHead>
                  <TableHead className="w-[200px]">Site Identifier</TableHead>
                  <TableHead className="w-[120px]">Source IP</TableHead>
                  <TableHead>Payload Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <RecordRow key={record.id} record={record} />
                ))}
              </TableBody>
            </Table>
            <div ref={tableEndRef} />
          </div>
        )}

        {totalCount > 100 && (
          <p className="text-xs text-muted-foreground text-center">
            Showing latest 100 of {totalCount} records
          </p>
        )}
      </div>

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear received data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedSite ? `all data for site "${selectedSite}"` : 'all received data'}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const RecordRow = ({ record }: { record: ReceivedDataRecord }) => {
  const [expanded, setExpanded] = useState(false);

  const formatPayloadSummary = (payload: Record<string, unknown>): string => {
    if (!payload) return '—';
    const parts: string[] = [];
    if (payload.source_ip) parts.push(`src: ${payload.source_ip}`);
    if (payload.dest_ip || payload.destination_ip) parts.push(`dst: ${payload.dest_ip || payload.destination_ip}`);
    if (payload.address !== undefined) parts.push(`addr: ${payload.address}`);
    if (payload.FC !== undefined) parts.push(`FC: ${payload.FC}`);
    if (Array.isArray(payload.data)) parts.push(`${payload.data.length} items`);
    if (parts.length > 0) return parts.join(' · ');
    const keys = Object.keys(payload).slice(0, 4);
    return keys.join(', ') + (Object.keys(payload).length > 4 ? '...' : '');
  };

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="text-xs">
          <div>{new Date(record.received_at).toLocaleTimeString()}</div>
          <div className="text-muted-foreground text-[10px]">
            {formatDistanceToNow(new Date(record.received_at), { addSuffix: true })}
          </div>
        </TableCell>
        <TableCell>
          <code className="text-xs font-mono">
            {record.site_identifier
              ? (record.site_identifier.length > 24
                ? record.site_identifier.slice(0, 24) + '...'
                : record.site_identifier)
              : '—'}
          </code>
        </TableCell>
        <TableCell className="text-xs font-mono">
          {record.source_ip || '—'}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {formatPayloadSummary(record.payload)}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={4} className="bg-muted/30">
            <pre className="text-xs font-mono whitespace-pre-wrap max-h-60 overflow-auto p-2">
              {JSON.stringify(record.payload, null, 2)}
            </pre>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export default DataReceiver;
