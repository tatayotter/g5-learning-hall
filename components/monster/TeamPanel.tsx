'use client';
import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ALL_MONSTERS, BATTLE_CONSTANTS, MonsterDef, Skill, SKILLS, Element, ELEMENT_ICON_SRC,
  getUnlockedMonsterSlots, getScaledStats, getEquippedSkills,
  getGraduatedMonsterDisplay, getMaxGraduationTier, GRADUATION_LEVEL_REQUIREMENT,
} from '@/lib/monsterConfig';
import { SCROLL_CATALOG, unlearnMonsterSkill, learnMonsterSkill } from '@/lib/skillScrolls';
import { graduateMonster } from '@/lib/monsterGraduation';
import { MonsterImage, UserMonster } from '@/components/battle/shared';
import { CaughtMonster } from '@/components/monster/types';
import {
  QualityTier, QUALITY_LABEL, TUTOR_COST_BY_TIER, totalAdvanceChance, getQualityGlowClass,
} from '@/lib/curioQuality';
import { getTomeForTier } from '@/lib/tomeShop';
import { tutorCurio, TutorOutcome } from '@/lib/tutorCurio';
import { InventoryMap } from '@/lib/inventory';
import GraduationCeremonyModal from '@/components/GraduationCeremonyModal';
import TeachSkillModal from '@/components/monster/TeachSkillModal';
import UnlearnSkillModal from '@/components/monster/UnlearnSkillModal';
import TutorRollModal from '@/components/TutorRollModal';

const ELEMENT_STYLES: Record<Element, string> = {
  fire:   'text-orange-400 border-orange-800 bg-orange-900/20',
  water:  'text-blue-400 border-blue-800 bg-blue-900/20',
  leaf:   'text-green-400 border-green-800 bg-green-900/20',
  storm:  'text-yellow-400 border-yellow-800 bg-yellow-900/20',
  shadow: 'text-purple-400 border-purple-800 bg-purple-900/20',
  light:  'text-amber-300 border-amber-700 bg-amber-900/20',
};

