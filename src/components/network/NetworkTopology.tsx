import { useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NetworkAsset } from '@/types/network';
import { DeviceNode } from './DeviceNode';
import { Badge } from '@/components/ui/badge';
import { Server, Shield, AlertTriangle } from 'lucide-react';

interface NetworkTopologyProps {
  assets: NetworkAsset[];
  onNodeClick?: (asset: NetworkAsset) => void;
}

const nodeTypes = {
  device: DeviceNode,
};

// Calculate layout positions based on zone (Purdue model)
const calculateNodePosition = (asset: NetworkAsset, index: number, assetsInZone: number): { x: number; y: number } => {
  const zone = asset.zone || 'Unknown';
  
  // Determine Y position based on zone (Purdue levels)
  let yBase = 0;
  if (zone.includes('Level 1') || zone.includes('Control Network')) {
    yBase = 100; // Field devices at top
  } else if (zone.includes('Level 2') || zone.includes('Cell/Area')) {
    yBase = 300; // Control level
  } else if (zone.includes('Level 3') || zone.includes('SCADA') || zone.includes('Site/Area')) {
    yBase = 500; // Supervisory level
  } else if (zone.includes('Level 4')) {
    yBase = 700; // Enterprise level
  } else if (zone.includes('DMZ')) {
    yBase = 400; // DMZ between levels
  } else if (zone.includes('IT')) {
    yBase = 800; // IT zone at bottom
  } else {
    yBase = 900; // Unknown at very bottom
  }
  
  // Spread horizontally within zone
  const spacing = 250;
  const totalWidth = (assetsInZone - 1) * spacing;
  const xStart = -totalWidth / 2;
  const x = xStart + (index * spacing);
  
  // Add some randomness to avoid perfect alignment
  const xJitter = (Math.random() - 0.5) * 50;
  const yJitter = (Math.random() - 0.5) * 30;
  
  return {
    x: x + xJitter,
    y: yBase + yJitter,
  };
};

export const NetworkTopology = ({ assets, onNodeClick }: NetworkTopologyProps) => {
  // Group assets by zone for layout
  const assetsByZone = useMemo(() => {
    const groups = new Map<string, NetworkAsset[]>();
    assets.forEach(asset => {
      const zone = asset.zone || 'Unknown';
      if (!groups.has(zone)) {
        groups.set(zone, []);
      }
      groups.get(zone)!.push(asset);
    });
    return groups;
  }, [assets]);

  // Create nodes
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    
    assetsByZone.forEach((zoneAssets) => {
      zoneAssets.forEach((asset, index) => {
        const position = calculateNodePosition(asset, index, zoneAssets.length);
        
        nodes.push({
          id: asset.mac,
          type: 'device',
          position,
          data: {
            asset,
            label: asset.vendor || 'Unknown',
            onClick: onNodeClick,
          },
        });
      });
    });
    
    return nodes;
  }, [assets, assetsByZone, onNodeClick]);

  // Create edges based on flows_peers_by_type
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    
    // For now, we'll create edges to the SCADA server (the central hub)
    // Since we don't have specific peer MAC addresses, we'll show conceptual connections
    const scadaAsset = assets.find(a => 
      a.device_type_final?.includes('SCADA') || 
      a.device_type_base?.includes('SCADA')
    );
    
    if (!scadaAsset) return edges;
    
    assets.forEach(asset => {
      if (asset.mac === scadaAsset.mac) return;
      
      // Check if this asset communicates with SCADA
      const peerTypes = asset.flows_peers_by_type || {};
      const scadaFlows = peerTypes['SCADA / OT Server'] || 0;
      
      if (scadaFlows > 0) {
        edges.push({
          id: `${asset.mac}-${scadaAsset.mac}`,
          source: asset.mac,
          target: scadaAsset.mac,
          type: 'default',
          animated: asset.flows_talks_to_internet || false,
          style: {
            stroke: asset.flows_talks_to_internet ? '#ef4444' : '#94a3b8',
            strokeWidth: Math.min(3, Math.max(1, scadaFlows / 100)),
          },
          data: {
            peerType: 'SCADA / OT Server',
            flowCount: scadaFlows,
          },
        });
      }
    });
    
    return edges;
  }, [assets]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Stats
  const stats = useMemo(() => {
    const totalAssets = assets.length;
    const highRisk = assets.filter(a => (a.risk_score || 0) >= 40).length;
    const mediumRisk = assets.filter(a => (a.risk_score || 0) >= 20 && (a.risk_score || 0) < 40).length;
    const lowRisk = assets.filter(a => (a.risk_score || 0) < 20).length;
    const internetExposed = assets.filter(a => a.flows_talks_to_internet).length;
    const otDevices = assets.filter(a => 
      a.device_type_final?.includes('OT') || 
      a.device_type_final?.includes('PLC') ||
      a.device_type_final?.includes('SCADA') ||
      a.device_type_final?.includes('Industrial')
    ).length;
    
    return {
      totalAssets,
      highRisk,
      mediumRisk,
      lowRisk,
      internetExposed,
      otDevices,
    };
  }, [assets]);

  return (
    <div className="h-[calc(100vh-300px)] min-h-[600px] border rounded-lg bg-slate-50 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const asset = (node.data as any).asset as NetworkAsset;
            const risk = asset.risk_score || 0;
            if (risk >= 40) return '#ef4444';
            if (risk >= 20) return '#f59e0b';
            return '#10b981';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        
        {/* Stats Panel */}
        <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Server className="h-4 w-4" />
            Network Overview
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Total Assets:</span>
              <Badge variant="secondary">{stats.totalAssets}</Badge>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">OT Devices:</span>
              <Badge className="bg-purple-100 text-purple-700">{stats.otDevices}</Badge>
            </div>
            
            <div className="border-t pt-2 space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-red-600">High Risk:</span>
                <Badge className="bg-red-100 text-red-700">{stats.highRisk}</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-amber-600">Medium Risk:</span>
                <Badge className="bg-amber-100 text-amber-700">{stats.mediumRisk}</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-emerald-600">Low Risk:</span>
                <Badge className="bg-emerald-100 text-emerald-700">{stats.lowRisk}</Badge>
              </div>
            </div>
            
            {stats.internetExposed > 0 && (
              <div className="border-t pt-2">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{stats.internetExposed} exposed to internet</span>
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* Legend Panel */}
        <Panel position="top-right" className="bg-white rounded-lg shadow-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Shield className="h-4 w-4" />
            Risk Levels
          </div>
          
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>High (40+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Medium (20-39)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Low (below 20)</span>
            </div>
          </div>
          
          <div className="border-t pt-2 mt-2">
            <div className="text-xs text-muted-foreground mb-1">Connections</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-slate-400" />
                <span>Internal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-red-500 animate-pulse" />
                <span>Internet</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};