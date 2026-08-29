'use client';
import { useState } from 'react';
import {
  WILD_MONSTERS, ALL_MONSTERS, EVENT_MONSTERS, SKILLS,
  getGuildMonsterTier, getGuildMonsterTierDef,
  getGraduatedMonsterDisplay, getMaxGraduationTier, GRADUATION_LEVEL_REQUIREMENT,
  Element, MonsterDef, ELEMENT_ICON_SRC,
} from '@/lib/monsterConfig';
import { guildLevelForKey, GUILD_MONSTER_GRANT_LEVEL, SubclassProfile } from '@/lib/guildEngine';
import { GUILDS } from '@/lib/dailyChecklist';
import { UserMonster, MonsterImage, LegendaryBadge } from '@/components/battle/shared';
import { CaughtMonster } from '@/components/monster/types';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';
import { questButtonDropShadow, questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';

// White parchment inset with a gold outline — the modal's own content
// sections (description/stats/attacks) sit inside these rather than
// directly on the wood, the same "frame + insets" layering the dex tiles use
// (2026-08-29). No corner nails here (kept only on the outer modal frame and
// the dex grid tiles) — plain gold trim reads cleaner at this smaller scale.
function WhiteNailBox({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`relative bg-white border-2 border-[#4a2f18] rounded-xl p-3 ${className}`} style={{ boxShadow: '0 0 0 2px #d4a017' }}>
      {children}
    </div>
  );
}

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

