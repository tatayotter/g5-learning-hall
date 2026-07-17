// components/QuestModule.tsx
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { playChime, playClash, playLevelUp } from '@/lib/sounds';
import GameButton from '@/components/GameButton';
import CelebrationOverlay from '@/components/CelebrationOverlay';

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

const markdownComponents = {
  h1: (props: any) => <h1 className="text-2xl font-bold font-display text-white mt-6 mb-3 first:mt-0" {...props} />,
  h2: (props: any) => <h2 className="text-xl font-bold font-display text-white mt-6 mb-3 first:mt-0" {...props} />,
  h3: (props: any) => <h3 className="text-lg font-bold font-display text-blue-400 mt-6 mb-2 first:mt-0" {...props} />,
  p: (props: any) => <p className="text-gray-300 leading-relaxed mb-4" {...props} />,
  strong: (props: any) => <strong className="text-white font-bold" {...props} />,
  ul: (props: any) => <ul className="list-disc list-outside pl-5 mb-4 space-y-1 text-gray-300" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-outside pl-5 mb-4 space-y-1 text-gray-300" {...props} />,
  li: (props: any) => <li className="pl-1" {...props} />,
  hr: () => <hr className="border-neutral-700 my-6" />,
  blockquote: (props: any) => <blockquote className="border-l-4 border-blue-600 pl-4 italic text-gray-400 my-4" {...props} />,
};

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
}

interface QuestModuleProps {
  userId: string;
  questName: string;
  questKey: string;
  questData: any;
  currentStats: CharacterStats;
  attemptsSoFar: number;
  isMastered: boolean;
  onQuizSubmit: (isPerfect: boolean, newAttempts: number, newStats: CharacterStats, xpEarned: number, goldEarned: number) => void;
  onExit: () => void;
}

const COOLDOWN_SECONDS = 20;

function calculateReward(attempts: number) {
  const safeAttempts = Number.isFinite(attempts) && attempts > 0 ? attempts : 1;
  const multiplier = Math.max(1 - 0.1 * (safeAttempts - 1), 0.5);
  return {
    xp: Math.round(200 * multiplier),
    gold: Math.round(50 * multiplier)
  };
}

export default function QuestModule({ userId, questName, questKey, questData, currentStats, attemptsSoFar, isMastered, onQuizSubmit, onExit }: QuestModuleProps) {
  const safeAttemptsSoFar = Number.isFinite(attemptsSoFar) ? attemptsSoFar : 0;

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<Record<number, string[]>>({});
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

  const handleSubmitQuiz = () => {
    const total = quiz.length;
    let correctCount = 0;
    quiz.forEach((q, i) => {
      if (selectedAnswers[i] === q.correct_answer) correctCount++;
    });
    const isPerfect = total > 0 && correctCount === total;
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
      <div className="bg-green-900/20 border border-green-800 p-8 rounded-xl text-center">
        <h2 className="text-3xl font-bold text-green-400 mb-4 font-display">✅ Quest Completed!</h2>
        <p className="text-gray-400 mb-2">Mastered in {safeAttemptsSoFar || 1} attempt{safeAttemptsSoFar !== 1 ? 's' : ''}.</p>
        <p className="text-xl mb-6">You earned <span className="font-bold text-blue-400 font-mono">{recap.xp} XP</span> and <span className="font-bold text-yellow-400 font-mono">{recap.gold} Gold</span>.</p>
        <GameButton
          onClick={onExit}
          className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-6 rounded transition-colors"
        >
          Return to Campaign Map
        </GameButton>
      </div>
    );
  }

  // --- JUST HIT A PERFECT SCORE ---
  if (submitted && lastResult?.isPerfect) {
    return (
      <div className="bg-green-900/20 border border-green-800 p-8 rounded-xl text-center">
        <h2 className="text-3xl font-bold text-green-400 mb-4 font-display">🎉 Quest Completed!</h2>
        <p className="text-gray-400 mb-2">Perfect score: {lastResult.score}/{lastResult.total} in {lastResult.attemptNumber} attempt(s).</p>
        <p className="text-xl mb-6">You earned <span className="font-bold text-blue-400 font-mono">{lastResult.xp} XP</span> and <span className="font-bold text-yellow-400 font-mono">{lastResult.gold} Gold</span>.</p>
        <GameButton
          onClick={onExit}
          className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-6 rounded transition-colors"
        >
          Return to Campaign Map
        </GameButton>
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-[#333] p-8 rounded-xl shadow-2xl">
      <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-blue-400 font-display">{questName.replace('_', ' ')}</h2>
        <span className="bg-blue-900/30 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-800">
          {safeAttemptsSoFar > 0 ? `ATTEMPT ${safeAttemptsSoFar + 1}` : 'IN PROGRESS'}
        </span>
      </div>

      {!hasStarted && (
        <div className="mb-10 bg-black/30 border border-neutral-800 rounded-xl p-6">
          <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
        </div>
      )}

      {!hasStarted && quiz.length > 0 && (
        <div className="border-t border-neutral-800 pt-6 flex justify-center">
          <GameButton
            onClick={() => setHasStarted(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-10 rounded transition-colors font-display text-lg"
          >
            ▶ Start Exam
          </GameButton>
        </div>
      )}

      {hasStarted && quiz.length > 0 ? (
        <div className="border-t border-neutral-800 pt-6">
          <h3 className="text-xl font-bold mb-4 font-display">📝 Quiz: Score a perfect round to claim loot!</h3>

          {submitted && !lastResult?.isPerfect && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6 text-red-400">
              <p className="font-bold mb-1">❌ Not quite — {lastResult?.score}/{lastResult?.total} correct.</p>
              <p className="text-sm text-gray-400">
                No loot awarded this attempt. 📖 Review your mistakes and remember the correct answers below before your next try — it'll help more than guessing.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {quiz.map((q, i) => (
              <div key={i} className="bg-black border border-neutral-800 rounded-lg p-4">
                <p className="font-bold mb-3">{i + 1}. {q.question}</p>
                <div className="space-y-2">
                  {(shuffledOptions[i] || q.options).map((opt) => {
                    const isSelected = selectedAnswers[i] === opt;
                    const showFeedback = submitted;
                    const isCorrectOption = opt === q.correct_answer;
                    let optionStyle = 'border-neutral-700 hover:border-blue-500';
                    if (showFeedback) {
                      if (isCorrectOption) optionStyle = 'border-green-600 bg-green-900/20';
                      else if (isSelected && !isCorrectOption) optionStyle = 'border-red-600 bg-red-900/20';
                    } else if (isSelected) {
                      optionStyle = 'border-blue-500 bg-blue-900/20';
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
                  <span className="text-sm text-gray-500 font-mono">
                    ⏳ Review time: {cooldownRemaining}s
                  </span>
                )}
                <GameButton
                  onClick={handleRetry}
                  disabled={cooldownRemaining > 0}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {cooldownRemaining > 0 ? `🔒 Wait ${cooldownRemaining}s` : '🔁 Try Again'}
                </GameButton>
              </>
            ) : (
              <GameButton
                onClick={handleSubmitQuiz}
                disabled={!allAnswered}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ✅ Submit Quiz
              </GameButton>
            )}
          </div>
        </div>
      ) : !hasStarted ? null : (
        <div className="mt-8 pt-6 border-t border-neutral-800 flex justify-between items-center">
          <p className="text-sm text-gray-400">No quiz for this module — read the material above.</p>
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