import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { VlanFingerprint } from '@/utils/networkTopology';
import { Network, Shield, AlertTriangle, Server, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VlanGroupData {
  vlanId: string;
  zone: string;
  zoneColor: string;
  assetCount: number;
  fingerprint: VlanFingerprint;
  isPartOfTurbine?: boolean;
  turbineName?: string;
  onClick?: () => void;
}

export const VlanGroupNode = memo(({ data }: NodeProps<VlanGroupData>) => {
  const avgRisk = data.fingerprint.avgRiskScore;
  
  const getRiskColor = () => {
    if (avgRisk >= 40) return 'border-red-400 bg-red-50';
    if (avgRisk >= 20) return 'border-amber-400 bg-amber-50';
    return 'border-emerald-400 bg-emerald-50';
  };
  
  const hasInternet = Object.values(data.fingerprint.deviceCounts).some(count => count > 0);
  
  // Get top device types
  const topDeviceTypes = Object.entries(data.fingerprint.deviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  return (
    <div
      onClick={data.onClick}
      className={cn(
        'rounded-lg border-2 bg-white shadow-lg p-3 cursor-pointer transition-all hover:shadow-xl hover:scale-105',
        getRiskColor()
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: data.zoneColor }}
          />
          <div className="min-w-0">
            <div className="font-bold text-sm flex items-center gap-1">
              <Network className="h-4 w-4 flex-shrink-0" />
              <span>VLAN {data.vlanId}</span>
            </div>
            <div className="text-[9px] text-muted-foreground truncate">
              {data.zone}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasInternet && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Internet exposed</TooltipContent>
            </Tooltip>
          )}
          <Badge 
            variant="secondary" 
            className={cn(
              'text-[10px] px-1.5 py-0',
              avgRisk >= 40 ? 'bg-red-500 text-white' :
              avgRisk >= 20 ? 'bg-amber-500 text-white' :
              'bg-emerald-500 text-white'
            )}
          >
            <Shield className="h-2.5 w-2.5 mr-0.5" />
            {Math.round(avgRisk)}
          </Badge>
        </div>
      </div>
      
      {/* Turbine badge */}
      {data.isPartOfTurbine && data.turbineName && (
        <div className="mb-2">
          <Badge className="bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0">
            <Layers className="h-2.5 w-2.5 mr-0.5" />
            {data.turbineName}
          </Badge>
        </div>
      )}
      
      {/* Stats */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Server className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">{data.assetCount} devices</span>
        </div>
        
        {/* Top device types */}
        {topDeviceTypes.length > 0 && (
          <div className="space-y-0.5">
            {topDeviceTypes.map(([type, count]) => (
              <div key={type} className="text-[10px] text-muted-foreground flex items-center justify-between">
                <span className="truncate flex-1">{type}</span>
                <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1 flex-shrink-0">
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        )}
        
        {/* Vendor summary */}
        {(data.fingerprint.hasSiemens > 0 || data.fingerprint.hasPortwell > 0 || data.fingerprint.hasCisco > 0) && (
          <div className="pt-1 border-t text-[9px] text-muted-foreground space-y-0.5">
            {data.fingerprint.hasSiemens > 0 && <div>• {data.fingerprint.hasSiemens} Siemens</div>}
            {data.fingerprint.hasPortwell > 0 && <div>• {data.fingerprint.hasPortwell} Portwell</div>}
            {data.fingerprint.hasCisco > 0 && <div>• {data.fingerprint.hasCisco} Cisco</div>}
          </div>
        )}
      </div>
    </div>
  );
});

VlanGroupNode.displayName = 'VlanGroupNode';