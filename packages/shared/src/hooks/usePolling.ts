/**
 * usePolling Hook
 *
 * Reusable hook for polling data at regular intervals
 * Supports adaptive intervals to reduce unnecessary requests
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
  /** Use adaptive interval - slow down when data unchanged (default: false) */
  adaptive?: boolean;
  /** Maximum interval for adaptive polling in ms (default: 30000) */
  maxInterval?: number;
  /** Backoff multiplier for adaptive polling (default: 1.5) */
  backoffMultiplier?: number;
}

/**
 * Hook for polling data at regular intervals
 *
 * @example
 * const { data, loading, error } = usePolling(
 *   () => sessionAPI.getByCode(code),
 *   { interval: 3000, adaptive: true }
 * );
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  options: UsePollingOptions
): UsePollingResult<T> {
  const {
    interval,
    immediate = true,
    enabled = true,
    adaptive = false,
    maxInterval = 30000,
    backoffMultiplier = 1.5,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate && enabled);
  const [error, setError] = useState<string | null>(null);

  // Store fetchFn in ref to avoid dependency issues
  const fetchFnRef = useRef(fetchFn);
  const lastDataRef = useRef<string | null>(null);
  const currentIntervalRef = useRef(interval);
  fetchFnRef.current = fetchFn;

  const refetch = useCallback(async () => {
    if (!enabled) return;

    try {
      const result = await fetchFnRef.current();

      // Adaptive interval logic
      if (adaptive) {
        const currentDataStr = JSON.stringify(result);
        if (currentDataStr === lastDataRef.current) {
          // Data unchanged, slow down polling
          currentIntervalRef.current = Math.min(
            currentIntervalRef.current * backoffMultiplier,
            maxInterval
          );
        } else {
          // Data changed, reset to base interval
          currentIntervalRef.current = interval;
        }
        lastDataRef.current = currentDataStr;
      }

      setData(result);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Polling error:', err);
      // On error, slow down polling
      if (adaptive) {
        currentIntervalRef.current = Math.min(
          currentIntervalRef.current * backoffMultiplier,
          maxInterval
        );
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, adaptive, interval, maxInterval, backoffMultiplier]);

  // Initial fetch
  useEffect(() => {
    if (immediate && enabled) {
      refetch();
    }
  }, [immediate, enabled, refetch]);

  // Polling interval with adaptive support
  useEffect(() => {
    if (!enabled) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const nextInterval = adaptive ? currentIntervalRef.current : interval;
      timeoutId = setTimeout(() => {
        refetch().then(scheduleNext);
      }, nextInterval);
    };

    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [interval, enabled, refetch, adaptive]);

  return { data, loading, error, refetch };
}
