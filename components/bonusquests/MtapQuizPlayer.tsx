// components/bonusquests/MtapQuizPlayer.tsx
// Timed quiz player for one archetype+tier of the MTAP Expansion Pack. Mirrors
// QuestModule.tsx's option-state styling and GameButton usage (see
// docs/STYLE_GUIDE.md's parchment palette) but grades one question at a time
// through grade_mtap_expansion_answer instead of a whole-quiz RPC, since each
// question here carries its own timer and its own reward-eligibility check.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { UserId } from '@/lib/userSession';
import { calculateReward } from '@/lib/quizReward';
import GameButton from '@/components/GameButton';
import {
  MtapQuestion, MtapGradeResult, fetchMtapQuestions, gradeMtapAnswer, creditMtapReward,
} from '@/lib/mtapEngine';
import { TIER_LABEL, MtapTier } from '@/lib/mtapContent';

interface MtapQuizPlayerProps {
  userId: UserId;
  grade: number;
  archetype: string;
  archetypeName: string;
  tier: MtapTier;
  onExit: () => void;
  onRewardEarned?: (xp: number, gold: number) => void;
  onProgress?: () => void; // called after each grade, so the parent can refresh attempts/mastery
}

type Phase = 'loading' | 'question' | 'answered' | 'done' | 'empty';

