import { DiscoveredEquipment } from '@/types/discovery';
import { EquipmentList } from './EquipmentList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Server, RefreshCcw } from 'lucide-react';

interface EquipmentTabProps {
  equipment: DiscoveredEquipment[];
  slaveEquipmentCount: number;
  masterEquipmentCount: number;
  syncing: boolean;
  onSyncEquipment: () => void;
}

export const EquipmentTab = ({
  equipment,
  slaveEquipmentCount,
  masterEquipmentCount,
  syncing,
  onSyncEquipment,
}: EquipmentTabProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg">Discovered Equipment</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Network devices identified in the OT traffic ({slaveEquipmentCount} slave devices, {masterEquipmentCount} master devices)
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSyncEquipment} 
            disabled={syncing}
            className="w-full sm:w-auto"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Equipment</span>
            <span className="sm:hidden">Sync</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {equipment.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <Server className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm sm:text-base">No equipment discovered yet</p>
            <Button 
              variant="outline" 
              className="mt-4 w-full sm:w-auto" 
              onClick={onSyncEquipment} 
              disabled={syncing}
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sync Equipment
            </Button>
          </div>
        ) : (
          <EquipmentList equipment={equipment} />
        )}
      </CardContent>
    </Card>
  );
};