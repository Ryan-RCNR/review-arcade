/**
 * Review Arcade Shared Types
 *
 * Aligned with backend models (2026-02-24):
 * - Single game_type per session (not games array)
 * - teacher_mode: monitor | play
 * - player_token for WS auth
 * - Streak multiplier + comeback credits
 * - Server-side answer validation via correct_index
 */

// =============================================================================
// Session
// =============================================================================

export interface Session {
  id: string;
  code: string;
  teacher_id: string;
  status: 'draft' | 'lobby' | 'active' | 'paused' | 'ended';
  game_type: GameType;
  teacher_mode: 'monitor' | 'play';
  config: SessionConfig;
  player_count: number;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface SessionConfig {
  time_limit_minutes: number;
  max_players: number;
  question_config: QuestionConfig;
}

export interface QuestionConfig {
  type: string;
  operations: string[];
  range: [number, number];
}

export interface SessionCreate {
  game_type: GameType;
  teacher_mode: 'monitor' | 'play';
  time_limit_minutes: number;
  max_players: number;
  question_source?: QuestionSource;
  question_config?: QuestionConfig;
  question_bank_ids?: string[];
}

/** Public session info returned for student join screen */
export interface SessionPreview {
  code: string;
  status: string;
  game_type: GameType;
  player_count: number;
  max_players: number;
}

// =============================================================================
// Player
// =============================================================================

export interface Player {
  id: string;
  name: string;
  session_code: string;
  player_token: string;
  is_teacher: boolean;
  joined_at: string;
}

export interface PlayerJoin {
  name: string;
}

export interface LeaderboardEntry {
  rank: number;
  player_id: string;
  player_name: string;
  total_score: number;
  is_teacher?: boolean;
  comeback_credits?: number;
  current_streak?: number;
}

// =============================================================================
// Question (sent by server after death)
// =============================================================================

export interface Question {
  question_id: string;
  question_text: string;
  options: string[];
  difficulty?: string;
}

/** Question with correct answer visible -- for teacher preview during bank creation */
export interface QuestionWithAnswer extends Question {
  correct_index: number;
  category?: string;
  id?: string;
}

export type QuestionSource = 'math' | 'custom';

// =============================================================================
// Game Types
// =============================================================================

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
  lucideIcon: string;
  difficulty: 'easy' | 'medium' | 'hard';
  controls: string;
}

export const AVAILABLE_GAMES: GameInfo[] = [
  {
    id: 'snake-pit',
    name: 'Snake Pit',
    description: 'Grow your snake, avoid walls and yourself',
    lucideIcon: 'waypoints',
    difficulty: 'easy',
    controls: 'Arrow keys or WASD',
  },
  {
    id: 'brick-breaker',
    name: 'Brick Breaker',
    description: 'Classic breakout -- destroy all bricks',
    lucideIcon: 'layout-grid',
    difficulty: 'easy',
    controls: 'Arrow keys or mouse',
  },
  {
    id: 'dino-dash',
    name: 'Dino Dash',
    description: 'Endless runner -- jump over obstacles',
    lucideIcon: 'rabbit',
    difficulty: 'easy',
    controls: 'Space or Up to jump',
  },
  {
    id: 'space-rocks',
    name: 'Space Rocks',
    description: 'Destroy asteroids, survive the void',
    lucideIcon: 'rocket',
    difficulty: 'medium',
    controls: 'Arrow keys + Space to shoot',
  },
  {
    id: 'maze-muncher',
    name: 'Maze Muncher',
    description: 'Eat dots, avoid ghosts',
    lucideIcon: 'ghost',
    difficulty: 'medium',
    controls: 'Arrow keys or WASD',
  },
  {
    id: 'frog-crossing',
    name: 'Frog Crossing',
    description: 'Cross the road and river safely',
    lucideIcon: 'move',
    difficulty: 'medium',
    controls: 'Arrow keys',
  },
  {
    id: 'alien-invasion',
    name: 'Alien Invasion',
    description: 'Defend Earth from alien waves',
    lucideIcon: 'shield',
    difficulty: 'medium',
    controls: 'Arrow keys + Space to shoot',
  },
  {
    id: 'block-drop',
    name: 'Block Drop',
    description: 'Stack and clear lines, Tetris style',
    lucideIcon: 'blocks',
    difficulty: 'medium',
    controls: 'Arrow keys, Up to rotate',
  },
  {
    id: 'flappy-study',
    name: 'Flappy Study',
    description: 'Tap to fly through gaps',
    lucideIcon: 'bird',
    difficulty: 'hard',
    controls: 'Space or click to flap',
  },
  {
    id: 'rhythm-rush',
    name: 'Rhythm Rush',
    description: 'Jump and slide to the beat',
    lucideIcon: 'zap',
    difficulty: 'hard',
    controls: 'Space to jump, Down to duck',
  },
];

// =============================================================================
// Awards
// =============================================================================

export interface Award {
  player_id: string;
  player_name: string;
  award_key: string;
  award_name: string;
  award_value: string;
  icon: string;
}

// =============================================================================
// GameBridge -- Interface between React and vanilla game engines
// =============================================================================

export interface GameBridgeCallbacks {
  /** Player died in the game. Score is the run score before death. */
  onDeath: (score: number, metadata?: Record<string, unknown>) => void;
  /** Player triggered a special event (tetris, combo, etc.) */
  onSpecialEvent: (event: { type: string; [key: string]: unknown }) => void;
  /** Live score update (informational, for host display) */
  onScoreUpdate: (score: number) => void;
}

