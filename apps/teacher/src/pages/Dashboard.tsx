/**
 * Teacher Dashboard Page
 *
 * Shows list of sessions (active, past, drafts)
 * with quick actions to create/monitor/view results
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionAPI, type Session } from '@review-arcade/shared'

type FilterType = 'all' | 'active' | 'ended'

const STATUS_COLORS: Record<Session['status'], string> = {
  active: 'bg-green-100 text-green-800 border-green-300',
  lobby: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  paused: 'bg-orange-100 text-orange-800 border-orange-300',
  ended: 'bg-gray-100 text-gray-800 border-gray-300',
  draft: 'bg-blue-100 text-blue-800 border-blue-300',
}

interface FilterButtonProps {
  label: string
  value: FilterType
  currentFilter: FilterType
  onClick: (value: FilterType) => void
}

function FilterButton({ label, value, currentFilter, onClick }: FilterButtonProps): JSX.Element {
  const isActive = currentFilter === value
  const baseClasses = 'px-4 py-2 rounded-lg transition-colors'
  const activeClasses = 'bg-primary text-gray-900 font-bold'
  const inactiveClasses = 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'

  return (
    <button
      onClick={() => onClick(value)}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
      {label}
    </button>
  )
}

interface SessionActionButtonProps {
  session: Session
  onNavigate: (path: string) => void
}

function SessionActionButton({ session, onNavigate }: SessionActionButtonProps): JSX.Element {
  const isMonitorable = session.status === 'active' || session.status === 'lobby'
  const isEnded = session.status === 'ended'

  if (isMonitorable) {
    return (
      <button
        onClick={() => onNavigate(`/monitor/${session.id}`)}
        className="btn-primary flex-1 text-sm py-2"
      >
        Monitor
      </button>
    )
  }

  if (isEnded) {
    return (
      <button
        onClick={() => onNavigate(`/results/${session.id}`)}
        className="btn-ghost flex-1 text-sm py-2"
      >
        View Results
      </button>
    )
  }

  return (
    <button className="btn-ghost flex-1 text-sm py-2">
      View Details
    </button>
  )
}

export default function Dashboard(): JSX.Element {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    async function fetchSessions(): Promise<void> {
      try {
        const sessionsData = await sessionAPI.list(50)
        setSessions(sessionsData)
      } catch (err) {
        console.error('Failed to load sessions:', err)
        setError(err instanceof Error ? err.message : 'Failed to load sessions')
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [])

  const filteredSessions = sessions.filter((session) => {
    if (filter === 'active') {
      return session.status === 'active' || session.status === 'lobby'
    }
    if (filter === 'ended') {
      return session.status === 'ended'
    }
    return true
  })

  function getStatusColor(status: Session['status']): string {
    return STATUS_COLORS[status] || STATUS_COLORS.draft
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <FilterButton label="All Sessions" value="all" currentFilter={filter} onClick={setFilter} />
            <FilterButton label="Active" value="active" currentFilter={filter} onClick={setFilter} />
            <FilterButton label="Ended" value="ended" currentFilter={filter} onClick={setFilter} />
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
        ) : error ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4">❌</div>
            <h3 className="text-xl font-bold text-red-600 mb-2">
              Failed to load sessions
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Try Again
            </button>
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
                  <SessionActionButton session={session} onNavigate={navigate} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
