// components/bonusquests/MtapMixedTrainerPlayer.tsx
// Mixed Trainer Track — the capstone mode every grade's content doc specs:
// "shuffled, timed sets drawn from all strands at a matching tier, majority-
// easy weighting... structured like an actual elimination round." Forked from
// MtapQuizPlayer.tsx rather than reusing it directly, since the two differ in
// a way that isn't a small parameter: MtapQuizPlayer fetches and displays ONE
// archetype+tier for the whole session (one static badge, one time budget
// pulled once); here both change every question, and the results screen needs
// a tier-by-tier breakdown instead of a single score line. Grading, timing,
// and reward logic are otherwise identical, and deliberately kept that way —
// see lib/mtapEngine.ts's gradeMtapAnswer/creditMtapReward, unchanged here.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { UserId } from '@/lib/userSession';
import { calculateReward } from '@/lib/quizReward';
import GameButton from '@/components/GameButton';
import {
  MtapQuestion, MtapGradeResult, MixedTrainerRewardResult, fetchMixedTrainerSet, gradeMtapAnswer, creditMtapReward, claimMixedTrainerReward,
} from '@/lib/mtapEngine';
import { TIER_LABEL, MtapTier, TIERS } from '@/lib/mtapContent';

interface MtapMixedTrainerPlayerProps {
  userId: UserId;
  grade: number;
  onExit: () => void;
  onRewardEarned?: (xp: number, gold: number) => void;
  onProgress?: () => void; // called after each grade, same as MtapQuizPlayer's — lets the topics list refresh mastery once the child is back
}

type Phase = 'loading' | 'question' | 'answered' | 'done' | 'empty';

