'use client';
// components/dashboard/board/CurioTrainingPicker.tsx
// "Pick a curio to train" step shown before a main quest quiz starts. The chosen
// curio earns 1/3 of the quest's XP as Curio EXP when the quest is completed
// (see ActiveQuestView). An eligible curio is always selected; the player can switch.
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ALL_MONSTERS, BATTLE_CONSTANTS, getOwnedMonsterDisplay } from '@/lib/monsterConfig';
import { MonsterImage } from '@/components/battle/shared';
import { questButtonFontFamily, questButtonLetterSpacing, questButtonBoxShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';

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
      <style>{`
        .ccard { position:relative; display:flex; flex-direction:column; align-items:center; gap:4px; padding:22px 10px 12px; cursor:pointer;
          border-radius:16px; border:2px solid #8b5e2a; background:linear-gradient(180deg,#fffdf7 0%,#fbf3df 100%);
          box-shadow:0 4px 0 #8b5e2a, 0 8px 12px rgba(42,21,5,.22); transition:transform .1s, box-shadow .1s; }
        .ccard::before { content:''; position:absolute; inset:4px; border:1px dashed #c9a87a; border-radius:11px; pointer-events:none; }
        .ccard:hover { transform:translateY(-2px); box-shadow:0 6px 0 #8b5e2a, 0 11px 14px rgba(42,21,5,.28); }
        .ccard:active { transform:translateY(3px); box-shadow:0 1px 0 #8b5e2a; }
        .ccard-sprite { display:flex; padding:6px; border-radius:50%; background:radial-gradient(circle,#f0ddb8 0%,#e8d0a0 70%); border:2px solid #c9a87a; }
        .ccard-lv { font-size:12px; font-weight:800; color:#6b4820; background:#f0ddb8; border:1px solid #c9a87a; border-radius:999px; padding:1px 10px; }
        .ccard-selected { border-color:#c9781a; background:linear-gradient(180deg,#ffe9a8 0%,#f5c95c 100%);
          box-shadow:0 4px 0 #c9781a, 0 0 0 3px rgba(245,201,92,.6), 0 8px 14px rgba(201,120,26,.4); transform:translateY(-1px); }
        .ccard-selected .ccard-sprite { background:radial-gradient(circle,#fff6d6 0%,#f5c95c 80%); border-color:#c9781a; }
        .ccard-tag { position:absolute; top:-10px; left:50%; transform:translateX(-50%); z-index:2; overflow:hidden; white-space:nowrap;
          background:#f5c542; border:0.0476em solid #000; border-radius:0.508em; padding:.25em .7em; }
        .ccard-check { position:absolute; top:6px; right:8px; width:22px; height:22px; border-radius:50%; background:#22c55e; color:#fff;
          border:2px solid #14532d; font-size:12px; font-weight:900; display:flex; align-items:center; justify-content:center; z-index:2; }
      `}</style>
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
