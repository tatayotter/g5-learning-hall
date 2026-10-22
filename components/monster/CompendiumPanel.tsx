'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  WILD_MONSTERS, ALL_MONSTERS, EVENT_MONSTERS, SKILLS,
  getGuildMonsterTier, getGuildMonsterTierDef,
  getGraduatedMonsterDisplay, getMaxGraduationTier, GRADUATION_LEVEL_REQUIREMENT,
  MonsterDef,
} from '@/lib/monsterConfig';
import { guildLevelForKey, GUILD_MONSTER_GRANT_LEVEL, SubclassProfile } from '@/lib/guildEngine';
import { GUILDS } from '@/lib/dailyChecklist';
import { UserMonster, MonsterImage, LegendaryBadge } from '@/components/battle/shared';
import { CaughtMonster } from '@/components/monster/types';
import CurioCard from '@/components/monster/CurioCard';
import MiniCurioCard, { MonsterSilhouette } from '@/components/monster/MiniCurioCard';
import { playPageFlip } from '@/lib/sounds';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';
import GameButton from '@/components/GameButton';
import TrackingScrollIcon from '@/components/monster/TrackingScrollIcon';
import type { InventoryMap } from '@/lib/inventory';
import { TRACKING_GOAL, TRACKING_SCROLL_COST, isTrackable, trackingScrollKey } from '@/lib/curioTracking';
import { questButtonDropShadow, questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';

// White parchment inset with a gold outline — the modal's own content
// sections (description/stats/attacks) sit inside these rather than
// directly on the wood, the same "frame + insets" layering the dex tiles use
// (2026-08-29). No corner nails here (kept only on the outer modal frame and
// the dex grid tiles) — plain gold trim reads cleaner at this smaller scale.
export function WhiteNailBox({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`relative bg-white border-2 border-[#4a2f18] rounded-xl p-3 ${className}`} style={{ boxShadow: '0 0 0 2px #d4a017' }}>
      {children}
    </div>
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
// Buy a Tracking Scroll from a first form's Compendium page (also sold in the
// Shop). Not offered for a curio the player already has.
function TrackingScrollOffer({ name, monster, owned, inBag, gold, buying, onBuy }: {
  name: string; monster?: MonsterDef; owned: boolean; inBag: number; gold: number; buying: boolean; onBuy?: () => void;
}) {
  if (!onBuy) return null;
  const canAfford = gold >= TRACKING_SCROLL_COST;
  return (
    <div className="mt-4">
      <WhiteNailBox>
        <div className="flex items-center gap-3">
          {/* An unknown curio's scroll stays plain so it doesn't give away the face. */}
          {monster ? <TrackingScrollIcon monster={monster} className="w-14 h-14" /> : <span className="text-3xl" aria-hidden>📜</span>}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-extrabold text-[#2a1505]">Tracking Scroll</p>
            <p className="text-[11px] text-[#6b4820] leading-snug">
              {owned
                ? `You already have ${name}.`
                : inBag > 0
                  ? 'It\'s in your bag! Put it in a map slot and tap it to start tracking.'
                  : `Put it in a map slot, answer ${TRACKING_GOAL} map questions right, and ${name} comes to you!`}
            </p>
          </div>
          {!owned && inBag === 0 && (
            <GameButton
              variant="quest"
              color={canAfford ? '#d97706' : '#57534e'}
              disabled={!canAfford || buying}
              onClick={onBuy}
              data-testid="compendium-buy-tracking"
              style={{ fontSize: 13, whiteSpace: 'nowrap' }}
            >
              {buying ? 'Buying…' : (
                <span className="inline-flex items-center gap-1">
                  {TRACKING_SCROLL_COST.toLocaleString()} <img src="/icons/rewards/gold_coin.svg" alt="" className="w-3.5 h-3.5" />
                </span>
              )}
            </GameButton>
          )}
        </div>
        {!owned && inBag === 0 && !canAfford && (
          <p className="text-[11px] text-[#b91c1c] font-bold mt-1 text-right">You need {(TRACKING_SCROLL_COST - gold).toLocaleString()} more gold.</p>
        )}
      </WhiteNailBox>
    </div>
  );
}

export default function CompendiumPanel({ userMonsters, caughtMonsters, seenMonsterIds, subclassProfile, inventory, currentGold, onBuyTrackingScroll }: {
  userMonsters: UserMonster[];
  caughtMonsters: CaughtMonster[];
  seenMonsterIds: string[];
  monsterDisplay: Record<string, MonsterDef>;
  subclassProfile: SubclassProfile | null;
  inventory?: InventoryMap;
  currentGold?: number;
  onBuyTrackingScroll?: (monsterId: string) => Promise<void>;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [buyingScroll, setBuyingScroll] = useState(false);

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

  // A player CAN own more than one instance of a given species at once (the
  // egg mechanism explicitly allows a graduated adult plus its own freshly
  // hatched, ungraduated child — see MonsterGuild.tsx's displayMonsters
  // comment), so report the highest tier any owned instance has reached
  // rather than whichever row happens to be first in the array.
  const graduationTierForSpecies = (speciesId: string) =>
    userMonsters.reduce((max, m) => m.monster_id === speciesId ? Math.max(max, m.graduation_tier ?? 0) : max, 0);

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
        {/* Same Bungee/stroke/shadow text treatment as the quest GameButton's
            label (2026-08-29), in quest gold instead of the button's white. */}
        <h3 className="text-lg" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span aria-hidden style={questTextShadowStyle}>Compendium</span>
            <span style={{ ...questTextStyle, color: '#f5c542' }}>Compendium</span>
          </span>
        </h3>
        <p className="text-xs text-[#6b4820]">Every curio species in the game. Wild-only species stay a mystery silhouette until you encounter one on the Training Map.</p>
      </div>

      {selected && selectedKnown && selectedEntry && (() => {
        const stageIndex = graduationStreamEntries.findIndex(e => e.key === selectedEntry.key);
        const fromEntry = stageIndex > 0 ? graduationStreamEntries[stageIndex - 1] : undefined;
        const close = () => setSelectedKey(null);
        return createPortal(
          // Known species: its trading card, with the form chain and the
          // Tracking Scroll offer in a wood panel beside it (below on a phone).
          // Portaled to <body> so a transformed ancestor can't clip it.
          <div className="fixed inset-0 z-[82] bg-black/75 overflow-y-auto" data-testid="compendium-detail">
            <div
              className="min-h-full flex flex-col md:flex-row items-center md:items-start md:justify-center gap-5 px-4 pt-12 pb-8 md:pt-[6vh]"
              onClick={e => { if (e.target === e.currentTarget) close(); }}
            >
              <button
                onClick={() => { playPageFlip(); close(); }}
                className="fixed top-3 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white text-xl leading-none btn-tactile"
                aria-label="Close"
              >
                ✕
              </button>
              <div className="md:sticky md:top-[6vh] flex justify-center w-full md:w-auto" onClick={e => { if (e.target === e.currentTarget) close(); }}>
                <CurioCard
                  key={selectedEntry.key}
                  def={selected}
                  speciesId={selectedEntry.speciesId}
                  stats={{ hp: selected.baseHp, attack: selected.baseAttack, defense: selected.baseDefense, speed: selected.baseSpeed }}
                  moves={selected.skills.map((skillId, i) => ({
                    skill: SKILLS[skillId] ?? null,
                    lockedUntil: i === 0 ? undefined : i === 1 ? selected.skillUnlocks.tier2 : selected.skillUnlocks.tier3,
                  }))}
                  stage={{
                    index: Math.max(1, stageIndex + 1),
                    total: Math.max(1, graduationStreamEntries.length),
                    from: fromEntry && graduationStreamKnownByKey[fromEntry.key] ? fromEntry.def : undefined,
                  }}
                  ownedNote={selectedOwned && selectedIsActiveTier ? 'You have it!' : undefined}
                />
              </div>
              <div
                className="relative w-full max-w-md rounded-2xl border-2 border-[#4a2f18] battle-panel-in"
                style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
              >
                <Nail className="top-2 left-2" />
                <Nail className="top-2 right-2" />
                <Nail className="bottom-2 left-2" />
                <Nail className="bottom-2 right-2" />
                <div className="flex flex-col gap-4 p-5">
                  {graduationStreamEntries.length > 1 && (
                    <GraduationStream
                      entries={graduationStreamEntries}
                      knownByKey={graduationStreamKnownByKey}
                      activeKey={selectedKey}
                      onSelect={setSelectedKey}
                    />
                  )}
                  {selectedEntry.guildLabel && (
                    <p className="text-xs text-gray-200" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>Comes at {selectedEntry.guildLabel} Lv.{selectedEntry.unlockLevel}.</p>
                  )}
                  {selectedEntry.isGraduationTier && (
                    <p className="text-xs text-amber-300 font-semibold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                      ✨ Graduated form · needs Lv.{selectedEntry.unlockLevel} and a Graduation Scroll
                    </p>
                  )}
                  <WhiteNailBox>
                    <p className="text-xs text-[#3a2610] leading-snug">
                      {selectedOwned && selectedIsActiveTier
                        ? 'This card shows the starting numbers. Open your curio in My Team to see its real level, power and moves, and to train it.'
                        : 'This card shows the starting numbers. Moves with a 🔒 are learned as the curio levels up.'}
                    </p>
                  </WhiteNailBox>
                  {selectedEntry.tier === 1 && !selectedEntry.guildLabel && isTrackable(selectedEntry.speciesId) && (
                    <TrackingScrollOffer
                      name={selected.name}
                      monster={selected}
                      owned={selectedOwned}
                      inBag={inventory?.[trackingScrollKey(selectedEntry.speciesId)] ?? 0}
                      gold={currentGold ?? 0}
                      buying={buyingScroll}
                      onBuy={onBuyTrackingScroll ? async () => {
                        setBuyingScroll(true);
                        try { await onBuyTrackingScroll(selectedEntry.speciesId); } finally { setBuyingScroll(false); }
                      } : undefined}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        );
      })()}

      {selected && !selectedKnown && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setSelectedKey(null)}
        >
          <div
            className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border-2 border-[#4a2f18] battle-panel-in"
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
              onClick={() => { playPageFlip(); setSelectedKey(null); }}
              className="absolute top-3 right-7 z-10 text-gray-200 hover:text-white text-xl leading-none btn-tactile"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
              aria-label="Close"
            >
              ✕
            </button>
            {/* Only this body scrolls, so the frame's nails stay pinned to its corners. */}
            <div className="overflow-y-auto min-h-0 p-5">
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
          {selectedEntry && selectedEntry.tier === 1 && !selectedEntry.guildLabel && isTrackable(selectedEntry.speciesId) && (
            <TrackingScrollOffer
              name="???"
              owned={selectedOwned}
              inBag={inventory?.[trackingScrollKey(selectedEntry.speciesId)] ?? 0}
              gold={currentGold ?? 0}
              buying={buyingScroll}
              onBuy={onBuyTrackingScroll ? async () => {
                setBuyingScroll(true);
                try { await onBuyTrackingScroll(selectedEntry.speciesId); } finally { setBuyingScroll(false); }
              } : undefined}
            />
          )}
            </div>
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
          // Must check slot !== null — a bare species match is true for any
          // owned row (team or bench alike), which previously made every
          // benched curio show "In Team" instead of "Benched".
          const inTeam = userMonsters.some(m => m.monster_id === entry.speciesId && m.slot !== null);
          return (
            // The species' card thumbnail (base numbers); a species not met
            // yet is the face-down mystery version.
            <button
              key={entry.key}
              onClick={() => setSelectedKey(entry.key)}
              className="relative pt-2 text-left btn-tactile"
              aria-label={known ? entry.def.name : 'Unknown curio'}
            >
              <MiniCurioCard
                def={entry.def}
                mystery={!known}
                hp={known ? entry.def.baseHp : undefined}
                tag={entry.guildLabel ? `Tier ${entry.tier}` : entry.isGraduationTier ? `Grad ${entry.tier - 1}` : undefined}
                selected={selectedKey === entry.key}
                note={
                  known && owned && isActiveTier ? (inTeam ? '✅ In Team' : '📦 Benched')
                  : entry.isGraduationTier ? `Lv.${entry.unlockLevel}+`
                  : undefined
                }
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
