// components/battle/MonsterHpPanel.tsx
// HP bar / status-badge rendering, extracted from BattleScreen's inline JSX
// (components/MonsterGuild.tsx) so both the solo BattleScreen and the live
// LiveBattleScreen render a monster's battle-header the same way.
import { MonsterImage } from '@/components/battle/shared';
import { STATUS_DEFINITIONS, MonsterDef, StatusEffect } from '@/lib/monsterConfig';

interface MonsterHpPanelProps {
  name: string;
  level: number;
  def: MonsterDef;
  currentHp: number;
  maxHp: number;
  status: StatusEffect;
  animClassName?: string;
  align?: 'left' | 'right';
}

export default function MonsterHpPanel({ name, level, def, currentHp, maxHp, status, animClassName = '', align = 'left' }: MonsterHpPanelProps) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 mb-1">{align === 'left' ? 'Your Monster' : 'Opponent'}</p>
      <div className={`w-16 h-16 mx-auto mb-2 ${animClassName}`}>
        <MonsterImage monster={def} className="w-full h-full battle-float" emojiClassName="text-4xl" />
      </div>
      <p className="text-sm font-bold text-white">{name} Lv.{level}</p>
      <div className="w-32 bg-neutral-800 rounded-full h-2 mt-1 mx-auto">
        <div
          className="h-2 rounded-full bg-green-500 transition-all"
          style={{ width: `${maxHp > 0 ? (currentHp / maxHp) * 100 : 0}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">{currentHp}/{maxHp} HP</p>
      {status && <p className="text-xs mt-1">{STATUS_DEFINITIONS[status].emoji} {status}</p>}
    </div>
  );
}
