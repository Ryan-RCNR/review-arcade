/**
 * Leaderboard Sidebar Component
 *
 * Shows leaderboard with player rankings
 */

import type { LeaderboardEntry } from '@review-arcade/shared';

interface LeaderboardSidebarProps {
  entries: LeaderboardEntry[];
  currentPlayerId: string | null;
}

export function LeaderboardSidebar({ entries, currentPlayerId }: LeaderboardSidebarProps) {
  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <h3 className="text-lg font-bold mb-4">Leaderboard</h3>
      <div className="space-y-2">
        {entries.map((entry, index) => {
          const isCurrentPlayer = entry.player_id === currentPlayerId;
          const medal = getMedal(index);

          return (
            <div
              key={entry.player_id}
              className={`flex items-center justify-between p-2 rounded ${
                isCurrentPlayer
                  ? 'bg-primary/20 border border-primary/50'
                  : index < 3
                  ? 'bg-gray-700/50'
                  : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold w-6 text-center">
                  {medal || entry.rank}
                </span>
                <span className="truncate max-w-[100px]">
                  {entry.player_name}
                  {isCurrentPlayer && ' (You)'}
                </span>
              </div>
              <span className="font-mono text-sm">{entry.total_score}</span>
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="text-gray-500 text-center py-4 text-sm">
            No scores yet
          </p>
        )}
      </div>
    </div>
  );
}