// Horizontal chain of a species' forms — base -> first/second graduation for
// a regular monster (MonsterDef.graduation), or tier1 -> tier2 -> tier3 for a
// guild companion (MonsterDef.guildEvolution). Both are graduations in the
// same sense (a permanent, one-way form upgrade past the base species) —
// a guild companion's is just automatic (gated on guild level) rather than
// bought with a Graduation Scroll, so both share the "Graduation Stream"
// label. Shown inside the detail modal for any species with more than one
// DexEntry, and reuses the exact same silhouette/"???" treatment as the main
// dex grid (MonsterSilhouette, plus LegendaryBadge on locked-but-legendary
// stages) so a locked stage never looks any more "revealed" here than its
// own grid tile does. Clicking a stage re-points the modal at that stage's
// own DexEntry, so the stream doubles as in-modal navigation between a
// species' forms.
function GraduationStream({ entries, knownByKey, activeKey, onSelect }: {
  entries: DexEntry[]; // same speciesId, sorted tier ascending
  knownByKey: Record<string, boolean>;
  activeKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] text-gray-200 font-bold uppercase tracking-widest mb-1.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>Graduation Stream</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {entries.map((stage, i) => {
          const known = knownByKey[stage.key];
          return (
            <div key={stage.key} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-200 text-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>→</span>}
              {/* White card + gold nail, same family as the description/
                  stats/attacks insets below — a small stage tile rather than
                  the dark neutral swatch this used to be (2026-08-29). */}
              <button
                onClick={() => onSelect(stage.key)}
                className="relative p-1.5 rounded-lg border-2 bg-white text-center transition-colors"
                style={{ borderColor: stage.key === activeKey ? '#f5c542' : '#4a2f18' }}
              >
                <div className="relative w-12 h-12 mx-auto mb-1">
                  {known ? (
                    <MonsterImage monster={stage.def} className="w-full h-full" emojiClassName="text-2xl" />
                  ) : (
                    <>
                      <MonsterSilhouette id={stage.def.spriteId ?? stage.speciesId} className="w-full h-full" />
                      {stage.def.isLegendary && <LegendaryBadge />}
                    </>
                  )}
                </div>
                <p className="text-[9px] font-bold text-[#2a1505] truncate max-w-[64px]">{known ? stage.def.name : '???'}</p>
                <p className="text-[9px] text-[#6b4820]">
                  {stage.tier === 1 ? 'Base' : stage.guildLabel ? `${stage.guildLabel} Lv.${stage.unlockLevel}+` : `Lv.${stage.unlockLevel}+`}
                </p>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Stat bar ceilings that accommodate every form in the game:
//   wild-legendary tier (WILD_STAT_PRESET × 1.70) tops out at HP≈238, ATK≈44
//   super_enhanced (1.45×) peaks at HP≈174, ATK≈36 — well within these bounds.
const STAT_BAR_MAX = { hp: 250, atk: 50, def: 40, spd: 30 } as const;

function CompendiumStatBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-[#6b4820] font-bold mb-0.5">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="w-full h-1.5 bg-[#e8d0a0] border border-[#c9a87a] rounded-full overflow-hidden">
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

// Compendium is a pure species reference — default base stats and default
// attacks only, never a specific owned curio's live (level/graduation/
// quality-modified) numbers or editable loadout. Instance-specific actions
// (skill loadout, graduation, quality tutoring) live in TeamPanel instead,
// since a dex entry can't disambiguate which owned copy of a species an
// action should apply to (a duplicate catch can sit benched as a second
// instance of the same species) — every row in TeamPanel is already one
// specific instance, so there's nothing to disambiguate there.
export default function CompendiumPanel({ userMonsters, caughtMonsters, seenMonsterIds, monsterDisplay, subclassProfile }: {
  userMonsters: UserMonster[];
  caughtMonsters: CaughtMonster[];
  seenMonsterIds: string[];
  monsterDisplay: Record<string, MonsterDef>;
  subclassProfile: SubclassProfile | null;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

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

  // Every DexEntry for whichever species the open modal belongs to — a
  // species' own graduation tiers (base -> first/second graduation) *or* a
  // guild companion's evolution tiers (tier1 -> tier2 -> tier3), whichever
  // applies. Only worth rendering once there's more than one entry, i.e.
  // the species actually defines `graduation` or `guildEvolution`.
  const graduationStreamEntries = selectedEntry
    ? dexEntries.filter(e => e.speciesId === selectedEntry.speciesId).sort((a, b) => a.tier - b.tier)
    : [];
  const graduationStreamKnownByKey = Object.fromEntries(graduationStreamEntries.map(e => [e.key, isEntryKnown(e)]));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white font-display">Compendium</h3>
        <p className="text-xs text-gray-500">Every curio species in the game. Wild-only species stay a mystery silhouette until you encounter one on the Training Map.</p>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setSelectedKey(null)}
        >
          <div
            className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto p-5 rounded-2xl border-2 border-[#4a2f18] battle-panel-in"
            style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Same wood-plank + gold trim + corner-nail frame as the
                battle screen's MonsterHpPanel and the dex grid tiles above
                (2026-08-29). */}
            <Nail className="top-2 left-2" />
            <Nail className="top-2 right-2" />
            <Nail className="bottom-2 left-2" />
            <Nail className="bottom-2 right-2" />
            <button
              onClick={() => setSelectedKey(null)}
              className="absolute top-3 right-3 text-gray-200 hover:text-white text-xl leading-none btn-tactile"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
              aria-label="Close"
            >
              ✕
            </button>
          {selectedKnown ? (
            <div className="flex flex-col gap-4">
              {/* Portrait through the Graduation Stream is one centered
                  column (2026-08-29) — the insets below stay left-aligned
                  text inside their own white boxes. */}
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-28 h-28">
                  <MonsterImage monster={selected} className="w-full h-full" emojiClassName="text-6xl" />
                </div>
                {/* Same Bungee/stroke/shadow text treatment as the quest
                    GameButton's label (2026-08-29). */}
                <p className="text-xl font-bold flex items-center justify-center gap-2" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
                  <span style={{ position: 'relative', display: 'inline-block' }}>
                    <span aria-hidden style={questTextShadowStyle}>{selected.name}</span>
                    <span style={questTextStyle}>{selected.name}</span>
                  </span>
                  {selected.isLegendary && <span title="Legendary">👑</span>}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border capitalize ${ELEMENT_STYLES[selected.element]}`}>
                    <img src={ELEMENT_ICON_SRC[selected.element]} alt="" className="w-3 h-3 object-contain" />
                    {selected.element}
                  </span>
                  <span className="text-[10px] text-gray-200 capitalize" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>{selected.archetype.replace('_', ' ')}</span>
                  {selectedOwned && selectedIsActiveTier && <span className="text-[10px] text-green-400 font-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>✅ In your collection</span>}
                  {selectedEntry?.guildLabel && (
                    <span className="text-[10px] text-gray-200" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>Tier {selectedEntry.tier} · {selectedEntry.guildLabel} Lv.{selectedEntry.unlockLevel}+</span>
                  )}
                  {selectedEntry?.isGraduationTier && (
                    <span className="text-[10px] text-amber-300 font-semibold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                      ✨ Grad {selectedEntry.tier - 1} · Lv.{selectedEntry.unlockLevel}+
                    </span>
                  )}
                </div>
                {graduationStreamEntries.length > 1 && (
                  <GraduationStream
                    entries={graduationStreamEntries}
                    knownByKey={graduationStreamKnownByKey}
                    activeKey={selectedKey}
                    onSelect={setSelectedKey}
                  />
                )}
              </div>

              <WhiteNailBox>
                <p className="text-sm text-[#3a2610] leading-relaxed">{selected.description}</p>
              </WhiteNailBox>

              <WhiteNailBox>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <CompendiumStatBar label="HP" value={selected.baseHp} max={STAT_BAR_MAX.hp} />
                  <CompendiumStatBar label="Attack" value={selected.baseAttack} max={STAT_BAR_MAX.atk} />
                  <CompendiumStatBar label="Defense" value={selected.baseDefense} max={STAT_BAR_MAX.def} />
                  <CompendiumStatBar label="Speed" value={selected.baseSpeed} max={STAT_BAR_MAX.spd} />
                </div>
              </WhiteNailBox>

              <WhiteNailBox>
                <p className="text-[10px] text-[#6b4820] font-bold uppercase tracking-widest mb-1">Default attacks</p>
                <div className="space-y-1">
                  {selected.skills.map((skillId, i) => {
                    const skill = SKILLS[skillId];
                    if (!skill) return null;
                    const unlockLevel = i === 0 ? 1 : i === 1 ? selected.skillUnlocks.tier2 : selected.skillUnlocks.tier3;
                    return (
                      <div key={skillId} className="flex items-center gap-2 text-xs">
                        <span className="text-[#6b4820] w-14 flex-shrink-0">Lv.{unlockLevel}</span>
                        <span className="font-bold text-[#2a1505]">{skill.name}</span>
                        <span className="text-[#6b4820]">— {skill.description}</span>
                      </div>
                    );
                  })}
                </div>
                {selectedOwned && selectedIsActiveTier && (
                  <p className="text-[10px] text-[#8b5e2a] italic mt-2">
                    This is the species' default loadout — visit My Team to see this curio's actual equipped skills, live stats, and Tutor/Graduate it.
                  </p>
                )}
              </WhiteNailBox>
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
                  selectedEntry.tier === 2 ? (
                    <p className="text-sm text-gray-500 mt-2">
                      🔒 Reach Lv.{selectedEntry.unlockLevel} and use a Graduation Scroll on your {ALL_MONSTERS[selectedEntry.speciesId].name} to reveal this form.
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-2">
                      🔒 First graduate your {ALL_MONSTERS[selectedEntry.speciesId].name} to {ALL_MONSTERS[selectedEntry.speciesId].graduation?.first?.name ?? 'its first form'} (Lv.{GRADUATION_LEVEL_REQUIREMENT[1]}), then use a second Graduation Scroll at Lv.{selectedEntry.unlockLevel} to reveal this form.
                    </p>
                  )
                ) : (
                  <p className="text-sm text-gray-500 mt-2">A mysterious wild curio — its identity is still unknown. Keep answering questions on the Training Map for a chance to encounter it.</p>
                )}
                {graduationStreamEntries.length > 1 && (
                  <div className="mt-4">
                    <GraduationStream
                      entries={graduationStreamEntries}
                      knownByKey={graduationStreamKnownByKey}
                      activeKey={selectedKey}
                      onSelect={setSelectedKey}
                    />
                  </div>
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
            // Same wood-plank + gold trim + corner-nail frame as the battle
            // screen's MonsterHpPanel, reusing its exported style pieces
            // rather than re-deriving them (2026-08-29).
            <button
              key={entry.key}
              onClick={() => setSelectedKey(entry.key)}
              className="relative p-3 rounded-xl border-2 border-[#4a2f18] text-center transition-shadow"
              style={{
                ...woodTextureStyle,
                boxShadow: selectedKey === entry.key
                  ? `0 0 0 3px #f5c542, ${questButtonDropShadow}`
                  : `0 0 0 2px #d4a017, ${questButtonDropShadow}`,
              }}
            >
              <Nail className="top-1 left-1" />
              <Nail className="top-1 right-1" />
              <Nail className="bottom-1 left-1" />
              <Nail className="bottom-1 right-1" />
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
              <p className="text-xs font-bold text-white truncate" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>{known ? entry.def.name : '???'}</p>
              {entry.guildLabel && <p className="text-[9px] text-gray-200" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>Tier {entry.tier}</p>}
              {entry.isGraduationTier && <p className="text-[9px] text-amber-300" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>Grad {entry.tier - 1} · Lv.{entry.unlockLevel}</p>}
              {known && owned && isActiveTier && (
                inTeam ? (
                  <p className="text-[9px] text-green-400" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>✅ In Team</p>
                ) : (
                  <p className="text-[9px] text-amber-300" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>📦 Benched</p>
                )
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
