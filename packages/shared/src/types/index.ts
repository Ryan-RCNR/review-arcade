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

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}
