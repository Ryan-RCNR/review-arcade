/**
 * Teacher Dashboard Page
 *
 * Shows list of sessions (active, past, drafts)
 * with quick actions to create/monitor/view results
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { sessionAPI, type Session } from '@review-arcade/shared'

export default function Dashboard() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'ended'>('all')

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const sessionsData = await sessionAPI.list(50)
        setSessions(sessionsData)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load sessions:', err)
        setLoading(false)
      }
    }

    fetchSessions()
  }, [])

  // Filter sessions
  const filteredSessions = sessions.filter((session) => {
    if (filter === 'active') return session.status === 'active' || session.status === 'lobby'
    if (filter === 'ended') return session.status === 'ended'
    return true
  })

  // Get status badge color
  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'lobby':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'paused':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'ended':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Review Arcade
            </h1>
            <p className="text-sm text-gray-600">Teacher Dashboard</p>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-gray-900 font-bold'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              All Sessions
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'active'
                  ? 'bg-primary text-gray-900 font-bold'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('ended')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'ended'
                  ? 'bg-primary text-gray-900 font-bold'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Ended
            </button>
          </div>

          <button
            onClick={() => navigate('/create')}
            className="btn-primary"
          >
            + Create New Session
          </button>
        </div>

        {/* Sessions Grid */}
        {loading ? (
          <div className="card text-center py-12">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading sessions...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No sessions yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first session to get started!
            </p>
            <button
              onClick={() => navigate('/create')}
              className="btn-primary"
            >
              Create Session
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSessions.map((session) => (
              <div key={session.id} className="card hover:shadow-lg transition-shadow">
                {/* Session Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 font-mono">
                      {session.code}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      session.status
                    )}`}
                  >
                    {session.status}
                  </span>
                </div>

                {/* Session Info */}
                <div className="mb-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Games:</span>{' '}
                    {session.config.games.length}
                  </p>
                  {session.config.max_players && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Max Players:</span>{' '}
                      {session.config.max_players}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {session.status === 'active' || session.status === 'lobby' ? (
                    <button
                      onClick={() => navigate(`/monitor/${session.id}`)}
                      className="btn-primary flex-1 text-sm py-2"
                    >
                      Monitor
                    </button>
                  ) : session.status === 'ended' ? (
                    <button
                      onClick={() => navigate(`/results/${session.id}`)}
                      className="btn-secondary flex-1 text-sm py-2"
                    >
                      View Results
                    </button>
                  ) : (
                    <button className="btn-secondary flex-1 text-sm py-2">
                      View Details
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
