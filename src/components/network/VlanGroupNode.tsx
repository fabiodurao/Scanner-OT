import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { VlanFingerprint } from '@/utils/networkTopology';
import { Network, Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VlanGroupData {
  vlanId: string;
  zone: string;
  zoneColor: string;
  assetCount: number;
  fingerprint: VlanFingerprint;
  isPartOfTurbine?: boolean;
  turbineName?: string;
}

export const VlanGroupNode = memo(({ data }: NodeProps<VlanGroupData>) => {
  const avgRisk = data.fingerprint.avgRiskScore;
  
  const getRiskColor = () => {
    if (avgRisk >= 40) return 'border-red-400 bg-red-50/50';
    if (avgRisk >= 20) return 'border-amber-400 bg-amber-50/50';
    return 'border-emerald-400 bg-emerald-50/50';
  };
  
  const hasInternet = data.fingerprint.vendorCounts['Palo Alto Networks'] || 
                       Object.values(data.fingerprint.deviceCounts).some(count => count > 0);
  
  return (
    <div
      className={cn(
        'rounded-lg border-2 bg-white/90 backdrop-blur-sm shadow-lg p-4',
        getRiskColor()
      )}
      style={{
        minWidth: '300px',
        minHeight: '150px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b-2">
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: data.zoneColor }}
          />
          <div>
            <div className="font-bold text-base flex items-center gap-2">
              <Network className="h-5 w-5" />
              VLAN {data.vlanId}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {data.zone}
            </div>
            {data.isPartOfTurbine && data.turbineName && (
              <div className="text-[10px] text-purple-600 font-medium mt-1">
                {data.turbineName}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {hasInternet && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Internet exposed</TooltipContent>
            </Tooltip>
          )}
          <Badge 
            variant="secondary" 
            className={cn(
              'text-xs px-2 py-0.5',
              avgRisk >= 40 ? 'bg-red-500 text-white' :
              avgRisk >= 20 ? 'bg-amber-500 text-white' :
              'bg-emerald-500 text-white'
            )}
          >
            <Shield className="h-3 w-3 mr-1" />
            {Math.round(avgRisk)}
          </Badge>
        </div>
      </div>
      
      {/* Stats */}
      <div className="text-xs text-muted-foreground space-y-1.5">
        <div className="font-medium">{data.assetCount} devices</div>
        {data.fingerprint.hasSiemens > 0 && (
          <div>• {data.fingerprint.hasSiemens} Siemens</div>
        )}
        {data.fingerprint.hasPortwell > 0 && (
          <div>• {data.fingerprint.hasPortwell} Portwell</div>
        )}
        {data.fingerprint.hasCisco > 0 && (
          <div>• {data.fingerprint.hasCisco} Cisco</div>
        )}
      </div>
    </div>
  );
});

VlanGroupNode.displayName = 'VlanGroupNode';