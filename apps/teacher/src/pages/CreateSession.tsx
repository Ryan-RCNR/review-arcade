/**
 * Teacher Create Session Page
 *
 * Pick ONE game, choose monitor/play mode, configure settings.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionAPI, AVAILABLE_GAMES, type GameType } from '@review-arcade/shared';
import {
  Gamepad2,
  Monitor,
  Play,
  ArrowLeft,
  Users,
  Timer,
  ChevronRight,
} from 'lucide-react';

export default function CreateSession(): React.JSX.Element {
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [teacherMode, setTeacherMode] = useState<'monitor' | 'play'>('monitor');
  const [maxPlayers, setMaxPlayers] = useState(30);
  const [timeLimit, setTimeLimit] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');

    if (!selectedGame) {
      setError('Please select a game');
      return;
    }

    setLoading(true);

    try {
      const session = await sessionAPI.create({
        game_type: selectedGame,
        teacher_mode: teacherMode,
        time_limit_minutes: timeLimit,
        max_players: maxPlayers,
      });
      navigate(`/monitor/${session.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      setLoading(false);
    }
  }

  const gameInfo = selectedGame
    ? AVAILABLE_GAMES.find((g) => g.id === selectedGame)
    : null;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Create Session</h2>
            <p className="text-brand/50 text-sm">Pick a game and configure your session</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-ghost text-sm flex items-center gap-1.5"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Game Selection */}
          <div className="glass-card p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Gamepad2 size={20} className="text-brand" />
              Choose Your Game
            </h3>
            <p className="text-brand/40 text-sm mb-4">
              One game per session -- the whole class competes on the same leaderboard
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {AVAILABLE_GAMES.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelectedGame(game.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-center group ${
                    selectedGame === game.id
                      ? 'border-brand bg-brand/10 text-white'
                      : 'border-brand/10 bg-surface-light hover:border-brand/30 text-brand/60'
                  }`}
                >
                  <div className="text-2xl mb-2 font-bold text-brand/80 group-hover:text-brand">
                    {game.name.charAt(0)}
                  </div>
                  <p className="text-xs font-medium truncate">{game.name}</p>
                  <p className="text-[10px] text-brand/30 mt-0.5 capitalize">{game.difficulty}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Teacher Mode */}
          <div className="glass-card p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Monitor size={20} className="text-brand" />
              Your Role
            </h3>
            <p className="text-brand/40 text-sm mb-4">
              Monitor from the projector or compete against your students
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTeacherMode('monitor')}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  teacherMode === 'monitor'
                    ? 'border-brand bg-brand/10'
                    : 'border-brand/10 hover:border-brand/30'
                }`}
              >
                <Monitor
                  size={24}
                  className={teacherMode === 'monitor' ? 'text-brand mb-2' : 'text-brand/40 mb-2'}
                />
                <p className="text-white font-medium">Monitor Mode</p>
                <p className="text-brand/40 text-xs mt-1">
                  Projector shows live leaderboard and player activity
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTeacherMode('play')}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  teacherMode === 'play'
                    ? 'border-brand bg-brand/10'
                    : 'border-brand/10 hover:border-brand/30'
                }`}
              >
                <Play
                  size={24}
                  className={teacherMode === 'play' ? 'text-brand mb-2' : 'text-brand/40 mb-2'}
                />
                <p className="text-white font-medium">Play Mode</p>
                <p className="text-brand/40 text-xs mt-1">
                  Compete alongside your students on the leaderboard
                </p>
              </button>
            </div>
          </div>

          {/* Step 3: Settings */}
          <div className="glass-card p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Timer size={20} className="text-brand" />
              Settings
            </h3>

            <div className="space-y-6">
              <div>
                <label className="flex items-center justify-between text-sm text-brand/70 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} />
                    Max Players
                  </span>
                  <span className="text-white font-medium">{maxPlayers}</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                  className="w-full accent-brand"
                />
                <div className="flex justify-between text-xs text-brand/30 mt-1">
                  <span>5</span>
                  <span>100</span>
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between text-sm text-brand/70 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Timer size={14} />
                    Time Limit
                  </span>
                  <span className="text-white font-medium">{timeLimit} min</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                  className="w-full accent-brand"
                />
                <div className="flex justify-between text-xs text-brand/30 mt-1">
                  <span>5 min</span>
                  <span>60 min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary + Submit */}
          <div className="glass-card p-6 border-brand/20 mb-6">
            <h3 className="text-white font-semibold mb-3">Session Summary</h3>
            <div className="space-y-1.5 text-sm">
              <p className="text-brand/60">
                <span className="text-brand/40">Game:</span>{' '}
                <span className="text-white">{gameInfo?.name || 'None selected'}</span>
              </p>
              <p className="text-brand/60">
                <span className="text-brand/40">Mode:</span>{' '}
                <span className="text-white capitalize">{teacherMode}</span>
              </p>
              <p className="text-brand/60">
                <span className="text-brand/40">Players:</span>{' '}
                <span className="text-white">Up to {maxPlayers}</span>
              </p>
              <p className="text-brand/60">
                <span className="text-brand/40">Duration:</span>{' '}
                <span className="text-white">{timeLimit} minutes</span>
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-ghost flex-1 py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedGame}
              className="btn-ice flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Session'}
              {!loading && <ChevronRight size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