export default function TeamPanel({
  userMonsters, playerLevel, userId, onTeamChange, monsterDisplay, caughtMonsters, onPromote,
  inventory, currentGold, weekStartingDate, onGoldSynced,
}: {
  userMonsters: UserMonster[];
  playerLevel: number;
  userId: string;
  onTeamChange: () => void;
  monsterDisplay: Record<string, MonsterDef>;
  caughtMonsters: CaughtMonster[];
  onPromote: (caught: CaughtMonster, slot: number) => void;
  inventory: InventoryMap;
  currentGold: number;
  weekStartingDate: string;
  onGoldSynced: (newStats: { gold: number; xp: number; level: number }) => void;
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
  const [learnedEvent, setLearnedEvent] = useState<{ monster: MonsterDef; skill: Skill } | null>(null);
  const [forgottenEvent, setForgottenEvent] = useState<{ monster: MonsterDef; skill: Skill } | null>(null);
  const [tutorOutcome, setTutorOutcome] = useState<{ outcome: TutorOutcome; monsterName: string } | null>(null);

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

  const handleUnlearn = async (monsterRowId: string, slotIndex: number, skill: Skill, monsterDef: MonsterDef) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    try {
      const ok = await unlearnMonsterSkill(userId, monsterRowId, slotIndex);
      if (ok) {
        onTeamChange();
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
        onTeamChange();
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
        onTeamChange();
      } else {
        alert('Could not graduate — make sure the monster has reached the required level and you have a Graduation Scroll.');
      }
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const handleTutor = async (monsterRowId: string, monsterName: string, useTome: boolean) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    try {
      const outcome = await tutorCurio(userId, monsterRowId, weekStartingDate, useTome);
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
      setTutorOutcome({ outcome, monsterName });
      onTeamChange();
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
    const def = monsterDisplay[monster.monster_id];
    if (!def) return null;
    const scaled = getScaledStats(def, monster.monster_level, monster.quality);
    const glowClass = getQualityGlowClass(monster.quality);

    return (
      <div
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        onClick={() => setDetailMonster(null)}
      >
        <div
          className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto p-5 rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl battle-panel-in"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setDetailMonster(null)}
            className="absolute top-3 right-3 text-gray-500 hover:text-white text-xl leading-none btn-tactile"
            aria-label="Close"
          >
            ✕
          </button>

          <div className="flex flex-col sm:flex-row gap-5">
            <div className={`w-28 h-28 mx-auto sm:mx-0 flex-shrink-0 ${glowClass}`}>
              <MonsterImage monster={def} className="w-full h-full" emojiClassName="text-6xl" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xl font-bold text-white font-display flex items-center gap-2">
                  {def.name}
                  {def.isLegendary && <span title="Legendary">👑</span>}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border capitalize ${ELEMENT_STYLES[def.element]}`}>
                    <img src={ELEMENT_ICON_SRC[def.element]} alt="" className="w-3 h-3 object-contain" />
                    {def.element}
                  </span>
                  <span className="text-[10px] text-gray-500 capitalize">{def.archetype.replace('_', ' ')}</span>
                  <span className="text-[10px] text-gray-500">Lv.{monster.monster_level}{monster.graduation_tier ? ` · Graduation Tier ${monster.graduation_tier}` : ''}</span>
                  {monster.quality !== 'normal' && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-white ${glowClass}`}>
                      {QUALITY_LABEL[monster.quality]}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Live stats</p>
                <div className="grid grid-cols-2 gap-2 max-w-xs text-sm text-white">
                  <p className="flex items-center gap-1.5"><img src="/icons/stats/hp.svg" alt="" className="w-4 h-4 object-contain" /> {scaled.hp} HP</p>
                  <p className="flex items-center gap-1.5"><img src="/icons/stats/atk.svg" alt="" className="w-4 h-4 object-contain" /> {scaled.attack} Attack</p>
                  <p className="flex items-center gap-1.5"><img src="/icons/stats/def.svg" alt="" className="w-4 h-4 object-contain" /> {scaled.defense} Defense</p>
                  <p className="flex items-center gap-1.5"><img src="/icons/stats/spd.svg" alt="" className="w-4 h-4 object-contain" /> {scaled.speed} Speed</p>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Reflects level, graduation, and quality — the Compendium only shows this species' unmodified base stats.</p>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Skills</p>
                <div className="space-y-2">
                  {getEquippedSkills(monster.equipped_skills, def).map((skill, i) => {
                    const slotIndex = i + 1;
                    const isPending = pendingSlot?.monsterRowId === monster.id && pendingSlot.slotIndex === slotIndex;
                    const unlearnQty = inventory['unlearn_scroll'] || 0;
                    const slotScrolls = SCROLL_CATALOG.filter(s =>
                      s.skillId && (s.element === def.element || s.category === 'universal') && (inventory[s.key] || 0) > 0
                    );
                    return (
                      <div key={i} className="border border-neutral-800 rounded-lg p-2">
                        {skill ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs min-w-0">
                              <span className="font-bold text-white">{skill.name}</span>
                              <span className="text-gray-500"> — {skill.description}</span>
                            </div>
                            <button
                              onClick={() => handleUnlearn(monster.id, slotIndex, skill, def)}
                              disabled={unlearnQty === 0 || actionBusy}
                              className="text-[10px] bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded text-white flex-shrink-0"
                            >
                              {unlearnQty === 0 ? 'Need Unlearn Scroll' : 'Unlearn'}
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-gray-500 italic">Empty slot</span>
                              <button
                                onClick={() => setPendingSlot(isPending ? null : { monsterRowId: monster.id, slotIndex })}
                                className="text-[10px] bg-amber-800 hover:bg-amber-700 px-2 py-1 rounded text-white flex-shrink-0"
                              >
                                {isPending ? 'Cancel' : 'Teach a Skill'}
                              </button>
                            </div>
                            {isPending && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {slotScrolls.length === 0 ? (
                                  <p className="text-[10px] text-gray-600 italic">No scrolls owned for this slot yet — buy some in the Rewards Vault.</p>
                                ) : (
                                  slotScrolls.map(s => (
                                    <button
                                      key={s.key}
                                      disabled={actionBusy}
                                      onClick={() => handleLearn(monster.id, slotIndex, s.skillId!, s.key, def)}
                                      className="text-[10px] bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 px-2 py-1 rounded text-white"
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
              </div>

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
                  <div className="border border-amber-900 bg-amber-900/10 rounded-lg p-3">
                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1">Graduation</p>
                    <p className="text-xs text-gray-400 mb-2">
                      Reach Lv.{requiredLevel} and use a Graduation Scroll to graduate into <span className="font-bold text-white">{stage.name}</span>.
                    </p>
                    <button
                      onClick={() => handleGraduate(monster.id, requiredLevel, targetTier, monster.monster_id, currentTier, monster.monster_level, monster.quality)}
                      disabled={!levelMet || scrollQty === 0 || actionBusy}
                      className="text-[10px] bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded text-white"
                    >
                      {!levelMet ? `Need Lv.${requiredLevel} (currently Lv.${monster.monster_level})` : scrollQty === 0 ? 'Need Graduation Scroll' : `Graduate to ${stage.name} (x${scrollQty} Scroll)`}
                    </button>
                  </div>
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
                  <div className="border border-indigo-900 bg-indigo-900/10 rounded-lg p-3">
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-1">Tutor</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-white ${glowClass}`}>
                        {QUALITY_LABEL[quality]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {(advanceChance * 100).toFixed(1)}% chance to advance
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      Spend gold for a chance to permanently raise this curio's quality (boosts HP &amp; Attack). Never downgrades — a failed roll just costs the gold.
                    </p>
                    {tome && (
                      <label className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                        <input
                          type="checkbox"
                          checked={canUseTome}
                          disabled={tomeQty === 0}
                          onChange={e => setUseTomeToggle(e.target.checked)}
                        />
                        Use {tome.name} (x{tomeQty}) — boosts this roll's odds
                      </label>
                    )}
                    <button
                      onClick={() => handleTutor(monster.id, def.name, canUseTome)}
                      disabled={!affordable || actionBusy}
                      className="text-[10px] bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded text-white"
                    >
                      {!affordable ? `Need ${cost} Gold` : `Tutor (${cost} Gold)`}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white font-display">Your Team</h3>

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

      {tutorOutcome && (
        <TutorRollModal
          outcome={tutorOutcome.outcome}
          monsterName={tutorOutcome.monsterName}
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
              <button
                onClick={() => setDetailMonster(monster)}
                className="w-full flex items-center gap-4 text-left rounded-lg transition-colors hover:bg-white/5"
              >
                <div className={`w-12 h-12 ${getQualityGlowClass(monster.quality)}`}>
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
            const scaled = getScaledStats(def, bm.monster_level, bm.quality);
            return (
              <div key={bm.id} className="p-4 rounded-xl border border-cyan-900 bg-cyan-900/10">
                <div className="flex items-center gap-4">
                  <button onClick={() => setDetailMonster(bm)} className="flex flex-1 items-center gap-4 text-left rounded-lg transition-colors hover:bg-white/5 min-w-0">
                    <div className={`w-12 h-12 flex-shrink-0 ${getQualityGlowClass(bm.quality)}`}>
                      <MonsterImage monster={def} className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white">{def.name} <span className="text-gray-400 text-sm">Lv.{bm.monster_level}</span></p>
                      <p className="text-xs text-gray-500 capitalize">{def.element} · {def.archetype.replace('_', ' ')}</p>
                    </div>
                    <div className="text-xs text-gray-400 space-y-0.5 flex-shrink-0">
                      <p className="flex items-center gap-1"><img src="/icons/stats/hp.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.hp}</p>
                      <p className="flex items-center gap-1"><img src="/icons/stats/atk.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.attack}</p>
                      <p className="flex items-center gap-1"><img src="/icons/stats/def.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.defense}</p>
                      <p className="flex items-center gap-1"><img src="/icons/stats/spd.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.speed}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setPromotingBenchId(promotingBenchId === bm.id ? null : bm.id)}
                    className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex-shrink-0"
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
            // Not clickable into the detail modal — not yet a user_monsters
            // row, so skill loadout/graduation/tutoring only apply once
            // promoted below.
            const def = ALL_MONSTERS[caught.monster_id];
            if (!def) return null;
            const scaled = getScaledStats(def, caught.monster_level, caught.quality);
            return (
              <div key={caught.id} className="p-4 rounded-xl border border-cyan-900 bg-cyan-900/10">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 flex-shrink-0 ${getQualityGlowClass(caught.quality)}`}>
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
