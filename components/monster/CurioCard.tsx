'use client';
// Trading-card view of one curio — the face of both the My Team detail modal
// (one owned curio's live numbers) and the Compendium detail modal (a
// species' base numbers). Laid out like a monster trading card: form + name +
// HP across the top, a framed art window, moves with their question cost and
// power, the element match-up, flavor text, and a footer with the card number
// and quality. The frame's foil gets shinier with quality (Normal → Perfect),
// and legendaries get a rainbow foil on top of that. An owned curio's card
// also flips over to its story (how it joined, battles, training, next goal)
// and can be saved as a picture.
import { useRef, useState } from 'react';
import {
  ALL_MONSTERS, Element, ELEMENT_ICON_SRC, MonsterDef, MonsterArchetype, Skill,
  getCounterElements, getGraduatedMonsterDisplay, getGuildMonsterTierDef, getMaxGraduationTier,
  getSkillIconSrc, BATTLE_CONSTANTS, MONSTERS, WILD_MONSTERS, GUILD_MONSTERS, EVENT_MONSTERS,
  GRADUATION_LEVEL_REQUIREMENT,
} from '@/lib/monsterConfig';
import { GUILDS } from '@/lib/dailyChecklist';
import { isNativeApp } from '@/lib/platform';
import { QualityTier, QUALITY_LABEL, getQualityGlowClass } from '@/lib/curioQuality';
import { MonsterImage, UserMonster } from '@/components/battle/shared';
import { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';

export interface CurioCardMove {
  skill: Skill | null;       // null = an empty slot (unlearned, waiting for a scroll)
  lockedUntil?: number;      // monster level this move unlocks at, when not usable yet
}

export interface CurioStage {
  index: number;             // 1-based form number
  total: number;             // how many forms this species has
  from?: MonsterDef;         // the form it grew from (absent on a first form)
}

// Face colors per element: a light top fading into the element's color, plus
// a darker ink for the HP number and move power.
export const ELEMENT_THEME: Record<Element, { top: string; bottom: string; ink: string; art: string }> = {
  fire:   { top: '#fff4e6', bottom: '#fdba74', ink: '#9a3412', art: '#fed7aa' },
  water:  { top: '#eef8ff', bottom: '#7dd3fc', ink: '#075985', art: '#bae6fd' },
  leaf:   { top: '#f2fde4', bottom: '#86efac', ink: '#166534', art: '#bbf7d0' },
  storm:  { top: '#fefce8', bottom: '#fde047', ink: '#854d0e', art: '#fef08a' },
  shadow: { top: '#f7f0ff', bottom: '#c4b5fd', ink: '#5b21b6', art: '#ddd6fe' },
  light:  { top: '#fffbeb', bottom: '#fcd34d', ink: '#92400e', art: '#fde68a' },
};

export const ELEMENT_NAME: Record<Element, string> = {
  fire: 'Fire', water: 'Water', leaf: 'Leaf', storm: 'Storm', shadow: 'Shadow', light: 'Light',
};

const ELEMENTS = Object.keys(ELEMENT_ICON_SRC) as Element[];

// Kid-friendly words for the stat archetypes.
const ARCHETYPE_LABEL: Record<MonsterArchetype, string> = {
  tank: 'Tough type',
  balanced: 'All-rounder',
  glass_cannon: 'Hard hitter',
};

// Frame foil per quality, brightest at Perfect.
export const QUALITY_FRAME: Record<QualityTier, string> = {
  normal: 'linear-gradient(135deg, #f7d774 0%, #d4a017 45%, #f5c542 70%, #b8860b 100%)',
  good: 'linear-gradient(135deg, #d9f99d 0%, #4ade80 30%, #f5c542 60%, #22c55e 100%)',
  outstanding: 'linear-gradient(135deg, #a5f3fc 0%, #22d3ee 30%, #f5c542 55%, #818cf8 80%, #67e8f9 100%)',
  perfect: 'linear-gradient(135deg, #fde68a 0%, #fb923c 20%, #f472b6 40%, #f5c542 60%, #fb923c 80%, #fde68a 100%)',
};
export const LEGENDARY_FRAME = 'linear-gradient(135deg, #f87171, #fbbf24, #a3e635, #22d3ee, #a78bfa, #f472b6, #f87171)';

export const QUALITY_SYMBOL: Record<QualityTier, string> = {
  normal: '●',
  good: '◆',
  outstanding: '★',
  perfect: '★★',
};

const SPECIES_IDS = Object.keys(ALL_MONSTERS);

// Card number for a species, e.g. "#012/131". Every form of a species shares it.
export function curioCardNumber(speciesId: string): string {
  const n = SPECIES_IDS.indexOf(speciesId) + 1;
  return n > 0 ? `#${String(n).padStart(3, '0')}/${SPECIES_IDS.length}` : '';
}

// Which form an owned curio is in, and the one it grew from. Graduation is per
// instance (graduation_tier); a guild companion's form comes from guild level,
// already baked into its display def, so it's matched back by name.
export function getOwnedCurioStage(speciesId: string, displayDef: MonsterDef, graduationTier: number): CurioStage {
  const species = ALL_MONSTERS[speciesId];
  if (!species) return { index: 1, total: 1 };
  if (species.guildEvolution) {
    const ev = species.guildEvolution;
    const tier = displayDef.name === ev.tier3.name ? 3 : displayDef.name === ev.tier2.name ? 2 : 1;
    return { index: tier, total: 3, from: tier > 1 ? getGuildMonsterTierDef(species, (tier - 1) as 1 | 2) : undefined };
  }
  const maxTier = getMaxGraduationTier(species);
  const tier = Math.min(graduationTier, maxTier);
  return { index: tier + 1, total: maxTier + 1, from: tier > 0 ? getGraduatedMonsterDisplay(species, tier - 1) : undefined };
}

// Back of an owned curio's card.
export interface CurioStory {
  joinedAt?: string;         // user_monsters.created_at
  joinedHow: string;         // kid-friendly, e.g. "Hatched from an egg"
  battlesFought: number;
  battlesWon: number;
  questsTrained: number;
  totalExp: number;
  forms: { def: MonsterDef; reached: boolean }[];  // every form of the species, in order
  nextGoal: string;
  countingNote?: string;     // shown when the curio joined before battles/quests were counted
}

// Battles and quests are counted per curio from this day (migration
// 20261022030000_curio_card_story.sql); older curios say so on their card.
const STORY_COUNTING_SINCE = '2026-10-22';

function joinedHow(monster: UserMonster): string {
  if (monster.acquired_via === 'egg') return 'Hatched from an egg';
  if (monster.acquired_via === 'traded') return 'Got in a trade';
  const guildDef = GUILD_MONSTERS[monster.monster_id];
  if (guildDef) {
    const guild = GUILDS.find(g => g.key === guildDef.guildEvolution?.guildKey)?.label;
    return guild ? `Earned in ${guild}` : 'Earned in a guild';
  }
  if (EVENT_MONSTERS[monster.monster_id]) return 'Won in a special event';
  if (MONSTERS[monster.monster_id]) return 'Your starter partner';
  if (WILD_MONSTERS[monster.monster_id]) return 'Caught in the wild';
  return 'Joined your team';
}

// Everything the back of an owned curio's card shows. `stage` and `moves` are
// the same values the front uses.
export function buildCurioStory(monster: UserMonster, stage: CurioStage, moves: CurioCardMove[]): CurioStory {
  const species = ALL_MONSTERS[monster.monster_id];
  const forms: MonsterDef[] = !species ? []
    : species.guildEvolution ? ([1, 2, 3] as const).map(t => getGuildMonsterTierDef(species, t))
    : Array.from({ length: getMaxGraduationTier(species) + 1 }, (_, t) => getGraduatedMonsterDisplay(species, t));

  const lockedMove = moves
    .filter(m => m.skill && m.lockedUntil !== undefined)
    .sort((a, b) => a.lockedUntil! - b.lockedUntil!)[0];
  let nextGoal: string;
  if (lockedMove) {
    nextGoal = `Learns ${lockedMove.skill!.name} at Lv.${lockedMove.lockedUntil}`;
  } else if (species?.guildEvolution && stage.index < 3) {
    const ev = species.guildEvolution;
    const guild = GUILDS.find(g => g.key === ev.guildKey)?.label ?? 'its guild';
    nextGoal = `Grows into its next form at ${guild} Lv.${stage.index === 1 ? ev.tier2.level : ev.tier3.level}`;
  } else if (species?.graduation && stage.index < stage.total) {
    const req = GRADUATION_LEVEL_REQUIREMENT[stage.index as 1 | 2];
    nextGoal = monster.monster_level >= req
      ? 'Ready to graduate! Use a Graduation Scroll'
      : `Can graduate at Lv.${req}`;
  } else if (monster.monster_level < BATTLE_CONSTANTS.MONSTER_LEVEL_CAP) {
    nextGoal = `Keep training to reach Lv.${BATTLE_CONSTANTS.MONSTER_LEVEL_CAP}`;
  } else if (monster.quality !== 'perfect') {
    nextGoal = 'Tutor it up to Perfect quality';
  } else {
    nextGoal = 'Fully grown. A true champion!';
  }

  const joinedBeforeCounting = !monster.created_at || monster.created_at.slice(0, 10) < STORY_COUNTING_SINCE;
  return {
    joinedAt: monster.created_at,
    joinedHow: joinedHow(monster),
    battlesFought: monster.battles_fought ?? 0,
    battlesWon: monster.battles_won ?? 0,
    questsTrained: monster.quests_trained ?? 0,
    totalExp: monster.monster_exp,
    forms: forms.map((def, i) => ({ def, reached: i < stage.index })),
    nextGoal,
    countingNote: joinedBeforeCounting ? 'Battles and quests count from Oct 22, 2026.' : undefined,
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysTogether(iso: string): number {
  return Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) + 1);
}

// A move's power: attack × the move's multiplier, the same formula battle uses
// before the foe's Defense and the element bonus come in.
function movePower(attack: number, skill: Skill): number {
  return Math.round(attack * skill.baseDamageMultiplier);
}

function QuestionPips({ count, element }: { count: number; element: Element | null }) {
  const color = element ? ELEMENT_THEME[element].ink : '#57534e';
  return (
    <span className="flex gap-0.5 flex-shrink-0" title={`Answer ${count} question${count > 1 ? 's' : ''} to use`} aria-label={`${count} question${count > 1 ? 's' : ''}`}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="w-3.5 h-3.5 rounded-full text-[9px] font-black leading-none flex items-center justify-center text-white"
          style={{ background: color, boxShadow: 'inset 0 -1.5px 0 rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.7)' }}
        >
          ?
        </span>
      ))}
    </span>
  );
}

