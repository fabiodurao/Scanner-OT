import { useState, useEffect } from 'react';
import { DiscoveredEquipment } from '@/types/discovery';
import { EquipmentCatalogLink } from '@/types/catalog';
import { useEquipmentCatalog } from '@/hooks/useEquipmentCatalog';
import { CatalogLinkSelector } from '@/components/catalog/CatalogLinkSelector';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Cpu, Network, Variable, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface EquipmentListProps {
  equipment: DiscoveredEquipment[];
  siteIdentifier?: string;
  equipmentIds?: Map<string, string>; // ip -> equipment id
  catalogLinks?: Map<string, EquipmentCatalogLink>;
  onCatalogLinkChanged?: () => void;
}

const roleConfig = {
  master: {
    label: 'Master/Client',
    icon: Network,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    description: 'Initiates Modbus requests',
  },
  slave: {
    label: 'Slave/Server',
    icon: Cpu,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    description: 'Responds to Modbus requests',
  },
  unknown: {
    label: 'Unknown',
    icon: Server,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Role not determined',
  },
};

export const EquipmentList = ({ equipment, siteIdentifier, equipmentIds, catalogLinks, onCatalogLinkChanged }: EquipmentListProps) => {
  // Separate by role
  const slaves = equipment.filter(e => e.role === 'slave');
  const masters = equipment.filter(e => e.role === 'master');
  const unknown = equipment.filter(e => e.role === 'unknown');

  const renderEquipmentCard = (eq: DiscoveredEquipment) => {
    const config = roleConfig[eq.role];
    const Icon = config.icon;
    const eqId = equipmentIds?.get(eq.ip);
    const catalogLink = eqId ? catalogLinks?.get(eqId) || null : null;
    
    return (
      <Card key={eq.ip} className="hover:shadow-md transition-shadow">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={cn("p-2 rounded-lg", config.color.split(' ')[0])}>
                <Icon className={cn("h-5 w-5", config.color.split(' ')[1])} />
              </div>
              <div>
                <div className="font-mono font-medium text-lg">{eq.ip}</div>
                {eq.mac && (
                  <div className="font-mono text-xs text-muted-foreground mt-0.5">
                    {eq.mac}
                  </div>
                )}
                <Badge variant="outline" className={cn("mt-2", config.color)}>
                  {config.label}
                </Badge>
              </div>
            </div>
            
            <div className="text-right">
              {eq.variableCount > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <Variable className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{eq.variableCount}</span>
                  <span className="text-muted-foreground">vars</span>
                </div>
              )}
            </div>
          </div>

          {/* Catalog Link Section */}
          {siteIdentifier && eqId && eq.role === 'slave' && (
            <div className="mt-4 pt-3 border-t">
              <CatalogLinkSelector
                equipmentId={eqId}
                equipmentIp={eq.ip}
                siteIdentifier={siteIdentifier}
                existingLink={catalogLink}
                onLinkChanged={onCatalogLinkChanged || (() => {})}
              />
            </div>
          )}
          
          <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {eq.protocols.map(protocol => (
                <Badge key={protocol} variant="secondary" className="text-xs">
                  {protocol}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(eq.lastSeen), { addSuffix: true })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Slaves (devices with registers) */}
      {slaves.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Slave Devices ({slaves.length})
            <span className="text-xs font-normal">- Devices with Modbus registers</span>
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {slaves.map(renderEquipmentCard)}
          </div>
        </div>
      )}
      
      {/* Masters (clients) */}
      {masters.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Network className="h-4 w-4" />
            Master Devices ({masters.length})
            <span className="text-xs font-normal">- SCADA/HMI systems</span>
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {masters.map(renderEquipmentCard)}
          </div>
        </div>
      )}
      
      {/* Unknown */}
      {unknown.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Server className="h-4 w-4" />
            Other Devices ({unknown.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {unknown.map(renderEquipmentCard)}
          </div>
        </div>
      )}
    </div>
  );
};