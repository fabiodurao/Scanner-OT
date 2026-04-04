import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const DEFAULT_CATEGORIZE_PROMPT = `You are an expert in OT (Operational Technology) and energy systems.
Given a list of Modbus/protocol registers from industrial equipment, classify each register into exactly one category.

Available categories:
{{categories_json}}

For each register, analyze the name, label, unit, data type, and address to determine the most appropriate category.

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