/**
 * Teacher Monitor Page
 *
 * Real-time session monitoring via WebSocket.
 * Shows: join code, player list, live leaderboard, session controls.
 * Host connects with Clerk JWT for authentication.
 */

import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useWebSocket,
  getClerkToken,
  AVAILABLE_GAMES,
  type ServerWSMessage,
  type LeaderboardEntry,
} from '@review-arcade/shared';
import {
  Play,
  Pause,
  Square,
  Users,
  Trophy,
  ArrowLeft,
  Wifi,
  WifiOff,
  Crown,
  GraduationCap,
} from 'lucide-react';

interface PlayerInfo {
  player_id: string;
  display_name: string;
  is_teacher: boolean;
  connected: boolean;
}

export default function Monitor(): React.JSX.Element {
  const { id: sessionCode } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<string>('lobby');
  const [gameType, setGameType] = useState<string>('');
  const [teacherMode, setTeacherMode] = useState<string>('monitor');
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isConnected, send } = useWebSocket<ServerWSMessage>({
    sessionCode: sessionCode || '',
    enabled: !!sessionCode,
    onOpen: () => {
      const token = getClerkToken();
      if (token) {
        send({ type: 'init', role: 'host', token });
      }
    },
    onMessage: (msg) => {
      switch (msg.type) {
        case 'host_state': {
          setStatus(msg.status);
          setGameType(msg.game_type);
          setTeacherMode(msg.teacher_mode);
          setPlayers(msg.players);
          setLeaderboard(msg.leaderboard);
          setPlayerCount(msg.player_count);
          setTimerEnd(msg.timer_end ?? null);
          setInitialized(true);
          break;
        }

        case 'player_connected': {
          setPlayers((prev) => {
            const exists = prev.find((p) => p.player_id === msg.player_id);
            if (exists) {
              return prev.map((p) =>
                p.player_id === msg.player_id ? { ...p, connected: true } : p,
              );
            }
            return [
              ...prev,
              {
                player_id: msg.player_id,
                display_name: msg.display_name,
                is_teacher: msg.is_teacher,
                connected: true,
              },
            ];
          });
          setPlayerCount(msg.player_count);
          break;
        }

        case 'player_disconnected': {
          setPlayers((prev) =>
            prev.map((p) =>
              p.player_id === msg.player_id ? { ...p, connected: false } : p,
            ),
          );
          setPlayerCount(msg.player_count);
          break;
        }

        case 'session_started': {
          setStatus('active');
          setGameType(msg.game_type);
          break;
        }

        case 'session_paused': {
          setStatus('paused');
          break;
        }

        case 'session_resumed': {
          setStatus('active');
          break;
        }

        case 'session_ended': {
          setStatus('ended');
          setLeaderboard(msg.final_leaderboard);
          break;
        }

        case 'leaderboard_update': {
          if (msg.leaderboard) {
            setLeaderboard(msg.leaderboard);
          }
          break;
        }

        case 'ping': {
          send({ type: 'pong' });
          break;
        }

        case 'error': {
          setError(msg.message);
          break;
        }
      }
    },
  });

  const handleStart = useCallback(() => {
    send({ type: 'start_session' });
  }, [send]);

  const handlePause = useCallback(() => {
    send({ type: 'pause_session' });
  }, [send]);

  const handleResume = useCallback(() => {
    send({ type: 'resume_session' });
  }, [send]);

  const handleEnd = useCallback(() => {
    if (confirm('End this session? This cannot be undone.')) {
      send({ type: 'end_session' });
    }
  }, [send]);

  const gameInfo = AVAILABLE_GAMES.find((g) => g.id === gameType);
  const connectedCount = players.filter((p) => p.connected).length;

  // Timer display
  const getTimeRemaining = () => {
    if (!timerEnd) return null;
    const remaining = Math.max(0, timerEnd - Date.now() / 1000);
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-4" />
          <p className="text-brand/50">Connecting to session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      {/* Top bar */}
      <div className="bg-surface border-b border-brand/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-brand/40 text-xs uppercase tracking-wider">Session Code</p>
              <p className="text-3xl font-mono font-bold text-brand tracking-widest">
                {sessionCode}
              </p>
            </div>
            <div className="border-l border-brand/10 pl-6">
              <p className="text-brand/40 text-xs">Game</p>
              <p className="text-white font-medium">{gameInfo?.name || gameType}</p>
            </div>
            <div className="border-l border-brand/10 pl-6">
              <p className="text-brand/40 text-xs">Status</p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    status === 'active'
                      ? 'bg-emerald-400'
                      : status === 'paused'
                        ? 'bg-amber-400'
                        : status === 'ended'
                          ? 'bg-red-400'
                          : 'bg-brand/40'
                  }`}
                />
                <span className="text-white font-medium capitalize">{status}</span>
              </div>
            </div>
            {timerEnd && status === 'active' && (
              <div className="border-l border-brand/10 pl-6">
                <p className="text-brand/40 text-xs">Time Left</p>
                <p className="text-white font-mono font-bold">{getTimeRemaining()}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isConnected ? (
              <Wifi size={16} className="text-emerald-400" />
            ) : (
              <WifiOff size={16} className="text-red-400" />
            )}
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-ghost text-sm flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              Dashboard
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls + Players */}
        <div className="space-y-6">
          {/* Controls */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              Controls
            </h2>
            <div className="space-y-3">
              {status === 'lobby' && (
                <button
                  onClick={handleStart}
                  className="btn-ice w-full py-3 flex items-center justify-center gap-2"
                >
                  <Play size={18} />
                  Start Session
                </button>
              )}
              {status === 'active' && (
                <>
                  <button
                    onClick={handlePause}
                    className="btn-amber w-full py-2.5 flex items-center justify-center gap-2"
                  >
                    <Pause size={18} />
                    Pause
                  </button>
                  <button
                    onClick={handleEnd}
                    className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 w-full py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Square size={18} />
                    End Session
                  </button>
                </>
              )}
              {status === 'paused' && (
                <>
                  <button
                    onClick={handleResume}
                    className="btn-ice w-full py-2.5 flex items-center justify-center gap-2"
                  >
                    <Play size={18} />
                    Resume
                  </button>
                  <button
                    onClick={handleEnd}
                    className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 w-full py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Square size={18} />
                    End Session
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Players */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users size={18} className="text-brand" />
              Players ({connectedCount}/{playerCount})
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {players.map((player) => (
                <div
                  key={player.player_id}
                  className="flex items-center gap-3 bg-surface-light rounded-lg p-3"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      player.connected ? 'bg-emerald-400' : 'bg-brand/20'
                    }`}
                  />
                  <span className="text-white text-sm flex-1 truncate">
                    {player.display_name}
                  </span>
                  {player.is_teacher && (
                    <GraduationCap size={14} className="text-amber-400" />
                  )}
                </div>
              ))}
              {players.length === 0 && (
                <p className="text-brand/30 text-center py-6 text-sm">
                  Waiting for students to join...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Leaderboard (takes 2 columns) */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            Leaderboard
          </h2>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={48} className="text-brand/10 mx-auto mb-3" />
              <p className="text-brand/30">
                {status === 'lobby'
                  ? 'Scores will appear once the session starts'
                  : 'No scores yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.player_id}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    index === 0
                      ? 'bg-amber-500/10 border border-amber-500/20'
                      : index === 1
                        ? 'bg-brand/5 border border-brand/10'
                        : index === 2
                          ? 'bg-orange-500/5 border border-orange-500/10'
                          : 'bg-surface-light border border-brand/5'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center">
                    {index === 0 ? (
                      <Crown size={20} className="text-amber-400 mx-auto" />
                    ) : (
                      <span className="text-brand/40 font-bold">{entry.rank}</span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1">
                    <span className="text-white font-medium">{entry.player_name}</span>
                    {entry.is_teacher && (
                      <GraduationCap size={12} className="inline ml-1.5 text-amber-400" />
                    )}
                  </div>

                  {/* Streak */}
                  {entry.current_streak && entry.current_streak > 0 && (
                    <span className="text-amber-400/60 text-xs">
                      {entry.current_streak}x streak
                    </span>
                  )}

                  {/* Score */}
                  <span className="text-white font-mono font-bold tabular-nums">
                    {entry.total_score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