export interface GameBridge {
  /** Mount the game to a canvas element */
  mount(canvas: HTMLCanvasElement, callbacks: GameBridgeCallbacks): void;
  /** Start or resume gameplay */
  start(): void;
  /** Pause gameplay (question modal open) */
  pause(): void;
  /** Resume after answering question */
  resume(comebackStartScore: number): void;
  /** Clean up resources */
  destroy(): void;
  /** Resize the canvas (window resize) */
  resize(width: number, height: number): void;
}

// =============================================================================
// WebSocket Messages -- Server -> Client
// =============================================================================

export interface WSHostState {
  type: 'host_state';
  status: string;
  game_type: GameType;
  teacher_mode: string;
  players: Array<{
    player_id: string;
    display_name: string;
    is_teacher: boolean;
    connected: boolean;
  }>;
  leaderboard: LeaderboardEntry[];
  player_count: number;
  timer_end?: number;
}

export interface WSPlayerState {
  type: 'player_state';
  player_id: string;
  display_name: string;
  is_teacher: boolean;
  status: string;
  game_type: GameType | null;
  total_score: number;
  rank: number;
  comeback_credits: number;
  current_streak: number;
  streak_multiplier: number;
  timer_end?: number;
}

export interface WSPlayerConnected {
  type: 'player_connected';
  player_id: string;
  display_name: string;
  is_teacher: boolean;
  player_count: number;
}

export interface WSPlayerDisconnected {
  type: 'player_disconnected';
  player_id: string;
  player_count: number;
}

export interface WSSessionStarted {
  type: 'session_started';
  game_type: GameType;
  time_limit_seconds: number;
}

export interface WSSessionPaused {
  type: 'session_paused';
}

export interface WSSessionResumed {
  type: 'session_resumed';
  remaining_seconds: number;
}

export interface WSSessionEnded {
  type: 'session_ended';
  final_leaderboard: LeaderboardEntry[];
  awards: Award[];
}

export interface WSQuestion {
  type: 'question';
  question: Question;
  death_score: number;
  effective_score: number;
  multiplier: number;
  comeback_credits: number;
  total_score: number;
}

export interface WSAnswerCorrect {
  type: 'answer_correct';
  bonus_earned: number;
  total_score: number;
  current_streak: number;
  streak_multiplier: number;
  comeback_credits: number;
  comeback_start_score: number;
  respawn: true;
}

export interface WSAnswerWrong {
  type: 'answer_wrong';
  correct_index: number;
  respawn: false;
}

export interface WSLeaderboardUpdate {
  type: 'leaderboard_update';
  leaderboard?: LeaderboardEntry[];
  top_5?: LeaderboardEntry[];
  your_rank?: number;
  your_score?: number;
  total_players?: number;
}

export interface WSLiveEvent {
  type: 'live_event';
  player_id: string;
  player_name: string;
  event: Record<string, unknown>;
}

export interface WSPlayerScoreUpdate {
  type: 'player_score_update';
  player_id: string;
  live_score: number;
}

export interface WSPing {
  type: 'ping';
  t: number;
}

export interface WSError {
  type: 'error';
  message: string;
}

export type ServerWSMessage =
  | WSHostState
  | WSPlayerState
  | WSPlayerConnected
  | WSPlayerDisconnected
  | WSSessionStarted
  | WSSessionPaused
  | WSSessionResumed
  | WSSessionEnded
  | WSQuestion
  | WSAnswerCorrect
  | WSAnswerWrong
  | WSLeaderboardUpdate
  | WSLiveEvent
  | WSPlayerScoreUpdate
  | WSPing
  | WSError;

// =============================================================================
// WebSocket Messages -- Client -> Server
// =============================================================================

export interface WSClientInitHost {
  type: 'init';
  role: 'host';
  token: string;
}

export interface WSClientInitPlayer {
  type: 'init';
  role: 'player';
  player_id: string;
  player_token: string;
}

export interface WSClientDeath {
  type: 'death';
  score: number;
  metadata?: Record<string, unknown>;
}

export interface WSClientAnswer {
  type: 'answer';
  question_id: string;
  answer_index: number;
  time_ms: number;
}

export interface WSClientScoreUpdate {
  type: 'score_update';
  score: number;
}

export interface WSClientSpecialEvent {
  type: 'special_event';
  event: { type: string; [key: string]: unknown };
}

export interface WSClientStartSession {
  type: 'start_session';
}

export interface WSClientPauseSession {
  type: 'pause_session';
}

export interface WSClientResumeSession {
  type: 'resume_session';
}

export interface WSClientEndSession {
  type: 'end_session';
}

export interface WSClientPong {
  type: 'pong';
}

export type ClientWSMessage =
  | WSClientInitHost
  | WSClientInitPlayer
  | WSClientDeath
  | WSClientAnswer
  | WSClientScoreUpdate
  | WSClientSpecialEvent
  | WSClientStartSession
  | WSClientPauseSession
  | WSClientResumeSession
  | WSClientEndSession
  | WSClientPong;

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export function isServerWSMessage(msg: unknown): msg is ServerWSMessage {
  if (!msg || typeof msg !== 'object') return false;
  return typeof (msg as Record<string, unknown>).type === 'string';
}
