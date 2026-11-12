'use client';
// A Forgetful talks to the kid on the map (lib/forgetful.ts). They try to get the kid to forget a
// question they got wrong before. "Forget it" takes their 2 gold; "I'll remember!" tries that
// question again (right: 10 gold + 15 EXP). TrainingMap.tsx sends them running off the map once
// this closes, whatever the kid picked. In the in-game pop-up frame (components/game/GamePopup.tsx).
import { useMemo, useRef, useState } from 'react';
import GamePopup from '@/components/game/GamePopup';
import GameButton from '@/components/GameButton';
import { BattleQuestionModal, type BattleQuestion, type GradeResult } from '@/components/battle/shared';
import { FORGETFUL_REWARDS, fetchMissedQuestion, forgetfulPitch, meetForgetful, type ForgetfulResult } from '@/lib/forgetful';
import type { TownNpc } from '@/lib/townNpcs';
import { NPC_WALK_FRAMES } from '@/lib/townNpcs';

type Step = 'pitch' | 'loading' | 'question' | 'done';

interface ForgetfulPanelProps {
  npc: TownNpc;
  userId: string;
  region: string;
  /** This week's questions: used when the kid has no wrong answers to bring back. */
  questions: BattleQuestion[];
  /** Gold/EXP the server paid, for the HUD. */
  onPaid: (progress: { gold: number; xp: number; level: number }) => void;
  onAnswered?: (answered: BattleQuestion[]) => void;
  /** Closed (they run off): what to say on the bar. */
  onDone: (say: string | null) => void;
}

// The front pose (the frame after the walk frames), shown as their portrait.
function Portrait({ npc }: { npc: TownNpc }) {
  const scale = 56 / npc.frameH;
  return (
    <div className="w-14 h-14 overflow-hidden flex items-end justify-center" aria-hidden>
      <div
        style={{
          width: npc.frameW, height: npc.frameH, flexShrink: 0,
          backgroundImage: `url(${npc.sheet})`,
          backgroundPosition: `-${(npc.walkFrames ?? NPC_WALK_FRAMES) * npc.frameW}px 0`,
          transform: `scale(${scale})`, transformOrigin: 'bottom center',
        }}
      />
    </div>
  );
}

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export default function ForgetfulPanel({ npc, userId, region, questions, onPaid, onAnswered, onDone }: ForgetfulPanelProps) {
  const pitch = useMemo(() => forgetfulPitch(), []);
  const entryId = useRef(newId());
  const [step, setStep] = useState<Step>('pitch');
  const [question, setQuestion] = useState<BattleQuestion | null>(null);
  const [result, setResult] = useState<ForgetfulResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const paid = (r: ForgetfulResult) => { if (r.progress) onPaid(r.progress); };

  const forget = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const r = await meetForgetful(userId, entryId.current, region, 'forget');
      paid(r);
      setResult(r);
      setStep('done');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const remember = async () => {
    setStep('loading');
    const q = await fetchMissedQuestion(userId, questions);
    if (!q) { setFailed(true); setStep('pitch'); return; }
    setQuestion(q);
    setStep('question');
  };

  const grade = async (q: BattleQuestion, selected: string): Promise<GradeResult> => {
    try {
      const r = await meetForgetful(userId, entryId.current, region, 'remember', { id: q.id, selected });
      paid(r);
      setResult(r);
      return { correct: !!r.correct, correctAnswer: r.correct_answer };
    } catch {
      return { correct: false, correctAnswer: null, failed: true };
    }
  };

  const close = () => {
    const r = result;
    onDone(
      !r ? 'The Forgetful shrugs and runs away.'
      : r.status === 'remembered' ? `You remembered! +${r.gold} gold. The Forgetful runs away!`
      : r.status === 'forgot' ? `The Forgetful grins, drops ${r.gold} gold and runs away.`
      : r.status === 'wrong' ? 'Not quite, but you tried! The Forgetful runs away.'
      : 'The Forgetful runs away.',
    );
  };

  const line = step === 'done' && result
    ? result.status === 'remembered' ? 'No! You remembered it! How can you remember things?!'
      : result.status === 'wrong' ? 'Ha! See? Forgetting is easier... Fine, keep trying then.'
      : result.status === 'forgot' ? 'Good choice! A blank page is never wrong. Here, take this.'
      : 'I have nothing more for you today.'
    : step === 'question' ? 'Go on then. Show me you remember...'
    : pitch;

  return (
    <GamePopup
      inline
      title="The Forgetful"
      speaker={{ portrait: <Portrait npc={npc} />, line }}
      onClose={close}
      testId="forgetful-panel"
      data={{ step }}
      footer={step === 'pitch' ? (
        <div className="flex gap-2">
          <GameButton variant="quest" color="#6b7280" disabled={busy} onClick={forget} className="flex-1" style={{ fontSize: 14 }} data-testid="forgetful-forget">
            Forget it (+{FORGETFUL_REWARDS.forget}g)
          </GameButton>
          <GameButton variant="quest" color="#d97706" disabled={busy} onClick={remember} className="flex-1" style={{ fontSize: 14 }} data-testid="forgetful-remember">
            I&apos;ll remember!
          </GameButton>
        </div>
      ) : step === 'done' ? (
        <GameButton variant="quest" color="#d97706" onClick={close} className="w-full" style={{ fontSize: 15 }} data-testid="forgetful-close">
          OK
        </GameButton>
      ) : undefined}
    >
      {step === 'pitch' && (
        <div className="text-center text-[13px] text-[#3a2610] leading-snug">
          <p className="mb-1.5">Will you forget your mistake, or try it again?</p>
          <p className="text-[12px] text-[#6b4820]">
            Remember it right: <b className="text-[#c9781a]">+{FORGETFUL_REWARDS.rememberGold} gold</b> and <b>+{FORGETFUL_REWARDS.rememberXp} EXP</b>
          </p>
          {failed && <p className="mt-2 text-[12px] font-bold text-red-700">Hmm, that didn&apos;t work. Check your internet and try again.</p>}
        </div>
      )}
      {step === 'loading' && <p className="text-center text-[13px] text-[#6b4820] py-4">Finding your question...</p>}
      {step === 'question' && question && (
        <BattleQuestionModal
          questions={[question]}
          count={1}
          embedded
          gradingUserId={userId}
          gradeOverride={grade}
          onComplete={(_n, answered) => { onAnswered?.(answered); setStep('done'); }}
        />
      )}
      {step === 'done' && result && (
        <div className="text-center text-[14px] text-[#3a2610] py-2">
          {result.status === 'remembered' && <p className="font-bold text-green-700">You remembered! +{result.gold} gold, +{result.xp} EXP</p>}
          {result.status === 'wrong' && <p>That&apos;s okay! Mistakes help you learn. You&apos;ll get it next time.</p>}
          {result.status === 'forgot' && <p>You got {result.gold} gold. That question will come back another day.</p>}
          {result.status === 'tired' && <p>You met enough Forgetful today. Come back tomorrow!</p>}
        </div>
      )}
    </GamePopup>
  );
}
