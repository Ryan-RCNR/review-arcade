/**
 * Student Join Page
 *
 * Students enter a 6-character session code and their display name
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { playerAPI } from '@review-arcade/shared'

export default function Join() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate session code format (alphanumeric, 4-6 characters)
      const codePattern = /^[A-Z0-9]{4,6}$/
      if (!code || !codePattern.test(code.toUpperCase())) {
        setError('Please enter a valid session code (4-6 alphanumeric characters)')
        setLoading(false)
        return
      }

      if (!name || name.length < 2) {
        setError('Please enter a name (at least 2 characters)')
        setLoading(false)
        return
      }

      // Join session
      const player = await playerAPI.join(code.toUpperCase(), name)

      // Store player info in sessionStorage
      sessionStorage.setItem('player_id', player.id)
      sessionStorage.setItem('player_name', player.name)
      sessionStorage.setItem('session_code', code.toUpperCase())

      // Navigate to lobby
      navigate(`/lobby/${code.toUpperCase()}`)
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('404')) {
          setError('Session not found. Check your code and try again.')
        } else {
          setError(err.message || 'Failed to join session. Please try again.')
        }
      } else {
        setError('Failed to join session. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-primary flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Join Game
          </h1>
          <p className="text-gray-600">
            Enter your session code and name to get started
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
          >
            {error}
          </div>
        )}

        {/* Join Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Session Code Input */}
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Session Code
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="ABC123"
              maxLength={6}
              className="w-full px-4 py-3 text-center text-2xl font-mono uppercase border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the code shown on your teacher's screen
            </p>
          </div>

          {/* Name Input */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={50}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              2-50 characters, letters and numbers only
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !code || !name}
            className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join Session'}
          </button>
        </form>
      </div>
    </div>
  )
}
