import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CatalogRegister } from '@/types/catalog';

const EDGE_FUNCTION_URL = 'https://jgclhfwigmxmqyhqngcm.supabase.co/functions/v1/ai-categorize';
const BATCH_SIZE = 50;

export interface AICategorizationResult {
  address: number;
  category: string;
  confidence: number;
}

interface UseAIServiceReturn {
  categorizeRegisters: (registers: CatalogRegister[]) => Promise<AICategorizationResult[]>;
  testConnection: () => Promise<boolean>;
  loading: boolean;
  progress: { current: number; total: number } | null;
  error: string | null;
}

export const useAIService = (): UseAIServiceReturn => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated. Please log in.');
    }
    return session.access_token;
  };

  const callEdgeFunction = async (body: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const token = await getAuthToken();

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
  };

  const testConnection = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const data = await callEdgeFunction({ task: 'test_connection', registers: [] });
      setLoading(false);
      return (data as { success: boolean }).success === true;
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      setLoading(false);
      return false;
    }
  }, []);

  const categorizeRegisters = useCallback(async (registers: CatalogRegister[]): Promise<AICategorizationResult[]> => {
    if (registers.length === 0) return [];

    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: registers.length });

    try {
      const allResults: AICategorizationResult[] = [];

      // Split into batches
      const batches: CatalogRegister[][] = [];
      for (let i = 0; i < registers.length; i += BATCH_SIZE) {
        batches.push(registers.slice(i, i + BATCH_SIZE));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const data = await callEdgeFunction({
          task: 'categorize',
          registers: batch,
        });

        const results = (data as { results: AICategorizationResult[] }).results || [];
        allResults.push(...results);

        setProgress({
          current: Math.min((batchIndex + 1) * BATCH_SIZE, registers.length),
          total: registers.length,
        });
      }

      setLoading(false);
      setProgress(null);
      return allResults;
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      setLoading(false);
      setProgress(null);
      throw err;
    }
  }, []);

  return {
    categorizeRegisters,
    testConnection,
    loading,
    progress,
    error,
  };
};
