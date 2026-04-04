import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const DEFAULT_CATEGORIZE_PROMPT = `You are an expert in OT (Operational Technology), industrial automation, and electrical energy systems.

Your task is to classify each Modbus (or industrial protocol) register into exactly ONE category, based on its meaning and usage in energy systems (generation, distribution, or industrial environments).

Available categories:
{{categories_json}}

---

## Classification Guidelines

1. **instantaneous_electrical** — Real-time electrical measurements: voltage (V), current (A), active/reactive/apparent power (W, VAR, VA), frequency (Hz), power factor.
2. **demand** — Demand values: maximum demand, average demand, demand intervals, peak demand registers.
3. **energy_accumulators** — Accumulated energy counters: kWh, kVARh, kVAh (import, export, total, partial, per phase).
4. **power_quality** — Harmonics (THD), voltage/current distortion, unbalance, crest factor, K-factor.
5. **operational_state** — Operating status: on/off, run/stop, mode (auto/manual), relay status, switch position.
6. **control_commands** — Writable registers for control: setpoints, reset commands, relay control, configuration writes.
7. **internal_sensors** — Physical sensors inside equipment: temperature (°C), humidity (%), pressure, vibration.
8. **alarms_faults** — Alarm flags, fault codes, error counters, protection trip status, warning registers.
9. **grid** — Grid-related: grid voltage, grid frequency, anti-islanding, grid connection status, import/export.
10. **generation** — Generation-specific: DC voltage/current (PV), string power, irradiance, wind speed, rotor RPM.
11. **inverter_conversion** — Inverter internals: DC bus voltage, IGBT temperature, modulation index, efficiency, AC output.
12. **statistics_metrics** — Statistical/calculated: min/max/average values, running hours, counters, timestamps.
13. **identification_metadata** — Device info: serial number, firmware version, model ID, communication address, baud rate.
14. **communication** — Communication-specific: Modbus address, baud rate, parity, protocol version, timeout settings.
15. **diagnostics** — Diagnostic registers: self-test results, memory status, watchdog, CRC errors, communication errors.

---

## Rules

- Analyze the register **name**, **label**, **unit**, **data_type**, and **address range** to determine the best category.
- If a register could fit multiple categories, choose the **most specific** one.
- Energy registers (kWh, kVARh) → always **energy_accumulators**, never instantaneous_electrical.
- Temperature inside equipment → **internal_sensors**; ambient temperature → **internal_sensors**.
- Status/state registers → **operational_state**; alarm/fault registers → **alarms_faults**.
- DC-side measurements (PV strings, DC bus) → **generation** or **inverter_conversion** depending on context.

---

Respond ONLY with a JSON array where each element has:
- "address": the register address (number)
- "category": the category value (string, must be one of the available categories)
- "confidence": your confidence level (number, 0.0 to 1.0)

Registers to classify:
{{registers_json}}`;

export interface AIPrompts {
  categorize_registers: string;
}

/** Metadata about each prompt function for the UI */
export interface PromptFunctionMeta {
  key: keyof AIPrompts;
  label: string;
  description: string;
  defaultPrompt: string;
  variables: { name: string; description: string }[];
}

export const PROMPT_FUNCTIONS: PromptFunctionMeta[] = [
  {
    key: 'categorize_registers',
    label: 'Catalog Register Categorization',
    description: 'Classifies equipment catalog registers into functional categories (e.g., Instantaneous Electrical, Demand, Energy Accumulators). Used in the Equipment Catalog when importing or editing registers.',
    defaultPrompt: DEFAULT_CATEGORIZE_PROMPT,
    variables: [
      { name: '{{categories_json}}', description: 'JSON array of available categories with value and label' },
      { name: '{{registers_json}}', description: 'JSON array of registers to classify (address, name, label, unit, data_type)' },
    ],
  },
];

export interface UserSettings {
  id?: string;
  user_id?: string;
  n8n_webhook_url: string | null;
  mbsniffer_interval_batch: number;
  mbsniffer_interval_min: number;
  auto_publish: boolean;
  notifications_enabled: boolean;
  confidence_threshold: number;
  cross_site_learning: boolean;
  saas_endpoint: string;
  analysis_webhook_url: string | null;
  sample_threshold_for_analysis: number;
  auto_confirm_threshold: number;
  photo_webhook_url: string | null;
  ai_provider: string;
  ai_api_key: string | null;
  ai_model: string;
  ai_custom_base_url: string | null;
  ai_prompts: AIPrompts;
}

const defaultSettings: UserSettings = {
  n8n_webhook_url: null,
  mbsniffer_interval_batch: 1000,
  mbsniffer_interval_min: 100,
  auto_publish: false,
  notifications_enabled: true,
  confidence_threshold: 0.95,
  cross_site_learning: false,
  saas_endpoint: 'https://api.centrii.com/v1',
  analysis_webhook_url: 'https://n8n.otscanner.qzz.io/webhook-test/26d1b1b8-1713-4332-91da-151bebf35d5d',
  sample_threshold_for_analysis: 50,
  auto_confirm_threshold: 0.95,
  photo_webhook_url: 'https://n8n.otscanner.qzz.io/webhook/9118e601-ae51-446f-8f44-fdbc7037f2ad',
  ai_provider: 'anthropic',
  ai_api_key: null,
  ai_model: 'claude-sonnet-4-20250514',
  ai_custom_base_url: null,
  ai_prompts: {
    categorize_registers: DEFAULT_CATEGORIZE_PROMPT,
  },
};

export const useUserSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching settings:', error);
    }

    if (data) {
      setSettings({
        ...defaultSettings,
        ...data,
        ai_prompts: {
          ...defaultSettings.ai_prompts,
          ...(data.ai_prompts as AIPrompts || {}),
        },
      });
    } else {
      setSettings(defaultSettings);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (newSettings: Partial<UserSettings>): Promise<boolean> => {
    if (!user) return false;

    setSaving(true);

    const settingsToSave = {
      ...settings,
      ...newSettings,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    const { id, ...dataToSave } = settingsToSave;

    const { error } = await supabase
      .from('user_settings')
      .upsert(dataToSave, { onConflict: 'user_id' });

    if (error) {
      console.error('Error saving settings:', error);
      setSaving(false);
      return false;
    }

    setSettings(settingsToSave);
    setSaving(false);
    return true;
  };

  return {
    settings,
    loading,
    saving,
    saveSettings,
    refreshSettings: fetchSettings,
  };
};