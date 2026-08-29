// components/QuestModule.tsx
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { playChime, playClash, playLevelUp } from '@/lib/sounds';
import GameButton from '@/components/GameButton';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import { calculateReward } from '@/lib/quizReward';

// Proper Fisher-Yates — sort(() => Math.random() - 0.5) looks equivalent but
// is heavily biased (see components/battle/shared.tsx's shuffleArray).
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Exported so other screens that render the same summary_markdown (e.g. the
// pre-quest "Study Session" screens in app/page.tsx) can match this styling
// instead of falling back to plain/unstyled markdown.
export const markdownComponents = {
  h1: (props: any) => <h1 className="text-2xl font-bold font-display text-[#2a1505] mt-6 mb-3 first:mt-0" {...props} />,
  h2: (props: any) => <h2 className="text-xl font-bold font-display text-[#2a1505] mt-6 mb-3 first:mt-0" {...props} />,
  h3: (props: any) => <h3 className="text-lg font-bold font-display text-[#7a4a0f] mt-6 mb-2 first:mt-0" {...props} />,
  p: (props: any) => <p className="text-[#3a2610] leading-relaxed mb-4" {...props} />,
  strong: (props: any) => <strong className="text-[#1a0d05] font-bold" {...props} />,
  ul: (props: any) => <ul className="list-disc list-outside pl-5 mb-4 space-y-1 text-[#3a2610]" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-outside pl-5 mb-4 space-y-1 text-[#3a2610]" {...props} />,
  li: (props: any) => <li className="pl-1" {...props} />,
  hr: () => <hr className="border-[#c9a87a] my-6" />,
  blockquote: (props: any) => <blockquote className="border-l-4 border-[#c9781a] pl-4 italic text-[#6b4820] my-4" {...props} />,
  // GFM tables (needs remarkPlugins={[remarkGfm]} passed alongside this map —
  // plain react-markdown doesn't parse table syntax at all, it just falls
  // through as a literal pipe-delimited paragraph).
  table: (props: any) => <div className="overflow-x-auto mb-4"><table className="w-full text-sm border-collapse" {...props} /></div>,
  thead: (props: any) => <thead className="text-[#2a1505]" {...props} />,
  tr: (props: any) => <tr className="border-b border-[#c9a87a]" {...props} />,
  th: (props: any) => <th className="text-left font-bold py-2 px-3 border-b border-[#c9a87a]" {...props} />,
  td: (props: any) => <td className="py-2 px-3 text-[#3a2610]" {...props} />,
};

interface QuizQuestion {
  question: string;
  options: string[];
}

export interface QuizGradeResult {
  correct_count: number;
  total: number;
  is_perfect: boolean;
  correct_answers: string[];
}

interface QuestModuleProps {
  userId: string;
  questName: string;
  questKey: string;
  questData: any;
  currentStats: CharacterStats;
  attemptsSoFar: number;
  isMastered: boolean;
  // Grading happens server-side (grade_content_quiz / grade_event_quiz RPCs) —
  // questData never carries correct_answer, so this module can't compare
  // locally even if it wanted to.
  gradeQuiz: (selectedAnswers: Record<number, string>) => Promise<QuizGradeResult>;
  onQuizSubmit: (isPerfect: boolean, newAttempts: number, newStats: CharacterStats, xpEarned: number, goldEarned: number) => void;
  onExit: () => void;
}

const COOLDOWN_SECONDS = 20;

export default function QuestModule({ userId, questName, questKey, questData, currentStats, attemptsSoFar, isMastered, gradeQuiz, onQuizSubmit, onExit }: QuestModuleProps) {
  const safeAttemptsSoFar = Number.isFinite(attemptsSoFar) ? attemptsSoFar : 0;

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [grading, setGrading] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<Record<number, string[]>>({});
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<{ isPerfect: boolean; score: number; total: number; xp: number; gold: number; attemptNumber: number } | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [celebration, setCelebration] = useState<{ active: boolean; type: 'levelup' | 'perfect' }>({ active: false, type: 'perfect' });

  // Countdown ticker
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setTimeout(() => setCooldownRemaining(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownRemaining]);

  useEffect(() => {
    const newShuffled: Record<number, string[]> = {};
    quiz.forEach((q, i) => {
      newShuffled[i] = shuffleArray(q.options);
    });
    setShuffledOptions(newShuffled);
  }, [submitted]);

  const content = typeof questData === 'string'
    ? questData
    : questData?.content || questData?.summary_markdown || "### Welcome to this module!\n\nRead the material carefully before proceeding.";

  const quiz: QuizQuestion[] = questData?.quiz || [];

  const handleSelect = (qIndex: number, option: string) => {
    if (submitted) return;
    setSelectedAnswers({ ...selectedAnswers, [qIndex]: option });
  };

  const handleSubmitQuiz = async () => {
    if (grading) return;
    setGrading(true);
    let graded: QuizGradeResult;
    try {
      graded = await gradeQuiz(selectedAnswers);
    } catch (err) {
      console.error('Failed to grade quiz:', err);
      setGrading(false);
      alert('⚠️ Could not grade your quiz — please try again.');
      return;
    }
    setGrading(false);

    const { correct_count: correctCount, total, is_perfect: isPerfect, correct_answers: gradedAnswers } = graded;
    const newAttempts = safeAttemptsSoFar + 1;

    let newStats = { ...currentStats };
    let reward = { xp: 0, gold: 0 };

    if (isPerfect) {
      reward = calculateReward(newAttempts);
      newStats.xp += reward.xp;
      newStats.gold += reward.gold;

      let currentXp = newStats.xp;
      let currentLvl = newStats.level;
      while (currentXp >= (500 + currentLvl * 100)) {
        currentXp -= (500 + currentLvl * 100);
        currentLvl += 1;
      }
      newStats.xp = currentXp;
      newStats.level = currentLvl;

      if (currentLvl > currentStats.level) {
        playLevelUp();
        setCelebration({ active: true, type: 'levelup' });
      } else {
        playChime();
        setCelebration({ active: true, type: 'perfect' });
      }
    } else {
      // Wrong answer(s) — lock the retry button behind a short cooldown
      // to nudge re-reading the material instead of instant re-guessing.
      setCooldownRemaining(COOLDOWN_SECONDS);
      playClash();
    }

    setCorrectAnswers(gradedAnswers || []);
    setSubmitted(true);
    setLastResult({ isPerfect, score: correctCount, total, xp: reward.xp, gold: reward.gold, attemptNumber: newAttempts });
    onQuizSubmit(isPerfect, newAttempts, newStats, reward.xp, reward.gold);
  };

  const handleRetry = () => {
    if (cooldownRemaining > 0) return;
    setSelectedAnswers({});
    setSubmitted(false);
    setLastResult(null);
  };

  const allAnswered = quiz.length > 0 && quiz.every((_, i) => selectedAnswers[i] !== undefined);

  // --- ALREADY MASTERED: locked recap view ---
  if (isMastered) {
    const recap = calculateReward(safeAttemptsSoFar);
    return (
      <div className="bg-[#e8f5e0] border border-green-700 p-8 rounded-xl text-center">
        <h2 className="text-3xl font-bold text-green-700 mb-4 font-display">Quest Completed!</h2>
        <p className="text-[#6b4820] mb-2">Mastered in {safeAttemptsSoFar || 1} attempt{safeAttemptsSoFar !== 1 ? 's' : ''}.</p>
        <p className="text-xl text-[#2a1505] mb-6">You earned <span className="font-bold text-[#c9781a] font-mono">{recap.xp} XP</span> and <span className="font-bold text-yellow-600 font-mono">{recap.gold} Gold</span>.</p>
        <GameButton variant="quest" color="#8b5e2a" onClick={onExit} style={{ fontSize: 15 }}>
          Return to Campaign Map
        </GameButton>
      </div>
    );
  }

  // --- JUST HIT A PERFECT SCORE ---
  if (submitted && lastResult?.isPerfect) {
    return (
      <div className="bg-[#e8f5e0] border border-green-700 p-8 rounded-xl text-center">
        <h2 className="text-3xl font-bold text-green-700 mb-4 font-display">Quest Completed!</h2>
        <p className="text-[#6b4820] mb-2">Perfect score: {lastResult.score}/{lastResult.total} in {lastResult.attemptNumber} attempt(s).</p>
        <p className="text-xl text-[#2a1505] mb-6">You earned <span className="font-bold text-[#c9781a] font-mono">{lastResult.xp} XP</span> and <span className="font-bold text-yellow-600 font-mono">{lastResult.gold} Gold</span>.</p>
        <GameButton variant="quest" color="#8b5e2a" onClick={onExit} style={{ fontSize: 15 }}>
          Return to Campaign Map
        </GameButton>
      </div>
    );
  }

  return (
    <div className="bg-[#f0ddb8] border border-[#8b5e2a] p-8 rounded-xl shadow-2xl">
      <div className="flex justify-between items-center border-b border-[#c9a87a] pb-4 mb-6">
        <h2 className="text-2xl font-bold text-[#7a4a0f] font-display">{questName.replace('_', ' ')}</h2>
        <span className="bg-[#c9781a]/20 text-[#7a4a0f] text-xs font-bold px-3 py-1 rounded-full border border-[#8b5e2a]">
          {safeAttemptsSoFar > 0 ? `ATTEMPT ${safeAttemptsSoFar + 1}` : 'IN PROGRESS'}
        </span>
      </div>

      {!hasStarted && (
        <div className="mb-10 bg-[#e8d0a0]/60 border border-[#c9a87a] rounded-xl p-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{content}</ReactMarkdown>
        </div>
      )}

      {!hasStarted && quiz.length > 0 && (
        <div className="border-t border-[#c9a87a] pt-6 flex justify-center">
          <GameButton variant="quest" color="#3b82f6" onClick={() => setHasStarted(true)} style={{ fontSize: 16 }}>
            ▶ Start Exam
          </GameButton>
        </div>
      )}

      {hasStarted && quiz.length > 0 ? (
        <div className="border-t border-[#c9a87a] pt-6">
          <h3 className="text-xl font-bold mb-4 font-display text-[#2a1505]">Quiz: Score a perfect round to claim loot!</h3>

          {submitted && !lastResult?.isPerfect && (
            <div className="bg-red-100 border border-red-500 rounded-lg p-4 mb-6 text-red-700">
              <p className="font-bold mb-1">❌ Not quite — {lastResult?.score}/{lastResult?.total} correct.</p>
              <p className="text-sm text-red-600">
                No loot awarded this attempt. 📖 Review your mistakes and remember the correct answers below before your next try — it'll help more than guessing.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {quiz.map((q, i) => (
              <div key={i} className="bg-white border border-[#c9a87a] rounded-lg p-4">
                <p className="font-bold mb-3 text-[#2a1505]">{i + 1}. {q.question}</p>
                <div className="space-y-2">
                  {(shuffledOptions[i] || q.options).map((opt) => {
                    const isSelected = selectedAnswers[i] === opt;
                    const showFeedback = submitted;
                    const isCorrectOption = opt === correctAnswers[i];
                    let optionStyle = 'bg-[#f0ddb8] border-[#c9a87a] hover:border-[#c9781a] hover:bg-[#e8c88a] text-[#2a1505]';
                    if (showFeedback) {
                      if (isCorrectOption) optionStyle = 'bg-green-100 border-green-600 text-[#2a1505]';
                      else if (isSelected && !isCorrectOption) optionStyle = 'bg-red-100 border-red-500 text-[#2a1505]';
                    } else if (isSelected) {
                      optionStyle = 'bg-[#c9781a]/20 border-[#c9781a] text-[#2a1505]';
                    }
                    return (
                      <GameButton
                        key={opt}
                        onClick={() => handleSelect(i, opt)}
                        disabled={submitted}
                        className={`w-full text-left p-2 rounded border text-sm transition-colors ${optionStyle}`}
                      >
                        {opt}
                      </GameButton>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3 items-center">
            {submitted ? (
              <>
                {cooldownRemaining > 0 && (
                  <span className="text-sm text-[#6b4820] font-mono">
                    ⏳ Review time: {cooldownRemaining}s
                  </span>
                )}
                <GameButton
                  variant="quest"
                  color="#3b82f6"
                  onClick={handleRetry}
                  disabled={cooldownRemaining > 0}
                  style={{ fontSize: 15 }}
                >
                  {cooldownRemaining > 0 ? `🔒 Wait ${cooldownRemaining}s` : '🔁 Try Again'}
                </GameButton>
              </>
            ) : (
              <>
                <GameButton
                  variant="quest"
                  color="#3b82f6"
                  onClick={handleSubmitQuiz}
                  disabled={!allAnswered || grading}
                  style={{ fontSize: 15 }}
                >
                  {grading ? '⏳ Grading...' : '✅ Submit Quiz'}
                </GameButton>
              </>
            )}
          </div>
        </div>
      ) : !hasStarted ? null : (
        <div className="mt-8 pt-6 border-t border-[#c9a87a] flex justify-between items-center">
          <p className="text-sm text-[#6b4820]">No quiz for this module — read the material above.</p>
        </div>
      )}
    <CelebrationOverlay
        userId={userId}
        trigger={celebration.active}
        type={celebration.type}
        onComplete={() => setCelebration({ active: false, type: 'perfect' })}
      />
    </div>
  );
}