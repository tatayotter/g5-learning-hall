'use client';
// Wild curio encounter dialogue — shown by TrainingMap.tsx when the player
// steps onto the curio tile (pendingCurioChallenge). Battle! enters the
// encounter; Run Away lets the player walk away (curio stays on the map).
import { MonsterImage } from '@/components/battle/shared';
import type { MonsterDef } from '@/lib/monsterConfig';
import type { QualityTier } from '@/lib/curioQuality';

interface CurioEncounterPanelProps {
  curioDef: MonsterDef;
  quality: QualityTier;
  onBattle: () => void;
  onRunAway: () => void;
}

export default function CurioEncounterPanel({ curioDef, quality, onBattle, onRunAway }: CurioEncounterPanelProps) {
  return (
    <div className="w-full max-w-sm bg-neutral-900 border border-emerald-700 rounded-2xl p-4 battle-panel-in">
      <div className="flex items-start gap-3 mb-4">
        <MonsterImage monster={curioDef} className="w-14 h-14 flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-emerald-300 text-sm leading-tight">{curioDef.name} appeared!</p>
          <p className="text-gray-400 text-xs mt-0.5 capitalize">{quality} · {curioDef.element} type</p>
          <p className="text-gray-300 text-sm italic mt-1 leading-snug">
            "A wild curio is challenging you!"
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="flex-1 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800
                     text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
          onClick={onBattle}
        >
          ⚔️ Battle!
        </button>
        <button
          className="flex-1 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900
                     text-gray-400 font-bold text-sm py-2.5 rounded-xl border border-neutral-700
                     transition-colors"
          onClick={onRunAway}
        >
          🏃 Run Away!
        </button>
      </div>
    </div>
  );
}
