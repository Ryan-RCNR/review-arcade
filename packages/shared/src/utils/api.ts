/**
 * Review Arcade API Client
 *
 * Shared API client for backend communication
 */

import type {
  Session,
  SessionConfig,
  Player,
  Question,
  AnswerResponse,
  LeaderboardEntry,
  PlayerStats,
  ScoreResponse,
} from '../types';

// Get API URL - apps will provide this via env
const getApiUrl = () =>
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Default request timeout in milliseconds
const DEFAULT_TIMEOUT_MS = 10000;

// Generic fetch wrapper
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

  // Add auth token if available (teacher routes)
  const token = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('clerk_token')
    : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set up timeout with AbortController
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
      // Try to parse JSON error, fallback to text, then generic message
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
// Session API
// ========================================

export const sessionAPI = {
  // Create new session (teacher only, requires Clerk auth)
  create: async (config: SessionConfig): Promise<Session> => {
    return apiFetch('/api/reviewarcade/sessions', {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
  },

  // Get session by code (public)
  getByCode: async (code: string): Promise<Session> => {
    return apiFetch(`/api/reviewarcade/sessions/${code}`);
  },

  // Start session (teacher only)
  start: async (sessionId: string): Promise<Session> => {
    return apiFetch(`/api/reviewarcade/sessions/${sessionId}/start`, {
      method: 'POST',
    });
  },

  // Pause session (teacher only)
  pause: async (sessionId: string): Promise<Session> => {
    return apiFetch(`/api/reviewarcade/sessions/${sessionId}/pause`, {
      method: 'POST',
    });
  },

  // End session (teacher only)
  end: async (sessionId: string): Promise<Session> => {
    return apiFetch(`/api/reviewarcade/sessions/${sessionId}/end`, {
      method: 'POST',
    });
  },

  // List sessions (teacher only)
  list: async (limit: number = 20): Promise<Session[]> => {
    return apiFetch(`/api/reviewarcade/sessions?limit=${limit}`);
  },
};

// ========================================
// Player API
// ========================================

export const playerAPI = {
  // Join session (student, no auth)
  join: async (code: string, name: string): Promise<Player> => {
    return apiFetch(`/api/reviewarcade/sessions/${code}/join`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  // List players in session (public)
  list: async (code: string): Promise<Player[]> => {
    return apiFetch(`/api/reviewarcade/sessions/${code}/players`);
  },

  // Get player details (public)
  get: async (playerId: string): Promise<Player> => {
    return apiFetch(`/api/reviewarcade/sessions/player/${playerId}`);
  },
};

// ========================================
// Question API
// ========================================

export const questionAPI = {
  // Get next question (student)
  getNext: async (code: string, playerId: string): Promise<Question> => {
    return apiFetch(`/api/reviewarcade/sessions/${code}/question?player_id=${playerId}`);
  },

  // Submit answer (student)
  submitAnswer: async (
    code: string,
    data: {
      player_id: string;
      question_id: string;
      answer: string;
      time_to_answer_ms?: number;
    }
  ): Promise<AnswerResponse> => {
    return apiFetch(`/api/reviewarcade/sessions/${code}/answer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ========================================
// Score API
// ========================================

export const scoreAPI = {
  // Submit game score (student)
  submit: async (
    code: string,
    data: {
      player_id: string;
      game_name: string;
      game_score: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<ScoreResponse> => {
    return apiFetch(`/api/reviewarcade/sessions/${code}/score`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get leaderboard (public)
  getLeaderboard: async (code: string, limit: number = 50): Promise<LeaderboardEntry[]> => {
    return apiFetch(`/api/reviewarcade/sessions/${code}/leaderboard?limit=${limit}`);
  },

  // Get player stats (public)
  getPlayerStats: async (code: string, playerId: string): Promise<PlayerStats> => {
    return apiFetch(`/api/reviewarcade/sessions/${code}/player/${playerId}/stats`);
  },
};
