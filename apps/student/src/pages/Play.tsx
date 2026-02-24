/**
 * Student Play Page
 *
 * Main gameplay with real-time WebSocket connection.
 * Flow: WS connect -> init as player -> receive game state -> play game -> die -> question -> respawn
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useWebSocket,
  getPlayerToken,
  getSessionMetadata,
  type ServerWSMessage,
  type Question,
  type WSAnswerCorrect,
  type WSAnswerWrong,
  type LeaderboardEntry,
  type GameType,
} from '@review-arcade/shared';
import { GameContainer, getGameFactory } from '@review-arcade/games';
import { PlayHeader, LeaderboardSidebar, LoadingDisplay, ErrorDisplay } from '../components';

export default function Play() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  // Player state from session storage
  const metadata = getSessionMetadata();
  const playerId = metadata?.playerId || '';
  const playerName = metadata?.playerName || '';
  const playerToken = getPlayerToken();

  // Game state
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [rank, setRank] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [streakMultiplier, setStreakMultiplier] = useState(1.0);
  const [comebackCredits, setComebackCredits] = useState(0);

  // Question state
  const [question, setQuestion] = useState<Question | null>(null);
  const [answerResult, setAnswerResult] = useState<WSAnswerCorrect | WSAnswerWrong | null>(null);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Connection
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // WebSocket connection
  const { isConnected, send } = useWebSocket<ServerWSMessage>({
    sessionCode: code || '',
    enabled: !!code && !!playerToken,
    onOpen: () => {
      // Send auth init message
      send({
        type: 'init',
        role: 'player',
        player_id: playerId,
        player_token: playerToken || '',
      });
    },
    onMessage: (msg) => {
      switch (msg.type) {
        case 'player_state': {
          setGameType(msg.game_type);
          setTotalScore(msg.total_score);
          setRank(msg.rank);
          setComebackCredits(msg.comeback_credits);
          setCurrentStreak(msg.current_streak);
          setStreakMultiplier(msg.streak_multiplier);
          setIsActive(msg.status === 'active');
          setInitialized(true);
          break;
        }

        case 'session_started': {
          setGameType(msg.game_type);
          setIsActive(true);
          break;
        }

        case 'session_paused': {
          setIsActive(false);
          break;
        }

        case 'session_resumed': {
          setIsActive(true);
          break;
        }

        case 'session_ended': {
          navigate(`/results/${code}`, {
            state: {
              leaderboard: msg.final_leaderboard,
              awards: msg.awards,
              playerId,
              playerName,
              gameType,
            },
          });
          break;
        }

        case 'question': {
          setQuestion(msg.question);
          setTotalScore(msg.total_score);
          break;
        }

        case 'answer_correct': {
          setAnswerResult(msg);
          setTotalScore(msg.total_score);
          setCurrentStreak(msg.current_streak);
          setStreakMultiplier(msg.streak_multiplier);
          setComebackCredits(msg.comeback_credits);
          break;
        }

        case 'answer_wrong': {
          setAnswerResult(msg);
          setCurrentStreak(0);
          break;
        }

        case 'leaderboard_update': {
          if (msg.top_5) {
            setLeaderboard(msg.top_5);
          }
          if (msg.your_rank !== undefined) {
            setRank(msg.your_rank);
          }
          if (msg.your_score !== undefined) {
            setTotalScore(msg.your_score);
          }
          break;
        }

        case 'ping': {
          send({ type: 'pong' });
          break;
        }

        case 'error': {
          setError(msg.message);
          break;
        }
      }
    },
    onError: () => {
      setError('Connection lost. Trying to reconnect...');
    },
  });

  // Redirect if no credentials
  useEffect(() => {
    if (!playerToken || !playerId) {
      navigate('/join');
    }
  }, [playerToken, playerId, navigate]);

  // Game event handlers
  const handleDeath = useCallback(
    (score: number, metadata?: Record<string, unknown>) => {
      send({ type: 'death', score, metadata });
    },
    [send],
  );

  const handleAnswer = useCallback(
    (questionId: string, answerIndex: number, correctIndex: number, timeMs: number) => {
      send({
        type: 'answer',
        question_id: questionId,
        answer_index: answerIndex,
        correct_index: correctIndex,
        time_ms: timeMs,
      });
    },
    [send],
  );

  const handleScoreUpdate = useCallback(
    (score: number) => {
      send({ type: 'score_update', score });
    },
    [send],
  );

  const handleSpecialEvent = useCallback(
    (event: { type: string; [key: string]: unknown }) => {
      send({ type: 'special_event', event });
    },
    [send],
  );

  const clearAnswerResult = useCallback(() => {
    setAnswerResult(null);
    setQuestion(null);
  }, []);

  // Game factory (memoized so it doesn't re-create on every render)
  const createGame = useMemo(() => {
    if (!gameType) return null;
    return getGameFactory(gameType);
  }, [gameType]);

  if (error) {
    return <ErrorDisplay message={error} onRetry={() => setError(null)} />;
  }

  if (!initialized) {
    return <LoadingDisplay />;
  }

  return (
    <div className="min-h-screen text-white flex flex-col">
      <PlayHeader
        sessionCode={code || ''}
        playerName={playerName}
        playerScore={totalScore}
        isConnected={isConnected}
      />

      <div className="flex-1 p-4 flex gap-4">
        {/* Game area */}
        <div className="flex-1">
          {createGame ? (
            <GameContainer
              createGame={createGame}
              onDeath={handleDeath}
              onAnswer={handleAnswer}
              onScoreUpdate={handleScoreUpdate}
              onSpecialEvent={handleSpecialEvent}
              question={question}
              answerResult={answerResult}
              clearAnswerResult={clearAnswerResult}
              totalScore={totalScore}
              rank={rank}
              currentStreak={currentStreak}
              streakMultiplier={streakMultiplier}
              comebackCredits={comebackCredits}
              isActive={isActive}
            />
          ) : (
            <div className="glass-card rounded-xl p-8 h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-brand/50 text-lg mb-2">
                  {isActive
                    ? 'This game is not yet available'
                    : 'Waiting for the teacher to start the session...'}
                </p>
                {gameType && (
                  <p className="text-brand/30 text-sm">Game: {gameType}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard sidebar */}
        <div className="w-64 hidden lg:block">
          <LeaderboardSidebar
            entries={leaderboard}
            currentPlayerId={playerId}
          />
        </div>
      </div>
    </div>
  );
}
