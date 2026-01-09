import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Equipment, EquipmentType } from '@/types';
import { Server, Cpu, Zap, Gauge, Activity, Network } from 'lucide-react';

interface EquipmentCardProps {
  equipment: Equipment;
  variableCount: number;
  siteId: string;
}

const equipmentTypeConfig: Record<EquipmentType, { label: string; icon: React.ElementType; color: string }> = {
  scada: { label: 'SCADA', icon: Server, color: 'bg-blue-100 text-blue-700' },
  clp: { label: 'PLC', icon: Cpu, color: 'bg-purple-100 text-purple-700' },
  inversor: { label: 'Inverter', icon: Zap, color: 'bg-yellow-100 text-yellow-700' },
  gerador: { label: 'Generator', icon: Activity, color: 'bg-green-100 text-green-700' },
  multimedidor: { label: 'Multimeter', icon: Gauge, color: 'bg-orange-100 text-orange-700' },
  gateway: { label: 'Gateway', icon: Network, color: 'bg-slate-100 text-slate-700' },
  unknown: { label: 'Unknown', icon: Server, color: 'bg-gray-100 text-gray-700' },
};

export const EquipmentCard = ({ equipment, variableCount, siteId }: EquipmentCardProps) => {
  const config = equipmentTypeConfig[equipment.type];
  const Icon = config.icon;

  return (
    <Link to={`/sites/${siteId}/equipment/${equipment.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">{equipment.name}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {equipment.manufacturer || 'Unknown manufacturer'}
                </div>
              </div>
            </div>
            <Badge className={config.color}>{config.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">IP:</span>
              <span className="font-mono">{equipment.ip_address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">MAC:</span>
              <span className="font-mono text-xs">{equipment.mac_address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Variables:</span>
              <span className="font-bold">{variableCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};