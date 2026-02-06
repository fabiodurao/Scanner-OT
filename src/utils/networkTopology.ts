import { NetworkAsset } from '@/types/network';

// Purdue Model zones (top to bottom)
export const PURDUE_ZONES = {
  IT: { level: 0, yBase: 100, label: 'IT / NOC', color: '#3b82f6' },
  DMZ: { level: 1, yBase: 400, label: 'OT DMZ', color: '#f59e0b' },
  LEVEL_3: { level: 2, yBase: 700, label: 'Level 3 - Site/Area', color: '#8b5cf6' },
  LEVEL_2: { level: 3, yBase: 1000, label: 'Level 2 - Cell/Area', color: '#06b6d4' },
  LEVEL_1: { level: 4, yBase: 1300, label: 'Level 1 - Field Devices', color: '#10b981' },
  UNKNOWN: { level: 5, yBase: 1600, label: 'Unknown', color: '#6b7280' },
} as const;

export type PurdueZoneKey = keyof typeof PURDUE_ZONES;

// Classify asset into Purdue zone
export const classifyPurdueZone = (asset: NetworkAsset): PurdueZoneKey => {
  const zone = asset.zone || '';
  const deviceType = asset.device_type_final || '';
  
  // IT / NOC
  if (zone.includes('IT') || zone.includes('NOC') || deviceType.includes('IT Server')) {
    return 'IT';
  }
  
  // OT DMZ (includes switches exposed to internet)
  if (zone.includes('DMZ') || (asset.flows_talks_to_internet && deviceType.includes('Switch'))) {
    return 'DMZ';
  }
  
  // Level 3 - SCADA / Site Operations
  if (zone.includes('Level 3') || zone.includes('SCADA') || deviceType.includes('SCADA')) {
    return 'LEVEL_3';
  }
  
  // Level 2 - Cell/Area Network
  if (zone.includes('Level 2') || zone.includes('Cell') || zone.includes('Area Network')) {
    return 'LEVEL_2';
  }
  
  // Level 1 - Field Devices (PLCs, RTUs, IEDs)
  if (zone.includes('Level 1') || zone.includes('Control Network') || zone.includes('Process') ||
      deviceType.includes('PLC') || deviceType.includes('RTU') || deviceType.includes('IED')) {
    return 'LEVEL_1';
  }
  
  return 'UNKNOWN';
};

// Get first VLAN from asset
export const getFirstVlan = (asset: NetworkAsset): string => {
  const vlans = asset.vlans?.split(';').filter(Boolean) || [];
  return vlans[0] || 'No VLAN';
};

// Get all VLANs from asset
export const getAllVlans = (asset: NetworkAsset): string[] => {
  return asset.vlans?.split(';').filter(Boolean) || [];
};

// VLAN fingerprint for pattern detection
export interface VlanFingerprint {
  vlanId: string;
  deviceCounts: Record<string, number>; // device_type_final -> count
  vendorCounts: Record<string, number>; // vendor -> count
  totalAssets: number;
  hasScada: boolean;
  hasSiemens: number;
  hasPortwell: number;
  hasCisco: number;
  avgRiskScore: number;
}

// Create fingerprint for a VLAN
export const createVlanFingerprint = (vlanId: string, assets: NetworkAsset[]): VlanFingerprint => {
  const deviceCounts: Record<string, number> = {};
  const vendorCounts: Record<string, number> = {};
  let totalRisk = 0;
  let riskCount = 0;
  
  assets.forEach(asset => {
    // Count by device type
    const deviceType = asset.device_type_final || 'Unknown';
    deviceCounts[deviceType] = (deviceCounts[deviceType] || 0) + 1;
    
    // Count by vendor
    const vendor = asset.vendor || 'Unknown';
    vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
    
    // Average risk
    if (asset.risk_score !== null) {
      totalRisk += asset.risk_score;
      riskCount++;
    }
  });
  
  return {
    vlanId,
    deviceCounts,
    vendorCounts,
    totalAssets: assets.length,
    hasScada: Object.keys(deviceCounts).some(k => k.includes('SCADA')),
    hasSiemens: vendorCounts['SIEMENS'] || 0,
    hasPortwell: vendorCounts['Portwell'] || 0,
    hasCisco: vendorCounts['Cisco'] || 0,
    avgRiskScore: riskCount > 0 ? totalRisk / riskCount : 0,
  };
};

// Compare two fingerprints to detect similar VLANs (turbines/cells)
export const compareFingerprintSimilarity = (fp1: VlanFingerprint, fp2: VlanFingerprint): number => {
  // Don't compare VLAN with itself
  if (fp1.vlanId === fp2.vlanId) return 0;
  
  let similarity = 0;
  let maxScore = 0;
  
  // Compare device type counts (weight: 40%)
  const allDeviceTypes = new Set([...Object.keys(fp1.deviceCounts), ...Object.keys(fp2.deviceCounts)]);
  allDeviceTypes.forEach(type => {
    const count1 = fp1.deviceCounts[type] || 0;
    const count2 = fp2.deviceCounts[type] || 0;
    const diff = Math.abs(count1 - count2);
    const max = Math.max(count1, count2);
    if (max > 0) {
      similarity += (1 - diff / max) * 40;
      maxScore += 40;
    }
  });
  
  // Compare vendor counts (weight: 30%)
  const allVendors = new Set([...Object.keys(fp1.vendorCounts), ...Object.keys(fp2.vendorCounts)]);
  allVendors.forEach(vendor => {
    const count1 = fp1.vendorCounts[vendor] || 0;
    const count2 = fp2.vendorCounts[vendor] || 0;
    const diff = Math.abs(count1 - count2);
    const max = Math.max(count1, count2);
    if (max > 0) {
      similarity += (1 - diff / max) * 30;
      maxScore += 30;
    }
  });
  
  // Compare total asset count (weight: 20%)
  const assetDiff = Math.abs(fp1.totalAssets - fp2.totalAssets);
  const maxAssets = Math.max(fp1.totalAssets, fp2.totalAssets);
  if (maxAssets > 0) {
    similarity += (1 - assetDiff / maxAssets) * 20;
    maxScore += 20;
  }
  
  // Compare SCADA presence (weight: 10%)
  if (fp1.hasScada === fp2.hasScada) {
    similarity += 10;
  }
  maxScore += 10;
  
  return maxScore > 0 ? similarity / maxScore : 0;
};

