/**
 * Teacher Monitor Page
 *
 * Live monitoring view with session controls and leaderboard
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import {
  sessionAPI,
  playerAPI,
  scoreAPI,
  type Session,
  type Player,
  type LeaderboardEntry,
} from '@review-arcade/shared'

export default function Monitor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<'start' | 'end' | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      try {
        const sessionData = await sessionAPI.getByCode(id)
        const playersData = await playerAPI.list(sessionData.code)
        const leaderboardData = await scoreAPI.getLeaderboard(sessionData.code, 10)

        setSession(sessionData)
        setPlayers(playersData)
        setLeaderboard(leaderboardData)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load session:', err)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [id])

  const handleStart = async () => {
    if (!session) return
    setActionError(null)
    setActionLoading('start')
    try {
      await sessionAPI.start(session.id)
      // Optimistically update session status
      setSession({ ...session, status: 'active' })
    } catch (err) {
      console.error('Failed to start session:', err)
      setActionError(err instanceof Error ? err.message : 'Failed to start session')
    } finally {
      setActionLoading(null)
    }
  }

  const handleEnd = async () => {
    if (!session || !confirm('End this session?')) return
    setActionError(null)
    setActionLoading('end')
    try {
      await sessionAPI.end(session.id)
      navigate(`/results/${session.id}`)
    } catch (err) {
      console.error('Failed to end session:', err)
      setActionError(err instanceof Error ? err.message : 'Failed to end session')
      setActionLoading(null)
    }
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin text-6xl mb-4">⏳</div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Session Monitor</h1>
            <p className="text-gray-400">
              Code: <span className="font-mono text-primary">{session.code}</span>
            </p>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Controls</h2>
            <div className="space-y-3">
              <div className="text-sm text-gray-400 mb-4">
                Status:{' '}
                <span
                  className={`font-bold ${
                    session.status === 'active' ? 'text-green-400' : 'text-yellow-400'
                  }`}
                >
                  {session.status}
                </span>
              </div>
              {actionError && (
                <div className="bg-red-600/20 border border-red-500/50 rounded-lg p-3 text-sm text-red-400">
                  {actionError}
                </div>
              )}
              {session.status === 'lobby' && (
                <button
                  onClick={handleStart}
                  disabled={actionLoading === 'start'}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'start' ? 'Starting...' : 'Start Session'}
                </button>
              )}
              {session.status === 'active' && (
                <button
                  onClick={handleEnd}
                  disabled={actionLoading === 'end'}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'end' ? 'Ending...' : 'End Session'}
                </button>
              )}
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-secondary w-full"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Players */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Players ({players.length})</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {players.map((player) => (
                <div key={player.id} className="bg-gray-700 rounded p-3">
                  <p className="font-medium">{player.name}</p>
                </div>
              ))}
              {players.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  Waiting for players to join...
                </p>
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.player_id}
                  className={`flex items-center justify-between p-3 rounded ${
                    index === 0
                      ? 'bg-yellow-600/20 border border-yellow-500/30'
                      : index === 1
                      ? 'bg-gray-500/20 border border-gray-400/30'
                      : index === 2
                      ? 'bg-orange-600/20 border border-orange-500/30'
                      : 'bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg w-6">{entry.rank}</span>
                    <span>{entry.player_name}</span>
                  </div>
                  <span className="font-mono font-bold">{entry.total_score}</span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No scores yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
