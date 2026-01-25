import { NetworkAsset } from '@/types/network';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Server, 
  Network as NetworkIcon, 
  Shield, 
  Activity,
  Globe,
  Info,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AssetDetailSheetProps {
  asset: NetworkAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatBytes = (bytes: number | null): string => {
  if (!bytes) return '0 B';
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' B';
};

const getRiskBadge = (riskScore: number | null) => {
  if (riskScore === null) return <Badge variant="secondary">Unknown</Badge>;
  if (riskScore >= 40) return <Badge className="bg-red-500 text-white">High Risk ({riskScore})</Badge>;
  if (riskScore >= 20) return <Badge className="bg-amber-500 text-white">Medium Risk ({riskScore})</Badge>;
  return <Badge className="bg-emerald-500 text-white">Low Risk ({riskScore})</Badge>;
};

export const AssetDetailSheet = ({ asset, open, onOpenChange }: AssetDetailSheetProps) => {
  if (!asset) return null;

  const ips = asset.ips?.split(';').filter(Boolean) || [];
  const vlans = asset.vlans?.split(';').filter(Boolean) || [];
  const ports = asset.ports?.split(';').filter(Boolean) || [];
  const otProtocols = asset.ot_protocols_base?.split(';').filter(Boolean) || [];
  
  const firstSeen = asset.flows_first_seen 
    ? new Date(asset.flows_first_seen * 1000) 
    : null;
  const lastSeen = asset.flows_last_seen 
    ? new Date(asset.flows_last_seen * 1000) 
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Network Asset Details
          </SheetTitle>
          <SheetDescription>
            Detailed information from IT network discovery
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Identification */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                Identification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Vendor</div>
                <div className="font-medium">{asset.vendor || 'Unknown'}</div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground mb-1">MAC Address</div>
                <code className="text-sm bg-slate-100 px-2 py-1 rounded font-mono">
                  {asset.mac}
                </code>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground mb-1">Device Type</div>
                <div className="space-y-1">
                  {asset.device_type_final && (
                    <Badge variant="outline">{asset.device_type_final}</Badge>
                  )}
                  {asset.device_type_base && asset.device_type_base !== asset.device_type_final && (
                    <Badge variant="secondary" className="ml-2">Base: {asset.device_type_base}</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Risk Score:</span>
                {getRiskBadge(asset.risk_score)}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confidence:</span>
                <Badge variant="outline">{asset.confidence || 'Unknown'}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Zone:</span>
                <Badge className="bg-blue-100 text-blue-700">
                  {asset.zone || 'Unknown'}
                </Badge>
              </div>
              
              {asset.flows_talks_to_internet && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                  <Globe className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-700 font-medium">Internet Exposed</span>
                </div>
              )}
              
              {asset.risk_factors && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Risk Factors:</div>
                  <div className="text-xs bg-slate-50 p-2 rounded border">
                    {asset.risk_factors}
                  </div>
                </div>
              )}
              
              {asset.comment && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Analysis Comment:</div>
                  <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                    {asset.comment}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Network Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <NetworkIcon className="h-4 w-4" />
                Network Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ips.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">IP Addresses ({ips.length}):</div>
                  <div className="flex flex-wrap gap-1">
                    {ips.slice(0, 5).map((ip, i) => (
                      <code key={i} className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">
                        {ip}
                      </code>
                    ))}
                    {ips.length > 5 && (
                      <Badge variant="secondary" className="text-xs">+{ips.length - 5} more</Badge>
                    )}
                  </div>
                </div>
              )}
              
              {vlans.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">VLANs:</div>
                  <div className="flex flex-wrap gap-1">
                    {vlans.map((vlan, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {vlan}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {ports.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Open Ports ({ports.length}):</div>
                  <div className="flex flex-wrap gap-1">
                    {ports.slice(0, 10).map((port, i) => (
                      <Badge key={i} variant="secondary" className="text-xs font-mono">
                        {port}
                      </Badge>
                    ))}
                    {ports.length > 10 && (
                      <Badge variant="secondary" className="text-xs">+{ports.length - 10} more</Badge>
                    )}
                  </div>
                </div>
              )}
              
              {otProtocols.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">OT Protocols:</div>
                  <div className="flex flex-wrap gap-1">
                    {otProtocols.map((protocol, i) => (
                      <Badge key={i} className="bg-purple-100 text-purple-700 text-xs">
                        {protocol}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Traffic Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Traffic Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Packets</div>
                  <div className="font-mono text-sm">{asset.packets?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Bytes</div>
                  <div className="font-mono text-sm">{formatBytes(asset.bytes)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Flows (Src)</div>
                  <div className="font-mono text-sm">{asset.flows_total_as_src || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Flows (Dst)</div>
                  <div className="font-mono text-sm">{asset.flows_total_as_dst || 0}</div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="text-xs text-muted-foreground mb-1">Unique Peers:</div>
                <div className="font-medium">{asset.flows_unique_peers || 0}</div>
              </div>
              
              {asset.flows_peers_by_type && Object.keys(asset.flows_peers_by_type).length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Communication by Peer Type:</div>
                  <div className="space-y-1">
                    {Object.entries(asset.flows_peers_by_type).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{type}:</span>
                        <Badge variant="secondary" className="text-xs">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(firstSeen || lastSeen) && (
                <>
                  <Separator />
                  <div className="space-y-2 text-xs">
                    {firstSeen && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">First Seen:</span>
                        <span>{formatDistanceToNow(firstSeen, { addSuffix: true })}</span>
                      </div>
                    )}
                    {lastSeen && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Last Seen:</span>
                        <span>{formatDistanceToNow(lastSeen, { addSuffix: true })}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Job Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Discovery Job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Job ID:</span>
                <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{asset.job_id}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Source:</span>
                <Badge variant="outline">{asset.datasource}</Badge>
              </div>
              {asset.pcap_name && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">PCAP:</span>
                  <span className="font-mono text-xs truncate max-w-[200px]" title={asset.pcap_name}>
                    {asset.pcap_name}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};