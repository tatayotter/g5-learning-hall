'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MONSTERS } from '@/lib/monsterConfig';
import { MonsterImage } from '@/components/battle/shared';

interface StarterSelectionProps {
  userId: string;
  onComplete: () => void;
}

export default function StarterSelection({ userId, onComplete }: StarterSelectionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    if (!error) onComplete();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-display font-bold text-white mb-2">Choose Your Starter</h2>
      <p className="text-gray-400 mb-8">Pick your first curio. Choose wisely — you'll unlock more as you level up!</p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {starters.map(monster => (
          <button
            key={monster.id}
            onClick={() => setSelected(monster.id)}
            className={`p-6 rounded-2xl border-2 text-center transition-all ${
              selected === monster.id
                ? 'border-amber-400 bg-amber-900/20'
                : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
            }`}
          >
<div className="w-16 h-16 mx-auto mb-3">
              <MonsterImage monster={monster} className="w-full h-full" />
            </div>
            <p className="font-bold text-white font-display">{monster.name}</p>
            <p className="text-xs text-gray-400 capitalize mb-2">{monster.element} · {monster.archetype.replace('_', ' ')}</p>
            <p className="text-xs text-gray-500">{monster.description}</p>
            <div className="mt-3 text-xs text-gray-400 space-y-1">
              <p className="flex items-center gap-1 flex-wrap">
                <img src="/icons/stats/hp.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {monster.baseHp} HP ·
                <img src="/icons/stats/atk.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {monster.baseAttack} ATK
              </p>
              <p className="flex items-center gap-1 flex-wrap">
                <img src="/icons/stats/def.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {monster.baseDefense} DEF ·
                <img src="/icons/stats/spd.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {monster.baseSpeed} SPD
              </p>
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={handleConfirm}
        disabled={!selected || saving}
        className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-10 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : `Choose ${selected ? MONSTERS[selected].name : '...'}`}
      </button>
    </div>
  );
}
