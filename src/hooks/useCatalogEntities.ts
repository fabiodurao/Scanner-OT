import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Manufacturer, EquipmentModel, SupportedProtocol } from '@/types/catalog';

export const useCatalogEntities = () => {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [protocols, setProtocols] = useState<SupportedProtocol[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [mfgRes, modelRes, protoRes] = await Promise.all([
      supabase.from('manufacturers').select('*').order('name'),
      supabase.from('equipment_models').select('*').order('name'),
      supabase.from('supported_protocols').select('*').order('name'),
    ]);
    setManufacturers(mfgRes.data || []);
    setModels(modelRes.data || []);
    setProtocols(protoRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- Manufacturers ---
  const createManufacturer = useCallback(async (name: string): Promise<Manufacturer> => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('manufacturers')
      .insert({ name: name.trim(), created_by: user?.id })
      .select()
      .single();
    if (error) throw error;
    setManufacturers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  }, []);

  const deleteManufacturer = useCallback(async (id: string) => {
    const { error } = await supabase.from('manufacturers').delete().eq('id', id);
    if (error) throw error;
    setManufacturers(prev => prev.filter(m => m.id !== id));
    setModels(prev => prev.filter(m => m.manufacturer_id !== id));
  }, []);

  const importManufacturers = useCallback(async (names: string[]): Promise<number> => {
    const { data: { user } } = await supabase.auth.getUser();
    const unique = [...new Set(names.map(n => n.trim()).filter(Boolean))];
    let count = 0;
    for (const name of unique) {
      const { error } = await supabase
        .from('manufacturers')
        .insert({ name, created_by: user?.id });
      if (!error) count++;
    }
    await fetchAll();
    return count;
  }, [fetchAll]);

  // --- Models ---
  const createModel = useCallback(async (manufacturerId: string, name: string, description?: string): Promise<EquipmentModel> => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('equipment_models')
      .insert({ manufacturer_id: manufacturerId, name: name.trim(), description: description?.trim() || null, created_by: user?.id })
      .select()
      .single();
    if (error) throw error;
    setModels(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  }, []);

  const deleteModel = useCallback(async (id: string) => {
    const { error } = await supabase.from('equipment_models').delete().eq('id', id);
    if (error) throw error;
    setModels(prev => prev.filter(m => m.id !== id));
  }, []);

  const importModels = useCallback(async (items: { manufacturer: string; model: string; description?: string }[]): Promise<number> => {
    const { data: { user } } = await supabase.auth.getUser();
    let count = 0;
    for (const item of items) {
      // Find or create manufacturer
      let mfg = manufacturers.find(m => m.name.toLowerCase() === item.manufacturer.trim().toLowerCase());
      if (!mfg) {
        const { data, error } = await supabase
          .from('manufacturers')
          .insert({ name: item.manufacturer.trim(), created_by: user?.id })
          .select()
          .single();
        if (error) continue;
        mfg = data;
      }
      const { error } = await supabase
        .from('equipment_models')
        .insert({ manufacturer_id: mfg.id, name: item.model.trim(), description: item.description?.trim() || null, created_by: user?.id });
      if (!error) count++;
    }
    await fetchAll();
    return count;
  }, [manufacturers, fetchAll]);

  // --- Protocols ---
  const createProtocol = useCallback(async (name: string, description?: string): Promise<SupportedProtocol> => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('supported_protocols')
      .insert({ name: name.trim(), description: description?.trim() || null, created_by: user?.id })
      .select()
      .single();
    if (error) throw error;
    setProtocols(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  }, []);

  const deleteProtocol = useCallback(async (id: string) => {
    const { error } = await supabase.from('supported_protocols').delete().eq('id', id);
    if (error) throw error;
    setProtocols(prev => prev.filter(p => p.id !== id));
  }, []);

  const importProtocols = useCallback(async (items: { name: string; description?: string }[]): Promise<number> => {
    const { data: { user } } = await supabase.auth.getUser();
    let count = 0;
    for (const item of items) {
      const { error } = await supabase
        .from('supported_protocols')
        .insert({ name: item.name.trim(), description: item.description?.trim() || null, created_by: user?.id });
      if (!error) count++;
    }
    await fetchAll();
    return count;
  }, [fetchAll]);

  const getModelsForManufacturer = useCallback((manufacturerId: string) => {
    return models.filter(m => m.manufacturer_id === manufacturerId);
  }, [models]);

  return {
    manufacturers, models, protocols, loading,
    fetchAll,
    createManufacturer, deleteManufacturer, importManufacturers,
    createModel, deleteModel, importModels,
    createProtocol, deleteProtocol, importProtocols,
    getModelsForManufacturer,
  };
};