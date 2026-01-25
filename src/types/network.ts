export interface NetworkAsset {
  id: string;
  
  // Site identification
  site_identifier: string;
  site_id: string | null;
  
  // Job metadata
  job_id: string;
  datasource: string;
  pcap_name: string | null;
  job_created_at: string | null;
  job_status: string | null;
  
  // Asset identification
  endpoint_key: string;
  mac: string;
  vendor: string | null;
  
  // Classification
  device_type_base: string | null;
  device_type_final: string | null;
  zone: string | null;
  risk_score: number | null;
  risk_factors: string | null;
  confidence: string | null;
  comment: string | null;
  
  // Network info
  ips: string | null;
  protocols: string | null;
  ot_protocols_base: string | null;
  ports: string | null;
  vlans: string | null;
  
  // Traffic stats
  packets: number | null;
  bytes: number | null;
  flows_total_as_src: number | null;
  flows_total_as_dst: number | null;
  flows_unique_peers: number | null;
  flows_peers_by_type: Record<string, number> | null;
  flows_ot_protocols: string | null;
  flows_talks_to_internet: boolean | null;
  flows_first_seen: number | null;
  flows_last_seen: number | null;
  flows_vlans_from_flows: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// For React Flow visualization
export interface NetworkNode {
  id: string;
  type: 'device';
  position: { x: number; y: number };
  data: {
    asset: NetworkAsset;
    label: string;
  };
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: 'default';
  animated?: boolean;
  style?: React.CSSProperties;
  data?: {
    peerType: string;
    flowCount: number;
  };
}