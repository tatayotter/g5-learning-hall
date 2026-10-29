'use client';
// Wild curio encounter dialogue — shown by TrainingMap.tsx when the player
// steps onto the curio tile (pendingCurioChallenge). Battle! enters the
// encounter; Not yet (or the X) lets the player walk away (the curio stays, and
// keeps following them between maps until it's caught or out of tries).
// Uses the in-game pop-up frame (components/game/GamePopup.tsx).
import { MonsterImage } from '@/components/battle/shared';
import GameButton from '@/components/GameButton';
import GamePopup from '@/components/game/GamePopup';
import type { MonsterDef } from '@/lib/monsterConfig';
import { QUALITY_LABEL, type QualityTier } from '@/lib/curioQuality';

interface CurioEncounterPanelProps {
  curioDef: MonsterDef;
  quality: QualityTier;
  attemptsLeft: number;
  onBattle: () => void;
  onRunAway: () => void;
}

// The quality chip on parchment.
const QUALITY_CHIP: Record<QualityTier, string> = {
  normal: 'bg-[#e8d0a0] text-[#6b4820] border-[#c9a87a]',
  good: 'bg-[#dcfce7] text-[#166534] border-[#4ade80]',
  outstanding: 'bg-[#cffafe] text-[#155e75] border-[#22d3ee]',
  perfect: 'bg-[#ffedd5] text-[#9a3412] border-[#fb923c]',
};

export default function CurioEncounterPanel({ curioDef, quality, attemptsLeft, onBattle, onRunAway }: CurioEncounterPanelProps) {
  const rare = quality !== 'normal';
  const last = attemptsLeft === 1;
  return (
    <GamePopup
      inline
      title={curioDef.name}
      subtitle="A wild curio appeared! It wants to battle."
      onClose={onRunAway}
      testId="curio-encounter"
      data={{ quality }}
      footer={
        <div className="flex gap-2">
          <GameButton variant="quest" color="#16a34a" onClick={onBattle} className="flex-1" style={{ fontSize: 15 }} data-testid="curio-encounter-battle">
            Battle!
          </GameButton>
          <GameButton variant="quest" color="#78716c" onClick={onRunAway} className="flex-1" style={{ fontSize: 15 }} data-testid="curio-encounter-later">
            Not yet
          </GameButton>
        </div>
      }
    >
      <div className="flex items-center gap-3 rounded-xl border-2 border-[#8b5e2a] bg-[#fffdf7] p-2.5">
        <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-[radial-gradient(circle,#fff6d6_0%,#f0ddb8_80%)] flex items-center justify-center">
          <MonsterImage monster={curioDef} className="w-16 h-16" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap gap-1.5">
            <span className={`rounded-full border-2 px-2 py-0.5 text-[11px] font-black ${QUALITY_CHIP[quality]}`}>{QUALITY_LABEL[quality]}</span>
            <span className="rounded-full border-2 border-[#c9a87a] bg-[#e8d0a0] px-2 py-0.5 text-[11px] font-black text-[#6b4820] capitalize">{curioDef.element} type</span>
          </div>
          <p className="text-[13px] font-semibold leading-snug text-[#2a1505]">
            {rare
              ? `A ${QUALITY_LABEL[quality]} curio is tougher: more HP and Attack. Win and you get more EXP, and you keep it at ${QUALITY_LABEL[quality]}.`
              : 'Answer right and win the battle to catch it!'}
          </p>
        </div>
      </div>
      <p
        className={`mt-2 rounded-lg border-2 px-2.5 py-1.5 text-[12px] font-bold leading-snug ${last ? 'border-[#d97706] bg-[#fef3c7] text-[#92400e]' : 'border-[#c9a87a] bg-[#e8d0a0]/60 text-[#6b4820]'}`}
        data-testid="curio-encounter-tries"
      >
        {last
          ? 'Last try! If you miss, it runs off, but more curios will come.'
          : `${attemptsLeft} tries left. A wrong answer or a lost battle uses one.`}
      </p>
    </GamePopup>
  );
}
