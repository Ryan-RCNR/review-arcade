/**
 * Review Arcade Shared Constants
 *
 * Centralized constants for polling intervals, limits, and timeouts
 */

// Polling intervals (milliseconds)
export const POLLING_INTERVAL_FAST_MS = 2000; // Lobby page polling
export const POLLING_INTERVAL_NORMAL_MS = 3000; // Monitor page polling
export const POLLING_INTERVAL_SLOW_MS = 5000; // Play page polling

// API and WebSocket limits
export const DEFAULT_LEADERBOARD_LIMIT = 10;
export const MAX_LEADERBOARD_LIMIT = 50;
export const DEFAULT_SESSION_LIST_LIMIT = 20;

// API request timeout
export const API_TIMEOUT_MS = 10000;

// WebSocket reconnection
export const WS_MAX_RECONNECT_ATTEMPTS = 10;
export const WS_RECONNECT_INTERVAL_MS = 3000;
