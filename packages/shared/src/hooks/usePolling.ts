/**
 * usePolling Hook
 *
 * Reusable hook for polling data at regular intervals
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UsePollingResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UsePollingOptions {
  /** Polling interval in milliseconds */
  interval: number;
  /** Whether to start polling immediately (default: true) */
  immediate?: boolean;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for polling data at regular intervals
 *
 * @example
 * const { data, loading, error } = usePolling(
 *   () => sessionAPI.getByCode(code),
 *   { interval: 3000 }
 * );
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  options: UsePollingOptions
): UsePollingResult<T> {
  const { interval, immediate = true, enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate && enabled);
  const [error, setError] = useState<string | null>(null);

  // Store fetchFn in ref to avoid dependency issues
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const refetch = useCallback(async () => {
    if (!enabled) return;

    try {
      const result = await fetchFnRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Polling error:', err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Initial fetch
  useEffect(() => {
    if (immediate && enabled) {
      refetch();
    }
  }, [immediate, enabled, refetch]);

  // Polling interval
  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(refetch, interval);
    return () => clearInterval(intervalId);
  }, [interval, enabled, refetch]);

  return { data, loading, error, refetch };
}
