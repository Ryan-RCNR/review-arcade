/**
 * Student Play Page
 *
 * Main gameplay area with games and question prompts
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  sessionAPI,
  scoreAPI,
  useWebSocket,
  type Session,
  type LeaderboardEntry,
} from '@review-arcade/shared'

export default function Play() {
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
      } else if (data.type === 'leaderboard_update') {
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
        const leaderboardData = await scoreAPI.getLeaderboard(code, 10)

        setSession(sessionData)
        setLeaderboard(leaderboardData)
        setLoading(false)

        // If session ended, redirect
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
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [code, navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-lg text-red-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
            }}
            className="bg-primary px-4 py-2 rounded-lg hover:bg-primary/80"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin text-6xl mb-4">⏳</div>
          <p className="text-lg">Loading game...</p>
        </div>
      </div>
    )
  }

  // Find player's rank
  const playerRank = leaderboard.find((e) => e.player_id === playerId)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Review Arcade</h1>
            <p className="text-sm text-gray-400">
              Session: <span className="font-mono">{code}</span>
              {isConnected && (
                <span className="ml-2 text-green-400">● Live</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="font-medium">{playerName}</p>
            {playerRank && (
              <p className="text-sm text-primary">
                Score: {playerRank.total_score} pts
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Game Area */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 min-h-[500px] flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🎮</div>
                <h2 className="text-2xl font-bold mb-2">Game Area</h2>
                <p className="text-gray-400 mb-4">
                  Games will appear here when the session is active
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {session.config.games.map((game) => (
                    <span
                      key={game}
                      className="bg-gray-700 px-4 py-2 rounded-lg text-sm"
                    >
                      {game.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">Leaderboard</h3>
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((entry, index) => (
                  <div
                    key={entry.player_id}
                    className={`flex items-center justify-between p-2 rounded ${
                      entry.player_id === playerId
                        ? 'bg-primary/20 border border-primary/50'
                        : index < 3
                        ? 'bg-gray-700/50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold w-6 text-center">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : entry.rank}
                      </span>
                      <span className="truncate max-w-[100px]">
                        {entry.player_name}
                        {entry.player_id === playerId && ' (You)'}
                      </span>
                    </div>
                    <span className="font-mono text-sm">{entry.total_score}</span>
                  </div>
                ))}
                {leaderboard.length === 0 && (
                  <p className="text-gray-500 text-center py-4 text-sm">
                    No scores yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug info */}
      {lastMessage && (
        <div className="fixed bottom-4 right-4 bg-gray-800 p-2 rounded text-xs text-gray-400 max-w-xs">
          Last update: {lastMessage.type}
        </div>
      )}
    </div>
  )
}
