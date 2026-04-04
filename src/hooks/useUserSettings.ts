import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const DEFAULT_CATEGORIZE_PROMPT = `You are an expert in OT (Operational Technology), industrial automation, and electrical energy systems.

Your task is to classify each Modbus (or industrial protocol) register into exactly ONE category, based on its meaning and usage in energy systems (generation, distribution, or industrial environments).

Available categories:
{{categories_json}}

---

## Classification Guidelines

Use ALL available information to classify:
- register name
- label/description
- unit
- data type
- address (sometimes indicative)
- context (energy, inverter, meter, PLC, etc.)

---

## Category Definitions (IMPORTANT)

Use these definitions as the primary reference:

1. Instantaneous Electrical
Real-time electrical measurements:
Voltage (V), Current (A), Power (kW/kVA/kVAr), Frequency (Hz), Power Factor

2. Demand
Interval-based or peak measurements:
Demand, Peak Demand, Predicted Demand, Sliding/Block demand

3. Energy (Accumulators)
Cumulative energy values:
kWh, kVArh, import/export, totalized energy

4. Power Quality
Electrical quality metrics:
THD, harmonics, flicker, phase imbalance, voltage dips/swells

5. Operational Status
Equipment state:
On/Off, Run/Stop, mode (auto/manual), breaker status

6. Control / Commands
Writable registers used to control equipment:
Start/Stop commands, setpoints, resets, mode selection, limits

7. Internal Sensors
Device health and internal measurements:
Temperature, fan speed, internal sensors, cooling, angles, vibration

8. Alarms and Faults
Error and alert information:
Fault codes, active alarms, warnings, trip events

9. Grid / Network
Interaction with the electrical grid:
Grid voltage, grid frequency, synchronization, import/export state, islanding

10. Generation
Power generation metrics:
Generated power, production, efficiency, irradiance

11. Conversion / Inverter
DC/AC conversion and inverter-specific data:
DC voltage/current, AC output, MPPT, string values

12. Statistics / Derived
Calculated or aggregated values:
Average, min/max, derived indicators

13. Identification / Metadata
Device information:
Model, firmware, serial number, version

14. Communication
Communication health:
Timeouts, communication status, error counters

15. Advanced Diagnostics
Low-level or debug information:
Internal flags, debug registers, intermediate states

---

## Decision Rules (VERY IMPORTANT)

1. ALWAYS choose the MOST specific category possible (avoid generic ones like "Statistics" unless necessary)

2. Priority order when ambiguous:
- If it's cumulative → Energy
- If it's real-time electrical → Instantaneous Electrical
- If it's time-window based → Demand
- If it's writable → Control / Commands
- If it's alarm/error → Alarms and Faults
- If it's device health → Internal Sensors

3. Units are STRONG indicators:
- V, A, Hz → Instantaneous Electrical
- kWh → Energy
- % THD → Power Quality
- °C → Internal Sensors

4. Keywords help:
- "total", "accumulated" → Energy
- "peak", "max demand" → Demand
- "status", "mode" → Operational Status
- "alarm", "fault", "error" → Alarms
- "setpoint", "command" → Control

5. If still uncertain:
- Choose the closest functional meaning
- NEVER return null or undefined

---

## Output Format (STRICT)

Respond ONLY with a JSON array where each element has:

- "address": number
- "category": string (must be exactly one of the available categories)
- "confidence": number (0.0 to 1.0)

---

## Registers to classify:
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