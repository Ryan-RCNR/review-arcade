/**
 * Student Join Page
 *
 * Students enter a 6-character session code and display name.
 * On join, receives player_token for WS auth.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { playerAPI, storePlayerSession } from '@review-arcade/shared';

export default function Join() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const codePattern = /^[A-Z0-9]{4,6}$/;
      if (!code || !codePattern.test(code.toUpperCase())) {
        setError('Please enter a valid session code (4-6 alphanumeric characters)');
        setLoading(false);
        return;
      }

      if (!name || name.trim().length < 2) {
        setError('Please enter a name (at least 2 characters)');
        setLoading(false);
        return;
      }

      const player = await playerAPI.join(code.toUpperCase(), name.trim());

      // Store player session with token in memory (XSS-resistant)
      storePlayerSession({
        playerId: player.id,
        playerName: player.name,
        sessionCode: player.session_code,
        playerToken: player.player_token,
      });

      navigate(`/lobby/${player.session_code}`);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('not found') || err.message.includes('404')) {
          setError('Session not found. Check your code and try again.');
        } else if (err.message.includes('full')) {
          setError('Session is full. Try again later.');
        } else if (err.message.includes('not accepting')) {
          setError('Session is no longer accepting players.');
        } else {
          setError(err.message || 'Failed to join session. Please try again.');
        }
      } else {
        setError('Failed to join session. Please try again.');
      }
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Join Game
          </h1>
          <p className="text-brand/50">
            Enter the code from your teacher's screen
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-brand/70 mb-1.5">
              Session Code
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="ABC123"
              maxLength={6}
              className="w-full px-4 py-3 text-center text-2xl font-mono uppercase bg-surface-light border border-brand/15 rounded-xl text-white placeholder-brand/30 focus:outline-none focus:ring-2 focus:ring-brand/40"
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-brand/70 mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={50}
              className="w-full px-4 py-3 bg-surface-light border border-brand/15 rounded-xl text-white placeholder-brand/30 focus:outline-none focus:ring-2 focus:ring-brand/40"
              disabled={loading}
            />
            <p className="text-xs text-brand/30 mt-1">2-50 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading || !code || !name}
            className="btn-ice w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join Session'}
          </button>
        </form>
      </div>
    </div>
  );
}
