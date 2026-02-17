/**
 * Student Play Page
 *
 * Main gameplay area with games and question prompts
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  sessionAPI,
  scoreAPI,
  useWebSocket,
  POLLING_INTERVAL_SLOW_MS,
  DEFAULT_LEADERBOARD_LIMIT,
  type Session,
  type LeaderboardEntry,
} from '@review-arcade/shared'
import {
  PlayHeader,
  GameArea,
  LeaderboardSidebar,
  LoadingDisplay,
  ErrorDisplay,
} from '../components'

export default function Play(): JSX.Element | null {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const playerId = sessionStorage.getItem('player_id')
  const playerName = sessionStorage.getItem('player_name')

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage } = useWebSocket({
    sessionCode: code || '',
    enabled: !!code,
    onMessage: (data) => {
      if (data.type === 'session_ended') {
        navigate(`/results/${code}`)
        return
      }
      if (data.type === 'leaderboard_update') {
        const leaderboardData = data.leaderboard as LeaderboardEntry[] | undefined
        setLeaderboard(leaderboardData || [])
      }
    },
  })

  useEffect(() => {
    if (!code) return

    const fetchData = async () => {
      try {
        const sessionData = await sessionAPI.getByCode(code)
        const leaderboardData = await scoreAPI.getLeaderboard(code, DEFAULT_LEADERBOARD_LIMIT)

        setSession(sessionData)
        setLeaderboard(leaderboardData)
        setLoading(false)

        if (sessionData.status === 'ended') {
          navigate(`/results/${code}`)
        }
      } catch (err) {
        console.error('Failed to load session:', err)
        setError(err instanceof Error ? err.message : 'Failed to load session')
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, POLLING_INTERVAL_SLOW_MS)
    return () => clearInterval(interval)
  }, [code, navigate])

  // Memoize leaderboard data
  const topLeaderboard = useMemo(
    () => leaderboard.slice(0, DEFAULT_LEADERBOARD_LIMIT),
    [leaderboard]
  )

  const playerRank = useMemo(
    () => leaderboard.find((e) => e.player_id === playerId),
    [leaderboard, playerId]
  )

  function handleRetry(): void {
    setError(null)
    setLoading(true)
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={handleRetry} />
  }

  if (loading || !session) {
    return <LoadingDisplay />
  }

  return (
    <div className="min-h-screen text-white">
      <PlayHeader
        sessionCode={code || ''}
        playerName={playerName}
        playerScore={playerRank?.total_score}
        isConnected={isConnected}
      />

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <GameArea games={session.config.games} />
          </div>

          <div className="lg:col-span-1">
            <LeaderboardSidebar
              entries={topLeaderboard}
              currentPlayerId={playerId}
            />
          </div>
        </div>
      </div>

      {import.meta.env.DEV && lastMessage && (
        <div className="fixed bottom-4 right-4 bg-[#0A1E2E] p-2 rounded text-xs text-gray-400 max-w-xs">
          Last update: {lastMessage.type}
        </div>
      )}
    </div>
  )
}
