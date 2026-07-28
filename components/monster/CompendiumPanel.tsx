'use client';
import { useState, useRef } from 'react';
import {
  WILD_MONSTERS, ALL_MONSTERS, EVENT_MONSTERS, SKILLS,
  getEquippedSkills, getGuildMonsterTier, getGuildMonsterTierDef,
  getGraduatedMonsterDisplay, getMaxGraduationTier, GRADUATION_LEVEL_REQUIREMENT,
  Element, MonsterDef, ELEMENT_ICON_SRC,
} from '@/lib/monsterConfig';
import { SCROLL_CATALOG, unlearnMonsterSkill, learnMonsterSkill } from '@/lib/skillScrolls';
import { graduateMonster } from '@/lib/monsterGraduation';
import { guildLevelForKey, GUILD_MONSTER_GRANT_LEVEL, SubclassProfile } from '@/lib/guildEngine';
import { GUILDS } from '@/lib/dailyChecklist';
import { UserMonster, MonsterImage, LegendaryBadge } from '@/components/battle/shared';
import GraduationCeremonyModal from '@/components/GraduationCeremonyModal';
import { InventoryMap } from '@/lib/inventory';
import { UserId } from '@/lib/userSession';
import { CaughtMonster } from '@/components/monster/types';

const ELEMENT_STYLES: Record<Element, string> = {
  fire:   'text-orange-400 border-orange-800 bg-orange-900/20',
  water:  'text-blue-400 border-blue-800 bg-blue-900/20',
  leaf:   'text-green-400 border-green-800 bg-green-900/20',
  storm:  'text-yellow-400 border-yellow-800 bg-yellow-900/20',
  shadow: 'text-purple-400 border-purple-800 bg-purple-900/20',
  light:  'text-amber-300 border-amber-700 bg-amber-900/20',
};

