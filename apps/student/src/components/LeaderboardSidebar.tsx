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

const MEDALS = ['🥇', '🥈', '🥉'] as const;

function getEntryStyle(isCurrentPlayer: boolean, index: number): string {
  if (isCurrentPlayer) {
    return 'bg-primary/20 border border-primary/50';
  }
  if (index < 3) {
    return 'bg-[#0F2A3D]';
  }
  return '';
}

export function LeaderboardSidebar({ entries, currentPlayerId }: LeaderboardSidebarProps) {
  return (
    <div className="bg-[#0A1E2E] rounded-xl p-4 border border-gray-700">
      <h3 className="text-lg font-bold mb-4">Leaderboard</h3>
      <div className="space-y-2">
        {entries.map((entry, index) => {
          const isCurrentPlayer = entry.player_id === currentPlayerId;
          const medal = index < 3 ? MEDALS[index] : null;

          return (
            <div
              key={entry.player_id}
              className={`flex items-center justify-between p-2 rounded ${getEntryStyle(isCurrentPlayer, index)}`}
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
