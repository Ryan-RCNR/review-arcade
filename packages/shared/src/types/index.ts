/**
 * Review Arcade Shared Types
 */

// Session Types
export interface SessionConfig {
  games: string[];
  max_players?: number;
  time_limit_minutes?: number;
}

export interface Session {
  id: string;
  code: string;
  status: 'draft' | 'lobby' | 'active' | 'paused' | 'ended';
  config: SessionConfig;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface SessionCreate {
  config: SessionConfig;
}

export interface SessionUpdate {
  config?: SessionConfig;
  status?: Session['status'];
}

export interface SessionResponse extends Session {}

// Player Types
export interface Player {
  id: string;
  session_id: string;
  name: string;
  joined_at: string;
  is_active: boolean;
}

export interface PlayerJoin {
  name: string;
}

export interface PlayerResponse extends Player {}

export interface LeaderboardEntry {
  rank: number;
  player_id: string;
  player_name: string;
  total_score: number;
  games_played: number;
}

export interface PlayerStats {
  player_id: string;
  player_name: string;
  total_score: number;
  game_score: number;
  question_bonus: number;
  questions_answered: number;
  questions_correct: number;
  accuracy: number;
  avg_time_ms: number;
  best_streak: number;
  games_played: number;
}

// Question Types
export interface Question {
  id: string;
  question_text: string;
  options: string[];
  difficulty?: string;
  subject?: string;
}

export interface AnswerSubmit {
  player_id: string;
  question_id: string;
  answer: string;
  time_to_answer_ms?: number;
}

export interface AnswerResponse {
  is_correct: boolean;
  correct_answer?: string;
  message: string;
}

export interface QuestionStats {
  total_questions: number;
  total_correct: number;
  accuracy: number;
  avg_time_ms: number;
}

// Game Types
export interface GameScore {
  player_id: string;
  game_name: string;
  game_score: number;
  metadata?: Record<string, unknown>;
}

export interface ScoreResponse {
  score_id: string;
  player_id: string;
  player_name: string;
  game_name: string;
  game_score: number;
  question_bonus: number;
  total_score: number;
}

export type GameType =
  | 'block-drop'
  | 'space-rocks'
  | 'maze-muncher'
  | 'brick-breaker'
  | 'snake-pit'
  | 'dino-dash'
  | 'frog-crossing'
  | 'alien-invasion'
  | 'flappy-study'
  | 'rhythm-rush';

export interface GameInfo {
  id: GameType;
  name: string;
  description: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const AVAILABLE_GAMES: GameInfo[] = [
  {
    id: 'block-drop',
    name: 'Block Drop',
    description: 'Classic Tetris-style puzzle game',
    icon: '🟦',
    difficulty: 'medium',
  },
  {
    id: 'space-rocks',
    name: 'Space Rocks',
    description: 'Asteroids-inspired space shooter',
    icon: '🚀',
    difficulty: 'medium',
  },
  {
    id: 'maze-muncher',
    name: 'Maze Muncher',
    description: 'Pac-Man style maze game',
    icon: '👻',
    difficulty: 'medium',
  },
  {
    id: 'brick-breaker',
    name: 'Brick Breaker',
    description: 'Classic Breakout game',
    icon: '🧱',
    difficulty: 'easy',
  },
  {
    id: 'snake-pit',
    name: 'Snake Pit',
    description: 'Grow your snake, avoid walls',
    icon: '🐍',
    difficulty: 'easy',
  },
  {
    id: 'dino-dash',
    name: 'Dino Dash',
    description: 'Chrome Dino endless runner',
    icon: '🦖',
    difficulty: 'easy',
  },
  {
    id: 'frog-crossing',
    name: 'Frog Crossing',
    description: 'Frogger-style road crossing',
    icon: '🐸',
    difficulty: 'medium',
  },
  {
    id: 'alien-invasion',
    name: 'Alien Invasion',
    description: 'Space Invaders shooter',
    icon: '👾',
    difficulty: 'medium',
  },
  {
    id: 'flappy-study',
    name: 'Flappy Study',
    description: 'Flappy Bird style game',
    icon: '🐦',
    difficulty: 'hard',
  },
  {
    id: 'rhythm-rush',
    name: 'Rhythm Rush',
    description: 'Geometry Dash rhythm game',
    icon: '⚡',
    difficulty: 'hard',
  },
];

// WebSocket Types - Generic (deprecated, use specific message types)
export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

// Server -> Client WebSocket Messages
export interface WSLobbyUpdate {
  type: 'lobby_update';
  players: Player[];
  player_count: number;
}

export interface WSPlayerJoined {
  type: 'player_joined';
  player: Player;
  player_count: number;
}

export interface WSPlayerLeft {
  type: 'player_left';
  player_id: string;
  player_count: number;
}

export interface WSSessionStarted {
  type: 'session_started';
  current_game: GameType;
}

export interface WSGameStarted {
  type: 'game_started';
  game_type: GameType;
  time_limit_seconds: number;
}

export interface WSGameEnded {
  type: 'game_ended';
  game_type: GameType;
  leaderboard: LeaderboardEntry[];
}

export interface WSQuestionAvailable {
  type: 'question_available';
  question: Question;
}

export interface WSScoreUpdate {
  type: 'score_update';
  player_id: string;
  score: number;
  total_score: number;
}

export interface WSLeaderboardUpdate {
  type: 'leaderboard_update';
  leaderboard: LeaderboardEntry[];
}

export interface WSSessionEnded {
  type: 'session_ended';
  final_leaderboard: LeaderboardEntry[];
}

export interface WSError {
  type: 'error';
  message: string;
  code?: string;
}

// Discriminated union of all server messages
export type ServerWSMessage =
  | WSLobbyUpdate
  | WSPlayerJoined
  | WSPlayerLeft
  | WSSessionStarted
  | WSGameStarted
  | WSGameEnded
  | WSQuestionAvailable
  | WSScoreUpdate
  | WSLeaderboardUpdate
  | WSSessionEnded
  | WSError;

// Client -> Server WebSocket Messages
export interface WSClientInit {
  type: 'init';
  player_id?: string;
  session_code: string;
}

export interface WSClientAnswer {
  type: 'answer';
  question_id: string;
  answer: string;
  time_ms: number;
}

export interface WSClientGameScore {
  type: 'game_score';
  game_type: GameType;
  score: number;
}

export type ClientWSMessage = WSClientInit | WSClientAnswer | WSClientGameScore;

// Type Guards for WebSocket Messages
export function isServerWSMessage(msg: unknown): msg is ServerWSMessage {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  const validTypes = [
    'lobby_update',
    'player_joined',
    'player_left',
    'session_started',
    'game_started',
    'game_ended',
    'question_available',
    'score_update',
    'leaderboard_update',
    'session_ended',
    'error',
  ];
  return typeof m.type === 'string' && validTypes.includes(m.type);
}

export function isLobbyUpdate(msg: unknown): msg is WSLobbyUpdate {
  return isServerWSMessage(msg) && msg.type === 'lobby_update';
}

export function isPlayerJoined(msg: unknown): msg is WSPlayerJoined {
  return isServerWSMessage(msg) && msg.type === 'player_joined';
}

export function isPlayerLeft(msg: unknown): msg is WSPlayerLeft {
  return isServerWSMessage(msg) && msg.type === 'player_left';
}

export function isSessionStarted(msg: unknown): msg is WSSessionStarted {
  return isServerWSMessage(msg) && msg.type === 'session_started';
}

export function isGameStarted(msg: unknown): msg is WSGameStarted {
  return isServerWSMessage(msg) && msg.type === 'game_started';
}

export function isGameEnded(msg: unknown): msg is WSGameEnded {
  return isServerWSMessage(msg) && msg.type === 'game_ended';
}

export function isQuestionAvailable(msg: unknown): msg is WSQuestionAvailable {
  return isServerWSMessage(msg) && msg.type === 'question_available';
}

export function isScoreUpdate(msg: unknown): msg is WSScoreUpdate {
  return isServerWSMessage(msg) && msg.type === 'score_update';
}

export function isLeaderboardUpdate(msg: unknown): msg is WSLeaderboardUpdate {
  return isServerWSMessage(msg) && msg.type === 'leaderboard_update';
}

export function isSessionEnded(msg: unknown): msg is WSSessionEnded {
  return isServerWSMessage(msg) && msg.type === 'session_ended';
}

export function isWSError(msg: unknown): msg is WSError {
  return isServerWSMessage(msg) && msg.type === 'error';
}