export default function MtapMixedTrainerPlayer({
  userId, grade, onExit, onRewardEarned, onProgress,
}: MtapMixedTrainerPlayerProps) {
  const [questions, setQuestions] = useState<MtapQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<MtapGradeResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [grading, setGrading] = useState(false);
  const [sessionReward, setSessionReward] = useState({ xp: 0, gold: 0 });
  // Per-tier {correct, total} so the results screen can show a real
  // elimination-round-style breakdown, not just one combined score.
  const [tierTally, setTierTally] = useState<Record<MtapTier, { correct: number; total: number }>>({
    easy: { correct: 0, total: 0 },
    average: { correct: 0, total: 0 },
    difficult: { correct: 0, total: 0 },
  });
  const [pillResult, setPillResult] = useState<MixedTrainerRewardResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const qs = await fetchMixedTrainerSet(grade);
      if (cancelled) return;
      if (qs.length === 0) {
        setPhase('empty');
        return;
      }
      setQuestions(qs);
      setTimeLeft(qs[0].time_budget_seconds);
      setPhase('question');
    })();
    return () => { cancelled = true; };
  }, [grade]);

  const current = questions[index];

  const handleTimeout = useCallback(() => {
    if (phase !== 'question') return;
    setSelected(null);
    setResult({ correct: false, correct_answer: '', solution_steps: 'Time ran out before you answered.', technique: null, reward_eligible: false });
    setTierTally(t => ({ ...t, [current.tier]: { correct: t[current.tier].correct, total: t[current.tier].total + 1 } }));
    setPhase('answered');
  }, [phase, current]);

  useEffect(() => {
    if (phase !== 'question') return;
    // Same async-boundary-only setState pattern as MtapQuizPlayer.tsx — never
    // synchronously in the effect body (memory: render-time state adjustment
    // already caused a real crash here).
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
    setTierTally(t => ({
      ...t,
      [current.tier]: { correct: t[current.tier].correct + (graded.correct ? 1 : 0), total: t[current.tier].total + 1 },
    }));
    setPhase('answered');
    onProgress?.();

    if (graded.correct && graded.reward_eligible) {
      const reward = calculateReward(1); // same single-attempt-per-question model as the regular quiz player
      const credited = await creditMtapReward(userId, reward.xp, reward.gold);
      if (credited) {
        setSessionReward(r => ({ xp: r.xp + reward.xp, gold: r.gold + reward.gold }));
        onRewardEarned?.(reward.xp, reward.gold);
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

  // Claims the completion reward once, the moment the run actually finishes
  // — not from inside handleNext (which also fires for every question, not
  // just the last one) and not synchronously in a render, per this file's
  // own established async-boundary-only setState pattern. The RPC itself is
  // the real gate (see the migration): this just fires the one call and
  // reads back whatever it decided.
  useEffect(() => {
    if (phase !== 'done') return;
    let cancelled = false;
    (async () => {
      const codes = questions.map(q => q.question_code);
      const claimed = await claimMixedTrainerReward(userId, grade, codes);
      if (!cancelled) setPillResult(claimed);
    })();
    return () => { cancelled = true; };
  }, [phase, userId, grade, questions]);

  if (phase === 'loading') {
    return <div className="bg-[#f0ddb8] border-[3px] border-[#8b5e2a] rounded-2xl p-8 text-center text-[#7a4a0f]">Assembling your set…</div>;
  }
  if (phase === 'empty') {
    return (
      <div className="bg-[#f0ddb8] border-[3px] border-[#8b5e2a] rounded-2xl p-8 text-center">
        <p className="text-[#2a1505] font-bold mb-4">No questions available yet.</p>
        <GameButton variant="quest" color="#8b5e2a" onClick={onExit} style={{ fontSize: 14 }}>Back</GameButton>
      </div>
    );
  }
  if (phase === 'done') {
    const totalCorrect = TIERS.reduce((sum, t) => sum + tierTally[t].correct, 0);
    const totalAnswered = TIERS.reduce((sum, t) => sum + tierTally[t].total, 0);
    return (
      <div className="bg-[#e8f5e0] border border-green-700 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-green-700 mb-2 font-display">Mixed Trainer complete!</h2>
        <p className="text-[#2a1505] mb-4">{totalCorrect} / {totalAnswered} correct — an elimination-round-style set across every strand.</p>
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto mb-6">
          {TIERS.map(t => (
            <div key={t} className="bg-white border border-green-300 rounded-lg py-2 px-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#7a4a0f]">{TIER_LABEL[t]}</p>
              <p className="text-sm font-bold text-[#2a1505] font-mono">{tierTally[t].correct}/{tierTally[t].total}</p>
            </div>
          ))}
        </div>
        <p className="text-[#2a1505] mb-2">
          Earned <span className="font-bold text-[#c9781a] font-mono">{sessionReward.xp} XP</span> and{' '}
          <span className="font-bold text-yellow-600 font-mono">{sessionReward.gold} Gold</span> this run.
        </p>
        {pillResult?.granted && (
          <p className="text-[#2a1505] mb-6 font-bold">🎁 +{pillResult.growth_pills} Growth Pill for finishing a full run!</p>
        )}
        {pillResult && !pillResult.granted && pillResult.reason === 'already_claimed_today' && (
          <p className="text-xs text-[#8b5e2a] italic mb-4">Already claimed today's Growth Pill for this grade — come back tomorrow for another.</p>
        )}
        <div className="mt-4">
          <GameButton variant="quest" color="#8b5e2a" onClick={onExit} style={{ fontSize: 15 }}>Back to topics</GameButton>
        </div>
      </div>
    );
  }

  const timerColor = timeLeft <= 5 ? 'text-red-600' : 'text-[#7a4a0f]';

  return (
    <div className="bg-[#f0ddb8] border-[3px] border-[#8b5e2a] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#7a4a0f] bg-[#fff7ed] border border-[#c9a87a] rounded-full px-3 py-1 font-mono">
            {index + 1} / {questions.length}
          </span>
          <span className="text-xs font-bold text-green-800 bg-[#e8f5e0] border border-green-600 rounded-full px-3 py-1">
            {TIER_LABEL[current.tier]}
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
