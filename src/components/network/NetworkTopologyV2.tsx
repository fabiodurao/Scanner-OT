import { useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  Panel,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NetworkAsset } from '@/types/network';
import { DeviceNode } from './DeviceNode';
import { VlanGroupNode } from './VlanGroupNode';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Server, 
  AlertTriangle, 
  Layers,
} from 'lucide-react';
import {
  PURDUE_ZONES,
  getFirstVlan,
  detectTurbinePatterns,
  classifyPurdueZone,
  createVlanFingerprint,
  sortAssetsByDeviceType,
} from '@/utils/networkTopology';

interface NetworkTopologyV2Props {
  assets: NetworkAsset[];
  onNodeClick?: (asset: NetworkAsset) => void;
}

const nodeTypes = {
  device: DeviceNode,
  vlanGroup: VlanGroupNode,
};

// Layout constants - SMALLER cards, MORE columns
const DEVICE_WIDTH = 200;
const DEVICE_HEIGHT = 110;
const GRID_COLUMNS = 8; // 8 devices per row (was 6)
const HORIZONTAL_SPACING = 50; // Reduced spacing
const VERTICAL_SPACING = 40; // Reduced spacing

const VLAN_GROUP_WIDTH = 280;
const VLAN_GROUP_HEIGHT = 160;

const parsePeerTypes = (peerTypes: any): Record<string, number> => {
  if (!peerTypes) return {};
  if (typeof peerTypes === 'object' && !Array.isArray(peerTypes)) return peerTypes;
  if (typeof peerTypes === 'string') {
    try {
      return JSON.parse(peerTypes);
    } catch {
      return {};
    }
  }
  return {};
};

