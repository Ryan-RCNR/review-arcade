/**
 * Student Lobby Page
 *
 * Waiting room where students see other players joining
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionAPI, playerAPI, type Session, type Player } from '@review-arcade/shared'

export default function Lobby() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const playerName = sessionStorage.getItem('player_name') || 'You'

  useEffect(() => {
    if (!code) return

    const fetchData = async () => {
      try {
        const [sessionData, playersData] = await Promise.all([
          sessionAPI.getByCode(code),
          playerAPI.list(code),
        ])

        setSession(sessionData)
        setPlayers(playersData)
        setLoading(false)

        // If session is active, navigate to play page
        if (sessionData.status === 'active') {
          navigate(`/play/${code}`)
        }
      } catch {
        setError('Failed to load session. Please try again.')
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [code, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-light to-primary flex items-center justify-center">
        <div className="card text-center">
          <div className="animate-spin text-6xl mb-4">⏳</div>
          <p className="text-lg font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-light to-primary flex items-center justify-center p-4">
        <div className="card max-w-md text-center">
          <p className="text-red-600 font-medium mb-4">{error || 'Session not found'}</p>
          <a href="/join" className="btn-primary">
            Join Another Session
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-primary p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="card text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Review Arcade
          </h1>
          <p className="text-xl text-gray-700 mb-4">
            Session Code: <span className="font-mono font-bold">{code}</span>
          </p>
          <div className="inline-block bg-yellow-100 border border-yellow-400 text-yellow-800 px-6 py-3 rounded-lg">
            <p className="font-medium">⏳ Waiting for teacher to start...</p>
          </div>
        </div>

        {/* Player List */}
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Players in Lobby ({players.length})
          </h2>

          {players.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No players yet. Be the first to join!
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="bg-gray-100 rounded-lg p-3 text-center"
                >
                  <div className="text-2xl mb-1">
                    {index === 0 ? '👑' : '👤'}
                  </div>
                  <p className="font-medium text-gray-900 truncate">
                    {player.name}
                  </p>
                  {player.name === playerName && (
                    <span className="text-xs text-primary-dark">(You)</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Game Info */}
        {session.config.games && session.config.games.length > 0 && (
          <div className="card mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Games in This Session:
            </h3>
            <div className="flex flex-wrap gap-2">
              {session.config.games.map((game) => (
                <span
                  key={game}
                  className="bg-primary text-gray-900 px-4 py-2 rounded-lg font-medium"
                >
                  {game.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="card mt-6 bg-blue-50 border border-blue-200">
          <h3 className="text-lg font-bold text-blue-900 mb-2">
            How to Play
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Wait for your teacher to start the session</li>
            <li>• Play the arcade games to earn points</li>
            <li>• Answer review questions when they pop up</li>
            <li>• Correct answers give you bonus points!</li>
            <li>• Try to reach the top of the leaderboard</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
