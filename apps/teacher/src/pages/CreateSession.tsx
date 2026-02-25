/**
 * Teacher Create Session Page
 *
 * 4-step wizard:
 * 1. Choose game
 * 2. Review questions (math auto, your questions, or generate from content)
 * 3. Teacher mode (monitor / play)
 * 4. Settings + submit
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  sessionAPI,
  questionAPI,
  AVAILABLE_GAMES,
  type GameType,
  type QuestionSource,
  type QuestionWithAnswer,
} from '@review-arcade/shared';
import {
  Gamepad2,
  Monitor,
  Play,
  ArrowLeft,
  Users,
  Timer,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  Brain,
  BookOpen,
  FileText,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calculator,
  Upload,
} from 'lucide-react';

type QuestionTab = 'math' | 'custom' | 'generate';

const MATH_OPERATIONS = [
  { id: 'addition', label: 'Addition (+)' },
  { id: 'subtraction', label: 'Subtraction (-)' },
  { id: 'multiplication', label: 'Multiplication (x)' },
  { id: 'division', label: 'Division (/)' },
];

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// --- Inline question entry form ---

interface ManualQuestionFormProps {
  onAdd: (q: QuestionWithAnswer) => void;
  onCancel: () => void;
}

function ManualQuestionForm({ onAdd, onCancel }: ManualQuestionFormProps) {
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIdx, setCorrectIdx] = useState(0);

  const handleOptionChange = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const canAdd =
    text.trim().length > 0 && options.every((o) => o.trim().length > 0);

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({
      question_id: `manual-${Date.now()}`,
      question_text: text.trim(),
      options: options.map((o) => o.trim()),
      correct_index: correctIdx,
    });
    setText('');
    setOptions(['', '', '', '']);
    setCorrectIdx(0);
  };

  return (
    <div className="glass-card p-4 space-y-3 border border-brand/20">
      <input
        type="text"
        placeholder="Question text..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={120}
        className="w-full bg-surface-light border border-brand/15 rounded-xl px-4 py-2.5 text-white placeholder-brand/30 text-sm focus:outline-none focus:border-brand/40"
      />
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCorrectIdx(i)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                correctIdx === i
                  ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                  : 'bg-surface-light text-brand/40 hover:text-brand/60'
              }`}
              title={`Mark ${OPTION_LABELS[i]} as correct`}
            >
              {correctIdx === i ? <Check size={12} /> : OPTION_LABELS[i]}
            </button>
            <input
              type="text"
              placeholder={`Option ${OPTION_LABELS[i]}`}
              value={opt}
              onChange={(e) => handleOptionChange(i, e.target.value)}
              maxLength={50}
              className="flex-1 bg-surface-light border border-brand/15 rounded-lg px-3 py-1.5 text-white placeholder-brand/30 text-xs focus:outline-none focus:border-brand/40"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="btn-ice text-xs px-4 py-1.5 disabled:opacity-40"
        >
          Add Question
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost text-xs px-4 py-1.5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// --- Question preview card ---

function QuestionPreview({
  q,
  index,
  onRemove,
}: {
  q: QuestionWithAnswer;
  index: number;
  onRemove?: () => void;
}) {
  return (
    <div className="bg-surface-light rounded-xl p-3 text-sm group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-white font-medium">
          <span className="text-brand/40 mr-1.5">{index + 1}.</span>
          {q.question_text}
        </p>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-brand/20 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {q.options.map((opt, i) => (
          <span
            key={i}
            className={`text-xs px-2 py-1 rounded-lg ${
              i === q.correct_index
                ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                : 'text-brand/50'
            }`}
          >
            {OPTION_LABELS[i]}. {opt}
          </span>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function CreateSession(): React.JSX.Element {
  const navigate = useNavigate();

  // Step 1: Game
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);

  // Step 2: Questions
  const [questionTab, setQuestionTab] = useState<QuestionTab>('math');
  const [questionSource, setQuestionSource] = useState<QuestionSource>('math');

  // Math config
  const [mathOps, setMathOps] = useState<string[]>(['multiplication']);
  const [mathRange, setMathRange] = useState<[number, number]>([2, 12]);

  // Custom question bank (persists across tabs)
  const [questionBank, setQuestionBank] = useState<QuestionWithAnswer[]>([]);
  const [questionBankIds, setQuestionBankIds] = useState<string[]>([]);

  // Paste + parse
  const [pasteText, setPasteText] = useState('');
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState('');

  // Manual entry
  const [showManualForm, setShowManualForm] = useState(false);

  // Amplify section
  const [showAmplify, setShowAmplify] = useState(false);
  const [amplifyContent, setAmplifyContent] = useState('');
  const [amplifyCount, setAmplifyCount] = useState(30);
  const [amplifySubject, setAmplifySubject] = useState('');
  const [amplifyGrade, setAmplifyGrade] = useState('');
  const [amplifyLoading, setAmplifyLoading] = useState(false);
  const [amplifyError, setAmplifyError] = useState('');
  const [amplifiedQuestions, setAmplifiedQuestions] = useState<QuestionWithAnswer[]>([]);
  const [showAmplifiedPreview, setShowAmplifiedPreview] = useState(true);

  // Generate tab
  const [genContent, setGenContent] = useState('');
  const [genCount, setGenCount] = useState(40);
  const [genSubject, setGenSubject] = useState('');
  const [genGrade, setGenGrade] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<QuestionWithAnswer[]>([]);
  const [showGenPreview, setShowGenPreview] = useState(true);

  // Step 3: Teacher Mode
  const [teacherMode, setTeacherMode] = useState<'monitor' | 'play'>('monitor');

  // Step 4: Settings
  const [maxPlayers, setMaxPlayers] = useState(30);
  const [timeLimit, setTimeLimit] = useState(15);

  // Submit
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const gameInfo = selectedGame
    ? AVAILABLE_GAMES.find((g) => g.id === selectedGame)
    : null;

  // Computed: total questions in bank
  const totalQuestions = questionBank.length;
  const hasEnoughQuestions = questionSource === 'math' || totalQuestions >= 10;

  // --- Tab switching ---
  const handleTabChange = (tab: QuestionTab) => {
    setQuestionTab(tab);
    setQuestionSource(tab === 'math' ? 'math' : 'custom');
  };

  // --- Paste & parse ---
  const handleParse = useCallback(async () => {
    if (!pasteText.trim()) return;
    setParseLoading(true);
    setParseError('');
    try {
      const result = await questionAPI.parse(pasteText, amplifySubject || undefined);
      const newQs = result.questions as QuestionWithAnswer[];
      setQuestionBank((prev) => [...prev, ...newQs]);
      setQuestionBankIds((prev) => [
        ...prev,
        ...newQs.filter((q) => q.id).map((q) => q.id!),
      ]);
      setPasteText('');
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : 'Failed to parse questions',
      );
    } finally {
      setParseLoading(false);
    }
  }, [pasteText, amplifySubject]);

  // --- File upload for questions (CSV/TXT) ---
  const handleQuestionFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Only allow text-based files
      const allowed = ['.csv', '.txt', '.tsv'];
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      if (!allowed.includes(ext)) {
        setParseError('Please upload a .csv, .txt, or .tsv file');
        return;
      }

      setParseLoading(true);
      setParseError('');
      try {
        const text = await file.text();
        const result = await questionAPI.parse(text, amplifySubject || undefined);
        const newQs = result.questions as QuestionWithAnswer[];
        setQuestionBank((prev) => [...prev, ...newQs]);
        setQuestionBankIds((prev) => [
          ...prev,
          ...newQs.filter((q) => q.id).map((q) => q.id!),
        ]);
      } catch (err) {
        setParseError(
          err instanceof Error ? err.message : 'Failed to parse file',
        );
      } finally {
        setParseLoading(false);
        // Reset input so same file can be re-uploaded
        e.target.value = '';
      }
    },
    [amplifySubject],
  );

  // --- File upload for content (TXT) ---
  const handleContentFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        setGenContent((prev) => (prev ? prev + '\n\n' + text : text));
      } catch {
        setGenError('Failed to read file');
      }
      e.target.value = '';
    },
    [],
  );

  // --- Manual add ---
  const handleManualAdd = useCallback((q: QuestionWithAnswer) => {
    setQuestionBank((prev) => [...prev, q]);
    setShowManualForm(false);
  }, []);

  // --- Remove question ---
  const handleRemoveQuestion = useCallback((index: number) => {
    setQuestionBank((prev) => {
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      if (removed?.id) {
        setQuestionBankIds((ids) => ids.filter((id) => id !== removed.id));
      }
      return next;
    });
  }, []);

  // --- Amplify ---
  const handleAmplify = useCallback(async () => {
    if (questionBank.length === 0) return;
    setAmplifyLoading(true);
    setAmplifyError('');
    try {
      const result = await questionAPI.amplify(
        questionBank,
        amplifyContent,
        amplifyCount,
        amplifySubject || undefined,
        amplifyGrade || undefined,
      );
      const newQs = result.questions as QuestionWithAnswer[];
      setAmplifiedQuestions(newQs);
      setShowAmplifiedPreview(true);
      // Add to bank + IDs
      setQuestionBank((prev) => [...prev, ...newQs]);
      setQuestionBankIds((prev) => [
        ...prev,
        ...newQs.filter((q) => q.id).map((q) => q.id!),
      ]);
    } catch (err) {
      setAmplifyError(
        err instanceof Error ? err.message : 'Failed to generate questions',
      );
    } finally {
      setAmplifyLoading(false);
    }
  }, [questionBank, amplifyContent, amplifyCount, amplifySubject, amplifyGrade]);

  // --- Generate from content ---
  const handleGenerate = useCallback(async () => {
    if (!genContent.trim()) return;
    setGenLoading(true);
    setGenError('');
    try {
      const result = await questionAPI.generate(
        genContent,
        genCount,
        genSubject || undefined,
        genGrade || undefined,
      );
      const newQs = result.questions as QuestionWithAnswer[];
      setGeneratedQuestions(newQs);
      setShowGenPreview(true);
      // Replace bank with generated questions
      setQuestionBank(newQs);
      setQuestionBankIds(newQs.filter((q) => q.id).map((q) => q.id!));
    } catch (err) {
      setGenError(
        err instanceof Error ? err.message : 'Failed to generate questions',
      );
    } finally {
      setGenLoading(false);
    }
  }, [genContent, genCount, genSubject, genGrade]);

  // --- Regenerate ---
  const handleRegenerate = useCallback(async () => {
    // Remove previously generated questions from bank
    setQuestionBank([]);
    setQuestionBankIds([]);
    setGeneratedQuestions([]);
    await handleGenerate();
  }, [handleGenerate]);

  // --- Submit ---
  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');

    if (!selectedGame) {
      setError('Please select a game');
      return;
    }

    if (questionSource === 'custom' && totalQuestions < 10) {
      setError('You need at least 10 questions to create a session');
      return;
    }

    setLoading(true);

    try {
      const payload: Parameters<typeof sessionAPI.create>[0] = {
        game_type: selectedGame,
        teacher_mode: teacherMode,
        time_limit_minutes: timeLimit,
        max_players: maxPlayers,
        question_source: questionSource,
      };

      if (questionSource === 'math') {
        payload.question_config = {
          type: 'math',
          operations: mathOps,
          range: mathRange,
        };
      } else {
        payload.question_bank_ids = questionBankIds;
      }

      const session = await sessionAPI.create(payload);
      navigate(`/monitor/${session.code}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create session',
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Create Session</h2>
            <p className="text-brand/50 text-sm">
              Pick a game, build your questions, and launch
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-ghost text-sm flex items-center gap-1.5"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {/* ============================================= */}
          {/* Step 1: Game Selection                        */}
          {/* ============================================= */}
          <div className="glass-card p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Gamepad2 size={20} className="text-brand" />
              Choose Your Game
            </h3>
            <p className="text-brand/40 text-sm mb-4">
              One game per session -- the whole class competes on the same
              leaderboard
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {AVAILABLE_GAMES.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelectedGame(game.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-center group ${
                    selectedGame === game.id
                      ? 'border-brand bg-brand/10 text-white'
                      : 'border-brand/10 bg-surface-light hover:border-brand/30 text-brand/60'
                  }`}
                >
                  <div className="text-2xl mb-2 font-bold text-brand/80 group-hover:text-brand">
                    {game.name.charAt(0)}
                  </div>
                  <p className="text-xs font-medium truncate">{game.name}</p>
                  <p className="text-[10px] text-brand/30 mt-0.5 capitalize">
                    {game.difficulty}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* ============================================= */}
          {/* Step 2: Review Questions                      */}
          {/* ============================================= */}
          <div className="glass-card p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Brain size={20} className="text-brand" />
              Review Questions
            </h3>
            <p className="text-brand/40 text-sm mb-4">
              Students answer these to respawn after dying in the game
            </p>

            {/* Tabs */}
            <div className="flex gap-1 bg-surface-light rounded-xl p-1 mb-5">
              {[
                {
                  key: 'math' as QuestionTab,
                  label: 'Math (Auto)',
                  icon: <Calculator size={14} />,
                },
                {
                  key: 'custom' as QuestionTab,
                  label: 'Your Questions',
                  icon: <FileText size={14} />,
                },
                {
                  key: 'generate' as QuestionTab,
                  label: 'Generate from Content',
                  icon: <BookOpen size={14} />,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    questionTab === tab.key
                      ? 'bg-brand/15 text-brand'
                      : 'text-brand/40 hover:text-brand/60'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ---- Tab: Math (Auto) ---- */}
            {questionTab === 'math' && (
              <div className="space-y-4">
                <p className="text-brand/60 text-sm">
                  Math questions are generated automatically during gameplay.
                  Students solve problems to respawn.
                </p>

                <div>
                  <label className="text-sm text-brand/70 mb-2 block">
                    Operations
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MATH_OPERATIONS.map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() =>
                          setMathOps((prev) =>
                            prev.includes(op.id)
                              ? prev.filter((o) => o !== op.id)
                              : [...prev, op.id],
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          mathOps.includes(op.id)
                            ? 'bg-brand/15 text-brand ring-1 ring-brand/30'
                            : 'bg-surface-light text-brand/40 hover:text-brand/60'
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm text-brand/70 mb-2">
                    <span>Number Range</span>
                    <span className="text-white font-medium">
                      {mathRange[0]} - {mathRange[1]}
                    </span>
                  </label>
                  <div className="flex gap-4">
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={mathRange[0]}
                      onChange={(e) =>
                        setMathRange([parseInt(e.target.value), mathRange[1]])
                      }
                      className="flex-1 accent-brand"
                    />
                    <input
                      type="range"
                      min={2}
                      max={50}
                      value={mathRange[1]}
                      onChange={(e) =>
                        setMathRange([mathRange[0], parseInt(e.target.value)])
                      }
                      className="flex-1 accent-brand"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ---- Tab: Your Questions ---- */}
            {questionTab === 'custom' && (
              <div className="space-y-4">
                {/* Question count badge */}
                <div className="flex items-center justify-between">
                  <p className="text-brand/60 text-sm">
                    Paste, type, or import your review questions.
                    {totalQuestions < 10 && (
                      <span className="text-amber-400 ml-1">
                        Need at least 10 (have {totalQuestions}).
                      </span>
                    )}
                  </p>
                  {totalQuestions > 0 && (
                    <span className="text-xs font-medium text-brand bg-brand/10 px-2.5 py-1 rounded-full">
                      {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Paste area */}
                <div>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={`Paste your questions here...\n\n1. What is the capital of France?\n  A) London\n  B) Berlin\n  *C) Paris\n  D) Madrid\n\n2. Which planet is closest to the Sun?\n  *A) Mercury\n  B) Venus\n  C) Earth\n  D) Mars`}
                    rows={6}
                    className="w-full bg-surface-light border border-brand/15 rounded-xl px-4 py-3 text-white placeholder-brand/30 text-sm focus:outline-none focus:border-brand/40 resize-y"
                  />
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleParse}
                      disabled={parseLoading || !pasteText.trim()}
                      className="btn-ice text-xs px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {parseLoading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <FileText size={12} />
                      )}
                      Parse Questions
                    </button>
                    <label className="btn-ghost text-xs px-4 py-1.5 flex items-center gap-1.5 cursor-pointer border border-brand/20 rounded-lg">
                      <Upload size={12} />
                      Upload File (.csv, .txt)
                      <input
                        type="file"
                        accept=".csv,.txt,.tsv"
                        onChange={handleQuestionFileUpload}
                        className="hidden"
                      />
                    </label>
                    {parseError && (
                      <span className="text-red-400 text-xs">{parseError}</span>
                    )}
                  </div>
                </div>

                {/* Manual entry */}
                {showManualForm ? (
                  <ManualQuestionForm
                    onAdd={handleManualAdd}
                    onCancel={() => setShowManualForm(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowManualForm(true)}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-brand/15 text-brand/40 hover:text-brand/60 hover:border-brand/30 transition-colors text-xs flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    Add Question Manually
                  </button>
                )}

                {/* Question bank preview */}
                {questionBank.length > 0 && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {questionBank.map((q, i) => (
                      <QuestionPreview
                        key={q.question_id || i}
                        q={q}
                        index={i}
                        onRemove={() => handleRemoveQuestion(i)}
                      />
                    ))}
                  </div>
                )}

                {/* Amplify section */}
                {questionBank.length > 0 && (
                  <div className="border-t border-brand/10 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAmplify(!showAmplify)}
                      className="flex items-center gap-2 text-sm font-medium text-brand/70 hover:text-brand transition-colors w-full"
                    >
                      {showAmplify ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                      <Brain size={14} />
                      Generate More from Content
                      <span className="text-brand/30 text-xs ml-auto">
                        AI will match your question style
                      </span>
                    </button>

                    {showAmplify && (
                      <div className="mt-3 space-y-3">
                        <textarea
                          value={amplifyContent}
                          onChange={(e) => setAmplifyContent(e.target.value)}
                          placeholder="Paste your standards, study guide, vocab list, lesson plan, or any reference material..."
                          rows={4}
                          className="w-full bg-surface-light border border-brand/15 rounded-xl px-4 py-3 text-white placeholder-brand/30 text-sm focus:outline-none focus:border-brand/40 resize-y"
                        />
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-xs text-brand/40 mb-1 block">
                              Subject (optional)
                            </label>
                            <input
                              type="text"
                              value={amplifySubject}
                              onChange={(e) => setAmplifySubject(e.target.value)}
                              placeholder="e.g., Biology"
                              className="w-full bg-surface-light border border-brand/15 rounded-lg px-3 py-1.5 text-white placeholder-brand/30 text-xs focus:outline-none focus:border-brand/40"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-brand/40 mb-1 block">
                              Grade Level (optional)
                            </label>
                            <input
                              type="text"
                              value={amplifyGrade}
                              onChange={(e) => setAmplifyGrade(e.target.value)}
                              placeholder="e.g., 8th Grade"
                              className="w-full bg-surface-light border border-brand/15 rounded-lg px-3 py-1.5 text-white placeholder-brand/30 text-xs focus:outline-none focus:border-brand/40"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-brand/40 shrink-0">
                            Generate
                          </label>
                          <input
                            type="range"
                            min={5}
                            max={50}
                            value={amplifyCount}
                            onChange={(e) =>
                              setAmplifyCount(parseInt(e.target.value))
                            }
                            className="flex-1 accent-brand"
                          />
                          <span className="text-white text-xs font-medium w-16 text-right">
                            {amplifyCount} more
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleAmplify}
                            disabled={amplifyLoading}
                            className="btn-ice text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-40"
                          >
                            {amplifyLoading ? (
                              <>
                                <Loader2 size={12} className="animate-spin" />
                                Generating questions...
                              </>
                            ) : (
                              <>
                                <Brain size={12} />
                                Generate {amplifyCount} More
                              </>
                            )}
                          </button>
                          {amplifyError && (
                            <span className="text-red-400 text-xs">
                              {amplifyError}
                            </span>
                          )}
                        </div>

                        {/* Amplified preview */}
                        {amplifiedQuestions.length > 0 && (
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setShowAmplifiedPreview(!showAmplifiedPreview)
                              }
                              className="flex items-center gap-1.5 text-xs text-brand/40 hover:text-brand/60 mb-2"
                            >
                              {showAmplifiedPreview ? (
                                <ChevronUp size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              )}
                              {amplifiedQuestions.length} AI-generated questions
                              added
                            </button>
                            {showAmplifiedPreview && (
                              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                                {amplifiedQuestions.map((q, i) => (
                                  <QuestionPreview
                                    key={q.question_id || i}
                                    q={q}
                                    index={
                                      questionBank.length -
                                      amplifiedQuestions.length +
                                      i
                                    }
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ---- Tab: Generate from Content ---- */}
            {questionTab === 'generate' && (
              <div className="space-y-4">
                <p className="text-brand/60 text-sm">
                  Paste your study material and AI will create a full question
                  bank for you.
                </p>

                <textarea
                  value={genContent}
                  onChange={(e) => setGenContent(e.target.value)}
                  placeholder="Paste your study guide, standards, vocabulary list, lesson plan, or any content you want students to review..."
                  rows={6}
                  className="w-full bg-surface-light border border-brand/15 rounded-xl px-4 py-3 text-white placeholder-brand/30 text-sm focus:outline-none focus:border-brand/40 resize-y"
                />
                <div className="mt-2 mb-4">
                  <label className="btn-ghost text-xs px-4 py-1.5 inline-flex items-center gap-1.5 cursor-pointer border border-brand/20 rounded-lg">
                    <Upload size={12} />
                    Upload File (.txt, .csv)
                    <input
                      type="file"
                      accept=".txt,.csv,.tsv,.md"
                      onChange={handleContentFileUpload}
                      className="hidden"
                    />
                  </label>
                  {genContent && (
                    <span className="text-brand/40 text-xs ml-3">
                      {genContent.length.toLocaleString()} characters
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-brand/40 mb-1 block">
                      Subject (optional)
                    </label>
                    <input
                      type="text"
                      value={genSubject}
                      onChange={(e) => setGenSubject(e.target.value)}
                      placeholder="e.g., US History"
                      className="w-full bg-surface-light border border-brand/15 rounded-lg px-3 py-2 text-white placeholder-brand/30 text-xs focus:outline-none focus:border-brand/40"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-brand/40 mb-1 block">
                      Grade Level (optional)
                    </label>
                    <input
                      type="text"
                      value={genGrade}
                      onChange={(e) => setGenGrade(e.target.value)}
                      placeholder="e.g., 10th Grade"
                      className="w-full bg-surface-light border border-brand/15 rounded-lg px-3 py-2 text-white placeholder-brand/30 text-xs focus:outline-none focus:border-brand/40"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs text-brand/40 shrink-0">
                    Questions
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={50}
                    value={genCount}
                    onChange={(e) => setGenCount(parseInt(e.target.value))}
                    className="flex-1 accent-brand"
                  />
                  <span className="text-white text-xs font-medium w-8 text-right">
                    {genCount}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {generatedQuestions.length === 0 ? (
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={genLoading || !genContent.trim()}
                      className="btn-ice text-xs px-5 py-2 flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {genLoading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Generating questions...
                        </>
                      ) : (
                        <>
                          <Brain size={14} />
                          Generate {genCount} Questions
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRegenerate}
                      disabled={genLoading}
                      className="btn-ghost text-xs px-4 py-2 flex items-center gap-1.5 border border-brand/20 disabled:opacity-40"
                    >
                      {genLoading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          Regenerate
                        </>
                      )}
                    </button>
                  )}
                  {genError && (
                    <span className="text-red-400 text-xs">{genError}</span>
                  )}
                </div>

                {/* Generated questions preview */}
                {generatedQuestions.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowGenPreview(!showGenPreview)}
                      className="flex items-center gap-1.5 text-sm font-medium text-brand/60 hover:text-brand mb-2"
                    >
                      {showGenPreview ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                      <Check size={14} className="text-emerald-400" />
                      {generatedQuestions.length} questions generated
                    </button>
                    {showGenPreview && (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {generatedQuestions.map((q, i) => (
                          <QuestionPreview
                            key={q.question_id || i}
                            q={q}
                            index={i}
                            onRemove={() => handleRemoveQuestion(i)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============================================= */}
          {/* Step 3: Teacher Mode                          */}
          {/* ============================================= */}
          <div className="glass-card p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Monitor size={20} className="text-brand" />
              Your Role
            </h3>
            <p className="text-brand/40 text-sm mb-4">
              Monitor from the projector or compete against your students
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTeacherMode('monitor')}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  teacherMode === 'monitor'
                    ? 'border-brand bg-brand/10'
                    : 'border-brand/10 hover:border-brand/30'
                }`}
              >
                <Monitor
                  size={24}
                  className={
                    teacherMode === 'monitor'
                      ? 'text-brand mb-2'
                      : 'text-brand/40 mb-2'
                  }
                />
                <p className="text-white font-medium">Monitor Mode</p>
                <p className="text-brand/40 text-xs mt-1">
                  Projector shows live leaderboard and player activity
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTeacherMode('play')}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  teacherMode === 'play'
                    ? 'border-brand bg-brand/10'
                    : 'border-brand/10 hover:border-brand/30'
                }`}
              >
                <Play
                  size={24}
                  className={
                    teacherMode === 'play'
                      ? 'text-brand mb-2'
                      : 'text-brand/40 mb-2'
                  }
                />
                <p className="text-white font-medium">Play Mode</p>
                <p className="text-brand/40 text-xs mt-1">
                  Compete alongside your students on the leaderboard
                </p>
              </button>
            </div>
          </div>

          {/* ============================================= */}
          {/* Step 4: Settings                              */}
          {/* ============================================= */}
          <div className="glass-card p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Timer size={20} className="text-brand" />
              Settings
            </h3>

            <div className="space-y-6">
              <div>
                <label className="flex items-center justify-between text-sm text-brand/70 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} />
                    Max Players
                  </span>
                  <span className="text-white font-medium">{maxPlayers}</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                  className="w-full accent-brand"
                />
                <div className="flex justify-between text-xs text-brand/30 mt-1">
                  <span>5</span>
                  <span>100</span>
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between text-sm text-brand/70 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Timer size={14} />
                    Time Limit
                  </span>
                  <span className="text-white font-medium">
                    {timeLimit} min
                  </span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                  className="w-full accent-brand"
                />
                <div className="flex justify-between text-xs text-brand/30 mt-1">
                  <span>5 min</span>
                  <span>60 min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary + Submit */}
          <div className="glass-card p-6 border-brand/20 mb-6">
            <h3 className="text-white font-semibold mb-3">Session Summary</h3>
            <div className="space-y-1.5 text-sm">
              <p className="text-brand/60">
                <span className="text-brand/40">Game:</span>{' '}
                <span className="text-white">
                  {gameInfo?.name || 'None selected'}
                </span>
              </p>
              <p className="text-brand/60">
                <span className="text-brand/40">Questions:</span>{' '}
                <span className="text-white">
                  {questionSource === 'math'
                    ? 'Math (auto-generated)'
                    : `${totalQuestions} custom questions`}
                </span>
              </p>
              <p className="text-brand/60">
                <span className="text-brand/40">Mode:</span>{' '}
                <span className="text-white capitalize">{teacherMode}</span>
              </p>
              <p className="text-brand/60">
                <span className="text-brand/40">Players:</span>{' '}
                <span className="text-white">Up to {maxPlayers}</span>
              </p>
              <p className="text-brand/60">
                <span className="text-brand/40">Duration:</span>{' '}
                <span className="text-white">{timeLimit} minutes</span>
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-ghost flex-1 py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedGame || !hasEnoughQuestions}
              className="btn-ice flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Session'}
              {!loading && <ChevronRight size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
