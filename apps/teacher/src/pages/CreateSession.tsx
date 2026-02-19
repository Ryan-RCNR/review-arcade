/**
 * Teacher Create Session Page
 *
 * Form to configure and create a new game session
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionAPI, AVAILABLE_GAMES, type GameType } from '@review-arcade/shared'

interface RangeSliderProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  minLabel: string
  maxLabel: string
  onChange: (value: number) => void
}

function RangeSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  minLabel,
  maxLabel,
  onChange,
}: RangeSliderProps): React.JSX.Element {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {label}
      </label>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

export default function CreateSession(): React.JSX.Element {
  const navigate = useNavigate()
  const [selectedGames, setSelectedGames] = useState<GameType[]>([])
  const [maxPlayers, setMaxPlayers] = useState(30)
  const [timeLimit, setTimeLimit] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleGame(gameId: GameType): void {
    const isSelected = selectedGames.includes(gameId)

    if (isSelected) {
      setSelectedGames(selectedGames.filter((g) => g !== gameId))
      return
    }

    const canAddMore = selectedGames.length < 3
    if (canAddMore) {
      setSelectedGames([...selectedGames, gameId])
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
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
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page title */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Create New Session
            </h2>
            <p className="text-sm text-gray-600">Configure your game session</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            &larr; Back to Dashboard
          </button>
        </div>
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
              <RangeSlider
                id="maxPlayers"
                label={`Maximum Players: ${maxPlayers}`}
                value={maxPlayers}
                min={5}
                max={100}
                step={5}
                minLabel="5"
                maxLabel="100"
                onChange={setMaxPlayers}
              />

              <RangeSlider
                id="timeLimit"
                label={`Time Limit: ${timeLimit} minutes`}
                value={timeLimit}
                min={5}
                max={60}
                step={5}
                minLabel="5 min"
                maxLabel="60 min"
                onChange={setTimeLimit}
              />
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
                {selectedGames.length === 0
                  ? 'None selected'
                  : selectedGames
                      .map((id) => AVAILABLE_GAMES.find((g) => g.id === id)?.name || id)
                      .join(', ')}
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
              className="btn-ghost flex-1"
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
