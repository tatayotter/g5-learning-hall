'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ALL_MONSTERS, BATTLE_CONSTANTS, MonsterDef,
  getUnlockedMonsterSlots, getScaledStats,
} from '@/lib/monsterConfig';
import { MonsterImage, UserMonster } from '@/components/battle/shared';
import { CaughtMonster } from '@/components/monster/types';

export default function TeamPanel({ userMonsters, playerLevel, userId, onTeamChange, monsterDisplay, caughtMonsters, onPromote }: {
  userMonsters: UserMonster[];
  playerLevel: number;
  userId: string;
  onTeamChange: () => void;
  monsterDisplay: Record<string, MonsterDef>;
  caughtMonsters: CaughtMonster[];
  onPromote: (caught: CaughtMonster, slot: number) => void;
}) {
  const unlockedSlots = getUnlockedMonsterSlots(playerLevel);
  const benchedMonsters = userMonsters.filter(m => m.slot === null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promotingBenchId, setPromotingBenchId] = useState<string | null>(null);

  const handleAddMonster = async (slot: number, monsterId: string) => {
    // set_team_slot never overwrites an existing monster's row — it reuses
    // monsterId's own persistent row if one exists (so a previously-benched
    // monster comes back with its own level/exp/equipped_skills intact) and
    // benches whoever it displaces, rather than destroying either identity.
    const { error } = await supabase.rpc('set_team_slot', {
      p_user_id: userId, p_monster_id: monsterId, p_slot: slot,
    });
    if (error) {
      console.error('set_team_slot error:', error);
      return;
    }
    onTeamChange();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white font-display">Your Team</h3>
      {[1, 2, 3].map(slot => {
        const monster = userMonsters.find(m => m.slot === slot);
        const isUnlocked = slot <= unlockedSlots || !!monster;
        const def = monster ? monsterDisplay[monster.monster_id] : null;
        const expToNext = monster ? BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL - (monster.monster_exp % BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) : 0;

        return (
          <div
            key={slot}
            className={`p-4 rounded-xl border ${isUnlocked ? 'border-neutral-700 bg-neutral-900' : 'border-neutral-800 bg-neutral-950 opacity-50'}`}
          >
            {!isUnlocked ? (
              <p className="text-gray-500 text-sm">🔒 Unlocks at player Level {BATTLE_CONSTANTS.PLAYER_LEVEL_FOR_SLOT[slot as 1|2|3]}</p>
            ) : !monster || !def ? (
              <div>
                <p className="text-gray-400 text-sm mb-2">Slot {slot} — Choose a monster:</p>
                {benchedMonsters.length === 0 ? (
                  <p className="text-xs text-gray-600">No captured monsters available. Catch one on the Training Map first!</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {benchedMonsters.map(bm => {
                      const bmDef = monsterDisplay[bm.monster_id];
                      if (!bmDef) return null;
                      return (
                        <button
                          key={bm.id}
                          onClick={() => handleAddMonster(slot, bm.monster_id)}
                          className="text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-1 rounded-lg text-white"
                        >
                          {bmDef.name} <span className="text-gray-500">Lv.{bm.monster_level}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12">
                  <MonsterImage monster={def} className="w-full h-full" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{def.name} <span className="text-gray-400 text-sm">Lv.{monster.monster_level}</span></p>
                  <p className="text-xs text-gray-500 capitalize">{def.element} · {def.archetype.replace('_', ' ')}</p>
                  <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-1">
                    <div
                      className="h-1.5 rounded-full bg-amber-400 transition-all"
                      style={{ width: `${((monster.monster_exp % BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) / BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{expToNext} EXP to next level</p>
                </div>
                <div className="text-xs text-gray-400 space-y-0.5">
                  {(() => {
                    const scaled = getScaledStats(def, monster.monster_level);
                    return (
                      <>
                        <p className="flex items-center gap-1"><img src="/icons/stats/hp.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.hp}</p>
                        <p className="flex items-center gap-1"><img src="/icons/stats/atk.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.attack}</p>
                        <p className="flex items-center gap-1"><img src="/icons/stats/def.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.defense}</p>
                        <p className="flex items-center gap-1"><img src="/icons/stats/spd.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.speed}</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Everything not currently sitting in slot 1-3: monsters already owned but
          benched (slot IS NULL — displaced teammates, guild-reward familiars) and
          rare wild catches waiting to join for the first time. This has to be an
          always-visible section: the per-slot "Choose a monster" list above only
          renders for slots that are already empty, so once every unlocked slot is
          full, a benched monster would otherwise have no UI to be seen or swapped
          back in from at all. */}
      {(benchedMonsters.length > 0 || caughtMonsters.length > 0) && (
        <div className="space-y-3 pt-2">
          <p className="text-xs text-cyan-500 font-bold uppercase tracking-widest">Your Bench (Add To Your Team)</p>
          {benchedMonsters.map(bm => {
            const def = monsterDisplay[bm.monster_id];
            if (!def) return null;
            const scaled = getScaledStats(def, bm.monster_level);
            return (
              <div key={bm.id} className="p-4 rounded-xl border border-cyan-900 bg-cyan-900/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex-shrink-0">
                    <MonsterImage monster={def} className="w-full h-full" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white">{def.name} <span className="text-gray-400 text-sm">Lv.{bm.monster_level}</span></p>
                    <p className="text-xs text-gray-500 capitalize">{def.element} · {def.archetype.replace('_', ' ')}</p>
                  </div>
                  <div className="text-xs text-gray-400 space-y-0.5">
                    <p className="flex items-center gap-1"><img src="/icons/stats/hp.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.hp}</p>
                    <p className="flex items-center gap-1"><img src="/icons/stats/atk.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.attack}</p>
                    <p className="flex items-center gap-1"><img src="/icons/stats/def.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.defense}</p>
                    <p className="flex items-center gap-1"><img src="/icons/stats/spd.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.speed}</p>
                  </div>
                  <button
                    onClick={() => setPromotingBenchId(promotingBenchId === bm.id ? null : bm.id)}
                    className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    → Move to Team
                  </button>
                </div>
                {promotingBenchId === bm.id && (
                  <div className="mt-3 pt-3 border-t border-cyan-900 flex flex-wrap gap-2">
                    {[1, 2, 3].map(slot => {
                      const existing = userMonsters.find(m => m.slot === slot);
                      const isUnlocked = slot <= unlockedSlots || !!existing;
                      if (!isUnlocked) return null;
                      return (
                        <button
                          key={slot}
                          onClick={() => { handleAddMonster(slot, bm.monster_id); setPromotingBenchId(null); }}
                          className="text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded-lg text-white"
                        >
                          {existing ? `Replace ${monsterDisplay[existing.monster_id]?.name || existing.monster_id} (Slot ${slot})` : `Empty Slot ${slot}`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {caughtMonsters.map(caught => {
            // Deliberately ALL_MONSTERS, not monsterDisplay — a bench catch is
            // always the ungraduated tier-1 form (user_caught_monsters has no
            // graduation_tier column; only a promoted team monster can be
            // graduated), so it must never render via the species-wide
            // graduation-aware display override, even if the player's own
            // team already owns a graduated instance of this same species.
            const def = ALL_MONSTERS[caught.monster_id];
            if (!def) return null;
            const scaled = getScaledStats(def, caught.monster_level);
            return (
              <div key={caught.id} className="p-4 rounded-xl border border-cyan-900 bg-cyan-900/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex-shrink-0">
                    <MonsterImage monster={def} className="w-full h-full" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white">{def.name} <span className="text-gray-400 text-sm">Lv.{caught.monster_level}</span></p>
                    <p className="text-xs text-gray-500 capitalize">{def.element} · {def.archetype.replace('_', ' ')}</p>
                  </div>
                  <div className="text-xs text-gray-400 space-y-0.5">
                    <p className="flex items-center gap-1"><img src="/icons/stats/hp.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.hp}</p>
                    <p className="flex items-center gap-1"><img src="/icons/stats/atk.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.attack}</p>
                    <p className="flex items-center gap-1"><img src="/icons/stats/def.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.defense}</p>
                    <p className="flex items-center gap-1"><img src="/icons/stats/spd.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.speed}</p>
                  </div>
                  <button
                    onClick={() => setPromotingId(promotingId === caught.id ? null : caught.id)}
                    className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    → Move to Team
                  </button>
                </div>
                {promotingId === caught.id && (
                  <div className="mt-3 pt-3 border-t border-cyan-900 flex flex-wrap gap-2">
                    {[1, 2, 3].map(slot => {
                      const existing = userMonsters.find(m => m.slot === slot);
                      const isUnlocked = slot <= unlockedSlots || !!existing;
                      if (!isUnlocked) return null;
                      return (
                        <button
                          key={slot}
                          onClick={() => { onPromote(caught, slot); setPromotingId(null); }}
                          className="text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded-lg text-white"
                        >
                          {existing ? `Replace ${monsterDisplay[existing.monster_id]?.name || existing.monster_id} (Slot ${slot})` : `Empty Slot ${slot}`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
