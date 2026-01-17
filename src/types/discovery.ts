// Discovery Types

export type LearningState = 'unknown' | 'hypothesis' | 'confirmed' | 'published';

export type DataType = 
  | 'uint16' | 'int16' 
  | 'uint32be' | 'int32be' | 'uint32le' | 'int32le'
  | 'float32be' | 'float32le'
  | 'uint64be' | 'int64be' | 'uint64le' | 'int64le'
  | 'float64be' | 'float64le';

export interface DiscoveredVariable {
  id: string;
  site_id: string | null;
  site_identifier: string;
  
  // Equipment
  source_ip: string;
  source_mac: string | null;
  destination_ip: string;
  destination_mac: string | null;
  source_port: number | null;
  destination_port: number | null;
  protocol: string;
  
  // Variable
  unit_id: number;
  address: number;
  function_code: number;
  
  // Data
  data_type: DataType | null;
  last_raw_value: string | null;
  last_interpreted_value: number | null;
  
  // Semantic
  semantic_label: string | null;
  semantic_unit: string | null;
  semantic_category: string | null;
  
  // Learning
  learning_state: LearningState;
  confidence_score: number;
  
  // Scores for heatmap
  score_uint16: number;
  score_int16: number;
  score_uint32be: number;
  score_int32be: number;
  score_uint32le: number;
  score_int32le: number;
  score_float32be: number;
  score_float32le: number;
  score_uint64be: number;
  score_int64be: number;
  score_uint64le: number;
  score_int64le: number;
  score_float64be: number;
  score_float64le: number;
  
  // Stats
  sample_count: number;
  first_seen_at: string;
  last_seen_at: string;
  
  created_at: string;
  updated_at: string;
}

export interface LearningSample {
  id: number;
  Identifier: string;
  Interface: number | null;
  SourceIp: string | null;
  DestinationIp: string | null;
  SourceMac: string | null;
  DestinationMac: string | null;
  SourcePort: number | null;
  DestinationPort: number | null;
  Protocol: string | null;
  unid_Id: number | null;
  Address: number | null;
  FC: number | null;
  'Best Type': string | null;
  UINT16: number | null;
  INT16: number | null;
  UINT32BE: number | null;
  INT32BE: number | null;
  UINT32LE: number | null;
  INT32LE: number | null;
  FLOAT32BE: number | null;
  FLOAT32LE: number | null;
  UINT64BE: number | null;
  INT64BE: number | null;
  UINT64LE: number | null;
  INT64LE: number | null;
  FLOAT64BE: number | null;
  FLOAT64LE: number | null;
  HEX: string | null;
  BIN: string | null;
  score_uint16: number | null;
  score_int16: number | null;
  score_uint32be: number | null;
  score_int32be: number | null;
  score_uint32le: number | null;
  score_int32le: number | null;
  score_float32be: number | null;
  score_float32le: number | null;
  score_uint64be: number | null;
  score_int64be: number | null;
  score_uint64le: number | null;
  score_int64le: number | null;
  score_float64be: number | null;
  score_float64le: number | null;
  time: string | null;
}

export interface DiscoveredEquipment {
  ip: string;
  mac: string | null;
  role: 'master' | 'slave' | 'unknown';
  variableCount: number;
  lastSeen: string;
  protocols: string[];
}

export interface SiteDiscoveryStats {
  totalEquipment: number;
  totalVariables: number;
  variablesByState: {
    unknown: number;
    hypothesis: number;
    confirmed: number;
    published: number;
  };
  lastActivity: string | null;
  sampleCount: number;
}

export interface UnknownSite {
  identifier: string;
  sampleCount: number;
  equipmentCount: number;
  variableCount: number;
  firstSeen: string;
  lastSeen: string;
  sourceIps: string[];
}