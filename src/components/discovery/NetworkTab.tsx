import { NetworkAsset } from '@/types/network';
import { NetworkTopologyV2 } from '@/components/network/NetworkTopologyV2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network as NetworkIcon, RefreshCw, Loader2 } from 'lucide-react';

interface NetworkTabProps {
  networkAssets: NetworkAsset[];
  networkLoading: boolean;
  onRefreshNetwork: () => void;
  onAssetClick: (asset: NetworkAsset) => void;
}

export const NetworkTab = ({
  networkAssets,
  networkLoading,
  onRefreshNetwork,
  onAssetClick,
}: NetworkTabProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <NetworkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              Network Topology
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              IT/OT network visualization with Purdue Model zones and VLAN grouping ({networkAssets.length} assets)
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRefreshNetwork} 
            disabled={networkLoading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${networkLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {networkLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : networkAssets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            <NetworkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm sm:text-base">No network assets discovered yet</p>
            <p className="text-xs sm:text-sm mt-2">
              Process a PCAP file with IT network analysis to see the topology
            </p>
          </div>
        ) : (
          <div style={{ height: 'calc(100vh - 400px)', minHeight: '600px' }}>
            <NetworkTopologyV2 
              assets={networkAssets} 
              onNodeClick={onAssetClick}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};