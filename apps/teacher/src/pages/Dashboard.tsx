/**
 * Teacher Dashboard
 *
 * Shows list of sessions with quick actions.
 * Updated for new Session type (game_type, teacher_mode, player_count).
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  sessionAPI,
  AVAILABLE_GAMES,
  type Session,
} from '@review-arcade/shared';
import {
  Plus,
  Monitor,
  BarChart3,
  Gamepad2,
  Users,
  Timer,
  RefreshCw,
} from 'lucide-react';

type FilterType = 'all' | 'active' | 'ended';

export default function Dashboard(): React.JSX.Element {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions(): Promise<void> {
    try {
      setLoading(true);
      const data = await sessionAPI.list(50);
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'active') return s.status === 'active' || s.status === 'lobby' || s.status === 'paused';
    if (filter === 'ended') return s.status === 'ended';
    return true;
  });

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30',
    lobby: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30',
    paused: 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/30',
    ended: 'bg-brand/5 text-brand/40 ring-1 ring-brand/10',
    draft: 'bg-brand/5 text-brand/30 ring-1 ring-brand/10',
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {(['all', 'active', 'ended'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-brand/10 text-brand border border-brand/20'
                    : 'text-brand/40 hover:text-brand/60 border border-transparent'
                }`}
              >
                {f === 'all' ? 'All Sessions' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={fetchSessions} className="btn-ghost p-2" title="Refresh">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => navigate('/create')}
              className="btn-ice flex items-center gap-2"
            >
              <Plus size={18} />
              New Session
            </button>
          </div>
        </div>

        {/* Content */}
        {loading && sessions.length === 0 ? (
          <div className="glass-card text-center py-16">
            <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-4" />
            <p className="text-brand/40">Loading sessions...</p>
          </div>
        ) : error ? (
          <div className="glass-card text-center py-16">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={fetchSessions} className="btn-ice">
              Try Again
            </button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="glass-card text-center py-16">
            <Gamepad2 size={48} className="text-brand/10 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No sessions yet</h3>
            <p className="text-brand/40 mb-6">Create your first session to get started!</p>
            <button onClick={() => navigate('/create')} className="btn-ice">
              Create Session
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSessions.map((session) => {
              const game = AVAILABLE_GAMES.find((g) => g.id === session.game_type);
              const isMonitorable = session.status === 'active' || session.status === 'lobby' || session.status === 'paused';

              return (
                <div key={session.id} className="glass-card p-5 hover:border-brand/20 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-2xl font-mono font-bold text-brand tracking-wider">
                        {session.code}
                      </p>
                      <p className="text-xs text-brand/30">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[session.status] || statusColors.draft}`}>
                      {session.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-brand/50">
                      <Gamepad2 size={14} />
                      <span>{game?.name || session.game_type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-brand/50">
                      <Users size={14} />
                      <span>{session.player_count} players</span>
                    </div>
                    <div className="flex items-center gap-2 text-brand/50">
                      <Timer size={14} />
                      <span>{session.config?.time_limit_minutes || 15} min</span>
                    </div>
                  </div>

                  {isMonitorable ? (
                    <button
                      onClick={() => navigate(`/monitor/${session.code}`)}
                      className="btn-ice w-full py-2 text-sm flex items-center justify-center gap-2"
                    >
                      <Monitor size={16} />
                      Monitor
                    </button>
                  ) : session.status === 'ended' ? (
                    <button
                      onClick={() => navigate(`/results/${session.id}`)}
                      className="btn-ghost w-full py-2 text-sm flex items-center justify-center gap-2"
                    >
                      <BarChart3 size={16} />
                      View Results
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
