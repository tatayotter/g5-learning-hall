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
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle, QUIZ_OPTION_STYLES } from '@/components/GameButton';
import VictoryScreen, { VictoryReward, XpIcon, GoldIcon, XP_REWARD, GOLD_REWARD, starsFromRatio } from '@/components/VictoryScreen';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';
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

type TierTally = Record<MtapTier, { correct: number; total: number }>;

// End-of-run summary. Exported (and prop-driven) so /dev/ui-gallery can preview it
// without a live session.
export function MixedTrainerComplete({ tierTally, reward, pillResult, onExit }: {
  tierTally: TierTally;
  reward: { xp: number; gold: number };
  pillResult: MixedTrainerRewardResult | null;
  onExit: () => void;
}) {
  const totalCorrect = TIERS.reduce((sum, t) => sum + tierTally[t].correct, 0);
  const totalAnswered = TIERS.reduce((sum, t) => sum + tierTally[t].total, 0);
  const rewards: VictoryReward[] = [];
  if (reward.xp > 0) rewards.push({ ...XP_REWARD, value: reward.xp, icon: <XpIcon /> });
  if (reward.gold > 0) rewards.push({ ...GOLD_REWARD, value: reward.gold, icon: <GoldIcon /> });
  const outlined = (text: string, size: number, color = '#ffffff') => (
    <span style={{ position: 'relative', display: 'inline-block', fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: size, lineHeight: 1 }}>
      <span aria-hidden style={questTextShadowStyle}>{text}</span>
      <span style={{ ...questTextStyle, color }}>{text}</span>
    </span>
  );
  return (
    <VictoryScreen
      title="Mixed Trainer Complete!"
      stars={starsFromRatio(totalCorrect, totalAnswered)}
      subtitle={`${totalCorrect} of ${totalAnswered} correct across every strand`}
      rewards={rewards}
      actions={<GameButton variant="quest" color="#8b5e2a" onClick={onExit} style={{ fontSize: 20 }}>Back to topics</GameButton>}
    >
      {/* Per-tier breakdown, framed like the battle HP card. */}
      <div
        className="vs-rise relative mx-auto max-w-md rounded-lg border-2 border-[#4a2f18] px-4 py-4 text-center"
        style={{ animationDelay: '900ms', boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
      >
        <Nail className="top-1 left-1" />
        <Nail className="top-1 right-1" />
        <Nail className="bottom-1 left-1" />
        <Nail className="bottom-1 right-1" />
        <div className="grid grid-cols-3 gap-2">
          {TIERS.map(t => (
            <div key={t}>
              <p className="mb-1">{outlined(TIER_LABEL[t], 11)}</p>
              <p>{outlined(`${tierTally[t].correct}/${tierTally[t].total}`, 26, tierTally[t].total > 0 && tierTally[t].correct === tierTally[t].total ? '#86efac' : '#ffffff')}</p>
            </div>
          ))}
        </div>
        {pillResult?.granted && (
          <p className="mt-3">{outlined(`+${pillResult.growth_pills} Growth Pill for finishing a full run!`, 13, '#f5c542')}</p>
        )}
        {pillResult && !pillResult.granted && pillResult.reason === 'already_claimed_today' && (
          <p className="mt-3 text-xs italic text-[#f0ddb8]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
            Already claimed today&apos;s Growth Pill for this grade. Come back tomorrow for another.
          </p>
        )}
      </div>
    </VictoryScreen>
  );
}

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
    return <MixedTrainerComplete tierTally={tierTally} reward={sessionReward} pillResult={pillResult} onExit={onExit} />;
  }

  const timerColor = timeLeft <= 5 ? 'text-red-600' : 'text-[#7a4a0f]';

  return (
    <div className="bg-[#f0ddb8] border-[3px] border-[#8b5e2a] rounded-2xl p-5">
      <style>{QUIZ_OPTION_STYLES}</style>
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
          {current.options.map((opt, idx) => {
            const label = ['A', 'B', 'C', 'D'][idx];
            let state = '';
            if (phase === 'answered') {
              if (result?.correct_answer && opt === result.correct_answer) state = 'correct';
              else if (opt === selected) state = 'wrong';
              else state = 'dim';
            } else if (opt === selected) {
              state = 'selected';
            }
            return (
              <GameButton
                key={opt}
                disabled={phase !== 'question' || grading}
                onClick={() => handlePick(opt)}
                className={`qopt ${state ? `qopt-${state}` : ''}`}
              >
                <span className="qopt-badge">{label}</span>
                <span className="qopt-text">{opt}</span>
                {state === 'correct' && <span className="qopt-mark">✔</span>}
                {state === 'wrong' && <span className="qopt-mark">✖</span>}
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
