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
import { VlanGroupNode } from './VlanGroupNode';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Server, 
  AlertTriangle, 
  Layers,
  Network as NetworkIcon,
} from 'lucide-react';
import {
  PURDUE_ZONES,
  getFirstVlan,
  detectTurbinePatterns,
  classifyPurdueZone,
  createVlanFingerprint,
} from '@/utils/networkTopology';

interface NetworkTopologyV2Props {
  assets: NetworkAsset[];
  onNodeClick?: (asset: NetworkAsset) => void;
}

const nodeTypes = {
  vlanGroup: VlanGroupNode,
};

// Layout constants - LARGER SPACING for visibility
const VLAN_GROUP_WIDTH = 280;
const VLAN_GROUP_HEIGHT = 160;
const GRID_COLUMNS = 4; // 4 VLANs per row
const HORIZONTAL_SPACING = 350; // Much larger
const VERTICAL_SPACING = 250; // Much larger

// Parse flows_peers_by_type
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
    
    // Group assets by VLAN
    const assetsByVlan = new Map<string, NetworkAsset[]>();
    assets.forEach(asset => {
      const vlan = getFirstVlan(asset);
      if (!assetsByVlan.has(vlan)) {
        assetsByVlan.set(vlan, []);
      }
      assetsByVlan.get(vlan)!.push(asset);
    });
    
    // Sort VLANs by ID
    const sortedVlans = Array.from(assetsByVlan.keys()).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
    
    console.log('[NetworkTopology] ========================================');
    console.log('[NetworkTopology] Total VLANs:', sortedVlans.length);
    console.log('[NetworkTopology] VLANs:', sortedVlans);
    console.log('[NetworkTopology] Grid: ', GRID_COLUMNS, 'columns');
    
    // Create VLAN group nodes in SIMPLE GRID
    sortedVlans.forEach((vlanId, index) => {
      const vlanAssets = assetsByVlan.get(vlanId)!;
      
      // Determine zone from first asset
      const zone = classifyPurdueZone(vlanAssets[0]);
      const zoneConfig = PURDUE_ZONES[zone];
      
      // SIMPLE GRID CALCULATION
      const row = Math.floor(index / GRID_COLUMNS);
      const col = index % GRID_COLUMNS;
      
      // Calculate position with LARGE spacing
      const x = col * (VLAN_GROUP_WIDTH + HORIZONTAL_SPACING);
      const y = row * (VLAN_GROUP_HEIGHT + VERTICAL_SPACING);
      
      console.log(`[NetworkTopology] VLAN ${vlanId}:`);
      console.log(`  - Index: ${index}`);
      console.log(`  - Row: ${row}, Col: ${col}`);
      console.log(`  - Position: (${x}, ${y})`);
      console.log(`  - Assets: ${vlanAssets.length}`);
      
      // Get turbine info
      const turbineInfo = vlanToTurbine.get(vlanId);
      const fingerprint = createVlanFingerprint(vlanId, vlanAssets);
      
      // Create VLAN group node
      const groupId = `vlan-${vlanId}`;
      nodes.push({
        id: groupId,
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
    
    console.log('[NetworkTopology] Created', nodes.length, 'VLAN nodes');
    console.log('[NetworkTopology] ========================================');
    
    // Create edges between VLANs
    const scadaVlans = new Set<string>();
    assets.forEach(a => {
      if (a.device_type_final?.includes('SCADA') || a.device_type_base?.includes('SCADA')) {
        scadaVlans.add(getFirstVlan(a));
      }
    });
    
    sortedVlans.forEach(vlanId => {
      const vlanAssets = assetsByVlan.get(vlanId)!;
      
      vlanAssets.forEach(asset => {
        if (showInternetOnly && !asset.flows_talks_to_internet) {
          return;
        }
        
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
    
    console.log('[NetworkTopology] Created', edges.length, 'edges');
    
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
        defaultViewport={{ x: 100, y: 100, zoom: 0.8 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background gap={20} size={1} color="#e2e8f0" />
        <Controls />
        <MiniMap 
          nodeColor={() => '#94a3b8'}
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
        
        {/* Top Left Panel - Overview */}
        <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-4 space-y-3 max-w-xs z-10">
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
              <span className="text-muted-foreground">VLANs:</span>
              <Badge className="bg-blue-100 text-blue-700">{stats.totalVlans}</Badge>
            </div>
            
            {stats.turbineCount > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Turbine Patterns:</span>
                <Badge className="bg-purple-100 text-purple-700">
                  <Layers className="h-3 w-3 mr-1" />
                  {stats.turbineCount}
                </Badge>
              </div>
            )}
            
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

        {/* Top Right Panel - Zones Legend */}
        <Panel position="top-right" className="bg-white rounded-lg shadow-lg p-4 space-y-3 max-w-xs z-10">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <NetworkIcon className="h-4 w-4" />
            ISA-95 Zones
          </div>
          
          <div className="space-y-1.5 text-xs">
            {[
              PURDUE_ZONES.IT,
              PURDUE_ZONES.DMZ,
              PURDUE_ZONES.LEVEL_3,
              PURDUE_ZONES.LEVEL_2,
              PURDUE_ZONES.LEVEL_1,
              PURDUE_ZONES.UNKNOWN,
            ].map((config, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-muted-foreground truncate">{config.label}</span>
              </div>
            ))}
          </div>
          
          <div className="border-t pt-2 mt-2">
            <div className="text-xs text-muted-foreground mb-2">Risk Levels</div>
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
          </div>
        </Panel>

        {/* Bottom Left Panel - Controls */}
        <Panel position="bottom-left" className="bg-white rounded-lg shadow-lg p-4 space-y-3 z-10">
          <div className="text-sm font-medium mb-2">View Options</div>
          
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="show-turbines" className="text-xs cursor-pointer">
              Show Turbine Patterns
            </Label>
            <Switch 
              id="show-turbines"
              checked={showTurbines}
              onCheckedChange={setShowTurbines}
            />
          </div>
          
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="internet-only" className="text-xs cursor-pointer">
              Internet Connections Only
            </Label>
            <Switch 
              id="internet-only"
              checked={showInternetOnly}
              onCheckedChange={setShowInternetOnly}
            />
          </div>
        </Panel>

        {/* Turbine Patterns Panel */}
        {showTurbines && turbinePatterns.filter(p => p.vlans.length > 1).length > 0 && (
          <Panel position="top-center" className="bg-white rounded-lg shadow-lg p-4 space-y-2 max-w-sm z-10">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Layers className="h-4 w-4 text-purple-600" />
              Detected Patterns
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {turbinePatterns
                .filter(p => p.vlans.length > 1)
                .map(pattern => (
                  <div 
                    key={pattern.id}
                    className="p-2 bg-purple-50 border border-purple-200 rounded text-xs"
                  >
                    <div className="font-medium text-purple-900 mb-1">
                      {pattern.name}
                    </div>
                    <div className="text-purple-700 space-y-0.5">
                      <div>VLANs: {pattern.vlans.join(', ')}</div>
                      <div>{pattern.assets.length} devices total</div>
                      {pattern.fingerprint.hasSiemens > 0 && (
                        <div>• {pattern.fingerprint.hasSiemens} Siemens per VLAN</div>
                      )}
                      {pattern.fingerprint.hasPortwell > 0 && (
                        <div>• {pattern.fingerprint.hasPortwell} Portwell per VLAN</div>
                      )}
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