export const NetworkTopologyV2 = ({ assets, onNodeClick }: NetworkTopologyV2Props) => {
  const [showTurbines, setShowTurbines] = useState(true);
  const [showInternetOnly, setShowInternetOnly] = useState(false);
  
  const turbinePatterns = useMemo(() => 
    detectTurbinePatterns(assets, 0.75),
    [assets]
  );
  
  const vlanToTurbine = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    turbinePatterns.forEach(pattern => {
      if (pattern.vlans.length > 1) {
        pattern.vlans.forEach(vlan => {
          map.set(vlan, { id: pattern.id, name: pattern.name });
        });
      }
    });
    return map;
  }, [turbinePatterns]);
  
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    const assetsByVlan = new Map<string, NetworkAsset[]>();
    assets.forEach(asset => {
      const vlan = getFirstVlan(asset);
      if (!assetsByVlan.has(vlan)) {
        assetsByVlan.set(vlan, []);
      }
      assetsByVlan.get(vlan)!.push(asset);
    });
    
    const vlanCount = assetsByVlan.size;
    
    console.log('[NetworkTopology] Total assets:', assets.length);
    console.log('[NetworkTopology] Total VLANs:', vlanCount);
    
    if (vlanCount <= 2) {
      console.log('[NetworkTopology] Showing individual devices (8 per row)');
      
      const sortedAssets = sortAssetsByDeviceType(assets);
      
      sortedAssets.forEach((asset, index) => {
        const row = Math.floor(index / GRID_COLUMNS);
        const col = index % GRID_COLUMNS;
        
        const x = col * (DEVICE_WIDTH + HORIZONTAL_SPACING);
        const y = row * (DEVICE_HEIGHT + VERTICAL_SPACING);
        
        nodes.push({
          id: asset.endpoint_key,
          type: 'device',
          position: { x, y },
          data: {
            asset,
            onClick: onNodeClick,
          },
          style: {
            width: DEVICE_WIDTH,
          },
        });
      });
      
      const scadaAssets = assets.filter(a => 
        a.device_type_final?.includes('SCADA') || 
        a.device_type_base?.includes('SCADA')
      );
      
      assets.forEach(asset => {
        if (showInternetOnly && !asset.flows_talks_to_internet) return;
        
        const peerTypes = parsePeerTypes(asset.flows_peers_by_type);
        
        scadaAssets.forEach(scada => {
          if (asset.endpoint_key === scada.endpoint_key) return;
          
          const scadaFlows = peerTypes['SCADA / OT Server'] || 0;
          
          if (scadaFlows > 0) {
            edges.push({
              id: `${asset.endpoint_key}-${scada.endpoint_key}`,
              source: asset.endpoint_key,
              target: scada.endpoint_key,
              type: 'smoothstep',
              animated: asset.flows_talks_to_internet || false,
              style: {
                stroke: asset.flows_talks_to_internet ? '#ef4444' : '#94a3b8',
                strokeWidth: Math.min(4, Math.max(1, scadaFlows / 50)),
              },
            });
          }
        });
      });
      
    } else {
      console.log('[NetworkTopology] Showing VLAN groups');
      
      const sortedVlans = Array.from(assetsByVlan.keys()).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
      
      sortedVlans.forEach((vlanId, index) => {
        const vlanAssets = assetsByVlan.get(vlanId)!;
        
        const zone = classifyPurdueZone(vlanAssets[0]);
        const zoneConfig = PURDUE_ZONES[zone];
        
        const row = Math.floor(index / GRID_COLUMNS);
        const col = index % GRID_COLUMNS;
        
        const x = col * (VLAN_GROUP_WIDTH + HORIZONTAL_SPACING);
        const y = row * (VLAN_GROUP_HEIGHT + VERTICAL_SPACING);
        
        const turbineInfo = vlanToTurbine.get(vlanId);
        const fingerprint = createVlanFingerprint(vlanId, vlanAssets);
        
        nodes.push({
          id: `vlan-${vlanId}`,
          type: 'vlanGroup',
          position: { x, y },
          data: {
            vlanId,
            zone: zoneConfig.label,
            zoneColor: zoneConfig.color,
            assetCount: vlanAssets.length,
            fingerprint,
            isPartOfTurbine: !!turbineInfo,
            turbineName: turbineInfo?.name,
            onClick: () => {
              if (onNodeClick && vlanAssets.length > 0) {
                onNodeClick(vlanAssets[0]);
              }
            },
          },
          style: {
            width: VLAN_GROUP_WIDTH,
            height: VLAN_GROUP_HEIGHT,
          },
        });
      });
      
      const scadaVlans = new Set<string>();
      assets.forEach(a => {
        if (a.device_type_final?.includes('SCADA') || a.device_type_base?.includes('SCADA')) {
          scadaVlans.add(getFirstVlan(a));
        }
      });
      
      sortedVlans.forEach(vlanId => {
        const vlanAssets = assetsByVlan.get(vlanId)!;
        
        vlanAssets.forEach(asset => {
          if (showInternetOnly && !asset.flows_talks_to_internet) return;
          
          const peerTypes = parsePeerTypes(asset.flows_peers_by_type);
          const scadaFlows = peerTypes['SCADA / OT Server'] || 0;
          
          if (scadaFlows > 0) {
            scadaVlans.forEach(scadaVlan => {
              if (scadaVlan !== vlanId) {
                const edgeId = `vlan-${vlanId}-vlan-${scadaVlan}`;
                
                if (!edges.find(e => e.id === edgeId)) {
                  edges.push({
                    id: edgeId,
                    source: `vlan-${vlanId}`,
                    target: `vlan-${scadaVlan}`,
                    type: 'smoothstep',
                    animated: asset.flows_talks_to_internet || false,
                    style: {
                      stroke: asset.flows_talks_to_internet ? '#ef4444' : '#94a3b8',
                      strokeWidth: 2,
                    },
                  });
                }
              }
            });
          }
        });
      });
    }
    
    console.log('[NetworkTopology] Created', nodes.length, 'nodes');
    
    return { nodes, edges };
  }, [assets, vlanToTurbine, onNodeClick, showInternetOnly]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

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
    const totalVlans = new Set(assets.map(a => getFirstVlan(a))).size;
    
    return {
      totalAssets,
      highRisk,
      mediumRisk,
      lowRisk,
      internetExposed,
      otDevices,
      totalVlans,
      turbineCount: turbinePatterns.filter(p => p.vlans.length > 1).length,
    };
  }, [assets, turbinePatterns]);

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 0.9 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background gap={20} size={1} color="#e2e8f0" />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            if (node.type === 'vlanGroup') return '#94a3b8';
            const asset = (node.data as any).asset as NetworkAsset;
            const risk = asset?.risk_score || 0;
            if (risk >= 40) return '#ef4444';
            if (risk >= 20) return '#f59e0b';
            return '#10b981';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          style={{ 
            backgroundColor: '#f8fafc',
            border: '2px solid #cbd5e1',
            borderRadius: '8px',
          }}
          position="bottom-right"
          zoomable
          pannable
        />
        
        <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-3 space-y-2 max-w-[200px] z-10">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Server className="h-3.5 w-3.5" />
            Network Overview
          </div>
          
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Assets:</span>
              <Badge variant="secondary" className="text-[9px]">{stats.totalAssets}</Badge>
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">VLANs:</span>
              <Badge className="bg-blue-100 text-blue-700 text-[9px]">{stats.totalVlans}</Badge>
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">OT:</span>
              <Badge className="bg-purple-100 text-purple-700 text-[9px]">{stats.otDevices}</Badge>
            </div>
            
            <div className="border-t pt-1.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-red-600">High:</span>
                <Badge className="bg-red-100 text-red-700 text-[9px]">{stats.highRisk}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-amber-600">Med:</span>
                <Badge className="bg-amber-100 text-amber-700 text-[9px]">{stats.mediumRisk}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-emerald-600">Low:</span>
                <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">{stats.lowRisk}</Badge>
              </div>
            </div>
            
            {stats.internetExposed > 0 && (
              <div className="border-t pt-1.5">
                <div className="flex items-center gap-1.5 text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{stats.internetExposed} internet</span>
                </div>
              </div>
            )}
          </div>
        </Panel>

        <Panel position="bottom-left" className="bg-white rounded-lg shadow-lg p-3 space-y-2 z-10">
          <div className="text-xs font-medium mb-1">View Options</div>
          
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="show-turbines" className="text-[10px] cursor-pointer">
              Turbine Patterns
            </Label>
            <Switch 
              id="show-turbines"
              checked={showTurbines}
              onCheckedChange={setShowTurbines}
            />
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="internet-only" className="text-[10px] cursor-pointer">
              Internet Only
            </Label>
            <Switch 
              id="internet-only"
              checked={showInternetOnly}
              onCheckedChange={setShowInternetOnly}
            />
          </div>
        </Panel>

        {showTurbines && turbinePatterns.filter(p => p.vlans.length > 1).length > 0 && (
          <Panel position="top-center" className="bg-white rounded-lg shadow-lg p-3 space-y-2 max-w-xs z-10">
            <div className="flex items-center gap-2 text-xs font-medium mb-1">
              <Layers className="h-3.5 w-3.5 text-purple-600" />
              Detected Patterns
            </div>
            
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {turbinePatterns
                .filter(p => p.vlans.length > 1)
                .map(pattern => (
                  <div 
                    key={pattern.id}
                    className="p-2 bg-purple-50 border border-purple-200 rounded text-[10px]"
                  >
                    <div className="font-medium text-purple-900 mb-0.5">
                      {pattern.name}
                    </div>
                    <div className="text-purple-700 space-y-0.5">
                      <div>VLANs: {pattern.vlans.join(', ')}</div>
                      <div>{pattern.assets.length} devices</div>
                    </div>
                  </div>
                ))}
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};