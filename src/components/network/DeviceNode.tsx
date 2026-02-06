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

// Get zone color based on ISA-95 level
const getZoneColor = (zone: string | null): string => {
  if (!zone) return '#6b7280'; // gray
  
  if (zone.includes('Level 4') || zone.includes('Enterprise')) return '#3b82f6'; // blue
  if (zone.includes('Level 3') || zone.includes('SCADA') || zone.includes('Site')) return '#8b5cf6'; // purple
  if (zone.includes('DMZ')) return '#f59e0b'; // amber
  if (zone.includes('Level 2') || zone.includes('Cell') || zone.includes('Area')) return '#06b6d4'; // cyan
  if (zone.includes('Level 1') || zone.includes('Control') || zone.includes('Process')) return '#10b981'; // emerald
  if (zone.includes('IT')) return '#3b82f6'; // blue
  
  return '#6b7280'; // gray for unknown
};

export const DeviceNode = memo(({ data }: NodeProps<{ asset: NetworkAsset; onClick?: (asset: NetworkAsset) => void }>) => {
  const asset = data.asset;
  const Icon = getDeviceIcon(asset.device_type_final);
  
  // Get first IP (primary)
  const primaryIp = asset.ips?.split(';')[0] || 'No IP';
  
  // Get primary VLAN
  const primaryVlan = asset.vlans?.split(';')[0] || 'No VLAN';
  
  // Get VLAN name from flows_vlans_from_flows if available
  const vlanName = asset.flows_vlans_from_flows?.split(';')[0] || primaryVlan;
  
  const handleClick = () => {
    if (data.onClick) {
      data.onClick(asset);
    }
  };

  const zoneColor = getZoneColor(asset.zone);

  return (
    <div
      onClick={handleClick}
      className={cn(
        'px-2.5 py-2 rounded-lg border-2 shadow-md cursor-pointer transition-all hover:shadow-xl hover:scale-105 min-w-[200px] max-w-[200px]',
        getRiskColor(asset.risk_score)
      )}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className={cn(
            'p-1 rounded',
            asset.risk_score && asset.risk_score >= 40 ? 'bg-red-100' :
            asset.risk_score && asset.risk_score >= 20 ? 'bg-amber-100' :
            'bg-emerald-100'
          )}>
            <Icon className={cn(
              'h-3.5 w-3.5',
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
        
        <Badge className={cn('text-[9px] px-1 py-0', getRiskBadgeColor(asset.risk_score))}>
          {asset.risk_score || 0}
        </Badge>
      </div>
      
      {/* Vendor */}
      <div className="font-medium text-xs mb-0.5 truncate" title={asset.vendor || 'Unknown'}>
        {asset.vendor || 'Unknown'}
      </div>
      
      {/* Device Type */}
      {asset.device_type_final && (
        <div className="text-[9px] text-muted-foreground mb-1.5 truncate" title={asset.device_type_final}>
          {asset.device_type_final}
        </div>
      )}
      
      {/* IP Address */}
      <div className="font-mono text-[10px] mb-1 truncate" title={primaryIp}>
        {primaryIp}
      </div>
      
      {/* MAC Address */}
      <div className="font-mono text-[8px] text-muted-foreground mb-1.5 truncate" title={asset.mac}>
        {asset.mac}
      </div>
      
      {/* Footer badges */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* Zone indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: zoneColor }}
            />
          </TooltipTrigger>
          <TooltipContent>{asset.zone || 'Unknown zone'}</TooltipContent>
        </Tooltip>
        
        {/* VLAN badge */}
        <Badge variant="outline" className="text-[8px] px-1 py-0" title={vlanName}>
          {vlanName.length > 12 ? vlanName.slice(0, 12) + '...' : vlanName}
        </Badge>
        
        {asset.ot_protocols_base && (
          <Badge className="bg-purple-100 text-purple-700 text-[8px] px-1 py-0">
            {asset.ot_protocols_base.split(';')[0]}
          </Badge>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
    </div>
  );
});

DeviceNode.displayName = 'DeviceNode';