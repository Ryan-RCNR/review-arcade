/**
 * Rate Limiter Utility
 *
 * Simple client-side rate limiting to prevent rapid API calls
 */

interface RateLimiterOptions {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitState {
  timestamps: number[];
}

/**
 * Create a rate limiter instance
 *
 * @example
 * const limiter = createRateLimiter({ maxRequests: 10, windowMs: 1000 });
 *
 * if (limiter.canProceed()) {
 *   await fetch('/api/data');
 * } else {
 *   console.log('Rate limited, try again in', limiter.getRetryAfterMs(), 'ms');
 * }
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { maxRequests, windowMs } = options;
  const state: RateLimitState = { timestamps: [] };

  const cleanOldTimestamps = () => {
    const now = Date.now();
    state.timestamps = state.timestamps.filter(
      (timestamp) => now - timestamp < windowMs
    );
  };

  return {
    /**
     * Check if a request can proceed
     */
    canProceed: (): boolean => {
      cleanOldTimestamps();
      return state.timestamps.length < maxRequests;
    },

    /**
     * Record a request (call this when making a request)
     */
    recordRequest: (): boolean => {
      cleanOldTimestamps();
      if (state.timestamps.length >= maxRequests) {
        return false;
      }
      state.timestamps.push(Date.now());
      return true;
    },

    /**
     * Get remaining requests in current window
     */
    getRemainingRequests: (): number => {
      cleanOldTimestamps();
      return Math.max(0, maxRequests - state.timestamps.length);
    },

    /**
     * Get milliseconds until rate limit resets
     */
    getRetryAfterMs: (): number => {
      cleanOldTimestamps();
      if (state.timestamps.length === 0) return 0;
      const oldestTimestamp = state.timestamps[0];
      return Math.max(0, windowMs - (Date.now() - oldestTimestamp));
    },

    /**
     * Reset the rate limiter
     */
    reset: (): void => {
      state.timestamps = [];
    },
  };
}

// Default rate limiter: 30 requests per second
export const defaultRateLimiter = createRateLimiter({
  maxRequests: 30,
  windowMs: 1000,
});