export default function CurioCard({
  def, speciesId, stats, moves, stage, quality, level, exp, ownedNote, story,
}: {
  def: MonsterDef;
  speciesId: string;
  stats: { hp: number; attack: number; defense: number; speed: number };
  moves: CurioCardMove[];
  stage: CurioStage;
  quality?: QualityTier;     // set for an owned curio; a species card shows base stats instead
  level?: number;            // set for an owned curio; absent on a species (Compendium) card
  exp?: number;              // owned curio's total exp, for the XP bar
  ownedNote?: string;        // small note under the art, e.g. "In your collection"
  story?: CurioStory;        // set for an owned curio: adds the card back, Flip and Save
}) {
  const theme = ELEMENT_THEME[def.element];
  const cardRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const strongVs = getCounterElements(def.element);
  const weakTo = ELEMENTS.filter(e => getCounterElements(e).includes(def.element));
  const tier = quality ?? 'normal';
  const shiny = tier !== 'normal' || !!def.isLegendary;
  const frame = def.isLegendary ? LEGENDARY_FRAME : QUALITY_FRAME[tier];
  const stageLabel = stage.total <= 1 ? 'Basic' : `Form ${stage.index}`;
  const expPerLevel = BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL;
  const atCap = level !== undefined && level >= BATTLE_CONSTANTS.MONSTER_LEVEL_CAP;
  const expInto = exp !== undefined ? exp % expPerLevel : 0;

  // Gentle tilt toward the pointer (mouse or finger), with the foil shine
  // following it. Skipped when the player asked for less motion.
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', `${(0.5 - y) * 10}deg`);
    el.style.setProperty('--ry', `${(x - 0.5) * 12}deg`);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
  };
  const onPointerLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  // The Android app's web view can't download or share a file, so Save only
  // shows where it works: a browser, or a device that can share pictures.
  const canSave = typeof navigator !== 'undefined' && (!isNativeApp() || typeof navigator.canShare === 'function');

  // Saves the front of the card as a picture: shared to the device's share
  // sheet where it can take a file (phones), otherwise downloaded.
  const saveCard = async () => {
    const el = cardRef.current;
    if (!el || saving) return;
    setSaving(true);
    try {
      if (flipped) {
        setFlipped(false);
        await new Promise(r => setTimeout(r, 650));
      }
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(el, {
        pixelRatio: 2,
        style: { transform: 'none', animation: 'none', margin: '0' },
      });
      if (!blob) return;
      const fileName = `${def.name.replace(/[^a-z0-9]+/gi, '-')}-card.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${def.name} card` }).catch(() => {});
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="curio-card-wrap w-full max-w-[340px] sm:max-w-[360px]" style={{ perspective: 900 }}>
      <div
        ref={cardRef}
        data-testid="curio-card"
        className="curio-card relative rounded-[18px] p-[9px]"
        style={{ background: frame, boxShadow: '0 14px 30px rgba(0,0,0,0.45), 0 0 0 2px #4a2f18' }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <div className={`curio-card-flipper relative ${flipped ? 'is-flipped' : ''}`}>
        <div
          className="curio-card-face relative rounded-[11px] overflow-hidden flex flex-col gap-1.5 px-2.5 pt-2 pb-1.5 text-[#2a1505]"
          aria-hidden={flipped}
          style={{ background: `linear-gradient(180deg, ${theme.top} 0%, ${theme.bottom} 100%)`, boxShadow: 'inset 0 0 0 1.5px rgba(74,47,24,0.55)' }}
        >
          {/* Form + name + HP */}
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 h-4">
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-px rounded-sm bg-[#2a1505]/80 text-[#fde68a]">
                  {stageLabel}
                </span>
                {stage.from && (
                  <span className="flex items-center gap-0.5 text-[9px] italic text-[#3a2610] truncate">
                    <MonsterImage monster={stage.from} className="w-4 h-4" emojiClassName="text-[10px]" />
                    Grew from {stage.from.name}
                  </span>
                )}
              </div>
              <p className="text-[19px] leading-tight mt-0.5 truncate" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  <span aria-hidden style={questTextShadowStyle}>{def.name}</span>
                  <span style={questTextStyle}>{def.name}</span>
                </span>
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 pt-1">
              <span className="text-[10px] font-black" style={{ color: theme.ink }}>HP</span>
              <span className="text-2xl leading-none" style={{ fontFamily: questButtonFontFamily, color: theme.ink }} data-testid="curio-card-hp">{stats.hp}</span>
              <img src={ELEMENT_ICON_SRC[def.element]} alt={ELEMENT_NAME[def.element]} title={`${ELEMENT_NAME[def.element]} element`} className="w-7 h-7 object-contain drop-shadow" />
            </div>
          </div>

          {/* Art window */}
          <div
            className="relative rounded-md overflow-hidden"
            style={{
              aspectRatio: '4 / 3',
              background: `radial-gradient(circle at 50% 60%, #ffffff 0%, ${theme.art} 55%, ${theme.bottom} 100%)`,
              boxShadow: '0 0 0 3px #c9a24a, 0 0 0 4.5px #4a2f18, inset 0 0 18px rgba(0,0,0,0.25)',
            }}
          >
            <div aria-hidden className="absolute inset-x-[12%] bottom-[9%] h-[10%] rounded-[50%] bg-black/15 blur-[2px]" />
            {/* The glow class sets position: relative, so it goes on an inner
                box — on the absolute one it would drop the inset and the art
                would spill to the window's edges. The legendary crown is the
                tag below, so the sprite's own corner badge is turned off. */}
            <div className="absolute inset-x-[10%] top-[9%] bottom-[11%]">
              <div className={`w-full h-full ${getQualityGlowClass(tier)}`}>
                <MonsterImage monster={{ ...def, isLegendary: false }} className="w-full h-full" emojiClassName="text-7xl" />
              </div>
            </div>
            {def.isLegendary && (
              <span className="absolute top-1.5 left-1.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-[#2a1505]/80 text-[#fde68a]">👑 Legendary</span>
            )}
            {level !== undefined && (
              <span className="absolute top-1.5 right-1.5 text-[11px] font-black px-1.5 py-0.5 rounded-md bg-white/90 text-[#2a1505] border border-[#4a2f18]" data-testid="curio-card-level">Lv.{level}</span>
            )}
          </div>

          {/* Info strip under the art */}
          <div
            className="text-center text-[10px] italic font-semibold text-[#3a2610] -mt-0.5 rounded-sm px-2 py-0.5 mx-3"
            style={{ background: 'linear-gradient(90deg, transparent, #f7d774, transparent)' }}
          >
            {ELEMENT_NAME[def.element]} curio · {ARCHETYPE_LABEL[def.archetype]}{ownedNote ? ` · ${ownedNote}` : ''}
          </div>
          {level !== undefined && exp !== undefined && (
            <div className="flex items-center gap-1.5 px-1" title={atCap ? 'Top level!' : `${expPerLevel - expInto} XP to Lv.${level + 1}`}>
              <span className="text-[9px] font-black text-[#3a2610] whitespace-nowrap">{atCap ? 'XP' : `XP to Lv.${level + 1}`}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/70 border border-[#4a2f18]/40 overflow-hidden">
                <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${atCap ? 100 : (expInto / expPerLevel) * 100}%` }} />
              </div>
              <span className="text-[9px] font-bold text-[#3a2610]">{atCap ? 'MAX' : `${expInto}/${expPerLevel}`}</span>
            </div>
          )}

          {/* Moves */}
          <div className="flex flex-col divide-y divide-[#4a2f18]/20" data-testid="curio-card-moves">
            {moves.map((move, i) => {
              const skill = move.skill;
              if (!skill) {
                return (
                  <div key={i} className="py-1.5 text-[11px] italic text-[#3a2610]/70 text-center">Empty move slot</div>
                );
              }
              const locked = move.lockedUntil !== undefined;
              return (
                <div key={i} className={`flex items-start gap-2 py-1.5 ${locked ? 'opacity-55' : ''}`}>
                  <div className="flex-1 min-w-0">
                    {/* Name first, question dots after it, so every name lines up. */}
                    <p className="text-[13px] font-extrabold leading-tight flex items-center gap-1">
                      <img src={getSkillIconSrc(skill)} alt="" className="w-3.5 h-3.5 object-contain flex-shrink-0" />
                      <span className="truncate">{skill.name}</span>
                      <span className="ml-1"><QuestionPips count={skill.questionCount} element={skill.element} /></span>
                    </p>
                    <p className="text-[10px] leading-snug text-[#3a2610]">
                      {locked ? `🔒 Learns this at Lv.${move.lockedUntil}` : skill.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-lg leading-none" style={{ fontFamily: questButtonFontFamily, color: theme.ink }}>{movePower(stats.attack, skill)}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-[#3a2610]">power</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-1 border-t border-[#4a2f18]/30 pt-1.5">
            {([
              ['atk', 'Attack', stats.attack],
              ['def', 'Defense', stats.defense],
              ['spd', 'Speed', stats.speed],
            ] as const).map(([icon, label, value]) => (
              <div key={icon} className="flex items-center justify-center gap-1 rounded-md bg-white/60 py-0.5">
                <img src={`/icons/stats/${icon}.svg`} alt="" className="w-3.5 h-3.5 object-contain" />
                <span className="text-[9px] font-bold uppercase text-[#3a2610]">{label}</span>
                <span className="text-xs font-black">{value}</span>
              </div>
            ))}
          </div>

          {/* Element match-up */}
          <div className="grid grid-cols-2 gap-1 text-[9px] font-bold uppercase tracking-wide text-[#3a2610]">
            <div className="flex items-center justify-center gap-1">
              Strong vs
              {strongVs.map(e => <img key={e} src={ELEMENT_ICON_SRC[e]} alt={ELEMENT_NAME[e]} title={ELEMENT_NAME[e]} className="w-4 h-4 object-contain" />)}
            </div>
            <div className="flex items-center justify-center gap-1">
              Weak to
              {weakTo.map(e => <img key={e} src={ELEMENT_ICON_SRC[e]} alt={ELEMENT_NAME[e]} title={ELEMENT_NAME[e]} className="w-4 h-4 object-contain" />)}
            </div>
          </div>

          {/* Flavor text */}
          <p className="text-[10.5px] italic leading-snug text-[#2a1505] bg-white/55 border border-[#c9a24a] rounded-md px-2 py-1">
            {def.description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between text-[9px] font-bold text-[#3a2610] px-0.5">
            <span>{curioCardNumber(speciesId)}</span>
            {quality ? (
              <span title={`${QUALITY_LABEL[quality]} quality`} data-testid="curio-card-quality">
                <span className="mr-0.5">{QUALITY_SYMBOL[quality]}</span>{QUALITY_LABEL[quality]}
              </span>
            ) : (
              <span>Base stats</span>
            )}
            <span>Learning Hall</span>
          </div>

          {shiny && <div aria-hidden className="curio-card-foil pointer-events-none absolute inset-0" />}
        </div>
        {story && <CardBack def={def} speciesId={speciesId} story={story} flipped={flipped} />}
        </div>
      </div>
      {story && (
        <div className="flex justify-center gap-2 mt-3">
          <button
            type="button"
            onClick={() => setFlipped(f => !f)}
            className="px-4 py-1.5 rounded-full text-sm font-black bg-white text-[#2a1505] border-2 border-[#4a2f18] shadow btn-tactile"
            data-testid="curio-card-flip"
          >
            {flipped ? '↺ Front' : '↻ Flip'}
          </button>
          {canSave && (
            <button
              type="button"
              onClick={saveCard}
              disabled={saving}
              className="px-4 py-1.5 rounded-full text-sm font-black bg-[#f5c542] text-[#2a1505] border-2 border-[#4a2f18] shadow btn-tactile disabled:opacity-60"
              data-testid="curio-card-save"
            >
              {saving ? 'Saving…' : '⬇ Save card'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StoryRow({ icon, label, value, testId }: { icon: string; label: string; value: string; testId?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-white/65 px-2 py-1" data-testid={testId}>
      <span className="text-base w-5 text-center" aria-hidden>{icon}</span>
      <span className="text-[11px] font-bold text-[#3a2610] flex-1">{label}</span>
      <span className="text-[13px] font-black text-[#2a1505] text-right">{value}</span>
    </div>
  );
}

// The back of an owned curio's card: its own story rather than species facts.
function CardBack({ def, speciesId, story, flipped }: { def: MonsterDef; speciesId: string; story: CurioStory; flipped: boolean }) {
  const theme = ELEMENT_THEME[def.element];
  return (
    <div
      className="curio-card-back absolute inset-0 rounded-[11px] overflow-hidden flex flex-col gap-1.5 px-2.5 pt-2 pb-1.5 text-[#2a1505]"
      style={{ background: `linear-gradient(180deg, ${theme.top} 0%, ${theme.bottom} 100%)`, boxShadow: 'inset 0 0 0 1.5px rgba(74,47,24,0.55)' }}
      aria-hidden={!flipped}
      data-testid="curio-card-back"
    >
      <div className="flex items-center gap-2">
        <MonsterImage monster={{ ...def, isLegendary: false }} className="w-10 h-10" emojiClassName="text-2xl" />
        <p className="text-[17px] leading-tight truncate" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span aria-hidden style={questTextShadowStyle}>{def.name}&apos;s story</span>
            <span style={questTextStyle}>{def.name}&apos;s story</span>
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <StoryRow icon="📅" label={story.joinedHow} value={story.joinedAt ? formatDate(story.joinedAt) : '—'} />
        {story.joinedAt && <StoryRow icon="🤝" label="Days together" value={String(daysTogether(story.joinedAt))} />}
        <StoryRow icon="🏆" label="Battles won" value={`${story.battlesWon} of ${story.battlesFought}`} testId="curio-story-battles" />
        <StoryRow icon="📚" label="Quests trained" value={String(story.questsTrained)} testId="curio-story-quests" />
        <StoryRow icon="⭐" label="Total XP" value={story.totalExp.toLocaleString()} />
      </div>

      {story.forms.length > 1 && (
        <div>
          <p className="text-[9px] font-black uppercase tracking-wider text-[#3a2610] mb-1">Forms</p>
          <div className="flex items-center justify-center gap-1">
            {story.forms.map((f, i) => (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-[#3a2610] text-xs">→</span>}
                <div
                  className={`w-14 rounded-md border-2 p-0.5 text-center ${f.def.name === def.name ? 'bg-white border-[#c9781a]' : 'bg-white/60 border-[#4a2f18]/40'}`}
                >
                  <div className="w-full h-10 flex items-center justify-center">
                    {f.reached
                      ? <MonsterImage monster={{ ...f.def, isLegendary: false }} className="w-10 h-10" emojiClassName="text-xl" />
                      : <span className="text-xl font-black text-[#3a2610]/60">?</span>}
                  </div>
                  <p className="text-[8px] font-bold truncate">{f.reached ? f.def.name : '???'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-md border-2 border-[#c9781a] bg-[#fff7e0] px-2 py-1.5" data-testid="curio-story-goal">
        <p className="text-[9px] font-black uppercase tracking-wider text-[#c9781a]">Next goal</p>
        <p className="text-[12px] font-bold leading-snug">{story.nextGoal}</p>
      </div>

      <div className="flex-1" />
      {story.countingNote && <p className="text-[9px] italic text-[#3a2610] text-center">{story.countingNote}</p>}
      <div className="flex items-center justify-between text-[9px] font-bold text-[#3a2610] px-0.5">
        <span>{curioCardNumber(speciesId)}</span>
        <span>Learning Hall</span>
      </div>
    </div>
  );
}
