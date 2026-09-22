'use client';
// components/dashboard/board/CurioTrainingPicker.tsx
// "Pick a curio to train" step shown before a main quest quiz starts. The chosen
// curio earns 1/3 of the quest's XP as Curio EXP when the quest is completed
// (see ActiveQuestView). An eligible curio is always selected; the player can switch.
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ALL_MONSTERS, BATTLE_CONSTANTS, getOwnedMonsterDisplay } from '@/lib/monsterConfig';
import { MonsterImage } from '@/components/battle/shared';
import { questButtonFontFamily, questButtonLetterSpacing, questButtonBoxShadow, questTextShadowStyle, questTextStyle, CURIO_CARD_STYLES } from '@/components/GameButton';

export const TRAINING_EXP_SHARE = 1 / 3;

export interface OwnedCurio {
  id: string;
  monster_id: string;
  nickname: string | null;
  monster_level: number;
  slot: number | null;
  graduation_tier: number | null;
}

const isMax = (c: { monster_level: number }) => c.monster_level >= BATTLE_CONSTANTS.MONSTER_LEVEL_CAP;

interface Props {
  userId: string;
  // undefined = player hasn't chosen yet (defaults to the active curio)
  selectedId: string | undefined;
  onSelect: (curio: OwnedCurio) => void;
}

export default function CurioTrainingPicker({ userId, selectedId, onSelect }: Props) {
  const [curios, setCurios] = useState<OwnedCurio[] | null>(null);
  const [activeSlot, setActiveSlot] = useState<number>(1);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('user_monsters')
      .select('id, monster_id, nickname, monster_level, slot, graduation_tier')
      .eq('user_id', userId)
      .order('slot', { ascending: true, nullsFirst: false })
      .then(({ data }) => { if (!cancelled) setCurios((data as OwnedCurio[]) ?? []); });
    supabase
      .from('user_battle_state')
      .select('active_monster_slot')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled && data?.active_monster_slot) setActiveSlot(data.active_monster_slot); });
    return () => { cancelled = true; };
  }, [userId]);

  const activeCurio = curios?.find(c => c.slot === activeSlot) ?? curios?.find(c => c.slot != null) ?? null;

  // Max-level curios can't earn EXP, so they're hidden entirely. Default is the
  // active curio if it can still level, else the first one that can.
  const trainable = curios?.filter(c => !isMax(c)) ?? null;
  const defaultCurio = trainable?.find(c => c.id === activeCurio?.id) ?? trainable?.[0] ?? null;

  // Default the selection to the trainable curio above, once, until they choose.
  const defaulted = useRef(false);
  useEffect(() => {
    if (defaulted.current || selectedId !== undefined || !defaultCurio) return;
    defaulted.current = true;
    onSelect(defaultCurio);
  }, [defaultCurio, selectedId, onSelect]);

  if (curios === null) return <p className="text-sm text-[#6b4820] mb-6">Loading your curios…</p>;
  if (!trainable || trainable.length === 0) return null; // nothing left to train — step disappears

  return (
    <div className="mb-8 text-left">
      <style>{CURIO_CARD_STYLES}</style>
      <p className="text-center text-[#7a4a0f] font-bold mb-1">Which curio should train?</p>
      <p className="text-center text-xs text-[#6b4820] mb-4">
        Your active curio is picked by default — tap another to switch. The trainee earns {Math.round(TRAINING_EXP_SHARE * 100)}% of the XP you earn when you complete this quest.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
        {trainable.map(c => {
          const def = getOwnedMonsterDisplay(ALL_MONSTERS[c.monster_id], c.graduation_tier);
          const selected = selectedId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={`ccard ${selected ? 'ccard-selected' : ''}`}
            >
              {c.id === activeCurio?.id && (
                <span
                  className="ccard-tag"
                  style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, boxShadow: questButtonBoxShadow, fontSize: 10 }}
                >
                  <span style={{ position: 'relative', display: 'inline-block' }}>
                    <span aria-hidden style={questTextShadowStyle}>Active</span>
                    <span style={questTextStyle}>Active</span>
                  </span>
                </span>
              )}
              <span className="ccard-sprite">
                <MonsterImage monster={def} className="w-16 h-16" emojiClassName="text-4xl" />
              </span>
              <span className="text-sm font-extrabold text-[#2a1505] truncate max-w-full">{c.nickname || def?.name || c.monster_id}</span>
              <span className="ccard-lv">
                Lv.{c.monster_level}{c.slot != null ? '' : ' · bench'}
              </span>
              {selected && <span className="ccard-check">✔</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
