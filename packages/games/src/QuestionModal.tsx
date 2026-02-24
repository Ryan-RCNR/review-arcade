/**
 * QuestionModal -- Full-screen overlay shown when player dies.
 *
 * Answer correctly to respawn with comeback bonus.
 * Wrong answer shows the correct answer briefly, then server sends a new question on next death.
 */

import { useState } from 'react';
import type { Question, WSAnswerCorrect, WSAnswerWrong } from '@review-arcade/shared';

interface QuestionModalProps {
  question: Question;
  onAnswer: (answerIndex: number) => void;
  answerResult: WSAnswerCorrect | WSAnswerWrong | null;
  streak: number;
  multiplier: number;
}

export function QuestionModal({
  question,
  onAnswer,
  answerResult,
  streak,
  multiplier,
}: QuestionModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (index: number) => {
    if (selectedIndex !== null) return; // Prevent double-click
    setSelectedIndex(index);
    onAnswer(index);
  };

  const getOptionStyle = (index: number) => {
    // Before answer submitted
    if (selectedIndex === null) {
      return 'bg-[#0F2A3D] border-brand/20 hover:border-brand/50 hover:bg-[#142F45] cursor-pointer';
    }

    // After answer result received
    if (answerResult) {
      if (answerResult.type === 'answer_correct') {
        if (index === selectedIndex) {
          return 'bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500/50';
        }
        return 'bg-[#0F2A3D]/50 border-brand/10 opacity-50';
      }
      if (answerResult.type === 'answer_wrong') {
        if (index === selectedIndex) {
          return 'bg-red-500/20 border-red-500 ring-1 ring-red-500/50';
        }
        if (index === answerResult.correct_index) {
          return 'bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500/50';
        }
        return 'bg-[#0F2A3D]/50 border-brand/10 opacity-50';
      }
    }

    // Waiting for server response
    if (index === selectedIndex) {
      return 'bg-brand/10 border-brand/50 ring-1 ring-brand/30 animate-pulse';
    }
    return 'bg-[#0F2A3D]/50 border-brand/10 opacity-50';
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-midnight/90 backdrop-blur-sm rounded-xl">
      <div className="w-full max-w-lg mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-brand/50 text-sm font-medium uppercase tracking-wider mb-1">
            Answer to Respawn
          </p>
          {streak > 0 && (
            <p className="text-amber-400 text-xs">
              Streak: {streak} ({multiplier}x multiplier)
            </p>
          )}
        </div>

        {/* Question */}
        <div className="glass-card p-6 mb-4">
          <p className="text-white text-xl font-semibold text-center leading-relaxed">
            {question.question_text}
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={selectedIndex !== null}
              className={`
                flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200
                text-left text-white font-medium
                ${getOptionStyle(index)}
                disabled:cursor-default
              `}
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand text-sm font-bold">
                {optionLabels[index]}
              </span>
              <span className="text-lg">{option}</span>
            </button>
          ))}
        </div>

        {/* Result feedback */}
        {answerResult && (
          <div className="mt-4 text-center">
            {answerResult.type === 'answer_correct' ? (
              <div className="text-emerald-400 font-bold text-lg animate-in fade-in">
                Correct! +{answerResult.bonus_earned} bonus
              </div>
            ) : (
              <div className="text-red-400 font-medium animate-in fade-in">
                Wrong -- the correct answer was{' '}
                <span className="font-bold">
                  {optionLabels[answerResult.correct_index]}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
