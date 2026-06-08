import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { SpecificationWithProject } from '../types';

interface UseSpecsResult {
  specs: SpecificationWithProject[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Fetches and re-fetches the saved-spec list.
 * Used by the sidebar and by the dashboard after a successful generation.
 */
export function useSpecs(): UseSpecsResult {
  const [specs, setSpecs] = useState<SpecificationWithProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { specifications } = await api.listSpecs();
      setSpecs(specifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load specs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { specs, loading, error, refresh };
}
