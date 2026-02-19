/**
 * Game Area Component
 *
 * Main game display area showing available games
 */

interface GameAreaProps {
  games: string[];
}

function formatGameName(game: string): string {
  return game.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function GameArea({ games }: GameAreaProps) {
  return (
    <div className="bg-[#0A1E2E] rounded-xl p-6 border border-gray-700 min-h-[500px] flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🎮</div>
        <h2 className="text-2xl font-bold mb-2">Game Area</h2>
        <p className="text-gray-400 mb-4">
          Games will appear here when the session is active
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {games.map((game) => (
            <span
              key={game}
              className="bg-[#0F2A3D] px-4 py-2 rounded-lg text-sm"
            >
              {formatGameName(game)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
