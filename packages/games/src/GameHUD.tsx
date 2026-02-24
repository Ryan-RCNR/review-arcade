/**
 * GameHUD -- Heads-up display overlay on the game canvas.
 *
 * Shows: run score, total score, rank, streak, multiplier, comeback credits.
 * Non-interactive, positioned at corners to minimize game obstruction.
 */

interface GameHUDProps {
  score: number;
  totalScore: number;
  rank: number;
  streak: number;
  multiplier: number;
  comebackCredits: number;
}

export function GameHUD({
  score,
  totalScore,
  rank,
  streak,
  multiplier,
  comebackCredits,
}: GameHUDProps) {
  return (
    <>
      {/* Top-left: Run score */}
      <div className="absolute top-3 left-3 z-10">
        <div className="bg-midnight/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-brand/10">
          <div className="text-brand/50 text-[10px] uppercase tracking-wider">Score</div>
          <div className="text-white text-lg font-bold tabular-nums">
            {score.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Top-right: Rank + Total */}
      <div className="absolute top-3 right-3 z-10">
        <div className="bg-midnight/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-brand/10 text-right">
          <div className="text-brand/50 text-[10px] uppercase tracking-wider">
            Rank #{rank}
          </div>
          <div className="text-brand text-sm font-semibold tabular-nums">
            {totalScore.toLocaleString()} pts
          </div>
        </div>
      </div>

      {/* Bottom-left: Streak + Multiplier */}
      {streak > 0 && (
        <div className="absolute bottom-3 left-3 z-10">
          <div className="bg-midnight/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold text-sm">{streak}x streak</span>
              <span className="text-amber-400/60 text-xs">{multiplier}x</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom-right: Comeback credits */}
      {comebackCredits > 0 && (
        <div className="absolute bottom-3 right-3 z-10">
          <div className="bg-midnight/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-emerald-500/20">
            <div className="text-emerald-400 text-xs font-medium">
              {comebackCredits} comeback credits
            </div>
          </div>
        </div>
      )}
    </>
  );
}
