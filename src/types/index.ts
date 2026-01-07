// Site / Planta
export interface Site {
  id: string;
  name: string;
  type: 'eolica' | 'fotovoltaica' | 'hibrida' | 'subestacao';
  location: string;
  aed_id: string;
  created_at: string;
  updated_at: string;
}

// Equipamento
export type EquipmentType = 'scada' | 'clp' | 'inversor' | 'gerador' | 'multimedidor' | 'gateway' | 'unknown';

export interface Equipment {
  id: string;
  site_id: string;
  ip_address: string;
  mac_address: string;
  type: EquipmentType;
  manufacturer: string | null;
  name: string;
  discovered_at: string;
  last_seen: string;
}

// Estados de Aprendizado
export type LearningState = 'unknown' | 'hypothesis' | 'confirmed' | 'published';

// Variável / Registrador
export interface Variable {
  id: string;
  equipment_id: string;
  register_address: number;
  raw_value: number | string;
  data_type: 'int16' | 'int32' | 'uint16' | 'uint32' | 'float32' | 'float64' | 'boolean' | 'string' | 'unknown';
  semantic_hypothesis: string | null;
  confidence_score: number;
  learning_state: LearningState;
  unit: string | null;
  created_at: string;
  updated_at: string;
}

// Arquivo PCAP
export type PcapStatus = 'uploading' | 'uploaded' | 'processing' | 'completed' | 'error';

export interface PcapFile {
  id: string;
  site_id: string;
  filename: string;
  size_bytes: number;
  uploaded_by: string;
  uploaded_at: string;
  status: PcapStatus;
  storage_path: string;
}

// Estatísticas do Site
export interface SiteStats {
  total_equipment: number;
  total_variables: number;
  confirmed_variables: number;
  published_variables: number;
  unknown_variables: number;
  hypothesis_variables: number;
}