// Renders a monster's sprite as a flat black silhouette — deliberately
// bypasses MonsterImage so the emoji fallback can't leak a hint about the
// mystery species underneath. Callers overlay their own LegendaryBadge
// (isLegendary is safe to reveal — it doesn't identify the species).
function MonsterSilhouette({ id, className = '' }: { id: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-neutral-950 text-neutral-700 text-2xl ${className}`}>
        ?
      </div>
    );
  }
  return (
    <img
      src={`/monsters/${id}.webp`}
      alt="???"
      className={`object-contain ${className}`}
      style={{ filter: 'brightness(0)', opacity: 0.55 }}
      onError={() => setFailed(true)}
    />
  );
}

function CompendiumStatBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

// One Compendium tile — a plain species, a single evolution tier of a guild
// companion, or a graduation stage of a regular monster (each tier/stage
// gets its own card; see CompendiumPanel).
interface DexEntry {
  key: string;
  speciesId: string; // the underlying monster_id (DB key) — same across all tiers/stages of a species
  def: MonsterDef;    // tier-appropriate display def (name/emoji/spriteId), stats/skills always the base species values
  tier: 1 | 2 | 3;
  unlockLevel: number;   // guild level (guild tiers) or monster level (graduation tiers) required to reveal this tier; 1 for a plain tier1 entry
  guildLabel?: string;   // e.g. "Lorekeeper" — only set for guild-tier entries, used in the locked hint
  isGraduationTier?: boolean; // true for a species' graduated-form card (tier 2/3 = first/second graduation)
}

export default function CompendiumPanel({ userId, userMonsters, caughtMonsters, seenMonsterIds, monsterDisplay, subclassProfile, inventory, onLoadoutChange }: {
  userId: UserId;
  userMonsters: UserMonster[];
  caughtMonsters: CaughtMonster[];
  seenMonsterIds: string[];
  monsterDisplay: Record<string, MonsterDef>;
  subclassProfile: SubclassProfile | null;
  inventory: InventoryMap;
  onLoadoutChange: () => Promise<void> | void;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [ceremony, setCeremony] = useState<{ fromDef: MonsterDef; toDef: MonsterDef; monsterLevel: number; speciesId: string; targetTier: 1 | 2 } | null>(null);
  const [pendingSlot, setPendingSlot] = useState<{ monsterRowId: string; slotIndex: number } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const actionBusyRef = useRef(false);

  const handleUnlearn = async (monsterRowId: string, slotIndex: number) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    try {
      const ok = await unlearnMonsterSkill(userId, monsterRowId, slotIndex);
      if (ok) await onLoadoutChange();
      else alert('Could not unlearn that skill — make sure you have an Unlearn Scroll.');
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const handleLearn = async (monsterRowId: string, slotIndex: number, skillId: string, scrollKey: string) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    try {
      const ok = await learnMonsterSkill(userId, monsterRowId, slotIndex, skillId, scrollKey);
      if (ok) {
        setPendingSlot(null);
        await onLoadoutChange();
      } else {
        alert('Could not learn that skill — make sure you still have that scroll.');
      }
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const handleGraduate = async (monsterRowId: string, requiredLevel: number, targetTier: 1 | 2, speciesId: string, currentTier: number, monsterLevel: number) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    try {
      const ok = await graduateMonster(userId, monsterRowId, requiredLevel, targetTier);
      if (ok) {
        const speciesDef = ALL_MONSTERS[speciesId];
        // Snapshot before/after display defs now, off the pre-refresh data —
        // the ceremony below renders from this snapshot, so it's unaffected
        // by onLoadoutChange()'s refresh (fired in the background here)
        // updating userMonsters/inventory underneath it.
        setCeremony({
          fromDef: getGraduatedMonsterDisplay(speciesDef, currentTier),
          toDef: getGraduatedMonsterDisplay(speciesDef, targetTier),
          monsterLevel,
          speciesId,
          targetTier,
        });
        onLoadoutChange();
      } else {
        alert('Could not graduate — make sure the monster has reached the required level and you have a Graduation Scroll.');
      }
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const ownedSpeciesIds = new Set([
    ...userMonsters.map(m => m.monster_id),
    ...caughtMonsters.map(c => c.monster_id),
  ]);
  const knownSpeciesIds = new Set([...ownedSpeciesIds, ...seenMonsterIds]);
  const isKnownSpecies = (id: string) => {
    // Event-exclusive curios never appear wild, so seen_monsters can't apply —
    // they're a mystery until actually claimed/owned.
    if (EVENT_MONSTERS[id]) return ownedSpeciesIds.has(id);
    return !WILD_MONSTERS[id] || knownSpeciesIds.has(id);
  };

  // A player only ever owns one instance of a given species, so this lookup
  // (used below for both the "active graduation tier" checks) is unambiguous.
  const graduationTierForSpecies = (speciesId: string) => userMonsters.find(m => m.monster_id === speciesId)?.graduation_tier ?? 0;

  const dexEntries: DexEntry[] = [];
  for (const def of Object.values(ALL_MONSTERS)) {
    if (def.guildEvolution) {
      const guildLabel = GUILDS.find(g => g.key === def.guildEvolution!.guildKey)?.label;
      ([1, 2, 3] as const).forEach(tier => {
        const unlockLevel = tier === 1 ? GUILD_MONSTER_GRANT_LEVEL : tier === 2 ? def.guildEvolution!.tier2.level : def.guildEvolution!.tier3.level;
        dexEntries.push({
          key: `${def.id}__t${tier}`,
          speciesId: def.id,
          def: getGuildMonsterTierDef(def, tier),
          tier,
          unlockLevel,
          guildLabel,
        });
      });
      continue;
    }
    dexEntries.push({ key: def.id, speciesId: def.id, def, tier: 1, unlockLevel: 1 });
    if (def.graduation) {
      const maxTier = getMaxGraduationTier(def);
      for (let t = 1; t <= maxTier; t++) {
        const graduationTier = t as 1 | 2;
        dexEntries.push({
          key: `${def.id}__grad${graduationTier}`,
          speciesId: def.id,
          def: getGraduatedMonsterDisplay(def, graduationTier),
          tier: (graduationTier + 1) as 2 | 3, // base entry is tier 1, so first/second graduation land on tier 2/3
          unlockLevel: GRADUATION_LEVEL_REQUIREMENT[graduationTier],
          isGraduationTier: true,
        });
      }
    }
  }

  // Whether a given dex entry is revealed. Plain species use the existing
  // wild-encounter "known" rule; guild-tier entries (including tier 1 — the
  // companion is a reward, not a starter) are revealed purely by the owning
  // player's guild level crossing that tier's threshold; graduation-tier
  // entries are revealed only once the player has actually purchased that
  // graduation on their owned instance (it's not auto-computed from level).
  const isEntryKnown = (entry: DexEntry) => {
    if (entry.isGraduationTier) return graduationTierForSpecies(entry.speciesId) >= entry.tier - 1;
    if (!entry.guildLabel) return isKnownSpecies(entry.speciesId);
    const guildDef = ALL_MONSTERS[entry.speciesId];
    const guildLevel = guildLevelForKey(subclassProfile, guildDef.guildEvolution?.guildKey);
    return guildLevel >= entry.unlockLevel;
  };

  const selectedEntry = selectedKey ? dexEntries.find(e => e.key === selectedKey) ?? null : null;
  const selected = selectedEntry?.def ?? null;
  const selectedKnown = selectedEntry ? isEntryKnown(selectedEntry) : false;
  const selectedOwned = selectedEntry ? ownedSpeciesIds.has(selectedEntry.speciesId) : false;
  // Only the tile matching the species' *currently active* tier shows the
  // owned/team badge — as guild level rises (or a monster gets graduated),
  // the badge visually "moves" to the new tier's card.
  const selectedIsActiveTier = selectedEntry
    ? (selectedEntry.guildLabel
        ? selectedEntry.tier === getGuildMonsterTier(ALL_MONSTERS[selectedEntry.speciesId], guildLevelForKey(subclassProfile, ALL_MONSTERS[selectedEntry.speciesId].guildEvolution?.guildKey))
        : selectedEntry.tier === graduationTierForSpecies(selectedEntry.speciesId) + 1)
    : false;
  // The actual team row for the selected species, if any — a player only
  // ever owns one instance of a given monster, so this lookup is unambiguous.
  // Only team monsters (not benched catches) have an editable skill loadout.
  // Gated on selectedIsActiveTier so a species' now-superseded tier (e.g. the
  // pre-graduation form after graduating) reads as unowned, same as any dex
  // entry the player never actually holds — no skill editing, no team badge.
  const ownedMonster = selectedEntry && selectedIsActiveTier ? userMonsters.find(m => m.monster_id === selectedEntry.speciesId) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white font-display">Compendium</h3>
        <p className="text-xs text-gray-500">Every curio species in the game. Wild-only species stay a mystery silhouette until you encounter one on the Training Map.</p>
      </div>

      {ceremony && (
        <GraduationCeremonyModal
          fromDef={ceremony.fromDef}
          toDef={ceremony.toDef}
          monsterLevel={ceremony.monsterLevel}
          userId={userId}
          onGoToCompendium={() => {
            setSelectedKey(`${ceremony.speciesId}__grad${ceremony.targetTier}`);
            setCeremony(null);
          }}
        />
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setSelectedKey(null)}
        >
          <div
            className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto p-5 rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl battle-panel-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedKey(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-white text-xl leading-none btn-tactile"
              aria-label="Close"
            >
              ✕
            </button>
          {selectedKnown ? (
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="w-28 h-28 mx-auto sm:mx-0 flex-shrink-0">
                <MonsterImage monster={selected} className="w-full h-full" emojiClassName="text-6xl" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xl font-bold text-white font-display flex items-center gap-2">
                    {selected.name}
                    {selected.isLegendary && <span title="Legendary">👑</span>}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border capitalize ${ELEMENT_STYLES[selected.element]}`}>
                      <img src={ELEMENT_ICON_SRC[selected.element]} alt="" className="w-3 h-3 object-contain" />
                      {selected.element}
                    </span>
                    <span className="text-[10px] text-gray-500 capitalize">{selected.archetype.replace('_', ' ')}</span>
                    {selectedOwned && selectedIsActiveTier && <span className="text-[10px] text-green-500 font-bold">✅ In your collection</span>}
                    {selectedEntry?.guildLabel && <span className="text-[10px] text-gray-500">Tier {selectedEntry.tier} · {selectedEntry.guildLabel} Lv.{selectedEntry.unlockLevel}+</span>}
                  </div>
                </div>
                <p className="text-sm text-gray-400">{selected.description}</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 max-w-sm">
                  <CompendiumStatBar label="HP" value={selected.baseHp} max={150} />
                  <CompendiumStatBar label="Attack" value={selected.baseAttack} max={30} />
                  <CompendiumStatBar label="Defense" value={selected.baseDefense} max={30} />
                  <CompendiumStatBar label="Speed" value={selected.baseSpeed} max={30} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Skills</p>
                  {ownedMonster ? (
                    <div className="space-y-2">
                      {getEquippedSkills(ownedMonster.equipped_skills, selected).map((skill, i) => {
                        const slotIndex = i + 1;
                        const isPending = pendingSlot?.monsterRowId === ownedMonster.id && pendingSlot.slotIndex === slotIndex;
                        const unlearnQty = inventory['unlearn_scroll'] || 0;
                        const slotScrolls = SCROLL_CATALOG.filter(s =>
                          s.skillId && (s.element === selected.element || s.category === 'universal') && (inventory[s.key] || 0) > 0
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
                                  onClick={() => handleUnlearn(ownedMonster.id, slotIndex)}
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
                                    onClick={() => setPendingSlot(isPending ? null : { monsterRowId: ownedMonster.id, slotIndex })}
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
                                          onClick={() => handleLearn(ownedMonster.id, slotIndex, s.skillId!, s.key)}
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
                  ) : (
                    <div className="space-y-1">
                      {selected.skills.map((skillId, i) => {
                        const skill = SKILLS[skillId];
                        if (!skill) return null;
                        const unlockLevel = i === 0 ? 1 : i === 1 ? selected.skillUnlocks.tier2 : selected.skillUnlocks.tier3;
                        return (
                          <div key={skillId} className="flex items-center gap-2 text-xs">
                            <span className="text-gray-600 w-14 flex-shrink-0">Lv.{unlockLevel}</span>
                            <span className="font-bold text-white">{skill.name}</span>
                            <span className="text-gray-500">— {skill.description}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {selectedEntry && !selectedEntry.isGraduationTier && ownedMonster && ALL_MONSTERS[selectedEntry.speciesId].graduation && (() => {
                  const speciesDef = ALL_MONSTERS[selectedEntry.speciesId];
                  const grad = speciesDef.graduation!;
                  const maxTier = getMaxGraduationTier(speciesDef);
                  const currentTier = ownedMonster.graduation_tier ?? 0;
                  if (currentTier >= maxTier) return null;
                  const targetTier = (currentTier + 1) as 1 | 2;
                  const stage = targetTier === 2 && grad.second ? grad.second : grad.first;
                  const requiredLevel = GRADUATION_LEVEL_REQUIREMENT[targetTier];
                  const scrollQty = inventory['graduation_scroll'] || 0;
                  const levelMet = ownedMonster.monster_level >= requiredLevel;
                  return (
                    <div className="border border-amber-900 bg-amber-900/10 rounded-lg p-3">
                      <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1">Graduation</p>
                      <p className="text-xs text-gray-400 mb-2">
                        Reach Lv.{requiredLevel} and use a Graduation Scroll to graduate into <span className="font-bold text-white">{stage.name}</span>.
                      </p>
                      <button
                        onClick={() => handleGraduate(ownedMonster.id, requiredLevel, targetTier, selectedEntry.speciesId, currentTier, ownedMonster.monster_level)}
                        disabled={!levelMet || scrollQty === 0 || actionBusy}
                        className="text-[10px] bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded text-white"
                      >
                        {!levelMet ? `Need Lv.${requiredLevel} (currently Lv.${ownedMonster.monster_level})` : scrollQty === 0 ? 'Need Graduation Scroll' : `Graduate to ${stage.name} (x${scrollQty} Scroll)`}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              <div className="relative w-28 h-28 flex-shrink-0">
                <MonsterSilhouette id={selected.spriteId ?? selected.id} className="w-full h-full" />
                {selected.isLegendary && <LegendaryBadge />}
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl font-bold text-white font-display">???</p>
                {selectedEntry?.guildLabel ? (
                  <p className="text-sm text-gray-500 mt-2">
                    🔒 Reach {selectedEntry.guildLabel} Level {selectedEntry.unlockLevel} to {selectedEntry.tier === 1 ? 'earn this companion' : 'reveal this graduation'}.
                  </p>
                ) : selectedEntry?.isGraduationTier ? (
                  <p className="text-sm text-gray-500 mt-2">
                    🔒 Reach Lv.{selectedEntry.unlockLevel} and use a Graduation Scroll on your {ALL_MONSTERS[selectedEntry.speciesId].name} to reveal this graduation.
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">A mysterious wild curio — its identity is still unknown. Keep answering questions on the Training Map for a chance to encounter it.</p>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {dexEntries.map(entry => {
          const known = isEntryKnown(entry);
          const owned = ownedSpeciesIds.has(entry.speciesId);
          const speciesDef = ALL_MONSTERS[entry.speciesId];
          // Same formula for the base tier (always tier 1) and graduation
          // tiers alike, so a species' now-superseded pre-graduation card
          // stops showing the owned/team badge once graduated past it.
          const isActiveTier = entry.guildLabel
            ? entry.tier === getGuildMonsterTier(speciesDef, guildLevelForKey(subclassProfile, speciesDef.guildEvolution!.guildKey))
            : entry.tier === graduationTierForSpecies(entry.speciesId) + 1;
          const inTeam = userMonsters.find(m => m.monster_id === entry.speciesId);
          return (
            <button
              key={entry.key}
              onClick={() => setSelectedKey(entry.key)}
              className={`p-3 rounded-xl border text-center transition-colors ${
                selectedKey === entry.key ? 'border-amber-400 bg-amber-900/10' : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
              }`}
            >
              <div className="relative w-14 h-14 mx-auto mb-2">
                {known ? (
                  <MonsterImage monster={entry.def} className="w-full h-full" emojiClassName="text-3xl" />
                ) : (
                  <>
                    <MonsterSilhouette id={entry.def.spriteId ?? entry.speciesId} className="w-full h-full" />
                    {entry.def.isLegendary && <LegendaryBadge />}
                  </>
                )}
              </div>
              <p className="text-xs font-bold text-white truncate">{known ? entry.def.name : '???'}</p>
              {(entry.guildLabel || entry.isGraduationTier) && <p className="text-[9px] text-gray-600">Tier {entry.tier}</p>}
              {known && owned && isActiveTier && (
                inTeam ? (
                  <p className="text-[9px] text-green-500">✅ In Team</p>
                ) : (
                  <p className="text-[9px] text-amber-500">📦 Benched</p>
                )
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
