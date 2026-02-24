/**
 * Review Arcade API Client
 *
 * Updated for new backend (2026-02-24):
 * - SessionCreate sends game_type + teacher_mode (not config.games array)
 * - Join returns player_token for WS auth
 * - Session preview for student join screen
 * - Teacher join-as-player endpoint
 * - Post-game results endpoint
 */

import type {
  Session,
  SessionCreate,
  SessionPreview,
  Player,
} from '../types';

const getApiUrl = () =>
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DEFAULT_TIMEOUT_MS = 10000;

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<T> {
  const url = `${getApiUrl()}${endpoint}`;
  const { timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  const { getClerkToken } = await import('./secureSession');
  const token = getClerkToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(async () => {
        const text = await response.text().catch(() => '');
        return { detail: text || `Request failed with HTTP ${response.status}` };
      });
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

// ========================================
// Session API (teacher, requires Clerk auth)
// ========================================

export const sessionAPI = {
  create: async (data: SessionCreate): Promise<Session> => {
    return apiFetch('/api/reviewarcade/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  list: async (limit: number = 20): Promise<Session[]> => {
    return apiFetch(`/api/reviewarcade/sessions?limit=${limit}`);
  },

  /** Public -- students check session before joining */
  getByCode: async (code: string): Promise<SessionPreview> => {
    return apiFetch(`/api/reviewarcade/sessions/${code}`);
  },

  /** Get post-game results (teacher only) */
  getResults: async (sessionId: string): Promise<Record<string, unknown>> => {
    return apiFetch(`/api/reviewarcade/sessions/${sessionId}/results`);
  },
};

// ========================================
// Player API (public, no auth)
// ========================================

export const playerAPI = {
  /** Student joins session. Returns player with player_token for WS auth. */
  join: async (code: string, name: string): Promise<Player> => {
    return apiFetch(`/api/reviewarcade/sessions/${code}/join`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  /** Teacher joins own session as player (Play Mode). Requires Clerk auth. */
  joinAsTeacher: async (code: string): Promise<Player> => {
    return apiFetch(`/api/reviewarcade/sessions/${code}/join-teacher`, {
      method: 'POST',
    });
  },
};
