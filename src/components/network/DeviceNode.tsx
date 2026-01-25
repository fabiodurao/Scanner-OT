import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NetworkAsset } from '@/types/network';
import { Badge } from '@/components/ui/badge';
import { 
  Server, 
  Cpu, 
  Network, 
  Globe,
  HardDrive,
  Monitor,
  Box,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const getDeviceIcon = (deviceType: string | null) => {
  if (!deviceType) return Server;
  
  const type = deviceType.toLowerCase();
  if (type.includes('scada') || type.includes('server')) return Server;
  if (type.includes('plc') || type.includes('controller')) return Cpu;
  if (type.includes('switch') || type.includes('network')) return Network;
  if (type.includes('workstation') || type.includes('host')) return Monitor;
  if (type.includes('virtual') || type.includes('vmware')) return HardDrive;
  
  return Box;
};

const getRiskColor = (riskScore: number | null): string => {
  if (riskScore === null) return 'bg-slate-100 border-slate-300';
  if (riskScore >= 40) return 'bg-red-50 border-red-400';
  if (riskScore >= 20) return 'bg-amber-50 border-amber-400';
  return 'bg-emerald-50 border-emerald-400';
};

const getRiskBadgeColor = (riskScore: number | null): string => {
  if (riskScore === null) return 'bg-slate-100 text-slate-700';
  if (riskScore >= 40) return 'bg-red-500 text-white';
  if (riskScore >= 20) return 'bg-amber-500 text-white';
  return 'bg-emerald-500 text-white';
};

export const DeviceNode = memo(({ data }: NodeProps<{ asset: NetworkAsset; onClick?: (asset: NetworkAsset) => void }>) => {
  const asset = data.asset;
  const Icon = getDeviceIcon(asset.device_type_final);
  
  // Get first IP (primary)
  const primaryIp = asset.ips?.split(';')[0] || 'No IP';
  
  // Get primary VLAN
  const primaryVlan = asset.vlans?.split(';')[0] || null;
  
  const handleClick = () => {
    if (data.onClick) {
      data.onClick(asset);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'px-3 py-2 rounded-lg border-2 shadow-lg cursor-pointer transition-all hover:shadow-xl hover:scale-105 min-w-[180px] max-w-[220px]',
        getRiskColor(asset.risk_score)
      )}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-1.5 rounded',
            asset.risk_score && asset.risk_score >= 40 ? 'bg-red-100' :
            asset.risk_score && asset.risk_score >= 20 ? 'bg-amber-100' :
            'bg-emerald-100'
          )}>
            <Icon className={cn(
              'h-4 w-4',
              asset.risk_score && asset.risk_score >= 40 ? 'text-red-600' :
              asset.risk_score && asset.risk_score >= 20 ? 'text-amber-600' :
              'text-emerald-600'
            )} />
          </div>
          {asset.flows_talks_to_internet && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Globe className="h-3 w-3 text-red-500" />
              </TooltipTrigger>
              <TooltipContent>Internet exposed</TooltipContent>
            </Tooltip>
          )}
        </div>
        
        <Badge className={cn('text-[10px] px-1.5 py-0', getRiskBadgeColor(asset.risk_score))}>
          {asset.risk_score || 0}
        </Badge>
      </div>
      
      {/* Vendor */}
      <div className="font-medium text-xs mb-1 truncate" title={asset.vendor || 'Unknown'}>
        {asset.vendor || 'Unknown'}
      </div>
      
      {/* Device Type */}
      {asset.device_type_final && (
        <div className="text-[10px] text-muted-foreground mb-2 truncate" title={asset.device_type_final}>
          {asset.device_type_final}
        </div>
      )}
      
      {/* IP Address */}
      <div className="font-mono text-[10px] mb-1 truncate" title={primaryIp}>
        {primaryIp}
      </div>
      
      {/* MAC Address */}
      <div className="font-mono text-[9px] text-muted-foreground mb-2 truncate" title={asset.mac}>
        {asset.mac}
      </div>
      
      {/* Footer badges */}
      <div className="flex items-center gap-1 flex-wrap">
        {primaryVlan && (
          <Badge variant="outline" className="text-[9px] px-1 py-0">
            VLAN {primaryVlan}
          </Badge>
        )}
        {asset.ot_protocols_base && (
          <Badge className="bg-purple-100 text-purple-700 text-[9px] px-1 py-0">
            {asset.ot_protocols_base.split(';')[0]}
          </Badge>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
    </div>
  );
});

DeviceNode.displayName = 'DeviceNode';