// Detect turbine/cell patterns
export interface TurbinePattern {
  id: string;
  name: string;
  vlans: string[];
  fingerprint: VlanFingerprint;
  assets: NetworkAsset[];
}

export const detectTurbinePatterns = (
  assets: NetworkAsset[], 
  similarityThreshold: number = 0.75
): TurbinePattern[] => {
  // Group assets by VLAN
  const assetsByVlan = new Map<string, NetworkAsset[]>();
  
  assets.forEach(asset => {
    const vlan = getFirstVlan(asset);
    if (!assetsByVlan.has(vlan)) {
      assetsByVlan.set(vlan, []);
    }
    assetsByVlan.get(vlan)!.push(asset);
  });
  
  // Create fingerprints for each VLAN
  const fingerprints = new Map<string, VlanFingerprint>();
  assetsByVlan.forEach((vlanAssets, vlanId) => {
    fingerprints.set(vlanId, createVlanFingerprint(vlanId, vlanAssets));
  });
  
  // Find similar VLANs (turbine patterns)
  const patterns: TurbinePattern[] = [];
  const assignedVlans = new Set<string>();
  
  const vlanIds = Array.from(fingerprints.keys());
  
  for (let i = 0; i < vlanIds.length; i++) {
    const vlan1 = vlanIds[i];
    if (assignedVlans.has(vlan1)) continue;
    
    const fp1 = fingerprints.get(vlan1)!;
    const similarVlans = [vlan1];
    
    // Find similar VLANs
    for (let j = i + 1; j < vlanIds.length; j++) {
      const vlan2 = vlanIds[j];
      if (assignedVlans.has(vlan2)) continue;
      
      const fp2 = fingerprints.get(vlan2)!;
      const similarity = compareFingerprintSimilarity(fp1, fp2);
      
      if (similarity >= similarityThreshold) {
        similarVlans.push(vlan2);
        assignedVlans.add(vlan2);
      }
    }
    
    assignedVlans.add(vlan1);
    
    // Create pattern
    const allAssets = similarVlans.flatMap(v => assetsByVlan.get(v) || []);
    
    patterns.push({
      id: `turbine-${patterns.length + 1}`,
      name: similarVlans.length > 1 
        ? `Turbine/Cell Pattern ${patterns.length + 1}` 
        : `VLAN ${vlan1}`,
      vlans: similarVlans.sort(),
      fingerprint: fp1,
      assets: allAssets,
    });
  }
  
  return patterns;
};

// Group assets by zone and VLAN
export interface ZoneVlanGroup {
  zone: PurdueZoneKey;
  vlanId: string;
  assets: NetworkAsset[];
  fingerprint: VlanFingerprint;
}

export const groupAssetsByZoneAndVlan = (assets: NetworkAsset[]): ZoneVlanGroup[] => {
  const groups: ZoneVlanGroup[] = [];
  
  // First group by zone
  const byZone = new Map<PurdueZoneKey, NetworkAsset[]>();
  assets.forEach(asset => {
    const zone = classifyPurdueZone(asset);
    if (!byZone.has(zone)) {
      byZone.set(zone, []);
    }
    byZone.get(zone)!.push(asset);
  });
  
  // Then group each zone by VLAN
  byZone.forEach((zoneAssets, zone) => {
    const byVlan = new Map<string, NetworkAsset[]>();
    
    zoneAssets.forEach(asset => {
      const vlan = getFirstVlan(asset);
      if (!byVlan.has(vlan)) {
        byVlan.set(vlan, []);
      }
      byVlan.get(vlan)!.push(asset);
    });
    
    byVlan.forEach((vlanAssets, vlanId) => {
      groups.push({
        zone,
        vlanId,
        assets: vlanAssets,
        fingerprint: createVlanFingerprint(vlanId, vlanAssets),
      });
    });
  });
  
  return groups;
};

// Sort assets within a VLAN by device type
export const sortAssetsByDeviceType = (assets: NetworkAsset[]): NetworkAsset[] => {
  const typeOrder = [
    'Switch',
    'Network',
    'SCADA',
    'Server',
    'PLC',
    'RTU',
    'IED',
    'Controller',
    'HMI',
    'Workstation',
    'Unknown',
  ];
  
  return [...assets].sort((a, b) => {
    const typeA = a.device_type_final || 'Unknown';
    const typeB = b.device_type_final || 'Unknown';
    
    const indexA = typeOrder.findIndex(t => typeA.includes(t));
    const indexB = typeOrder.findIndex(t => typeB.includes(t));
    
    const orderA = indexA >= 0 ? indexA : typeOrder.length;
    const orderB = indexB >= 0 ? indexB : typeOrder.length;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Secondary sort by vendor
    return (a.vendor || '').localeCompare(b.vendor || '');
  });
};