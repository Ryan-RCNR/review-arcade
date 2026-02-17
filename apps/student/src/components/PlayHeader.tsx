/**
 * Play Header Component
 *
 * Shows session info and player score at top of play screen
 */

interface PlayHeaderProps {
  sessionCode: string;
  playerName: string | null;
  playerScore?: number;
  isConnected: boolean;
}

export function PlayHeader({ sessionCode, playerName, playerScore, isConnected }: PlayHeaderProps) {
  return (
    <header className="bg-[#0A1E2E] border-b border-gray-700 px-4 py-3">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Review Arcade</h1>
          <p className="text-sm text-gray-400">
            Session: <span className="font-mono">{sessionCode}</span>
            {isConnected && (
              <span className="ml-2 text-green-400">● Live</span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="font-medium">{playerName}</p>
          {playerScore !== undefined && (
            <p className="text-sm text-primary">
              Score: {playerScore} pts
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
