/**
 * Secure Session Manager
 *
 * Stores sensitive tokens in memory to mitigate XSS attacks.
 * SessionStorage is only used for non-sensitive session metadata.
 *
 * Security features:
 * - Tokens stored in memory (not accessible via XSS)
 * - Session metadata (non-sensitive) can be persisted
 * - Tokens cleared on page unload for security
 * - Optional session expiration
 */

export interface PlayerSessionData {
  playerId: string;
  playerName: string;
  sessionCode: string;
}

interface SecureSessionData extends PlayerSessionData {
  playerToken?: string;
  clerkToken?: string;
  expiresAt?: number;
}

// In-memory storage for sensitive tokens (XSS-resistant)
let memorySession: SecureSessionData | null = null;

// Session expiration time (4 hours)
const SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000;

/**
 * Store player session securely
 * - Token stored in memory only (not in sessionStorage)
 * - Non-sensitive metadata stored in sessionStorage for reconnection hints
 */
export function storePlayerSession(session: SecureSessionData): void {
  const sessionWithExpiry: SecureSessionData = {
    ...session,
    expiresAt: Date.now() + SESSION_EXPIRY_MS,
  };

  memorySession = sessionWithExpiry;

  // Store only non-sensitive metadata in sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('player_id', session.playerId);
    sessionStorage.setItem('player_name', session.playerName);
    sessionStorage.setItem('session_code', session.sessionCode);
  }
}

/**
 * Store Clerk auth token securely in memory
 */
export function storeClerkToken(token: string): void {
  if (!memorySession) {
    memorySession = {
      playerId: '',
      playerName: '',
      sessionCode: '',
    };
  }
  memorySession.clerkToken = token;
  memorySession.expiresAt = Date.now() + SESSION_EXPIRY_MS;
}

/**
 * Get Clerk token from memory
 */
export function getClerkToken(): string | null {
  if (!memorySession) return null;

  // Check expiration
  if (memorySession.expiresAt && Date.now() > memorySession.expiresAt) {
    return null;
  }

  return memorySession.clerkToken ?? null;
}

/**
 * Get player token from memory
 */
export function getPlayerToken(): string | null {
  if (!memorySession) return null;

  // Check expiration
  if (memorySession.expiresAt && Date.now() > memorySession.expiresAt) {
    return null;
  }

  return memorySession.playerToken ?? null;
}

/**
 * Get session metadata (non-sensitive, for UI)
 */
export function getSessionMetadata(): PlayerSessionData | null {
  if (typeof sessionStorage === 'undefined') return null;

  const playerId = sessionStorage.getItem('player_id');
  const playerName = sessionStorage.getItem('player_name');
  const sessionCode = sessionStorage.getItem('session_code');

  if (!playerId || !playerName || !sessionCode) return null;

  return { playerId, playerName, sessionCode };
}

/**
 * Check if has valid session
 */
export function hasValidSession(): boolean {
  if (!memorySession) return false;
  if (memorySession.expiresAt && Date.now() > memorySession.expiresAt) {
    return false;
  }
  return true;
}

/**
 * Clear all session data
 */
export function clearSession(): void {
  memorySession = null;

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('player_id');
    sessionStorage.removeItem('player_name');
    sessionStorage.removeItem('session_code');
  }
}

/**
 * Refresh session expiry
 */
export function refreshSessionExpiry(): void {
  if (memorySession) {
    memorySession.expiresAt = Date.now() + SESSION_EXPIRY_MS;
  }
}