export default function MtapQuizPlayer({
  userId, grade, archetype, archetypeName, tier, onExit, onRewardEarned, onProgress,
}: MtapQuizPlayerProps) {
  const [questions, setQuestions] = useState<MtapQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<MtapGradeResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [grading, setGrading] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionReward, setSessionReward] = useState({ xp: 0, gold: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const qs = await fetchMtapQuestions(grade, archetype, tier);
      if (cancelled) return;
      if (qs.length === 0) {
        setPhase('empty');
        return;
      }
      // Shuffle so a repeat session doesn't always see the bank in the same order.
      const shuffled = [...qs].sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
      setTimeLeft(shuffled[0].time_budget_seconds);
      setPhase('question');
    })();
    return () => { cancelled = true; };
  }, [grade, archetype, tier]);

  const current = questions[index];

  const handleTimeout = useCallback(() => {
    if (phase !== 'question') return;
    setSelected(null);
    setResult({ correct: false, correct_answer: '', solution_steps: 'Time ran out before you answered.', technique: null, reward_eligible: false });
    setPhase('answered');
  }, [phase]);

  useEffect(() => {
    if (phase !== 'question') return;
    // Both branches' setState calls live inside the timeout callback (an async
    // boundary), never synchronously in the effect body itself — avoids the
    // cascading-render risk flagged by react-hooks/set-state-in-effect (see
    // memory: render-time state adjustment already caused a real crash here).
    const t = setTimeout(() => {
      if (timeLeft <= 1) handleTimeout();
      else setTimeLeft(s => s - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, handleTimeout]);

  const handlePick = async (option: string) => {
    if (phase !== 'question' || grading) return;
    setGrading(true);
    setSelected(option);
    const graded = await gradeMtapAnswer(userId, current.question_code, option);
    setGrading(false);
    if (!graded) return; // network hiccup — leave the question up rather than losing state
    setResult(graded);
    setPhase('answered');
    onProgress?.();

    if (graded.correct) {
      setSessionCorrect(c => c + 1);
      if (graded.reward_eligible) {
        const reward = calculateReward(1); // single-attempt-per-question, not the retry-whole-quiz model
        const credited = await creditMtapReward(userId, reward.xp, reward.gold);
        if (credited) {
          setSessionReward(r => ({ xp: r.xp + reward.xp, gold: r.gold + reward.gold }));
          onRewardEarned?.(reward.xp, reward.gold);
        }
      }
    }
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setPhase('done');
      return;
    }
    setIndex(i => i + 1);
    setSelected(null);
    setResult(null);
    setTimeLeft(questions[index + 1].time_budget_seconds);
    setPhase('question');
  };

  if (phase === 'loading') {
    return <div className="bg-[#f0ddb8] border-[3px] border-[#8b5e2a] rounded-2xl p-8 text-center text-[#7a4a0f]">Loading questions…</div>;
  }
  if (phase === 'empty') {
    return (
      <div className="bg-[#f0ddb8] border-[3px] border-[#8b5e2a] rounded-2xl p-8 text-center">
        <p className="text-[#2a1505] font-bold mb-4">No questions available for this topic yet.</p>
        <GameButton variant="quest" color="#8b5e2a" onClick={onExit} style={{ fontSize: 14 }}>Back</GameButton>
      </div>
    );
  }
  if (phase === 'done') {
    return (
      <div className="bg-[#e8f5e0] border border-green-700 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-green-700 mb-2 font-display">Set complete!</h2>
        <p className="text-[#2a1505] mb-2">{sessionCorrect} / {questions.length} correct this round.</p>
        <p className="text-[#2a1505] mb-6">
          Earned <span className="font-bold text-[#c9781a] font-mono">{sessionReward.xp} XP</span> and{' '}
          <span className="font-bold text-yellow-600 font-mono">{sessionReward.gold} Gold</span> this session.
        </p>
        <GameButton variant="quest" color="#8b5e2a" onClick={onExit} style={{ fontSize: 15 }}>Back to topics</GameButton>
      </div>
    );
  }

  const timerColor = timeLeft <= 5 ? 'text-red-600' : 'text-[#7a4a0f]';

  return (
    <div className="bg-[#f0ddb8] border-[3px] border-[#8b5e2a] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[#7a4a0f] bg-[#fff7ed] border border-[#c9a87a] rounded-full px-3 py-1">
            {archetypeName}
          </span>
          <span className="text-xs font-bold text-green-800 bg-[#e8f5e0] border border-green-600 rounded-full px-3 py-1">
            {TIER_LABEL[tier]}
          </span>
        </div>
        <span className={`font-mono font-bold text-sm ${timerColor}`}>{phase === 'question' ? timeLeft : 0}s</span>
      </div>

      <div className="bg-white border border-[#c9a87a] rounded-xl p-5">
        <p className="font-bold text-[#2a1505] mb-4">{current.question}</p>
        <div className="space-y-2">
          {current.options.map(opt => {
            let cls = 'bg-[#f0ddb8] border-[#c9a87a] hover:border-[#c9781a] hover:bg-[#e8c88a] text-[#2a1505]';
            if (phase === 'answered') {
              if (result?.correct_answer && opt === result.correct_answer) cls = 'bg-green-100 border-green-600 text-[#2a1505]';
              else if (opt === selected) cls = 'bg-red-100 border-red-500 text-[#2a1505]';
            } else if (opt === selected) {
              cls = 'bg-[#c9781a]/20 border-[#c9781a] text-[#2a1505]';
            }
            return (
              <GameButton
                key={opt}
                disabled={phase !== 'question' || grading}
                onClick={() => handlePick(opt)}
                className={`w-full text-left p-3 rounded-lg border text-sm font-semibold transition-colors ${cls}`}
              >
                {opt}
              </GameButton>
            );
          })}
        </div>
      </div>

      {phase === 'answered' && (
        <div className={`mt-4 rounded-xl border-2 p-4 ${result?.correct ? 'bg-[#e8f5e0] border-green-600' : 'bg-red-50 border-red-400'}`}>
          <p className="font-bold text-[#2a1505] mb-1">{result?.correct ? 'Correct!' : 'Not quite.'}</p>
          <p className="text-sm text-[#3a2610] mb-2">{result?.solution_steps}</p>
          {result?.correct && !result?.reward_eligible && (
            <p className="text-xs text-[#6b4820] italic mb-2">Already mastered this one before — no extra reward on a repeat, but great practice!</p>
          )}
          {result?.correct && result?.reward_eligible && (
            <p className="text-sm font-bold text-[#c9781a] mb-2">+{calculateReward(1).xp} XP, +{calculateReward(1).gold} Gold</p>
          )}
          <GameButton variant="quest" color="#3b82f6" onClick={handleNext} style={{ fontSize: 14 }}>
            {index + 1 >= questions.length ? 'Finish' : 'Next Question'}
          </GameButton>
        </div>
      )}
    </div>
  );
}
