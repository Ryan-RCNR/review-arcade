/**
 * Teacher Create Session Page
 *
 * Form to configure and create a new game session
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { sessionAPI, AVAILABLE_GAMES, type GameType } from '@review-arcade/shared'

export default function CreateSession() {
  const navigate = useNavigate()
  const [selectedGames, setSelectedGames] = useState<GameType[]>([])
  const [maxPlayers, setMaxPlayers] = useState(30)
  const [timeLimit, setTimeLimit] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleGame = (gameId: GameType) => {
    if (selectedGames.includes(gameId)) {
      setSelectedGames(selectedGames.filter((g) => g !== gameId))
    } else {
      if (selectedGames.length < 3) {
        setSelectedGames([...selectedGames, gameId])
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (selectedGames.length === 0) {
      setError('Please select at least one game')
      return
    }

    setLoading(true)

    try {
      const session = await sessionAPI.create({
        games: selectedGames,
        max_players: maxPlayers,
        time_limit_minutes: timeLimit,
      })

      navigate(`/monitor/${session.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Create New Session
            </h1>
            <p className="text-sm text-gray-600">Configure your game session</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit}>
          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Game Selection */}
          <div className="card mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              1. Select Games ({selectedGames.length}/3)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Choose 1-3 games for this session
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {AVAILABLE_GAMES.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => toggleGame(game.id)}
                  disabled={
                    !selectedGames.includes(game.id) && selectedGames.length >= 3
                  }
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    selectedGames.includes(game.id)
                      ? 'border-primary bg-primary text-gray-900 font-bold'
                      : 'border-gray-300 bg-white hover:border-gray-400 text-gray-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="text-3xl mb-2">{game.icon}</div>
                  <p className="text-xs font-medium">{game.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Session Settings */}
          <div className="card mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              2. Session Settings
            </h2>

            <div className="space-y-4">
              {/* Max Players */}
              <div>
                <label
                  htmlFor="maxPlayers"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Maximum Players: {maxPlayers}
                </label>
                <input
                  type="range"
                  id="maxPlayers"
                  min="5"
                  max="100"
                  step="5"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5</span>
                  <span>100</span>
                </div>
              </div>

              {/* Time Limit */}
              <div>
                <label
                  htmlFor="timeLimit"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Time Limit: {timeLimit} minutes
                </label>
                <input
                  type="range"
                  id="timeLimit"
                  min="5"
                  max="60"
                  step="5"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5 min</span>
                  <span>60 min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="card mb-6 bg-blue-50 border border-blue-200">
            <h3 className="text-lg font-bold text-blue-900 mb-3">
              Session Summary
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                <span className="font-medium">Games:</span>{' '}
                {selectedGames.length > 0
                  ? selectedGames
                      .map(
                        (id) =>
                          AVAILABLE_GAMES.find((g) => g.id === id)?.name || id
                      )
                      .join(', ')
                  : 'None selected'}
              </p>
              <p>
                <span className="font-medium">Max Players:</span> {maxPlayers}
              </p>
              <p>
                <span className="font-medium">Time Limit:</span> {timeLimit}{' '}
                minutes
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedGames.length === 0}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
