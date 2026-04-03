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
  
  // Equipment (lowercase - internal use)
  source_ip: string;
  source_mac: string | null;
  destination_ip: string;
  destination_mac: string | null;
  source_port: number | null;
  destination_port: number | null;
  protocol: string;
  
  // Equipment (CamelCase - for n8n mapping)
  SiteIdentifier: string | null;
  SourceIp: string | null;
  DestinationIp: string | null;
  SourceMac: string | null;
  DestinationMac: string | null;
  SourcePort: number | null;
  DestinationPort: number | null;
  Protocol: string | null;
  Interface: number | null;
  
  // Variable (lowercase - internal use)
  unit_id: number;
  address: number;
  function_code: number;
  
  // Variable (CamelCase - for n8n mapping)
  Address: number | null;
  FC: number | null;
  unid_Id: number | null;
  
  // Data source
  data_source: string | null;
  
  // Data
  data_type: DataType | null;
  last_raw_value: string | null;
  last_interpreted_value: number | null;
  
  // RAW VALUES - last known value per type (from last learning_sample)
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
  
  // Semantic
  semantic_label: string | null;
  semantic_unit: string | null;
  semantic_category: string | null;
  scale: number | null;
  
  // Learning
  learning_state: LearningState;
  confidence_score: number;

  // AI fields
  ai_suggested_type: DataType | null;
  ai_confidence: number;
  ai_analysis_at: string | null;
  ai_reasoning: string | null;

  // AI historical analysis - winner and explanation
  winner: string | null;
  explanation: string | null;

  // AI historical scores (populated after historical analysis)
  historical_scores_uint16: number | null;
  historical_scores_int16: number | null;
  historical_scores_uint32be: number | null;
  historical_scores_int32be: number | null;
  historical_scores_uint32le: number | null;
  historical_scores_int32le: number | null;
  historical_scores_float32be: number | null;
  historical_scores_float32le: number | null;
  historical_scores_uint64be: number | null;
  historical_scores_int64be: number | null;
  historical_scores_uint64le: number | null;
  historical_scores_int64le: number | null;
  historical_scores_float64be: number | null;
  historical_scores_float64le: number | null;

  // Stats per type (populated after historical analysis)
  stats_UINT16_count: number | null;
  stats_UINT16_avg_value: number | null;
  stats_UINT16_std: number | null;
  stats_UINT16_avg_jump: number | null;
  stats_UINT16_max_jump: number | null;
  stats_UINT16_nulls: number | null;
  stats_UINT16_zeros: number | null;
  stats_UINT16_avg_score: number | null;

  stats_INT16_count: number | null;
  stats_INT16_avg_value: number | null;
  stats_INT16_std: number | null;
  stats_INT16_avg_jump: number | null;
  stats_INT16_max_jump: number | null;
  stats_INT16_nulls: number | null;
  stats_INT16_zeros: number | null;
  stats_INT16_avg_score: number | null;

  stats_UINT32BE_count: number | null;
  stats_UINT32BE_avg_value: number | null;
  stats_UINT32BE_std: number | null;
  stats_UINT32BE_avg_jump: number | null;
  stats_UINT32BE_max_jump: number | null;
  stats_UINT32BE_nulls: number | null;
  stats_UINT32BE_zeros: number | null;
  stats_UINT32BE_avg_score: number | null;

  stats_INT32BE_count: number | null;
  stats_INT32BE_avg_value: number | null;
  stats_INT32BE_std: number | null;
  stats_INT32BE_avg_jump: number | null;
  stats_INT32BE_max_jump: number | null;
  stats_INT32BE_nulls: number | null;
  stats_INT32BE_zeros: number | null;
  stats_INT32BE_avg_score: number | null;

  stats_UINT32LE_count: number | null;
  stats_UINT32LE_avg_value: number | null;
  stats_UINT32LE_std: number | null;
  stats_UINT32LE_avg_jump: number | null;
  stats_UINT32LE_max_jump: number | null;
  stats_UINT32LE_nulls: number | null;
  stats_UINT32LE_zeros: number | null;
  stats_UINT32LE_avg_score: number | null;

  stats_INT32LE_count: number | null;
  stats_INT32LE_avg_value: number | null;
  stats_INT32LE_std: number | null;
  stats_INT32LE_avg_jump: number | null;
  stats_INT32LE_max_jump: number | null;
  stats_INT32LE_nulls: number | null;
  stats_INT32LE_zeros: number | null;
  stats_INT32LE_avg_score: number | null;

  stats_FLOAT32BE_count: number | null;
  stats_FLOAT32BE_avg_value: number | null;
  stats_FLOAT32BE_std: number | null;
  stats_FLOAT32BE_avg_jump: number | null;
  stats_FLOAT32BE_max_jump: number | null;
  stats_FLOAT32BE_nulls: number | null;
  stats_FLOAT32BE_zeros: number | null;
  stats_FLOAT32BE_avg_score: number | null;

  stats_FLOAT32LE_count: number | null;
  stats_FLOAT32LE_avg_value: number | null;
  stats_FLOAT32LE_std: number | null;
  stats_FLOAT32LE_avg_jump: number | null;
  stats_FLOAT32LE_max_jump: number | null;
  stats_FLOAT32LE_nulls: number | null;
  stats_FLOAT32LE_zeros: number | null;
  stats_FLOAT32LE_avg_score: number | null;

  stats_UINT64BE_count: number | null;
  stats_UINT64BE_avg_value: number | null;
  stats_UINT64BE_std: number | null;
  stats_UINT64BE_avg_jump: number | null;
  stats_UINT64BE_max_jump: number | null;
  stats_UINT64BE_nulls: number | null;
  stats_UINT64BE_zeros: number | null;
  stats_UINT64BE_avg_score: number | null;

  stats_INT64BE_count: number | null;
  stats_INT64BE_avg_value: number | null;
  stats_INT64BE_std: number | null;
  stats_INT64BE_avg_jump: number | null;
  stats_INT64BE_max_jump: number | null;
  stats_INT64BE_nulls: number | null;
  stats_INT64BE_zeros: number | null;
  stats_INT64BE_avg_score: number | null;

  stats_UINT64LE_count: number | null;
  stats_UINT64LE_avg_value: number | null;
  stats_UINT64LE_std: number | null;
  stats_UINT64LE_avg_jump: number | null;
  stats_UINT64LE_max_jump: number | null;
  stats_UINT64LE_nulls: number | null;
  stats_UINT64LE_zeros: number | null;
  stats_UINT64LE_avg_score: number | null;

  stats_INT64LE_count: number | null;
  stats_INT64LE_avg_value: number | null;
  stats_INT64LE_std: number | null;
  stats_INT64LE_avg_jump: number | null;
  stats_INT64LE_max_jump: number | null;
  stats_INT64LE_nulls: number | null;
  stats_INT64LE_zeros: number | null;
  stats_INT64LE_avg_score: number | null;

  stats_FLOAT64BE_count: number | null;
  stats_FLOAT64BE_avg_value: number | null;
  stats_FLOAT64BE_std: number | null;
  stats_FLOAT64BE_avg_jump: number | null;
  stats_FLOAT64BE_max_jump: number | null;
  stats_FLOAT64BE_nulls: number | null;
  stats_FLOAT64BE_zeros: number | null;
  stats_FLOAT64BE_avg_score: number | null;

  stats_FLOAT64LE_count: number | null;
  stats_FLOAT64LE_avg_value: number | null;
  stats_FLOAT64LE_std: number | null;
  stats_FLOAT64LE_avg_jump: number | null;
  stats_FLOAT64LE_max_jump: number | null;
  stats_FLOAT64LE_nulls: number | null;
  stats_FLOAT64LE_zeros: number | null;
  stats_FLOAT64LE_avg_score: number | null;

  confirmed_by: string | null;
  confirmed_at: string | null;
  
  // Stats
  sample_count: number;
  first_seen_at: string;
  last_seen_at: string;

  // Real last reading timestamp from learning_samples.time (MAX per variable key)
  // Injected by HistoricalTab after fetching learning_samples — NOT from discovered_variables
  last_reading_at?: string | null;
  
  created_at: string;
  updated_at: string;
}

// Raw sample from learning_samples table (no scores - just raw values)
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
  time: string | null;
  data_source: string | null;
}

// Equipment discovered from PCAP analysis (stored in discovered_equipment table)
export interface DiscoveredEquipment {
  ip: string;
  mac: string | null;
  role: 'master' | 'slave' | 'unknown';
  variableCount: number;
  lastSeen: string;
  protocols: string[];
  
  manufacturer?: string | null;
  model?: string | null;
  deviceName?: string | null;
  deviceType?: string | null;
  firmwareVersion?: string | null;
}

// Full equipment record from database
export interface DiscoveredEquipmentRecord {
  id: string;
  site_id: string | null;
  site_identifier: string;
  ip_address: string;
  mac_address: string | null;
  role: 'master' | 'slave' | 'unknown';
  manufacturer: string | null;
  model: string | null;
  device_name: string | null;
  device_type: string | null;
  firmware_version: string | null;
  variable_count: number;
  sample_count: number;
  protocols: string[];
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
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