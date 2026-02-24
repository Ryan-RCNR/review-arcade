/**
 * Student Lobby Page
 *
 * Waiting room -- polls for session status, shows player list.
 * When session becomes active, navigates to Play.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  sessionAPI,
  getSessionMetadata,
  AVAILABLE_GAMES,
  POLLING_INTERVAL_FAST_MS,
  type SessionPreview,
  type GameType,
} from '@review-arcade/shared';

export default function Lobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const metadata = getSessionMetadata();
  const playerName = metadata?.playerName || 'You';

  useEffect(() => {
    if (!code) return;

    const fetchData = async () => {
      try {
        const data = await sessionAPI.getByCode(code);
        setSession(data);
        setLoading(false);

        if (data.status === 'active') {
          navigate(`/play/${code}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, POLLING_INTERVAL_FAST_MS);
    return () => clearInterval(interval);
  }, [code, navigate]);

  // Redirect if no credentials
  useEffect(() => {
    if (!metadata) {
      navigate('/join');
    }
  }, [metadata, navigate]);

  const gameInfo = session
    ? AVAILABLE_GAMES.find((g) => g.id === session.game_type)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-4" />
          <p className="text-brand/50">Loading lobby...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
        <div className="glass-card max-w-md text-center p-8">
          <p className="text-red-400 font-medium mb-4">{error || 'Session not found'}</p>
          <a href="/join" className="btn-ice inline-block px-6 py-2">
            Join Another Session
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight p-4">
      <div className="max-w-xl mx-auto py-8">
        {/* Header */}
        <div className="glass-card text-center p-8 mb-6">
          <h1 className="text-3xl font-bold text-white mb-3">Review Arcade</h1>
          <p className="text-brand/50 mb-1">Session Code</p>
          <p className="text-4xl font-mono font-bold text-brand tracking-widest mb-6">
            {code}
          </p>

          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-5 py-2.5 rounded-xl">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="font-medium">Waiting for teacher to start...</span>
          </div>
        </div>

        {/* Game info */}
        {gameInfo && (
          <div className="glass-card p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">Today's Game</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand text-xl font-bold">
                {gameInfo.name.charAt(0)}
              </div>
              <div>
                <p className="text-white font-medium">{gameInfo.name}</p>
                <p className="text-brand/40 text-sm">{gameInfo.description}</p>
                <p className="text-brand/30 text-xs mt-1">Controls: {gameInfo.controls}</p>
              </div>
            </div>
          </div>
        )}

        {/* Player count + your name */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-brand/50 text-sm">Your Name</p>
              <p className="text-white font-medium">{playerName}</p>
            </div>
            <div className="text-right">
              <p className="text-brand/50 text-sm">Players</p>
              <p className="text-white font-bold text-2xl tabular-nums">
                {session.player_count}
                <span className="text-brand/30 text-sm font-normal">
                  /{session.max_players}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="glass-card p-6 border-brand/10">
          <h3 className="text-white font-semibold mb-3">How to Play</h3>
          <ul className="text-brand/50 text-sm space-y-2">
            <li className="flex gap-2">
              <span className="text-brand/30">1.</span>
              Play the arcade game to earn points
            </li>
            <li className="flex gap-2">
              <span className="text-brand/30">2.</span>
              When you die, answer a review question to respawn
            </li>
            <li className="flex gap-2">
              <span className="text-brand/30">3.</span>
              Correct answers build your streak multiplier (up to 2x)
            </li>
            <li className="flex gap-2">
              <span className="text-brand/30">4.</span>
              Comeback credits give you a head start when you respawn
            </li>
            <li className="flex gap-2">
              <span className="text-brand/30">5.</span>
              Compete for the top of the leaderboard!
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
