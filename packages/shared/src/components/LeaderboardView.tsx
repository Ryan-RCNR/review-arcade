/**
 * LeaderboardView Component
 *
 * Displays a ranked list of players with their scores
 */

import type { LeaderboardEntry } from '../types';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  currentPlayerId?: string | null;
  limit?: number;
  emptyMessage?: string;
  className?: string;
}

export function LeaderboardView({
  entries,
  currentPlayerId,
  limit,
  emptyMessage = 'No scores yet',
  className = '',
}: LeaderboardViewProps) {
  const displayEntries = limit ? entries.slice(0, limit) : entries;

  return (
    <div className={`bg-gray-800 rounded-xl p-4 border border-gray-700 ${className}`}>
      <h3 className="text-lg font-bold mb-4 text-white">Leaderboard</h3>
      <div className="space-y-2">
        {displayEntries.map((entry, index) => (
          <div
            key={entry.player_id}
            className={`flex items-center justify-between p-2 rounded ${
              entry.player_id === currentPlayerId
                ? 'bg-primary/20 border border-primary/50'
                : index < 3
                  ? 'bg-gray-700/50'
                  : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold w-6 text-center text-white" aria-label={`Rank ${entry.rank}`}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : entry.rank}
              </span>
              <span className="truncate max-w-[100px] text-white">
                {entry.player_name}
                {entry.player_id === currentPlayerId && ' (You)'}
              </span>
            </div>
            <span className="font-mono text-sm text-white">{entry.total_score}</span>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-gray-500 text-center py-4 text-sm">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}
