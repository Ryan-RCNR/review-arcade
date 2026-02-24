/**
 * Student Results Page
 *
 * GoldenEye-style awards ceremony with one-at-a-time reveal.
 * Shows: final rank, personal stats, award cards with staggered animation.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  AVAILABLE_GAMES,
  type LeaderboardEntry,
  type Award,
  type GameType,
} from '@review-arcade/shared';
import {
  Trophy,
  Medal,
  Crown,
  Star,
  Zap,
  Target,
  Flame,
  Brain,
  Timer,
  TrendingUp,
  Sparkles,
  Gamepad2,
  GraduationCap,
  ArrowLeft,
} from 'lucide-react';

interface ResultsState {
  leaderboard: LeaderboardEntry[];
  awards: Award[];
  playerId: string;
  playerName: string;
  gameType: GameType;
}

// Map award icon strings to Lucide components
const AWARD_ICONS: Record<string, React.ElementType> = {
  trophy: Trophy,
  medal: Medal,
  crown: Crown,
  star: Star,
  zap: Zap,
  target: Target,
  flame: Flame,
  brain: Brain,
  timer: Timer,
  trending_up: TrendingUp,
  sparkles: Sparkles,
  gamepad: Gamepad2,
};

// Award card reveal timing (ms)
const REVEAL_DELAY = 600;
const INITIAL_DELAY = 1200;

export default function Results() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ResultsState | null;

  const [revealedCount, setRevealedCount] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Redirect if no state (direct URL access)
  useEffect(() => {
    if (!state) {
      navigate('/join');
    }
  }, [state, navigate]);

  // Get player's awards
  const myAwards = useMemo(() => {
    if (!state) return [];
    return state.awards.filter((a) => a.player_id === state.playerId);
  }, [state]);

  // Staggered reveal animation
  useEffect(() => {
    if (!state || myAwards.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Reveal awards one by one
    for (let i = 0; i <= myAwards.length; i++) {
      timers.push(
        setTimeout(() => {
          setRevealedCount(i + 1);
        }, INITIAL_DELAY + i * REVEAL_DELAY),
      );
    }

    // Show leaderboard after all awards revealed
    timers.push(
      setTimeout(() => {
        setShowLeaderboard(true);
      }, INITIAL_DELAY + myAwards.length * REVEAL_DELAY + 400),
    );

    return () => timers.forEach(clearTimeout);
  }, [myAwards.length, state]);

  if (!state) return null;

  const { leaderboard, playerId, playerName, gameType } = state;
  const gameInfo = AVAILABLE_GAMES.find((g) => g.id === gameType);
  const myEntry = leaderboard.find((e) => e.player_id === playerId);
  const myRank = myEntry?.rank ?? leaderboard.length;
  const myScore = myEntry?.total_score ?? 0;

  return (
    <div className="min-h-screen bg-midnight text-white overflow-y-auto">
      {/* Header */}
      <div className="text-center pt-8 pb-4 px-4">
        <p className="text-brand/40 text-sm uppercase tracking-wider mb-2">
          {gameInfo?.name || gameType} -- Session {code}
        </p>
        <h1 className="text-4xl font-bold text-white mb-1 animate-fade-in">
          Game Over
        </h1>
      </div>

      {/* Personal stats banner */}
      <div className="max-w-2xl mx-auto px-4 mb-8">
        <div className="glass-card p-6 text-center animate-fade-in">
          <p className="text-brand/50 text-sm mb-1">Your Result</p>
          <p className="text-2xl font-bold text-white mb-3">{playerName}</p>
          <div className="flex items-center justify-center gap-8">
            <div>
              <p className="text-brand/40 text-xs uppercase tracking-wider">Rank</p>
              <p className="text-3xl font-bold text-brand tabular-nums">
                #{myRank}
              </p>
            </div>
            <div className="w-px h-10 bg-brand/10" />
            <div>
              <p className="text-brand/40 text-xs uppercase tracking-wider">Score</p>
              <p className="text-3xl font-bold text-white tabular-nums">
                {myScore.toLocaleString()}
              </p>
            </div>
            {myEntry?.current_streak && myEntry.current_streak > 0 && (
              <>
                <div className="w-px h-10 bg-brand/10" />
                <div>
                  <p className="text-brand/40 text-xs uppercase tracking-wider">Best Streak</p>
                  <p className="text-3xl font-bold text-amber-400 tabular-nums">
                    {myEntry.current_streak}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Awards ceremony */}
      {myAwards.length > 0 && (
        <div className="max-w-2xl mx-auto px-4 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 justify-center">
            <Star size={18} className="text-amber-400" />
            Your Awards
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myAwards.map((award, index) => {
              const isRevealed = index < revealedCount;
              const IconComp = AWARD_ICONS[award.icon] || Trophy;

              return (
                <div
                  key={award.award_key}
                  className={`glass-card p-4 flex items-center gap-4 transition-all duration-500 ${
                    isRevealed
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-4 scale-95'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <IconComp size={24} className="text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      {award.award_name}
                    </p>
                    <p className="text-brand/50 text-xs truncate">
                      {award.award_value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No awards fallback */}
      {myAwards.length === 0 && (
        <div className="max-w-2xl mx-auto px-4 mb-8 text-center">
          <div className="glass-card p-8">
            <Gamepad2 size={48} className="text-brand/20 mx-auto mb-3" />
            <p className="text-brand/40">Great effort! Keep playing to earn awards.</p>
          </div>
        </div>
      )}

      {/* Final leaderboard */}
      <div
        className={`max-w-2xl mx-auto px-4 pb-8 transition-all duration-500 ${
          showLeaderboard || myAwards.length === 0
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4'
        }`}
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 justify-center">
          <Trophy size={18} className="text-amber-400" />
          Final Standings
        </h2>
        <div className="glass-card p-4 space-y-2">
          {leaderboard.map((entry, index) => {
            const isMe = entry.player_id === playerId;
            return (
              <div
                key={entry.player_id}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                  isMe
                    ? 'bg-brand/10 border border-brand/20'
                    : index === 0
                      ? 'bg-amber-500/10 border border-amber-500/15'
                      : index === 1
                        ? 'bg-brand/5 border border-brand/10'
                        : index === 2
                          ? 'bg-orange-500/5 border border-orange-500/10'
                          : 'bg-surface-light border border-transparent'
                }`}
              >
                <div className="w-8 text-center shrink-0">
                  {index === 0 ? (
                    <Crown size={20} className="text-amber-400 mx-auto" />
                  ) : (
                    <span className="text-brand/40 font-bold">{entry.rank}</span>
                  )}
                </div>
                <span className="text-white font-medium flex-1 truncate">
                  {entry.player_name}
                  {isMe && (
                    <span className="text-brand/50 text-xs ml-1.5">(You)</span>
                  )}
                  {entry.is_teacher && (
                    <GraduationCap size={12} className="inline ml-1.5 text-amber-400" />
                  )}
                </span>
                <span className="text-white font-mono font-bold tabular-nums shrink-0">
                  {entry.total_score.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Play again */}
      <div className="max-w-2xl mx-auto px-4 pb-12 text-center">
        <button
          onClick={() => navigate('/join')}
          className="btn-ice px-8 py-3 inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Join Another Session
        </button>
      </div>
    </div>
  );
}
