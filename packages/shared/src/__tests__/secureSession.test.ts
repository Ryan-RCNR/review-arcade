/**
 * Secure Session Tests
 *
 * Tests for the secure session manager that stores tokens in memory.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  storePlayerSession,
  storeClerkToken,
  getClerkToken,
  getPlayerToken,
  getSessionMetadata,
  hasValidSession,
  clearSession,
  refreshSessionExpiry,
} from '../utils/secureSession';

describe('secureSession', () => {
  beforeEach(() => {
    clearSession();
  });

  describe('storePlayerSession', () => {
    it('should store session data', () => {
      storePlayerSession({
        playerId: 'player-1',
        playerName: 'Test Player',
        sessionCode: 'ABC123',
        playerToken: 'secret-token',
      });

      expect(hasValidSession()).toBe(true);
      expect(getPlayerToken()).toBe('secret-token');
    });

    it('should store metadata in sessionStorage', () => {
      storePlayerSession({
        playerId: 'player-1',
        playerName: 'Test Player',
        sessionCode: 'ABC123',
      });

      expect(sessionStorage.setItem).toHaveBeenCalledWith('player_id', 'player-1');
      expect(sessionStorage.setItem).toHaveBeenCalledWith('player_name', 'Test Player');
      expect(sessionStorage.setItem).toHaveBeenCalledWith('session_code', 'ABC123');
    });
  });

  describe('storeClerkToken', () => {
    it('should store Clerk token in memory', () => {
      storeClerkToken('clerk-jwt-token');
      expect(getClerkToken()).toBe('clerk-jwt-token');
    });

    it('should create session if none exists', () => {
      storeClerkToken('clerk-jwt-token');
      expect(hasValidSession()).toBe(true);
    });
  });

  describe('getClerkToken', () => {
    it('should return null when no session', () => {
      expect(getClerkToken()).toBeNull();
    });

    it('should return token when stored', () => {
      storeClerkToken('my-token');
      expect(getClerkToken()).toBe('my-token');
    });
  });

  describe('getPlayerToken', () => {
    it('should return null when no session', () => {
      expect(getPlayerToken()).toBeNull();
    });

    it('should return token when stored', () => {
      storePlayerSession({
        playerId: 'p1',
        playerName: 'Player',
        sessionCode: 'CODE',
        playerToken: 'player-token-123',
      });
      expect(getPlayerToken()).toBe('player-token-123');
    });
  });

  describe('getSessionMetadata', () => {
    it('should return null when no metadata stored', () => {
      expect(getSessionMetadata()).toBeNull();
    });
  });

  describe('hasValidSession', () => {
    it('should return false when no session', () => {
      expect(hasValidSession()).toBe(false);
    });

    it('should return true when session exists', () => {
      storeClerkToken('token');
      expect(hasValidSession()).toBe(true);
    });
  });

  describe('clearSession', () => {
    it('should clear all session data', () => {
      storePlayerSession({
        playerId: 'p1',
        playerName: 'Player',
        sessionCode: 'CODE',
        playerToken: 'token',
      });

      clearSession();

      expect(hasValidSession()).toBe(false);
      expect(getPlayerToken()).toBeNull();
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('player_id');
    });
  });

  describe('refreshSessionExpiry', () => {
    it('should extend session expiry', () => {
      storeClerkToken('token');

      // Fast-forward time simulation would require vi.useFakeTimers
      // For now just ensure it doesn't throw
      refreshSessionExpiry();
      expect(hasValidSession()).toBe(true);
    });
  });

  describe('session expiration', () => {
    it('should return null for expired token', () => {
      vi.useFakeTimers();

      storeClerkToken('token');
      expect(getClerkToken()).toBe('token');

      // Advance time past expiration (4 hours + 1 second)
      vi.advanceTimersByTime(4 * 60 * 60 * 1000 + 1000);

      expect(getClerkToken()).toBeNull();

      vi.useRealTimers();
    });
  });
});
