/**
 * Rate Limiter Tests
 *
 * Tests for the client-side rate limiting utility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRateLimiter } from '../utils/rateLimiter';

describe('rateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createRateLimiter', () => {
    it('should allow requests within limit', () => {
      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 1000 });

      expect(limiter.canMakeRequest()).toBe(true);
      expect(limiter.canMakeRequest()).toBe(true);
      expect(limiter.canMakeRequest()).toBe(true);
    });

    it('should block requests exceeding limit', () => {
      const limiter = createRateLimiter({ maxRequests: 2, windowMs: 1000 });

      expect(limiter.canMakeRequest()).toBe(true);
      expect(limiter.canMakeRequest()).toBe(true);
      expect(limiter.canMakeRequest()).toBe(false);
    });

    it('should reset after window expires', () => {
      const limiter = createRateLimiter({ maxRequests: 2, windowMs: 1000 });

      limiter.canMakeRequest();
      limiter.canMakeRequest();
      expect(limiter.canMakeRequest()).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(1001);

      expect(limiter.canMakeRequest()).toBe(true);
    });

    it('should return remaining requests', () => {
      const limiter = createRateLimiter({ maxRequests: 3, windowMs: 1000 });

      expect(limiter.getRemainingRequests()).toBe(3);
      limiter.canMakeRequest();
      expect(limiter.getRemainingRequests()).toBe(2);
    });

    it('should return time until reset', () => {
      const limiter = createRateLimiter({ maxRequests: 1, windowMs: 5000 });

      limiter.canMakeRequest();

      // Should be approximately 5000ms until reset
      const timeUntilReset = limiter.getTimeUntilReset();
      expect(timeUntilReset).toBeGreaterThan(0);
      expect(timeUntilReset).toBeLessThanOrEqual(5000);
    });

    it('should allow manual reset', () => {
      const limiter = createRateLimiter({ maxRequests: 1, windowMs: 10000 });

      limiter.canMakeRequest();
      expect(limiter.canMakeRequest()).toBe(false);

      limiter.reset();
      expect(limiter.canMakeRequest()).toBe(true);
    });
  });
});
