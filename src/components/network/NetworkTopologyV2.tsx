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
  Network as NetworkIcon,
} from 'lucide-react';
import {
  PURDUE_ZONES,
  PurdueZoneKey,
  getFirstVlan,
  groupAssetsByZoneAndVlan,
  sortAssetsByDeviceType,
  detectTurbinePatterns,
  ZoneVlanGroup,
} from '@/utils/networkTopology';

interface NetworkTopologyV2Props {
  assets: NetworkAsset[];
  onNodeClick?: (asset: NetworkAsset) => void;
}

const nodeTypes = {
  device: DeviceNode,
  vlanGroup: VlanGroupNode,
};

// Layout constants - HORIZONTAL ISA-95 layout (zones left to right)
const VLAN_GROUP_WIDTH = 300;
const VLAN_GROUP_MIN_HEIGHT = 180;
const VLAN_GROUP_PADDING = 20;
const DEVICE_WIDTH = 220;
const DEVICE_HEIGHT = 140;
const ZONE_HORIZONTAL_SPACING = 150; // Space between zones (left to right)
const VLAN_VERTICAL_SPACING = 80; // Space between VLANs in same zone (top to bottom)
const DEVICE_VERTICAL_SPACING = 30; // Space between devices in same VLAN

// Parse flows_peers_by_type - pode vir como objeto ou string JSON
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
  
  // Detect turbine patterns
  const turbinePatterns = useMemo(() => 
    detectTurbinePatterns(assets, 0.75),
    [assets]
  );
  
  // Group assets by zone and VLAN
  const zoneVlanGroups = useMemo(() => 
    groupAssetsByZoneAndVlan(assets),
    [assets]
  );
  
  // Create turbine mapping (VLAN -> turbine)
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
    
    // Group by zone first
    const groupsByZone = new Map<PurdueZoneKey, ZoneVlanGroup[]>();
    zoneVlanGroups.forEach(group => {
      if (!groupsByZone.has(group.zone)) {
        groupsByZone.set(group.zone, []);
      }
      groupsByZone.get(group.zone)!.push(group);
    });
    
    // Sort zones by level REVERSED (Level 1 on left, IT on right)
    // ISA-95: Field Devices → Controllers → SCADA → DMZ → IT
    const sortedZones = Array.from(groupsByZone.keys()).sort((a, b) => 
      PURDUE_ZONES[b].level - PURDUE_ZONES[a].level // REVERSED!
    );
    
    let currentX = 0;
    
    // Process each zone (LEFT TO RIGHT)
    sortedZones.forEach((zone) => {
      const zoneGroups = groupsByZone.get(zone)!;
      const zoneConfig = PURDUE_ZONES[zone];
      
      let currentY = 0;
      let maxWidthInZone = VLAN_GROUP_WIDTH;
      
      // Process each VLAN in this zone (TOP TO BOTTOM)
      zoneGroups.forEach((group) => {
        const turbineInfo = vlanToTurbine.get(group.vlanId);
        const sortedAssets = sortAssetsByDeviceType(group.assets);
        
        // Calculate group height based on number of devices
        const deviceCount = sortedAssets.length;
        const groupHeight = Math.max(
          VLAN_GROUP_MIN_HEIGHT,
          VLAN_GROUP_PADDING * 2 + 80 + (deviceCount * (DEVICE_HEIGHT + DEVICE_VERTICAL_SPACING))
        );
        
        // Create VLAN group node
        const groupId = `vlan-${zone}-${group.vlanId}`;
        nodes.push({
          id: groupId,
          type: 'vlanGroup',
          position: { x: currentX, y: currentY },
          data: {
            vlanId: group.vlanId,
            zone: zoneConfig.label,
            zoneColor: zoneConfig.color,
            assetCount: group.assets.length,
            fingerprint: group.fingerprint,
            isPartOfTurbine: !!turbineInfo,
            turbineName: turbineInfo?.name,
          },
          style: {
            width: VLAN_GROUP_WIDTH,
            height: groupHeight,
            zIndex: 1,
          },
        });
        
        // Create device nodes inside the group (vertical stack)
        sortedAssets.forEach((asset, index) => {
          const deviceX = VLAN_GROUP_PADDING;
          const deviceY = VLAN_GROUP_PADDING + 80 + (index * (DEVICE_HEIGHT + DEVICE_VERTICAL_SPACING));
          
          nodes.push({
            id: asset.endpoint_key,
            type: 'device',
            position: { x: deviceX, y: deviceY },
            parentNode: groupId,
            extent: 'parent' as const,
            draggable: false,
            data: {
              asset,
              onClick: onNodeClick,
            },
            style: {
              width: DEVICE_WIDTH,
              zIndex: 2,
            },
          });
        });
        
        // Move to next VLAN position (vertical - down)
        currentY += groupHeight + VLAN_VERTICAL_SPACING;
      });
      
      // Move to next zone (horizontal - right)
      currentX += maxWidthInZone + ZONE_HORIZONTAL_SPACING;
    });
    
    // Create edges between devices
    const scadaAssets = assets.filter(a => 
      a.device_type_final?.includes('SCADA') || 
      a.device_type_base?.includes('SCADA') ||
      a.device_type_final?.includes('OT Server')
    );
    
    assets.forEach(asset => {
      if (showInternetOnly && !asset.flows_talks_to_internet) {
        return;
      }
      
      const peerTypes = parsePeerTypes(asset.flows_peers_by_type);
      
      // Connect to SCADA servers
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
            data: {
              peerType: 'SCADA / OT Server',
              flowCount: scadaFlows,
            },
          });
        }
      });
      
      // Connect switches to other devices in same VLAN
      if (asset.device_type_final?.includes('Switch')) {
        const assetVlan = getFirstVlan(asset);
        const sameVlanAssets = assets.filter(a => 
          a.endpoint_key !== asset.endpoint_key &&
          getFirstVlan(a) === assetVlan
        );
        
        sameVlanAssets.forEach(peer => {
          const peerFlows = peerTypes['Switch / Network Device'] || 0;
          
          if (peerFlows > 0) {
            edges.push({
              id: `${asset.endpoint_key}-${peer.endpoint_key}`,
              source: asset.endpoint_key,
              target: peer.endpoint_key,
              type: 'smoothstep',
              style: {
                stroke: '#cbd5e1',
                strokeWidth: 1,
                strokeDasharray: '5,5',
              },
            });
          }
        });
      }
    });
    
    return { nodes, edges };
  }, [assets, zoneVlanGroups, vlanToTurbine, onNodeClick, showInternetOnly]);

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
        fitViewOptions={{ padding: 0.2, maxZoom: 0.8 }}
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

        {/* Top Right Panel - Purdue Zones Legend */}
        <Panel position="top-right" className="bg-white rounded-lg shadow-lg p-4 space-y-3 max-w-xs z-10">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <NetworkIcon className="h-4 w-4" />
            ISA-95 / Purdue Model
          </div>
          
          <div className="text-xs text-muted-foreground mb-2">
            Zones organized left to right:
          </div>
          
          <div className="space-y-1.5 text-xs">
            {/* Show in ISA-95 order (field to enterprise) */}
            {[
              PURDUE_ZONES.LEVEL_1,
              PURDUE_ZONES.LEVEL_2,
              PURDUE_ZONES.LEVEL_3,
              PURDUE_ZONES.DMZ,
              PURDUE_ZONES.IT,
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

        {/* Turbine Patterns Panel - moved to avoid minimap overlap */}
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