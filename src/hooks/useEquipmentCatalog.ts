import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EquipmentCatalog, CatalogProtocol, CatalogRegister, EquipmentCatalogLink } from '@/types/catalog';

export const useEquipmentCatalog = () => {

  const fetchCatalogs = useCallback(async (): Promise<EquipmentCatalog[]> => {
    const { data: catalogs, error } = await supabase
      .from('equipment_catalogs')
      .select('*')
      .order('manufacturer', { ascending: true });

    if (error) throw error;

    const { data: protocols } = await supabase
      .from('catalog_protocols')
      .select('*');

    const protocolsByCatalog = new Map<string, CatalogProtocol[]>();
    (protocols || []).forEach((p: CatalogProtocol) => {
      const existing = protocolsByCatalog.get(p.catalog_id) || [];
      existing.push(p);
      protocolsByCatalog.set(p.catalog_id, existing);
    });

    return (catalogs || []).map((c: EquipmentCatalog) => {
      const catalogProtocols = protocolsByCatalog.get(c.id) || [];
      return {
        ...c,
        protocols: catalogProtocols,
        protocol_count: catalogProtocols.length,
        total_registers: catalogProtocols.reduce((sum, p) => sum + (p.register_count || 0), 0),
      };
    });
  }, []);

  const fetchCatalogDetail = useCallback(async (id: string): Promise<EquipmentCatalog | null> => {
    const { data: catalog, error } = await supabase
      .from('equipment_catalogs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;

    const { data: protocols } = await supabase
      .from('catalog_protocols')
      .select('*')
      .eq('catalog_id', id)
      .order('protocol', { ascending: true });

    return {
      ...catalog,
      protocols: (protocols || []) as CatalogProtocol[],
      protocol_count: (protocols || []).length,
      total_registers: (protocols || []).reduce((sum: number, p: CatalogProtocol) => sum + (p.register_count || 0), 0),
    };
  }, []);

  const createCatalog = useCallback(async (data: {
    manufacturer: string;
    model: string;
    description?: string;
  }): Promise<EquipmentCatalog> => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: catalog, error } = await supabase
      .from('equipment_catalogs')
      .insert({
        manufacturer: data.manufacturer.trim(),
        model: data.model.trim(),
        description: data.description?.trim() || null,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return catalog;
  }, []);

  const updateCatalog = useCallback(async (id: string, data: {
    manufacturer?: string;
    model?: string;
    description?: string | null;
  }): Promise<void> => {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer.trim();
    if (data.model !== undefined) updateData.model = data.model.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;

    const { error } = await supabase
      .from('equipment_catalogs')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }, []);

  const deleteCatalog = useCallback(async (id: string): Promise<void> => {
    await supabase.from('equipment_catalog_links').delete().eq('catalog_id', id);
    const { error } = await supabase.from('equipment_catalogs').delete().eq('id', id);
    if (error) throw error;
  }, []);

  const addProtocol = useCallback(async (
    catalogId: string,
    protocol: string,
    registers: CatalogRegister[]
  ): Promise<CatalogProtocol> => {
    const { data, error } = await supabase
      .from('catalog_protocols')
      .insert({
        catalog_id: catalogId,
        protocol: protocol.trim(),
        registers: registers as unknown as Record<string, unknown>[],
        register_count: registers.length,
      })
      .select()
      .single();

    if (error) throw error;
    return data as CatalogProtocol;
  }, []);

  const updateProtocol = useCallback(async (
    protocolId: string,
    registers: CatalogRegister[]
  ): Promise<void> => {
    const { error } = await supabase
      .from('catalog_protocols')
      .update({
        registers: registers as unknown as Record<string, unknown>[],
        register_count: registers.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', protocolId);

    if (error) throw error;
  }, []);

  const deleteProtocol = useCallback(async (protocolId: string): Promise<void> => {
    await supabase.from('equipment_catalog_links').delete().eq('catalog_protocol_id', protocolId);
    const { error } = await supabase.from('catalog_protocols').delete().eq('id', protocolId);
    if (error) throw error;
  }, []);

  const linkCatalogToEquipment = useCallback(async (
    equipmentId: string,
    catalogProtocolId: string,
    siteIdentifier: string
  ): Promise<{ matched: number; total: number }> => {
    console.log('=== [CATALOG MATCH DEBUG] ===');
    console.log('equipmentId:', equipmentId);
    console.log('catalogProtocolId:', catalogProtocolId);
    console.log('siteIdentifier:', siteIdentifier);

    // Fetch protocol with its parent catalog
    const { data: protocol, error: protoError } = await supabase
      .from('catalog_protocols')
      .select('*, equipment_catalogs(*)')
      .eq('id', catalogProtocolId)
      .single();

    if (protoError || !protocol) throw new Error('Protocol not found');

    const catalog = (protocol as any).equipment_catalogs;
    if (!catalog) throw new Error('Catalog not found for this protocol');

    const registers: CatalogRegister[] = Array.isArray(protocol.registers) ? protocol.registers : [];
    console.log('Catalog registers count:', registers.length);
    console.log('First 3 catalog registers:', registers.slice(0, 3).map(r => ({ addr: r.address, fc: r.function_code, name: r.name })));

    // Fetch equipment details
    const { data: equipment, error: eqError } = await supabase
      .from('discovered_equipment')
      .select('ip_address, site_identifier')
      .eq('id', equipmentId)
      .single();

    if (eqError || !equipment) throw new Error('Equipment not found');
    console.log('Equipment IP:', equipment.ip_address);
    console.log('Equipment site_identifier:', equipment.site_identifier);

    const { data: { user } } = await supabase.auth.getUser();

    // Check if this exact link already exists
    const { data: existingLinks } = await supabase
      .from('equipment_catalog_links')
      .select('id')
      .eq('equipment_id', equipmentId)
      .eq('catalog_protocol_id', catalogProtocolId);

    if (existingLinks && existingLinks.length > 0) {
      throw new Error('This catalog protocol is already linked to this equipment');
    }

    // Insert new link
    const { error: linkError } = await supabase
      .from('equipment_catalog_links')
      .insert({
        equipment_id: equipmentId,
        catalog_id: protocol.catalog_id,
        catalog_protocol_id: catalogProtocolId,
        linked_by: user?.id,
      });

    if (linkError) throw new Error('Failed to create link: ' + linkError.message);

    // Update equipment manufacturer/model
    await supabase
      .from('discovered_equipment')
      .update({ manufacturer: catalog.manufacturer, model: catalog.model, updated_at: new Date().toISOString() })
      .eq('id', equipmentId);

    if (registers.length === 0) {
      return { matched: 0, total: 0 };
    }

    // Fetch ALL variables from the table (no filter) to diagnose what's there
    const { data: allVars, error: varsError } = await supabase
      .from('discovered_variables')
      .select('id, site_identifier, "SiteIdentifier", source_ip, "SourceIp", address, "Address", function_code, "FC"')
      .limit(2000);

    if (varsError) {
      console.error('[CATALOG MATCH] Error fetching variables:', varsError);
      return { matched: 0, total: registers.length };
    }

    console.log('Total variables in DB (up to 2000):', allVars?.length ?? 0);

    // Show what unique site identifiers and IPs exist
    const uniqueSites = new Set((allVars || []).map(v => v.site_identifier || (v as any).SiteIdentifier).filter(Boolean));
    const uniqueIps = new Set((allVars || []).map(v => v.source_ip || (v as any).SourceIp).filter(Boolean));
    console.log('Unique site_identifiers in DB:', Array.from(uniqueSites));
    console.log('Unique source_ips in DB:', Array.from(uniqueIps));
    console.log('Looking for site:', siteIdentifier, '| ip:', equipment.ip_address);

    // Show raw values of first variable to understand column state
    if (allVars && allVars.length > 0) {
      const sample = allVars[0];
      console.log('Sample variable raw:', {
        site_identifier: sample.site_identifier,
        SiteIdentifier: (sample as any).SiteIdentifier,
        source_ip: sample.source_ip,
        SourceIp: (sample as any).SourceIp,
        address: sample.address,
        Address: (sample as any).Address,
        function_code: sample.function_code,
        FC: (sample as any).FC,
      });
    }

    // Filter in JS to handle both column variants
    const equipmentVars = (allVars || []).filter(v => {
      const vSite = v.site_identifier || (v as any).SiteIdentifier;
      const vIp = v.source_ip || (v as any).SourceIp;
      return vSite === siteIdentifier && vIp === equipment.ip_address;
    });

    console.log('Variables matching site+ip:', equipmentVars.length);

    if (equipmentVars.length === 0) {
      // Try partial match to help diagnose
      const siteMatch = (allVars || []).filter(v => {
        const vSite = v.site_identifier || (v as any).SiteIdentifier;
        return vSite === siteIdentifier;
      });
      console.log('Variables matching ONLY site (any IP):', siteMatch.length);
      if (siteMatch.length > 0) {
        const ipsForSite = new Set(siteMatch.map(v => v.source_ip || (v as any).SourceIp));
        console.log('IPs found for this site:', Array.from(ipsForSite));
        console.log('Equipment IP we are looking for:', equipment.ip_address);
      }
      return { matched: 0, total: registers.length };
    }

    // Build lookup map: "address:fc" -> variable id
    const varMap = new Map<string, string>();
    for (const v of equipmentVars) {
      const addr = v.address ?? (v as any).Address;
      const fc = v.function_code ?? (v as any).FC;
      if (addr !== null && addr !== undefined && fc !== null && fc !== undefined) {
        varMap.set(`${addr}:${fc}`, v.id);
      }
    }

    console.log('Variable map size:', varMap.size);
    console.log('First 5 variable keys (addr:fc):', Array.from(varMap.keys()).slice(0, 5));
    console.log('First 5 catalog register keys (addr:fc):', registers.slice(0, 5).map(r => `${r.address}:${r.function_code}`));

    // Match and update
    const nowIso = new Date().toISOString();
    let matchedCount = 0;

    for (const register of registers) {
      if (register.address === undefined || register.address === null) continue;
      if (register.function_code === undefined || register.function_code === null) continue;

      const key = `${register.address}:${register.function_code}`;
      const varId = varMap.get(key);

      if (!varId) continue;

      const { data: updated, error: updateError } = await supabase
        .from('discovered_variables')
        .update({
          semantic_label: register.label || register.name || null,
          semantic_unit: register.unit || null,
          data_type: register.data_type?.toLowerCase() || null,
          scale: register.scale || 1,
          learning_state: 'confirmed',
          modification_source: 'catalog',
          confirmed_by: user?.id,
          confirmed_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', varId)
        .select('id');

      if (!updateError && updated && updated.length > 0) {
        matchedCount++;
      }
    }

    console.log('=== RESULT: matched', matchedCount, '/', registers.length, '===');
    return { matched: matchedCount, total: registers.length };
  }, []);

  const unlinkCatalogFromEquipment = useCallback(async (equipmentId: string): Promise<void> => {
    const { error } = await supabase.from('equipment_catalog_links').delete().eq('equipment_id', equipmentId);
    if (error) throw error;
  }, []);

  const unlinkSingleCatalogLink = useCallback(async (linkId: string): Promise<void> => {
    const { error } = await supabase.from('equipment_catalog_links').delete().eq('id', linkId);
    if (error) throw error;
  }, []);

  const getEquipmentCatalogLink = useCallback(async (equipmentId: string): Promise<EquipmentCatalogLink | null> => {
    const { data, error } = await supabase
      .from('equipment_catalog_links')
      .select('*')
      .eq('equipment_id', equipmentId)
      .single();

    if (error || !data) return null;

    const { data: catalog } = await supabase.from('equipment_catalogs').select('*').eq('id', data.catalog_id).single();
    const { data: protocol } = await supabase.from('catalog_protocols').select('*').eq('id', data.catalog_protocol_id).single();

    return { ...data, catalog: catalog || undefined, protocol: (protocol as CatalogProtocol) || undefined } as EquipmentCatalogLink;
  }, []);

  const fetchAllCatalogLinks = useCallback(async (siteIdentifier: string): Promise<Map<string, EquipmentCatalogLink>> => {
    const { data: equipment } = await supabase.from('discovered_equipment').select('id').eq('site_identifier', siteIdentifier);
    if (!equipment || equipment.length === 0) return new Map();

    const { data: links } = await supabase.from('equipment_catalog_links').select('*').in('equipment_id', equipment.map(e => e.id));
    if (!links || links.length === 0) return new Map();

    const catalogIds = [...new Set(links.map(l => l.catalog_id))];
    const protocolIds = [...new Set(links.map(l => l.catalog_protocol_id))];

    const { data: catalogs } = await supabase.from('equipment_catalogs').select('*').in('id', catalogIds);
    const { data: protocols } = await supabase.from('catalog_protocols').select('*').in('id', protocolIds);

    const catalogMap = new Map((catalogs || []).map(c => [c.id, c]));
    const protocolMap = new Map((protocols || []).map(p => [p.id, p]));

    const result = new Map<string, EquipmentCatalogLink>();
    links.forEach(link => {
      if (!result.has(link.equipment_id)) {
        result.set(link.equipment_id, {
          ...link,
          catalog: catalogMap.get(link.catalog_id) || undefined,
          protocol: (protocolMap.get(link.catalog_protocol_id) as CatalogProtocol) || undefined,
        } as EquipmentCatalogLink);
      }
    });

    return result;
  }, []);

  const fetchAllCatalogLinksGrouped = useCallback(async (siteIdentifier: string): Promise<Map<string, EquipmentCatalogLink[]>> => {
    const { data: equipment } = await supabase.from('discovered_equipment').select('id').eq('site_identifier', siteIdentifier);
    if (!equipment || equipment.length === 0) return new Map();

    const { data: links } = await supabase.from('equipment_catalog_links').select('*').in('equipment_id', equipment.map(e => e.id));
    if (!links || links.length === 0) return new Map();

    const catalogIds = [...new Set(links.map(l => l.catalog_id))];
    const protocolIds = [...new Set(links.map(l => l.catalog_protocol_id))];

    const { data: catalogs } = await supabase.from('equipment_catalogs').select('*').in('id', catalogIds);
    const { data: protocols } = await supabase.from('catalog_protocols').select('*').in('id', protocolIds);

    const catalogMap = new Map((catalogs || []).map(c => [c.id, c]));
    const protocolMap = new Map((protocols || []).map(p => [p.id, p]));

    const result = new Map<string, EquipmentCatalogLink[]>();
    links.forEach(link => {
      const enrichedLink = {
        ...link,
        catalog: catalogMap.get(link.catalog_id) || undefined,
        protocol: (protocolMap.get(link.catalog_protocol_id) as CatalogProtocol) || undefined,
      } as EquipmentCatalogLink;

      const existing = result.get(link.equipment_id) || [];
      existing.push(enrichedLink);
      result.set(link.equipment_id, existing);
    });

    return result;
  }, []);

  return {
    fetchCatalogs,
    fetchCatalogDetail,
    createCatalog,
    updateCatalog,
    deleteCatalog,
    addProtocol,
    updateProtocol,
    deleteProtocol,
    linkCatalogToEquipment,
    unlinkCatalogFromEquipment,
    unlinkSingleCatalogLink,
    getEquipmentCatalogLink,
    fetchAllCatalogLinks,
    fetchAllCatalogLinksGrouped,
  };
};