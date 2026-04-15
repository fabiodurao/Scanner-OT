import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserSettings } from '@/hooks/useUserSettings';

interface SitePublishUrlState {
  publishUrl: string | null;
  useCustomPublishUrl: boolean;
  globalUrl: string;
  loading: boolean;
  saving: boolean;
}

export const useSitePublishUrl = (siteIdentifier: string) => {
  const { settings } = useUserSettings();
  const [state, setState] = useState<SitePublishUrlState>({
    publishUrl: null,
    useCustomPublishUrl: false,
    globalUrl: '',
    loading: true,
    saving: false,
  });

  const fetchSiteUrl = useCallback(async () => {
    const { data, error } = await supabase
      .from('sites')
      .select('publish_url, use_custom_publish_url')
      .eq('unique_id', siteIdentifier)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching site publish URL:', error);
    }

    setState(prev => ({
      ...prev,
      publishUrl: data?.publish_url || null,
      useCustomPublishUrl: data?.use_custom_publish_url || false,
      globalUrl: settings.saas_endpoint || '',
      loading: false,
    }));
  }, [siteIdentifier, settings.saas_endpoint]);

  useEffect(() => {
    fetchSiteUrl();
  }, [fetchSiteUrl]);

  // Keep globalUrl in sync
  useEffect(() => {
    setState(prev => ({ ...prev, globalUrl: settings.saas_endpoint || '' }));
  }, [settings.saas_endpoint]);

  const savePublishUrl = async (useCustom: boolean, customUrl: string | null): Promise<boolean> => {
    setState(prev => ({ ...prev, saving: true }));

    const { error } = await supabase
      .from('sites')
      .update({
        use_custom_publish_url: useCustom,
        publish_url: useCustom ? customUrl : null,
      })
      .eq('unique_id', siteIdentifier);

    if (error) {
      console.error('Error saving publish URL:', error);
      setState(prev => ({ ...prev, saving: false }));
      return false;
    }

    setState(prev => ({
      ...prev,
      useCustomPublishUrl: useCustom,
      publishUrl: useCustom ? customUrl : null,
      saving: false,
    }));
    return true;
  };

  const resetToGlobal = async (): Promise<boolean> => {
    return savePublishUrl(false, null);
  };

  const effectiveUrl = state.useCustomPublishUrl && state.publishUrl
    ? state.publishUrl
    : state.globalUrl;

  return {
    ...state,
    effectiveUrl,
    savePublishUrl,
    resetToGlobal,
    refresh: fetchSiteUrl,
  };
};
