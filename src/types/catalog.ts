export interface CatalogRegister {
  address: number;
  name: string;
  label: string;
  data_type: string;
  scale: number;
  unit: string;
  function_code: number;
  register_type?: string;
  description?: string;
}

export interface CatalogProtocol {
  id: string;
  catalog_id: string;
  protocol: string;
  registers: CatalogRegister[];
  register_count: number;
  created_at: string;
  updated_at: string;
}

export interface EquipmentCatalog {
  id: string;
  manufacturer: string;
  model: string;
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