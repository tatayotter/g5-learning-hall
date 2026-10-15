'use client';
// components/dashboard/board/CurioTrainingPicker.tsx
// "Pick a curio to train" step shown before a main quest quiz starts. The chosen
// curio earns 1/3 of the quest's XP as Curio EXP when the quest is completed
// (see ActiveQuestView). An eligible curio is always selected; the player can switch.
// Lists every curio the player owns: the team and bench (user_monsters) plus the
// Catch Inbox (user_caught_monsters), where wild catches and guild companions wait
// until they're put on the team.
import { useEffect, useRef, useState } from 'react';
import { ALL_MONSTERS, BATTLE_CONSTANTS, GUILD_MONSTERS, MonsterDef, getGuildMonsterDisplay, getOwnedMonsterDisplay } from '@/lib/monsterConfig';
import { fetchCurioCollection } from '@/lib/curioCollection';
import { fetchSubclassProfile, guildLevelForKey, SubclassProfile } from '@/lib/guildEngine';
import { MonsterImage } from '@/components/battle/shared';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questButtonBoxShadow, questTextShadowStyle, questTextStyle, CURIO_CARD_STYLES } from '@/components/GameButton';
import { playPageFlip } from '@/lib/sounds';

export const TRAINING_EXP_SHARE = 1 / 3;

export interface OwnedCurio {
  id: string;
  monster_id: string;
  nickname: string | null;
  monster_level: number;
  slot: number | null;
  graduation_tier: number | null;
  // Which table the row lives in: 'team' = user_monsters, 'inbox' = user_caught_monsters.
  source: 'team' | 'inbox';
  // The form the player actually sees: guild companions at their guild-level
  // stage, graduated curios at their graduated stage.
  display: MonsterDef | undefined;
}

// Same display rules as the Curio Arena (MonsterGuild.tsx) and Trainer Card:
// guild companions take the stage their owner's guild level unlocks, then the
// row's own graduation tier is layered on.
export function getOwnedCurioDisplay(monsterId: string, graduationTier: number | null, profile: SubclassProfile | null): MonsterDef | undefined {
  const guildDef = GUILD_MONSTERS[monsterId];
  const species = guildDef
    ? getGuildMonsterDisplay(guildDef, guildLevelForKey(profile, guildDef.guildEvolution?.guildKey))
    : ALL_MONSTERS[monsterId];
  return getOwnedMonsterDisplay(species, graduationTier);
}

const isMax = (c: { monster_level: number }) => c.monster_level >= BATTLE_CONSTANTS.MONSTER_LEVEL_CAP;

interface Props {
  userId: string;
  // undefined = player hasn't chosen yet (defaults to the active curio)
  selectedId: string | undefined;
  onSelect: (curio: OwnedCurio) => void;
  // What the trainee earns, for screens that don't pay a share of quest XP
  // (Bonus Quest sets). Defaults to the main-quest wording.
  rewardText?: string;
}

export default function CurioTrainingPicker({ userId, selectedId, onSelect, rewardText }: Props) {
  const [curios, setCurios] = useState<OwnedCurio[] | null>(null);
  const [activeSlot, setActiveSlot] = useState<number>(1);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchCurioCollection(userId).catch(() => null),
      fetchSubclassProfile(userId).catch(() => null),
    ]).then(([collection, profile]) => {
      if (cancelled) return;
      const team: OwnedCurio[] = (collection?.userMonsters ?? []).map(m => ({
        id: m.id, monster_id: m.monster_id, nickname: m.nickname, monster_level: m.monster_level,
        slot: m.slot, graduation_tier: m.graduation_tier ?? null, source: 'team',
        display: getOwnedCurioDisplay(m.monster_id, m.graduation_tier ?? null, profile),
      }));
      // Catch Inbox curios are never graduated (graduating needs a team slot).
      const inbox: OwnedCurio[] = (collection?.caughtMonsters ?? []).map(m => ({
        id: m.id, monster_id: m.monster_id, nickname: m.nickname, monster_level: m.monster_level,
        slot: null, graduation_tier: 0, source: 'inbox',
        display: getOwnedCurioDisplay(m.monster_id, 0, profile),
      }));
      // Team slots first, then the bench, then the inbox, strongest first.
      team.sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99) || b.monster_level - a.monster_level);
      inbox.sort((a, b) => b.monster_level - a.monster_level);
      setCurios([...team, ...inbox]);
      if (collection?.battleState?.active_monster_slot) setActiveSlot(collection.battleState.active_monster_slot);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const activeCurio = curios?.find(c => c.slot === activeSlot) ?? curios?.find(c => c.slot != null) ?? null;

  // Max-level curios can't earn EXP, so they're hidden entirely. Default is the
  // active curio if it can still level, else the first one that can.
  const trainable = curios?.filter(c => !isMax(c)) ?? null;
  const defaultCurio = trainable?.find(c => c.id === activeCurio?.id) ?? trainable?.[0] ?? null;

  // Default the selection to the trainable curio above, once, until they choose.
  const defaulted = useRef(false);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    if (defaulted.current || selectedId !== undefined || !defaultCurio) return;
    defaulted.current = true;
    onSelect(defaultCurio);
  }, [defaultCurio, selectedId, onSelect]);

  if (curios === null) return <p className="text-sm text-[#6b4820] mb-6">Loading your curios…</p>;
  if (!trainable || trainable.length === 0) return null; // nothing left to train — step disappears

  // Team curios first; the bench and Catch Inbox wait behind "Show all" so a
  // big collection doesn't turn this step into a long scroll. The picked curio
  // always stays visible, and if no team curio can train, everything shows.
  const shortList = trainable.filter(c => c.slot != null || c.id === selectedId);
  const visible = showAll || shortList.length === 0 ? trainable : shortList;
  const hiddenCount = trainable.length - shortList.length;

  return (
    <div className="mb-8 text-left">
      <style>{CURIO_CARD_STYLES}</style>
      <p className="text-center text-[#7a4a0f] font-bold mb-1">Which curio should train?</p>
      <p className="text-center text-xs text-[#6b4820] mb-4">
        Your active curio is picked by default — tap another to switch. {rewardText ?? `The trainee earns ${Math.round(TRAINING_EXP_SHARE * 100)}% of the XP you earn when you complete this quest.`}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
        {visible.map(c => {
          const def = c.display;
          const selected = selectedId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => { playPageFlip(); onSelect(c); }}
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
              <MonsterImage monster={def} className="w-16 h-16" emojiClassName="text-4xl" />
              <span className="text-sm font-extrabold text-[#2a1505] truncate max-w-full">{c.nickname || def?.name || c.monster_id}</span>
              <span className="ccard-lv">
                Lv.{c.monster_level}{c.slot != null ? '' : c.source === 'inbox' ? ' · inbox' : ' · bench'}
              </span>
              {selected && <span className="ccard-check">✔</span>}
            </button>
          );
        })}
      </div>
      {shortList.length > 0 && hiddenCount > 0 && (
        <div className="flex justify-center mt-4">
          <GameButton
            variant="quest"
            color="#d4d4d4"
            onClick={() => { playPageFlip(); setShowAll(v => !v); }}
            style={{ fontSize: 13 }}
          >
            {showAll ? 'Show only my team' : `Show all my curios (+${hiddenCount})`}
          </GameButton>
        </div>
      )}
    </div>
  );
}
