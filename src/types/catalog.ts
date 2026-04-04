export interface Manufacturer {
  id: string;
  name: string;
  created_at: string;
  created_by: string | null;
}

export interface EquipmentModel {
  id: string;
  manufacturer_id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
  manufacturer?: Manufacturer;
}

export interface SupportedProtocol {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
}

export const REGISTER_CATEGORIES = [
  { value: 'instantaneous_electrical', label: 'Instantaneous Electrical', emoji: '⚡' },
  { value: 'demand', label: 'Demand', emoji: '📈' },
  { value: 'energy_accumulators', label: 'Energy (Accumulators)', emoji: '🔋' },
  { value: 'power_quality', label: 'Power Quality', emoji: '🌐' },
  { value: 'operational_state', label: 'Operational State', emoji: '🔄' },
  { value: 'control_commands', label: 'Control / Commands', emoji: '⚙️' },
  { value: 'internal_sensors', label: 'Internal Sensors', emoji: '🌡️' },
  { value: 'alarms_faults', label: 'Alarms & Faults', emoji: '⚠️' },
  { value: 'grid', label: 'Grid', emoji: '🔌' },
  { value: 'generation', label: 'Generation', emoji: '☀️' },
  { value: 'inverter_conversion', label: 'Inverter / Conversion', emoji: '🔄' },
  { value: 'statistics_metrics', label: 'Statistics / Metrics', emoji: '🧮' },
  { value: 'identification_metadata', label: 'Identification / Metadata', emoji: '🧾' },
  { value: 'communication', label: 'Communication', emoji: '🔐' },
  { value: 'diagnostics', label: 'Diagnostics', emoji: '🧪' },
] as const;

export type RegisterCategory = typeof REGISTER_CATEGORIES[number]['value'];

export interface CatalogRegister {
  address: number;
  name: string;
  label: string;
  data_type: string;
  scale: number;
  unit: string;
  function_code: number;
  category?: string;
  description?: string;
}

export interface CatalogProtocol {
  id: string;
  catalog_id: string;
  protocol: string;
  protocol_id: string | null;
  registers: CatalogRegister[];
  register_count: number;
  created_at: string;
  updated_at: string;
}

export interface EquipmentCatalog {
  id: string;
  manufacturer: string;
  model: string;
  manufacturer_id: string | null;
  model_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  protocols?: CatalogProtocol[];
  protocol_count?: number;
  total_registers?: number;
}

export interface EquipmentCatalogLink {
  id: string;
  equipment_id: string;
  catalog_id: string;
  catalog_protocol_id: string;
  linked_by: string | null;
  linked_at: string;
  catalog?: EquipmentCatalog;
  protocol?: CatalogProtocol;
}