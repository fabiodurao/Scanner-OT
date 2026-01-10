import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
}

const defaultSettings: UserSettings = {
  n8n_webhook_url: null,
  mbsniffer_interval_batch: 1000,
  mbsniffer_interval_min: 100,
  auto_publish: false,
  notifications_enabled: true,
  confidence_threshold: 0.95,
  cross_site_learning: false,
  saas_endpoint: 'https://api.cyberenergia.com/v1',
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
      // PGRST116 = no rows returned, which is fine for new users
      console.error('Error fetching settings:', error);
    }

    if (data) {
      setSettings({
        ...defaultSettings,
        ...data,
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

    // Remove id for upsert
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