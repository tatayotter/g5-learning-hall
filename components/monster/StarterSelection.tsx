'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MONSTERS } from '@/lib/monsterConfig';
import { MonsterImage } from '@/components/battle/shared';
import StarterClaimModal from '@/components/monster/StarterClaimModal';
import GameButton from '@/components/GameButton';
import { MonsterDef } from '@/lib/monsterConfig';

interface StarterSelectionProps {
  userId: string;
  onComplete: () => void;
}

export default function StarterSelection({ userId, onComplete }: StarterSelectionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [claimed, setClaimed] = useState<string | null>(null);
  // Tapping a curio's portrait opens its lore here instead of the card
  // showing the full description inline — the 12-starter grid got too tall
  // with every card's full paragraph always visible.
  const [loreMonster, setLoreMonster] = useState<MonsterDef | null>(null);

  const starters = Object.values(MONSTERS);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.from('user_monsters').insert({
      user_id: userId,
      monster_id: selected,
      monster_exp: 0,
      monster_level: 1,
      slot: 1,
      rest_used: 0,
    });
    await supabase.from('user_battle_state').upsert({
      user_id: userId,
      map_x: 1,
      map_y: 1,
      defeated_trainers: [],
      seen_monsters: [],
      active_monster_slot: 1,
    }, { onConflict: 'user_id' });
    setSaving(false);
    if (!error) setClaimed(selected);
  };

  if (claimed) {
    return <StarterClaimModal monster={MONSTERS[claimed]} userId={userId} onComplete={onComplete} />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-display font-bold text-[#7a4a0f] mb-2">Choose Your Starter</h2>
      <p className="text-[#6b4820] mb-8">Pick your first curio. Choose wisely — you'll unlock more as you level up!</p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {starters.map(monster => (
          <button
            key={monster.id}
            onClick={() => setSelected(monster.id)}
            className={`p-4 rounded-2xl border-2 text-center transition-all ${
              selected === monster.id
                ? 'border-[#c9781a] bg-[#c9781a]/20'
                : 'border-[#c9a87a] bg-white hover:border-[#c9781a] hover:bg-[#f0ddb8]'
            }`}
          >
            <div
              role="button"
              aria-label={`View ${monster.name}'s lore`}
              onClick={e => { e.stopPropagation(); setLoreMonster(monster); }}
              className="relative w-24 h-24 mx-auto mb-2"
            >
              <MonsterImage monster={monster} className="w-full h-full" />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border border-[#8b5e2a] text-[#7a4a0f] text-[11px] font-extrabold flex items-center justify-center shadow-sm">
                i
              </span>
            </div>
            <p className="font-bold text-[#2a1505] font-display">{monster.name}</p>
            <p className="text-xs text-[#6b4820] capitalize mb-2">{monster.element} · {monster.archetype.replace('_', ' ')}</p>
            <div className="text-xs text-[#6b4820] space-y-1">
              <p className="flex items-center gap-1 flex-wrap justify-center">
                <img src="/icons/stats/hp.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {monster.baseHp} HP ·
                <img src="/icons/stats/atk.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {monster.baseAttack} ATK
              </p>
              <p className="flex items-center gap-1 flex-wrap justify-center">
                <img src="/icons/stats/def.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {monster.baseDefense} DEF ·
                <img src="/icons/stats/spd.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {monster.baseSpeed} SPD
              </p>
            </div>
          </button>
        ))}
      </div>
      <div className="text-center">
        <GameButton
          variant="quest"
          color={selected ? undefined : '#57534e'}
          onClick={handleConfirm}
          disabled={!selected || saving}
          style={{ fontSize: 16 }}
        >
          {saving ? 'Saving...' : `Choose ${selected ? MONSTERS[selected].name : '...'}`}
        </GameButton>
      </div>

      {loreMonster && (
        <div
          className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4"
          onClick={() => setLoreMonster(null)}
        >
          <div
            className="bg-white border-2 border-[#8b5e2a] rounded-2xl p-6 max-w-sm w-full text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-24 h-24 mx-auto mb-3">
              <MonsterImage monster={loreMonster} className="w-full h-full" />
            </div>
            <p className="font-bold text-lg text-[#2a1505] font-display">{loreMonster.name}</p>
            <p className="text-xs text-[#6b4820] capitalize mb-3">{loreMonster.element} · {loreMonster.archetype.replace('_', ' ')}</p>
            <p className="text-sm text-[#3a2610] leading-relaxed mb-5">{loreMonster.description}</p>
            <button
              onClick={() => setLoreMonster(null)}
              className="text-[#6b4820] hover:text-[#2a1505] font-bold text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
