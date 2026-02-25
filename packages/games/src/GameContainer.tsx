/**
 * GameContainer -- React wrapper for vanilla canvas game engines.
 *
 * Responsibilities:
 * 1. Mount/unmount the GameBridge to a canvas element
 * 2. Handle resize (responsive canvas)
 * 3. Pause game + show QuestionModal on death
 * 4. Resume game after correct answer (with comeback score)
 * 5. Show wrong-answer feedback before retrying
 * 6. Forward game events to parent (for WS sends)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  GameBridge,
  GameBridgeCallbacks,
  Question,
  WSAnswerCorrect,
  WSAnswerWrong,
} from '@review-arcade/shared';
import { QuestionModal } from './QuestionModal';
import { GameHUD } from './GameHUD';

interface GameContainerProps {
  /** The game engine factory */
  createGame: () => GameBridge;
  /** Called when player dies -- send death to server */
  onDeath: (score: number, metadata?: Record<string, unknown>) => void;
  /** Called when player answers -- send answer to server (server validates) */
  onAnswer: (
    questionId: string,
    answerIndex: number,
    timeMs: number,
  ) => void;
  /** Called on live score update */
  onScoreUpdate: (score: number) => void;
  /** Called on special event */
  onSpecialEvent: (event: { type: string; [key: string]: unknown }) => void;
  /** Current question from server (null = playing) */
  question: Question | null;
  /** Answer result from server */
  answerResult: WSAnswerCorrect | WSAnswerWrong | null;
  /** Clear the answer result after animation */
  clearAnswerResult: () => void;
  /** Player stats for HUD */
  totalScore: number;
  rank: number;
  currentStreak: number;
  streakMultiplier: number;
  comebackCredits: number;
  /** Is game active? */
  isActive: boolean;
}

export function GameContainer({
  createGame,
  onDeath,
  onAnswer,
  onScoreUpdate,
  onSpecialEvent,
  question,
  answerResult,
  clearAnswerResult,
  totalScore,
  rank,
  currentStreak,
  streakMultiplier,
  comebackCredits,
  isActive,
}: GameContainerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameBridge | null>(null);
  const [runScore, setRunScore] = useState(0);
  const [showQuestion, setShowQuestion] = useState(false);
  const [answerStartTime, setAnswerStartTime] = useState(0);

  // Create callbacks for game engine
  const callbacks: GameBridgeCallbacks = {
    onDeath: (score, metadata) => {
      setRunScore(score);
      onDeath(score, metadata);
      // Game will be paused when question arrives from server
    },
    onSpecialEvent: (event) => {
      onSpecialEvent(event);
    },
    onScoreUpdate: (score) => {
      setRunScore(score);
      onScoreUpdate(score);
    },
  };

  // Mount game engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = createGame();
    gameRef.current = game;

    // Set canvas size
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    game.mount(canvas, callbacks);

    if (isActive) {
      game.start();
    }

    return () => {
      game.destroy();
      gameRef.current = null;
    };
    // Only re-mount when createGame changes (game type switch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createGame]);

  // Start/stop based on isActive
  useEffect(() => {
    if (!gameRef.current) return;
    if (isActive && !showQuestion) {
      gameRef.current.start();
    } else {
      gameRef.current.pause();
    }
  }, [isActive, showQuestion]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }
      gameRef.current?.resize(width, height);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Show question modal when server sends a question
  useEffect(() => {
    if (question) {
      setShowQuestion(true);
      setAnswerStartTime(Date.now());
      gameRef.current?.pause();
    }
  }, [question]);

  // Handle answer result from server
  useEffect(() => {
    if (!answerResult) return;

    if (answerResult.type === 'answer_correct') {
      // Resume game with comeback score
      setShowQuestion(false);
      gameRef.current?.resume(answerResult.comeback_start_score);

      // Clear result after brief delay
      const timer = setTimeout(clearAnswerResult, 300);
      return () => clearTimeout(timer);
    }

    if (answerResult.type === 'answer_wrong') {
      // Show wrong animation, then allow retry
      const timer = setTimeout(() => {
        clearAnswerResult();
        // Question stays open for retry -- server sends new question on next death
        // For now, keep question open and let them try again
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [answerResult, clearAnswerResult]);

  const handleAnswer = useCallback(
    (answerIndex: number) => {
      if (!question) return;
      const timeMs = Date.now() - answerStartTime;
      onAnswer(question.question_id, answerIndex, timeMs);
    },
    [question, answerStartTime, onAnswer],
  );

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px]">
      {/* Canvas fills container */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full rounded-xl"
        style={{ background: '#0A1628' }}
      />

      {/* HUD overlay */}
      <GameHUD
        score={runScore}
        totalScore={totalScore}
        rank={rank}
        streak={currentStreak}
        multiplier={streakMultiplier}
        comebackCredits={comebackCredits}
      />

      {/* Question modal overlay */}
      {showQuestion && question && (
        <QuestionModal
          question={question}
          onAnswer={handleAnswer}
          answerResult={answerResult}
          streak={currentStreak}
          multiplier={streakMultiplier}
        />
      )}
    </div>
  );
}
