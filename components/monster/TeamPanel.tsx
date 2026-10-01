'use client';
import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ALL_MONSTERS, BATTLE_CONSTANTS, MonsterDef, Skill, SKILLS, Element, ELEMENT_ICON_SRC,
  getUnlockedMonsterSlots, getScaledStats, getEquippedSkills,
  getGraduatedMonsterDisplay, getOwnedMonsterDisplay, getMaxGraduationTier, GRADUATION_LEVEL_REQUIREMENT,
  getMonsterLevel,
} from '@/lib/monsterConfig';
import { SCROLL_CATALOG, unlearnMonsterSkill, learnMonsterSkill } from '@/lib/skillScrolls';
import { playPageFlip } from '@/lib/sounds';
import { graduateMonster } from '@/lib/monsterGraduation';
import { useGrowthPill } from '@/lib/growthPill';
import { MonsterImage, UserMonster } from '@/components/battle/shared';
import { CaughtMonster } from '@/components/monster/types';
import {
  QualityTier, QUALITY_TIERS, QUALITY_LABEL, TUTOR_COST_BY_TIER, totalAdvanceChance, getQualityGlowClass,
} from '@/lib/curioQuality';
import { getTomeForTier } from '@/lib/tomeShop';
import { tutorCurio, TutorOutcome } from '@/lib/tutorCurio';
import { InventoryMap } from '@/lib/inventory';
import { logAction } from '@/lib/playerlog';
import GraduationCeremonyModal from '@/components/GraduationCeremonyModal';
import GrowthPillCeremonyModal from '@/components/GrowthPillCeremonyModal';
import TeachSkillModal from '@/components/monster/TeachSkillModal';
import UnlearnSkillModal from '@/components/monster/UnlearnSkillModal';
import TutorRollModal from '@/components/TutorRollModal';
import { EggChainMap, claimCurioEgg, eggReadyLevel } from '@/lib/curioEggs';
import MissionsPanel from '@/components/monster/MissionsPanel';
import { WhiteNailBox } from '@/components/monster/CompendiumPanel';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';
import GameButton, { questButtonDropShadow, questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';

const ELEMENT_STYLES: Record<Element, string> = {
  fire:   'text-orange-700 border-orange-200 bg-orange-50',
  water:  'text-blue-700 border-blue-200 bg-blue-50',
  leaf:   'text-green-700 border-green-200 bg-green-50',
  storm:  'text-yellow-700 border-yellow-200 bg-yellow-50',
  shadow: 'text-purple-700 border-purple-200 bg-purple-50',
  light:  'text-amber-700 border-amber-200 bg-amber-50',
};

export default function TeamPanel({
  userMonsters, playerLevel, userId, onTeamChange, onLoadoutChange, monsterDisplay, caughtMonsters, onPromote,
  inventory, currentGold, weekStartingDate, onGoldSynced,
  eggChainMap, claimedEggParentIds, onEggClaimed,
  onGraduated, onTutored,
}: {
  userMonsters: UserMonster[];
  playerLevel: number;
  userId: string;
  onTeamChange: () => void;
  // Lighter refresh (just userMonsters + inventory, no loading-spinner
  // remount) used by the modal actions below — onTeamChange sets `loading`
  // in MonsterGuild, which unmounts this whole panel and wipes local modal
  // state (tutorOutcome, detailMonster, ...) before the user ever sees the
  // result. Kept separate from onTeamChange (still used by handleAddMonster,
  // where a full reload was already the pre-existing behavior).
  onLoadoutChange: () => Promise<void> | void;
  monsterDisplay: Record<string, MonsterDef>;
  caughtMonsters: CaughtMonster[];
  onPromote: (caught: CaughtMonster, slot: number) => void;
  inventory: InventoryMap;
  currentGold: number;
  weekStartingDate: string;
  onGoldSynced: (newStats: { gold: number; xp: number; level: number }) => void;
  // Curio egg mechanism (see docs/curio-egg-mechanism-design.md) — a species
  // with no eggChainMap entry never shows the "ready to lay an egg" prompt
  // (also excludes guild/event curios, which never get a chain entry).
  eggChainMap: EggChainMap;
  claimedEggParentIds: Set<string | null>;
  onEggClaimed: () => void;
  // Achievement-counter bumps (see lib/achievements.ts) — fired on a
  // successful graduation/Tutor attempt, separately from onLoadoutChange
  // (which just refreshes the panel's own data).
  onGraduated?: () => void;
  onTutored?: () => void;
}) {
  const unlockedSlots = getUnlockedMonsterSlots(playerLevel);
  const benchedMonsters = userMonsters.filter(m => m.slot === null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promotingBenchId, setPromotingBenchId] = useState<string | null>(null);

  // Curio-instance detail (live stats) + management (skill loadout,
  // graduation, quality tutoring) lives here rather than the Compendium — a
  // species dex entry can't disambiguate which owned copy an action applies
  // to (a duplicate catch can sit benched as a second instance of the same
  // species), while every row rendered in this panel is already one
  // specific owned curio. Clicking a curio here opens its live stats
  // (level + graduation + quality all applied) — a deliberate contrast with
  // the Compendium, which only ever shows a species' default base stats and
  // default attacks.
  const [detailMonster, setDetailMonster] = useState<UserMonster | null>(null);
  const [pendingSlot, setPendingSlot] = useState<{ monsterRowId: string; slotIndex: number } | null>(null);
  const [useTomeToggle, setUseTomeToggle] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const actionBusyRef = useRef(false);
  const [ceremony, setCeremony] = useState<{ fromDef: MonsterDef; toDef: MonsterDef; monsterLevel: number; quality: QualityTier; speciesId: string; targetTier: 1 | 2 } | null>(null);
  const [growthCeremony, setGrowthCeremony] = useState<{ def: MonsterDef; fromLevel: number; toLevel: number; quality: QualityTier } | null>(null);
  const [learnedEvent, setLearnedEvent] = useState<{ monster: MonsterDef; skill: Skill } | null>(null);
  const [forgottenEvent, setForgottenEvent] = useState<{ monster: MonsterDef; skill: Skill } | null>(null);
  const [tutorOutcome, setTutorOutcome] = useState<{ outcome: TutorOutcome; monsterName: string; def: MonsterDef; monsterLevel: number } | null>(null);
  const [confirmingEgg, setConfirmingEgg] = useState<{ monsterRowId: string; name: string } | null>(null);
  const [eggClaimBusy, setEggClaimBusy] = useState(false);
  // Curio IDs currently locked on a training mission — blocks bench "Move to Team" while away.
  const [missionLockedIds, setMissionLockedIds] = useState<Set<string>>(new Set());

  const handleClaimEgg = async (monsterRowId: string) => {
    setEggClaimBusy(true);
    try {
      const result = await claimCurioEgg(userId, monsterRowId);
      if (!result?.success) {
        alert(
          result?.error === 'no_chain_defined'
            ? 'No egg content is set up for this curio yet — check back soon!'
            : 'Could not claim this egg right now — try again.'
        );
        return;
      }
      const laidBy = confirmingEgg?.name ?? 'A curio';
      setConfirmingEgg(null);
      setDetailMonster(null);
      logAction(userId, weekStartingDate, 'egg', `🥚 ${laidBy} laid an egg — now incubating in the Hatchery`, 0, 0);
      onEggClaimed();
    } finally {
      setEggClaimBusy(false);
    }
  };

  const handleAddMonster = async (slot: number, monsterId: string, monsterRowId: string) => {
    // set_team_slot never overwrites an existing monster's row — it reuses
    // monsterId's own persistent row if one exists (so a previously-benched
    // monster comes back with its own level/exp/equipped_skills intact) and
    // benches whoever it displaces, rather than destroying either identity.
    // monsterRowId pins the RPC to this exact bench row — a player can own
    // two rows of the same species at once (kept a duplicate catch while the
    // original was already on the team), so looking the row up by species
    // alone is ambiguous and previously errored out silently.
    const { error } = await supabase.rpc('set_team_slot', {
      p_user_id: userId, p_monster_id: monsterId, p_slot: slot, p_monster_row_id: monsterRowId,
    });
    if (error) {
      console.error('set_team_slot error:', error);
      return;
    }
    onTeamChange();
  };

  const handleUnlearn = async (monsterRowId: string, slotIndex: number, skill: Skill, monsterDef: MonsterDef) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    try {
      const ok = await unlearnMonsterSkill(userId, monsterRowId, slotIndex);
      if (ok) {
        onLoadoutChange();
        setForgottenEvent({ monster: monsterDef, skill });
      } else {
        alert('Could not unlearn that skill — make sure you have an Unlearn Scroll.');
      }
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const handleLearn = async (monsterRowId: string, slotIndex: number, skillId: string, scrollKey: string, monsterDef: MonsterDef) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    try {
      const ok = await learnMonsterSkill(userId, monsterRowId, slotIndex, skillId, scrollKey);
      if (ok) {
        setPendingSlot(null);
        onLoadoutChange();
        const skill = SKILLS[skillId];
        if (skill) setLearnedEvent({ monster: monsterDef, skill });
      } else {
        alert('Could not learn that skill — make sure you still have that scroll.');
      }
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const handleGraduate = async (monsterRowId: string, requiredLevel: number, targetTier: 1 | 2, speciesId: string, currentTier: number, monsterLevel: number, quality: QualityTier) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    try {
      const ok = await graduateMonster(userId, monsterRowId, requiredLevel, targetTier);
      if (ok) {
        const speciesDef = ALL_MONSTERS[speciesId];
        setCeremony({
          fromDef: getGraduatedMonsterDisplay(speciesDef, currentTier),
          toDef: getGraduatedMonsterDisplay(speciesDef, targetTier),
          monsterLevel,
          quality,
          speciesId,
          targetTier,
        });
        const toName = getGraduatedMonsterDisplay(speciesDef, targetTier).name;
        logAction(userId, weekStartingDate, 'graduation', `🎓 Graduated into ${toName}`, 0, 0);
        onLoadoutChange();
        onGraduated?.();
      } else {
        alert('Could not graduate — make sure the monster has reached the required level and you have a Graduation Scroll.');
      }
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const handleUseGrowthPill = async (monsterRowId: string, def: MonsterDef, currentLevel: number, currentExp: number, quality: QualityTier) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    try {
      const ok = await useGrowthPill(userId, monsterRowId);
      if (ok) {
        // Display-only projection of the RPC's own +500 exp / level-cap
        // clamp — the server is still the source of truth for what actually
        // got written, this just avoids a refetch before showing the ceremony.
        const toLevel = getMonsterLevel(currentExp + 500);
        setGrowthCeremony({ def, fromLevel: currentLevel, toLevel, quality });
        logAction(userId, weekStartingDate, 'growth_pill', `💊 ${def.name} surged to Lv.${toLevel}`, 0, 0);
        onLoadoutChange();
      } else {
        alert('Could not use a Growth Pill right now — make sure you have one.');
      }
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const handleTutor = async (monsterRowId: string, monsterName: string, def: MonsterDef, monsterLevel: number, useTome: boolean) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    try {
      const outcome = await tutorCurio(userId, monsterRowId, useTome);
      if (!outcome) {
        alert('Could not reach the tutor right now — try again.');
        return;
      }
      if (outcome.error === 'insufficient_gold') {
        alert('❌ Not enough Gold for a Tutor attempt.');
        return;
      }
      if (outcome.error) {
        alert('Could not tutor this curio right now.');
        return;
      }
      if (outcome.character_stats) onGoldSynced(outcome.character_stats);
      setUseTomeToggle(false);
      setTutorOutcome({ outcome, monsterName, def, monsterLevel });
      onTutored?.();
      const upgraded = outcome.new_quality && outcome.new_quality !== outcome.previous_quality;
      logAction(
        userId, weekStartingDate, 'tutor',
        upgraded
          ? `📘 Tutored ${monsterName} — rolled up to ${QUALITY_LABEL[outcome.new_quality as QualityTier]}!`
          : `📘 Tutored ${monsterName} — no upgrade this time`,
        0, -(outcome.gold_spent ?? 0)
      );
      onLoadoutChange();
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  // A monster's own row data can go stale the instant an action inside the
  // modal succeeds (onTeamChange refetches userMonsters asynchronously) — so
  // the modal renders off the freshest matching row in userMonsters when one
  // exists, falling back to the snapshot that opened it only if the row
  // briefly disappears mid-refresh (e.g. right after a promote).
  const liveDetailMonster = detailMonster
    ? userMonsters.find(m => m.id === detailMonster.id) ?? detailMonster
    : null;

  function renderDetailModal() {
    if (!liveDetailMonster) return null;
    const monster = liveDetailMonster;
    const def = getOwnedMonsterDisplay(monsterDisplay[monster.monster_id], monster.graduation_tier);
    if (!def) return null;
    const scaled = getScaledStats(def, monster.monster_level, monster.quality);
    const glowClass = getQualityGlowClass(monster.quality);

    // Small parchment chip button for inline skill-slot actions (Unlearn, Teach,
    // pick a scroll) — too small for the full quest button.
    const chipButton = 'text-[10px] font-bold bg-[#f0ddb8] hover:bg-[#e8c88a] border border-[#c9a87a] hover:border-[#c9781a] disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded text-[#6b4820] flex-shrink-0 btn-tactile';
    const sectionLabel = 'text-[10px] text-[#7a4a0f] font-bold uppercase tracking-widest mb-1';
    const shadowText = { textShadow: '0 1px 2px rgba(0,0,0,0.9)' };

    return (
      <div
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        onClick={() => setDetailMonster(null)}
      >
        {/* Same wood-plank + gold trim + corner-nail frame and white gold-trim
            insets as CompendiumPanel's species detail modal. The frame itself
            doesn't scroll (so the nails stay pinned to its corners) — only the
            inner body does. */}
        <div
          className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border-2 border-[#4a2f18] battle-panel-in"
          style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
          onClick={e => e.stopPropagation()}
        >
          <Nail className="top-2 left-2" />
          <Nail className="top-2 right-2" />
          <Nail className="bottom-2 left-2" />
          <Nail className="bottom-2 right-2" />
          <button
            onClick={() => { playPageFlip(); setDetailMonster(null); }}
            className="absolute top-3 right-7 z-10 text-gray-200 hover:text-white text-xl leading-none btn-tactile"
            style={shadowText}
            aria-label="Close"
          >
            ✕
          </button>

          <div className="flex flex-col gap-4 overflow-y-auto min-h-0 p-5">
            <div className="flex flex-col items-center text-center gap-2">
              <div className={`w-28 h-28 ${glowClass}`}>
                <MonsterImage monster={def} className="w-full h-full" emojiClassName="text-6xl" />
              </div>
              <p className="text-xl font-bold flex items-center justify-center gap-2" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  <span aria-hidden style={questTextShadowStyle}>{def.name}</span>
                  <span style={questTextStyle}>{def.name}</span>
                </span>
                {def.isLegendary && <span title="Legendary">👑</span>}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border capitalize ${ELEMENT_STYLES[def.element]}`}>
                  <img src={ELEMENT_ICON_SRC[def.element]} alt="" className="w-3 h-3 object-contain" />
                  {def.element}
                </span>
                <span className="text-[10px] text-gray-200 capitalize" style={shadowText}>{def.archetype.replace('_', ' ')}</span>
                <span className="text-[10px] text-gray-200" style={shadowText}>Lv.{monster.monster_level}{monster.graduation_tier ? ` · Graduation Tier ${monster.graduation_tier}` : ''}</span>
                {monster.quality !== 'normal' && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#2a1505] ${glowClass}`}>
                    {QUALITY_LABEL[monster.quality]}
                  </span>
                )}
              </div>
            </div>

            <WhiteNailBox>
              <p className={sectionLabel}>Live stats</p>
              <div className="grid grid-cols-2 gap-2 max-w-xs text-sm text-[#2a1505]">
                <p className="flex items-center gap-1.5"><img src="/icons/stats/hp.svg" alt="" className="w-4 h-4 object-contain" /> {scaled.hp} HP</p>
                <p className="flex items-center gap-1.5"><img src="/icons/stats/atk.svg" alt="" className="w-4 h-4 object-contain" /> {scaled.attack} Attack</p>
                <p className="flex items-center gap-1.5"><img src="/icons/stats/def.svg" alt="" className="w-4 h-4 object-contain" /> {scaled.defense} Defense</p>
                <p className="flex items-center gap-1.5"><img src="/icons/stats/spd.svg" alt="" className="w-4 h-4 object-contain" /> {scaled.speed} Speed</p>
              </div>
              <p className="text-[10px] text-[#6b4820] mt-1">Reflects level, graduation, and quality — the Compendium only shows this species&apos; unmodified base stats.</p>
            </WhiteNailBox>

            <WhiteNailBox>
              <p className={sectionLabel}>Skills</p>
              <div className="space-y-2">
                {getEquippedSkills(monster.equipped_skills, def).map((skill, i) => {
                  const slotIndex = i + 1;
                  const isPending = pendingSlot?.monsterRowId === monster.id && pendingSlot.slotIndex === slotIndex;
                  const unlearnQty = inventory['unlearn_scroll'] || 0;
                  const slotScrolls = SCROLL_CATALOG.filter(s =>
                    s.skillId && (s.element === def.element || s.category === 'universal') && (inventory[s.key] || 0) > 0
                  );
                  return (
                    <div key={i} className="border border-[#c9a87a] bg-[#f5f0e8] rounded-lg p-2">
                      {skill ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs min-w-0">
                            <span className="font-bold text-[#2a1505]">{skill.name}</span>
                            <span className="text-[#6b4820]"> — {skill.description}</span>
                          </div>
                          <button
                            onClick={() => handleUnlearn(monster.id, slotIndex, skill, def)}
                            disabled={unlearnQty === 0 || actionBusy}
                            className={chipButton}
                          >
                            {unlearnQty === 0 ? 'Need Unlearn Scroll' : 'Unlearn'}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#6b4820] italic">Empty slot</span>
                            <button
                              onClick={() => setPendingSlot(isPending ? null : { monsterRowId: monster.id, slotIndex })}
                              className={chipButton}
                            >
                              {isPending ? 'Cancel' : 'Teach a Skill'}
                            </button>
                          </div>
                          {isPending && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {slotScrolls.length === 0 ? (
                                <p className="text-[10px] text-[#6b4820] italic">No scrolls owned for this slot yet — buy some in the Rewards Vault.</p>
                              ) : (
                                slotScrolls.map(s => (
                                  <button
                                    key={s.key}
                                    disabled={actionBusy}
                                    onClick={() => handleLearn(monster.id, slotIndex, s.skillId!, s.key, def)}
                                    className={chipButton}
                                  >
                                    {s.name} (x{inventory[s.key]})
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </WhiteNailBox>

            {ALL_MONSTERS[monster.monster_id]?.graduation && (() => {
              const speciesDef = ALL_MONSTERS[monster.monster_id];
              const grad = speciesDef.graduation!;
              const maxTier = getMaxGraduationTier(speciesDef);
              const currentTier = monster.graduation_tier ?? 0;
              if (currentTier >= maxTier) return null;
              const targetTier = (currentTier + 1) as 1 | 2;
              const stage = targetTier === 2 && grad.second ? grad.second : grad.first;
              const requiredLevel = GRADUATION_LEVEL_REQUIREMENT[targetTier];
              const scrollQty = inventory['graduation_scroll'] || 0;
              const levelMet = monster.monster_level >= requiredLevel;
              return (
                <WhiteNailBox>
                  <p className={sectionLabel}>Graduation</p>
                  <p className="text-xs text-[#3a2610] mb-3">
                    Reach Lv.{requiredLevel} and use a Graduation Scroll to graduate into <span className="font-bold text-[#2a1505]">{stage.name}</span>.
                  </p>
                  <div style={{ fontSize: 12 }}>
                    <GameButton
                      variant="quest"
                      color="#d97706"
                      className="w-full"
                      onClick={() => handleGraduate(monster.id, requiredLevel, targetTier, monster.monster_id, currentTier, monster.monster_level, monster.quality)}
                      disabled={!levelMet || scrollQty === 0 || actionBusy}
                    >
                      {!levelMet ? `Need Lv.${requiredLevel} (now Lv.${monster.monster_level})` : scrollQty === 0 ? 'Need Graduation Scroll' : `Graduate to ${stage.name} (x${scrollQty})`}
                    </GameButton>
                  </div>
                </WhiteNailBox>
              );
            })()}

            {(() => {
              const pillQty = inventory['growth_pill'] || 0;
              const atCap = monster.monster_level >= BATTLE_CONSTANTS.MONSTER_LEVEL_CAP;
              return (
                <WhiteNailBox>
                  <p className={sectionLabel}>Growth Pill</p>
                  <p className="text-xs text-[#3a2610] mb-3">
                    Use a Growth Pill to instantly gain <span className="font-bold text-[#2a1505]">5 levels</span> — works on any owned curio.
                  </p>
                  <div style={{ fontSize: 12 }}>
                    <GameButton
                      variant="quest"
                      color="#7c3aed"
                      className="w-full"
                      onClick={() => handleUseGrowthPill(monster.id, def, monster.monster_level, monster.monster_exp, monster.quality)}
                      disabled={atCap || pillQty === 0 || actionBusy}
                    >
                      {atCap ? `Already Lv.${BATTLE_CONSTANTS.MONSTER_LEVEL_CAP}` : pillQty === 0 ? 'Need Growth Pill' : `Use Growth Pill (x${pillQty})`}
                    </GameButton>
                  </div>
                </WhiteNailBox>
              );
            })()}

            {(() => {
              const tier = monster.graduation_tier as 1 | 2;
              if (!tier || tier < 1) return null;
              if (monster.monster_level < eggReadyLevel(tier)) return null;
              const chain = eggChainMap[monster.monster_id];
              if (!chain) return null;
              if (claimedEggParentIds.has(monster.id)) return null;
              return (
                <WhiteNailBox>
                  <p className={sectionLabel}>Egg</p>
                  <p className="text-xs text-[#3a2610] mb-3">
                    {def.name} is ready to lay an egg. It can only do this once.
                  </p>
                  <div style={{ fontSize: 12 }}>
                    <GameButton
                      variant="quest"
                      color="#0d9488"
                      className="w-full"
                      onClick={() => setConfirmingEgg({ monsterRowId: monster.id, name: def.name })}
                      disabled={actionBusy}
                    >
                      Claim Egg
                    </GameButton>
                  </div>
                </WhiteNailBox>
              );
            })()}

            {monster.quality !== 'perfect' && (() => {
              const quality = monster.quality;
              const cost = TUTOR_COST_BY_TIER[quality]!;
              const advanceChance = totalAdvanceChance(quality);
              const tome = getTomeForTier(quality);
              const tomeQty = tome ? (inventory[tome.key] || 0) : 0;
              const canUseTome = useTomeToggle && tomeQty > 0;
              const affordable = currentGold >= cost;
              return (
                <WhiteNailBox>
                  <p className={sectionLabel}>Tutor</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f0ddb8] text-[#2a1505] ${glowClass}`}>
                      {QUALITY_LABEL[quality]}
                    </span>
                    <span className="text-xs text-[#6b4820]">
                      {(advanceChance * 100).toFixed(1)}% chance to advance
                    </span>
                  </div>
                  <p className="text-xs text-[#3a2610] mb-2">
                    Spend gold for a chance to permanently raise this curio&apos;s quality (boosts HP &amp; Attack). Never downgrades — a failed roll just costs the gold.
                  </p>
                  {/* Stat preview — shows what HP/Attack become at the next quality tier */}
                  {(() => {
                    const nextQuality = QUALITY_TIERS[QUALITY_TIERS.indexOf(quality) + 1];
                    if (!nextQuality) return null;
                    const cur = getScaledStats(def, monster.monster_level, quality);
                    const nxt = getScaledStats(def, monster.monster_level, nextQuality);
                    return (
                      <div className="flex items-center gap-3 bg-[#f5f0e8] border border-[#c9a87a] rounded-md px-3 py-2 mb-2 text-xs">
                        <span className="text-[#6b4820] shrink-0">If {QUALITY_LABEL[nextQuality]}:</span>
                        <span className="flex items-center gap-1 text-[#3a2610]">
                          <img src="/icons/stats/hp.svg" alt="HP" className="w-3.5 h-3.5 object-contain" />
                          {cur.hp} <span className="text-green-700 font-bold">→ {nxt.hp}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[#3a2610]">
                          <img src="/icons/stats/atk.svg" alt="ATK" className="w-3.5 h-3.5 object-contain" />
                          {cur.attack} <span className="text-green-700 font-bold">→ {nxt.attack}</span>
                        </span>
                      </div>
                    );
                  })()}
                  {tome && (
                    <label className="flex items-center gap-2 text-xs text-[#6b4820] mb-3">
                      <input
                        type="checkbox"
                        checked={canUseTome}
                        disabled={tomeQty === 0}
                        onChange={e => setUseTomeToggle(e.target.checked)}
                      />
                      Use {tome.name} (x{tomeQty}) — boosts this roll&apos;s odds
                    </label>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex-1" style={{ fontSize: 12 }}>
                      <GameButton
                        variant="quest"
                        color="#4f46e5"
                        className="w-full"
                        onClick={() => handleTutor(monster.id, def.name, def, monster.monster_level, canUseTome)}
                        disabled={!affordable || actionBusy}
                      >
                        {!affordable ? `Need ${cost} Gold` : `Tutor (${cost} Gold)`}
                      </GameButton>
                    </div>
                    <span className="text-[10px] text-[#6b4820] flex items-center gap-1 shrink-0">
                      <img src="/icons/rewards/gold_coin.svg" alt="" className="w-3 h-3" /> {currentGold} left
                    </span>
                  </div>
                </WhiteNailBox>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">Your Team</h3>

      {renderDetailModal()}

      {ceremony && (
        <GraduationCeremonyModal
          fromDef={ceremony.fromDef}
          toDef={ceremony.toDef}
          monsterLevel={ceremony.monsterLevel}
          quality={ceremony.quality}
          userId={userId}
          onGoToCompendium={() => setCeremony(null)}
        />
      )}

      {growthCeremony && (
        <GrowthPillCeremonyModal
          def={growthCeremony.def}
          fromLevel={growthCeremony.fromLevel}
          toLevel={growthCeremony.toLevel}
          quality={growthCeremony.quality}
          userId={userId}
          onDismiss={() => setGrowthCeremony(null)}
        />
      )}

      {tutorOutcome && (
        <TutorRollModal
          outcome={tutorOutcome.outcome}
          monsterName={tutorOutcome.monsterName}
          def={tutorOutcome.def}
          monsterLevel={tutorOutcome.monsterLevel}
          userId={userId}
          onClose={() => setTutorOutcome(null)}
        />
      )}

      {learnedEvent && (
        <TeachSkillModal
          monster={learnedEvent.monster}
          skill={learnedEvent.skill}
          userId={userId}
          onClose={() => setLearnedEvent(null)}
        />
      )}

      {forgottenEvent && (
        <UnlearnSkillModal
          monster={forgottenEvent.monster}
          skill={forgottenEvent.skill}
          userId={userId}
          onClose={() => setForgottenEvent(null)}
        />
      )}

      {confirmingEgg && (
        <div
          className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-6"
          onClick={() => !eggClaimBusy && setConfirmingEgg(null)}
        >
          <div
            className="relative border-2 border-[#4a2f18] rounded-2xl p-6 w-full max-w-xs text-center battle-panel-in"
            style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
            onClick={e => e.stopPropagation()}
          >
            <Nail className="top-2 left-2" />
            <Nail className="top-2 right-2" />
            <Nail className="bottom-2 left-2" />
            <Nail className="bottom-2 right-2" />
            <p className="text-white font-bold text-lg mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>Lay {confirmingEgg.name}&apos;s egg?</p>
            <p className="text-[#e8d0a0] text-xs mb-5">This can only happen once — {confirmingEgg.name} stays on your team either way.</p>
            <div className="flex gap-3" style={{ fontSize: 14 }}>
              <GameButton variant="quest" color="#57534e" className="flex-1" onClick={() => setConfirmingEgg(null)} disabled={eggClaimBusy}>
                Cancel
              </GameButton>
              <GameButton variant="quest" color="#0d9488" className="flex-1" onClick={() => handleClaimEgg(confirmingEgg.monsterRowId)} disabled={eggClaimBusy}>
                {eggClaimBusy ? '...' : 'Lay Egg'}
              </GameButton>
            </div>
          </div>
        </div>
      )}

      {[1, 2, 3].map(slot => {
        const monster = userMonsters.find(m => m.slot === slot);
        const isUnlocked = slot <= unlockedSlots || !!monster;
        const def = monster ? getOwnedMonsterDisplay(monsterDisplay[monster.monster_id], monster.graduation_tier) : null;
        const expToNext = monster ? BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL - (monster.monster_exp % BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) : 0;

        return (
          <div
            key={slot}
            className={`p-4 rounded-xl border ${isUnlocked ? 'border-stone-200 bg-stone-50' : 'border-stone-200 bg-stone-100 opacity-50'}`}
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
                      const bmDef = getOwnedMonsterDisplay(monsterDisplay[bm.monster_id], bm.graduation_tier);
                      if (!bmDef) return null;
                      return (
                        <button
                          key={bm.id}
                          onClick={() => handleAddMonster(slot, bm.monster_id, bm.id)}
                          className="text-sm bg-stone-100 hover:bg-stone-200 px-3 py-1 rounded-lg text-gray-900"
                        >
                          {bmDef.name} <span className="text-gray-500">Lv.{bm.monster_level}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setDetailMonster(monster)}
                className="w-full flex items-center gap-4 text-left rounded-lg"
              >
                <div className={`w-12 h-12 ${getQualityGlowClass(monster.quality)}`}>
                  <MonsterImage monster={def} className="w-full h-full" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{def.name} <span className="text-gray-500 text-sm">Lv.{monster.monster_level}</span></p>
                  <p className="text-xs text-gray-500 capitalize">{def.element} · {def.archetype.replace('_', ' ')}</p>
                  <div className="w-full bg-stone-200 rounded-full h-1.5 mt-1">
                    <div
                      className="h-1.5 rounded-full bg-amber-400 transition-all"
                      style={{ width: `${((monster.monster_exp % BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) / BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{expToNext} EXP to next level</p>
                </div>
                <div className="text-xs text-gray-400 space-y-0.5">
                  {(() => {
                    const scaled = getScaledStats(def, monster.monster_level, monster.quality);
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
              </button>
            )}
          </div>
        );
      })}

      {/* Training Missions — between Your Team and Your Bench. */}
      <MissionsPanel
        playerLevel={playerLevel}
        userId={userId}
        benchedMonsters={benchedMonsters}
        caughtMonsters={caughtMonsters}
        monsterDisplay={monsterDisplay}
        onMissionLockedIdsChange={setMissionLockedIds}
        onLoadoutChange={onLoadoutChange}
      />

      {/* Everything not currently sitting in slot 1-3: monsters already owned but
          benched (slot IS NULL — displaced teammates, guild-reward familiars) and
          rare wild catches waiting to join for the first time. This has to be an
          always-visible section: the per-slot "Choose a monster" list above only
          renders for slots that are already empty, so once every unlocked slot is
          full, a benched monster would otherwise have no UI to be seen or swapped
          back in from at all. */}
      {(benchedMonsters.length > 0 || caughtMonsters.length > 0) && (
        <div className="space-y-3 pt-2">
          <p className="text-xs text-cyan-700 font-bold uppercase tracking-widest">Your Bench (Add To Your Team)</p>
          {benchedMonsters.map(bm => {
            const def = getOwnedMonsterDisplay(monsterDisplay[bm.monster_id], bm.graduation_tier);
            if (!def) return null;
            const scaled = getScaledStats(def, bm.monster_level, bm.quality);
            return (
              <div key={bm.id} className="p-4 rounded-xl border border-cyan-200 bg-cyan-50">
                <div className="flex items-center gap-4">
                  <button onClick={() => setDetailMonster(bm)} className="flex flex-1 items-center gap-4 text-left rounded-lg min-w-0">
                    <div className={`w-12 h-12 flex-shrink-0 ${getQualityGlowClass(bm.quality)}`}>
                      <MonsterImage monster={def} className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{def.name} <span className="text-gray-500 text-sm">Lv.{bm.monster_level}</span></p>
                      <p className="text-xs text-gray-500 capitalize">{def.element} · {def.archetype.replace('_', ' ')}</p>
                    </div>
                    <div className="text-xs text-gray-400 space-y-0.5 flex-shrink-0">
                      <p className="flex items-center gap-1"><img src="/icons/stats/hp.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.hp}</p>
                      <p className="flex items-center gap-1"><img src="/icons/stats/atk.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.attack}</p>
                      <p className="flex items-center gap-1"><img src="/icons/stats/def.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.defense}</p>
                      <p className="flex items-center gap-1"><img src="/icons/stats/spd.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.speed}</p>
                    </div>
                  </button>
                  {missionLockedIds.has(bm.id) ? (
                    <span className="text-xs text-amber-700 font-bold px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 flex-shrink-0">
                      ⚔️ On Mission
                    </span>
                  ) : (
                    <button
                      onClick={() => setPromotingBenchId(promotingBenchId === bm.id ? null : bm.id)}
                      className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex-shrink-0"
                    >
                      → Move to Team
                    </button>
                  )}
                </div>
                {promotingBenchId === bm.id && (
                  <div className="mt-3 pt-3 border-t border-cyan-200 flex flex-wrap gap-2">
                    {[1, 2, 3].map(slot => {
                      const existing = userMonsters.find(m => m.slot === slot);
                      const isUnlocked = slot <= unlockedSlots || !!existing;
                      if (!isUnlocked) return null;
                      return (
                        <button
                          key={slot}
                          onClick={() => { handleAddMonster(slot, bm.monster_id, bm.id); setPromotingBenchId(null); }}
                          className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-lg text-gray-900"
                        >
                          {existing ? `Replace ${getOwnedMonsterDisplay(monsterDisplay[existing.monster_id], existing.graduation_tier)?.name || existing.monster_id} (Slot ${slot})` : `Empty Slot ${slot}`}
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
            // Not clickable into the detail modal — not yet a user_monsters
            // row, so skill loadout/graduation/tutoring only apply once
            // promoted below.
            const def = ALL_MONSTERS[caught.monster_id];
            if (!def) return null;
            const scaled = getScaledStats(def, caught.monster_level, caught.quality);
            return (
              <div key={caught.id} className="p-4 rounded-xl border border-cyan-200 bg-cyan-50">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 flex-shrink-0 ${getQualityGlowClass(caught.quality)}`}>
                    <MonsterImage monster={def} className="w-full h-full" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{def.name} <span className="text-gray-500 text-sm">Lv.{caught.monster_level}</span></p>
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
                  <div className="mt-3 pt-3 border-t border-cyan-200 flex flex-wrap gap-2">
                    {[1, 2, 3].map(slot => {
                      const existing = userMonsters.find(m => m.slot === slot);
                      const isUnlocked = slot <= unlockedSlots || !!existing;
                      if (!isUnlocked) return null;
                      return (
                        <button
                          key={slot}
                          onClick={() => { onPromote(caught, slot); setPromotingId(null); }}
                          className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-lg text-gray-900"
                        >
                          {existing ? `Replace ${getOwnedMonsterDisplay(monsterDisplay[existing.monster_id], existing.graduation_tier)?.name || existing.monster_id} (Slot ${slot})` : `Empty Slot ${slot}`}
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
