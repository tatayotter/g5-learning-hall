// components/battle/MonsterHpPanel.tsx
// HP card for the battle stage's hp-row — name/level, HP bar, status badge.
// Sprite rendering lives in BattleStage's Creature (positioned on the stage,
// not the card) since the redesigned layout separates "who's fighting" (the
// stage) from "how are they doing" (this card).
import { STATUS_DEFINITIONS, StatusEffect } from '@/lib/monsterConfig';

interface MonsterHpPanelProps {
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  status: StatusEffect;
}

export default function MonsterHpPanel({ name, level, currentHp, maxHp, status }: MonsterHpPanelProps) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
  return (
    <div className="bstage-hp-card bg-neutral-900 border-2 border-neutral-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-white font-bold text-center text-[15px] leading-tight mb-1 truncate">{name} Lv.{level}</p>
      <div className="h-[13px] bg-black border-2 border-white rounded-full overflow-hidden">
        <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-white text-center text-xs font-semibold mt-1">{Math.max(0, currentHp)}/{maxHp} HP</p>
      {status && (
        <p className="text-xs mt-1 flex items-center justify-center gap-1 text-gray-300">
          <img src={STATUS_DEFINITIONS[status].iconSrc} alt={status} className="w-3.5 h-3.5 object-contain" />
          {status}
        </p>
      )}
    </div>
  );
}
