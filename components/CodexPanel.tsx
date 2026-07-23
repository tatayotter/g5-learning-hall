'use client';
import { useState } from 'react';
import {
  Element, ELEMENT_ICON_SRC, getCounterElements, BATTLE_CONSTANTS,
  GRADUATION_LEVEL_REQUIREMENT, GRADUATION_SCROLL_COST,
} from '@/lib/monsterConfig';
import { GUILDS, GuildKey } from '@/lib/dailyChecklist';
import { REGIONS, ELEMENT_COLOR, REGION_BY_ELEMENT } from '@/lib/regions';
import GuardianSprite, { GuardianGuild } from '@/components/guilds/GuardianSprite';
import {
  XP_PER_CORRECT, GOLD_PER_CORRECT, SUBCLASS_XP_PER_LEVEL, CRIT_CHANCE,
  getStreakMultiplier, getTierRewardMultiplier,
} from '@/lib/guildConfig';
import { TITLE_TIERS } from '@/lib/titles';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { SHOP_CATALOG } from '@/lib/inventory';
import { SCROLL_CATALOG } from '@/lib/skillScrolls';

// ─── Static config shared by a few sections ────────────────────────────────

const ELEMENTS: Element[] = ['fire', 'water', 'leaf', 'storm', 'shadow', 'light'];

const ELEMENT_MEANING: Record<Element, string> = {
  fire: 'Fire keeps the memory of courage — the moment you tried something hard anyway.',
  water: 'Water keeps the memory of change and feeling — how things, and you, shift over time.',
  leaf: 'Leaf keeps the memory of growth and patience — the slow work that pays off later.',
  storm: 'Storm keeps the memory of momentum and consequence — what happens once something gets moving.',
  shadow: "Shadow keeps the memory of what's hidden or easy to overlook — the answer nobody else noticed.",
  light: "Light keeps the memory of what's been proven true — the facts that held up.",
};

const GUILD_KEY_TO_GUARDIAN: Record<GuildKey, GuardianGuild> = {
  lorekeeper: 'lorekeeper',
  spellcaster: 'spellcaster',
  number_realm: 'numberrealm',
  logic_labyrinth: 'logiclabyrinth',
  lexicon_arena: 'lexiconarena',
};

const GUILD_ACCENT: Record<GuildKey, { text: string; border: string; bg: string }> = {
  lorekeeper: { text: 'text-emerald-400', border: 'border-emerald-800', bg: 'bg-emerald-950/20' },
  spellcaster: { text: 'text-violet-400', border: 'border-violet-800', bg: 'bg-violet-950/20' },
  number_realm: { text: 'text-amber-400', border: 'border-amber-800', bg: 'bg-amber-950/20' },
  logic_labyrinth: { text: 'text-cyan-400', border: 'border-cyan-800', bg: 'bg-cyan-950/20' },
  lexicon_arena: { text: 'text-rose-400', border: 'border-rose-800', bg: 'bg-rose-950/20' },
};

const GUILD_TEACHES: Record<GuildKey, string> = {
  lorekeeper: 'Reading, difficulty rising in tiers as you master each passage.',
  spellcaster: 'Spelling, one word at a time, under a ticking clock.',
  number_realm: 'Math, with harder tiers unlocking as you clear each pool.',
  logic_labyrinth: 'Pattern and logic puzzles, speed and accuracy both counted.',
  lexicon_arena: 'Vocabulary and definitions, building your own living dictionary.',
};

const SECTIONS = [
  { id: 'ledger', label: 'The Ledger' },
  { id: 'elements', label: 'The Elements' },
  { id: 'worldmap', label: 'The World Map' },
  { id: 'guilds', label: 'The Five Guilds' },
  { id: 'growth', label: 'How Growth Works' },
  { id: 'curios', label: 'Curios & Evolution' },
  { id: 'items', label: 'Items & Scrolls' },
  { id: 'achievements', label: 'Achievements & Titles' },
  { id: 'glossary', label: 'Glossary' },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

const GLOSSARY: { term: string; definition: string }[] = [
  { term: 'Curio', definition: 'A small creature you catch, raise, and battle with — really a fragment of the Ledger, waking up.' },
  { term: 'Tier', definition: "A guild's current difficulty level (1-3 stars). Clearing a tier's question pool advances you to the next." },
  { term: 'Streak', definition: 'Consecutive correct answers in a row. Every 5-streak adds another gold multiplier.' },
  { term: 'Slot', definition: 'A team position for an active curio. You start with 1 and unlock more as your player level rises.' },
  { term: 'Bench', definition: "Curios you own but aren't in an active team slot — still yours, just not fielded right now." },
  { term: 'Familiar', definition: "A guild's own dedicated curio, granted free once that guild reaches level 5." },
  { term: 'Guild Evolution', definition: "A familiar's name/look changing as its guild's level rises — free, and tied to guild level, not curio level." },
  { term: 'Graduation', definition: 'A permanent, purchased upgrade for a regular curio, unlocked at a level milestone — separate from guild evolution.' },
  { term: 'Wild Encounter', definition: 'A rare chance to find and catch a new curio species while walking the map.' },
  { term: 'Region', definition: 'A destination on the World Map. The Ledger\'s Heart holds every element; the other 6 hold only one.' },
  { term: 'Elemental Region', definition: 'A World Map region themed to one element, where every wild curio you meet shares that element.' },
  { term: 'Cheer', definition: 'A quick reaction you can send another player on the leaderboard — one per person, per hour.' },
  { term: 'Lucky Find', definition: `A ~${Math.round(CRIT_CHANCE * 100)}% chance on any correct answer for a bonus gold payout.` },
  { term: 'Vault', definition: 'The Rewards Vault tab — spend gold on Items and Skill Scrolls.' },
  { term: 'Scroll', definition: "Teaches a curio a new skill in one of its 3 slots, or clears a slot so a different skill can be taught in." },
];

// ─── Small shared UI ────────────────────────────────────────────────────────

function TLDR({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-bold text-amber-300 bg-amber-950/30 border border-amber-900/50 rounded-lg px-3 py-2 mb-4">
      {children}
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-2xl font-display font-bold text-white mb-3">{children}</h3>;
}

// ─── Element wheel (SVG, relationships derived live from getCounterElement) ─

function ElementWheel() {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 108;
  const nodeRadius = 26;

  const positions: Record<Element, { x: number; y: number }> = {} as any;
  ELEMENTS.forEach((el, i) => {
    const angle = (i / ELEMENTS.length) * 2 * Math.PI - Math.PI / 2;
    positions[el] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });

  const arrows = ELEMENTS.flatMap(el =>
    getCounterElements(el).map(target => {
      const from = positions[el];
      const to = positions[target];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const startX = from.x + (dx / dist) * (nodeRadius + 4);
      const startY = from.y + (dy / dist) * (nodeRadius + 4);
      const endX = to.x - (dx / dist) * (nodeRadius + 10);
      const endY = to.y - (dy / dist) * (nodeRadius + 10);
      return { key: `${el}-${target}`, startX, startY, endX, endY };
    })
  );

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[320px] mx-auto">
      <defs>
        <marker id="codex-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#d4af37" />
        </marker>
      </defs>
      {arrows.map(a => (
        <line
          key={a.key}
          x1={a.startX} y1={a.startY} x2={a.endX} y2={a.endY}
          stroke="#d4af37" strokeWidth={1.5} opacity={0.7}
          markerEnd="url(#codex-arrow)"
        />
      ))}
      {ELEMENTS.map(el => {
        const p = positions[el];
        const color = ELEMENT_COLOR[el];
        return (
          <g key={el}>
            <circle cx={p.x} cy={p.y} r={nodeRadius} fill={color.to} stroke={color.text} strokeWidth={2} />
            <image href={ELEMENT_ICON_SRC[el]} x={p.x - 14} y={p.y - 14} width={28} height={28} />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main panel ─────────────────────────────────────────────────────────────

export default function CodexPanel() {
  const [activeSection, setActiveSection] = useState<SectionId>('ledger');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-white">📖 The Codex</h1>
        <p className="text-xs text-gray-500 mt-1">Everything about this world, and how it actually works.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Section nav — a row on mobile, a left column on desktop */}
        <nav className="flex flex-row lg:flex-col gap-1 lg:gap-1.5 overflow-x-auto lg:overflow-visible lg:w-56 flex-shrink-0 pb-1 lg:pb-0">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`px-3 py-2 text-sm font-bold text-left rounded-lg whitespace-nowrap transition-colors ${
                activeSection === s.id
                  ? 'bg-amber-900/30 text-amber-400 border border-amber-800'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-900 border border-transparent'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0 bg-[#111] border border-neutral-800 rounded-2xl p-5">
          {activeSection === 'ledger' && <LedgerSection />}
          {activeSection === 'elements' && <ElementsSection />}
          {activeSection === 'worldmap' && <WorldMapSection />}
          {activeSection === 'guilds' && <GuildsSection />}
          {activeSection === 'growth' && <GrowthSection />}
          {activeSection === 'curios' && <CuriosSection />}
          {activeSection === 'items' && <ItemsSection />}
          {activeSection === 'achievements' && <AchievementsSection />}
          {activeSection === 'glossary' && <GlossarySection />}
        </div>
      </div>
    </div>
  );
}

// ─── Sections ───────────────────────────────────────────────────────────────

function LedgerSection() {
  return (
    <div>
      <SectionTitle>The Ledger</SectionTitle>
      <TLDR>Everything in this world — every curio, every guild, every point of XP — is part of one story: the fight to keep knowledge from fading.</TLDR>
      <div className="space-y-3 text-gray-300 text-sm leading-relaxed max-w-2xl">
        <p>
          Long before anyone kept score, the world was held together by something called the <b className="text-white">Ledger</b> — a
          living record that remembered everything worth remembering: every story, every word, every number, every path, every true
          thing. The Ledger never sat still in one place. It broke apart and hid itself inside small sleeping creatures called{' '}
          <b className="text-white">curios</b> — so every curio you catch, raise, or battle with is really a tiny piece of that memory,
          waking up because you're paying attention to it.
        </p>
        <p>
          The Ledger has one enemy, and it isn't a monster. It's called the <b className="text-white">Forgetting</b> — and it's just
          what happens naturally when nobody practices, nobody reads, nobody keeps going. It doesn't attack. It just quietly erases
          things that go unused. Left alone, curios go quiet, guild halls fall silent, and whole subjects blur back into blank pages.
        </p>
        <p>
          The five guilds are watch-posts, built exactly where the Ledger runs thinnest and the Forgetting pushes hardest. Every
          player is a keeper-in-training — and there's only one way keepers have ever held the Forgetting back: doing the remembering
          themselves. Every correct answer is a line re-inked in the Ledger. That's the whole game.
        </p>
      </div>
    </div>
  );
}

function ElementsSection() {
  return (
    <div>
      <SectionTitle>The Elements</SectionTitle>
      <TLDR>Each element is a different kind of memory the Ledger keeps.</TLDR>
      <ElementWheel />
      <div className="grid sm:grid-cols-2 gap-3 mt-4 max-w-2xl">
        {ELEMENTS.map(el => (
          <div key={el} className="flex items-start gap-2 bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <img src={ELEMENT_ICON_SRC[el]} alt={el} className="w-6 h-6 mt-0.5" />
            <p className="text-sm text-gray-300">{ELEMENT_MEANING[el]}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        The arrows above show which element is strong against which in battle — a curio's element decides both what it remembers
        and what it's best at fighting.
      </p>
    </div>
  );
}

function WorldMapSection() {
  const ringOrder = ELEMENTS.map(el => REGIONS[REGION_BY_ELEMENT[el]]);
  return (
    <div>
      <SectionTitle>The World Map</SectionTitle>
      <TLDR>Explore The Ledger's Heart from the start, or unlock an elemental region at Player Level 10 to hunt one kind of curio at a time.</TLDR>
      <p className="text-sm text-gray-300 max-w-2xl mb-4">
        The World Map is where wild encounters happen. <b className="text-white">The Ledger's Heart</b> holds every element mixed
        together, same as it always has. Each of the other 6 regions is tuned to a single element — every curio you meet there
        shares that region's element, nothing else.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
        <RegionCard region={REGIONS.ledgers_heart} />
        {ringOrder.map(region => <RegionCard key={region.id} region={region} />)}
      </div>
    </div>
  );
}

function RegionCard({ region }: { region: typeof REGIONS[string] }) {
  const color = region.element !== 'all' ? ELEMENT_COLOR[region.element] : null;
  return (
    <div
      className="rounded-lg p-3 border"
      style={{
        borderColor: color ? color.text : '#d4af37',
        background: color ? `linear-gradient(135deg, ${color.from}33, transparent)` : 'rgba(212,175,55,0.06)',
      }}
    >
      <p className="font-bold text-white text-sm flex items-center gap-1.5">
        {region.element !== 'all' && <img src={ELEMENT_ICON_SRC[region.element]} alt={region.element} className="w-4 h-4" />}
        {region.name}
      </p>
      <p className="text-xs text-gray-400 mt-1">{region.lore}</p>
      {region.unlockLevel > 1 && (
        <p className="text-[11px] text-amber-500 mt-1.5">🔒 Unlocks at Player Level {region.unlockLevel}</p>
      )}
    </div>
  );
}

function GuildsSection() {
  return (
    <div>
      <SectionTitle>The Five Guilds</SectionTitle>
      <TLDR>Each guild is a watch-post, holding one part of the Ledger against the Forgetting.</TLDR>
      <div className="space-y-3 max-w-2xl">
        {GUILDS.map(g => {
          const accent = GUILD_ACCENT[g.key];
          return (
            <div key={g.key} className={`flex items-center gap-3 rounded-xl p-3 border ${accent.border} ${accent.bg}`}>
              <div className="w-14 h-14 flex-shrink-0">
                <GuardianSprite guild={GUILD_KEY_TO_GUARDIAN[g.key]} pose="idle" className="w-full h-full" />
              </div>
              <div>
                <p className={`font-bold ${accent.text}`}>{g.label}</p>
                <p className="text-xs text-gray-400 italic mt-0.5">{g.lore}</p>
                <p className="text-xs text-gray-500 mt-1">{GUILD_TEACHES[g.key]}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GrowthSection() {
  return (
    <div>
      <SectionTitle>How Growth Works</SectionTitle>
      <TLDR>Correct answers are the only currency here — XP, gold, and every unlock trace straight back to them.</TLDR>
      <div className="space-y-3 max-w-2xl text-sm">
        <Fact label="XP & Gold per correct answer" value={`+${XP_PER_CORRECT} XP, +${GOLD_PER_CORRECT} gold`}>
          Every correct answer in a guild adds to your Ledger — that's your XP.
        </Fact>
        <Fact label="Guild leveling" value={`${SUBCLASS_XP_PER_LEVEL} XP per level`}>
          Flat curve — every guild level costs exactly the same amount of XP as the last.
        </Fact>
        <Fact label="Streak multiplier" value={`+1x gold every 5 in a row`}>
          Formula: <code>{'1 + floor(streak / 5)'}</code> — a 10-answer streak doubles your gold, a 20-streak triples it.
        </Fact>
        <Fact label="Difficulty tier multiplier" value="Harder tiers pay more">
          A Tier 3 question pays roughly 3x what a Tier 1 question pays — difficulty is rewarded, not just gated.
        </Fact>
        <Fact label="Lucky Find" value={`~${Math.round(CRIT_CHANCE * 100)}% chance, 1-3x bonus gold`}>
          A small surprise bonus on top of everything else — see the ✨ toast when it happens.
        </Fact>
        <Fact
          label="Team slots"
          value={`Slot 2 at Lv.${BATTLE_CONSTANTS.PLAYER_LEVEL_FOR_SLOT[2]}, Slot 3 at Lv.${BATTLE_CONSTANTS.PLAYER_LEVEL_FOR_SLOT[3]}`}
        >
          You start with 1 active team slot and unlock 2 more as your player level rises.
        </Fact>
      </div>
    </div>
  );
}

function Fact({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
      <p className="flex items-baseline justify-between gap-2">
        <span className="font-bold text-white">{label}</span>
        <span className="text-amber-400 text-xs font-mono">{value}</span>
      </p>
      <p className="text-gray-400 text-xs mt-1">{children}</p>
    </div>
  );
}

function CuriosSection() {
  return (
    <div>
      <SectionTitle>Curios & Evolution</SectionTitle>
      <TLDR>Curios are fragments of the Ledger — some grow with their guild, some graduate on their own, and the rarest are barely ever found at all.</TLDR>
      <div className="space-y-3 max-w-2xl text-sm text-gray-300">
        <p>
          Every curio is a small piece of the world's memory, sorted by element and by where it was found. Want to browse every
          species in the game, one by one? That's what the <b className="text-white">Compendium</b> tab (inside Curio Arena) is for
          — the Codex only covers the systems, not each individual curio.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <p className="font-bold text-white text-sm">Guild Evolution</p>
            <p className="text-xs text-gray-400 mt-1">
              Free, and tied to your guild's level — not the curio's own level. Each guild has one dedicated familiar that changes
              shape as its guild grows stronger.
            </p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <p className="font-bold text-white text-sm">Graduation</p>
            <p className="text-xs text-gray-400 mt-1">
              A permanent, purchased upgrade for a regular curio — needs Level {GRADUATION_LEVEL_REQUIREMENT[1]} and a{' '}
              {GRADUATION_SCROLL_COST}-gold Graduation Scroll. Tied to the curio's own level, unrelated to any guild.
            </p>
          </div>
        </div>
        <p>
          Most wild curios are found by walking the World Map and answering questions — the odds are low on purpose, so a wild
          encounter always feels like a real event. Legendary curios are rarer still, and get harder to find the more of them you
          already own.
        </p>
      </div>
    </div>
  );
}

function ItemsSection() {
  const scrollCost = (category: string, tier: number) =>
    SCROLL_CATALOG.find(s => s.category === category && s.tier === tier)?.cost;
  const unlearnScroll = SCROLL_CATALOG.find(s => s.category === 'unlearn');
  const categoryCounts: Record<string, number> = {};
  for (const s of SCROLL_CATALOG) categoryCounts[s.category] = (categoryCounts[s.category] ?? 0) + 1;

  return (
    <div>
      <SectionTitle>Items & Scrolls</SectionTitle>
      <TLDR>Items are single-use battle tools bought with gold; Scrolls teach your curios new skills.</TLDR>

      <p className="text-sm font-bold text-white mb-2">Items</p>
      <p className="text-xs text-gray-500 mb-3 max-w-2xl">
        Bought with gold in the <b className="text-gray-300">Rewards Vault</b>, used mid-battle for a one-time effect.
      </p>
      <div className="grid sm:grid-cols-2 gap-2 max-w-2xl mb-6">
        {SHOP_CATALOG.map(item => (
          <div key={item.key} className="flex items-center gap-2.5 bg-neutral-900 border border-neutral-800 rounded-lg p-2.5">
            <img src={item.icon} alt={item.name} className="w-8 h-8 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white flex items-baseline gap-1.5">
                {item.name}
                <span className="text-[11px] text-amber-400 font-mono">{item.cost}g</span>
              </p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm font-bold text-white mb-2">Scrolls</p>
      <p className="text-xs text-gray-500 mb-3 max-w-2xl">
        Also bought in the Vault, then taught to a specific curio from its loadout screen in the{' '}
        <b className="text-gray-300">Compendium</b>. There are <b className="text-white">{SCROLL_CATALOG.length} scrolls</b> in
        total — one {unlearnScroll?.name.toLowerCase()} ({unlearnScroll?.cost}g, clears a skill slot) plus one scroll per skill in
        the game, split across three categories:
      </p>
      <div className="grid sm:grid-cols-3 gap-2 max-w-2xl">
        <ScrollCategoryCard
          label="Base"
          count={categoryCounts['base'] ?? 0}
          costs={[scrollCost('base', 1), scrollCost('base', 2), scrollCost('base', 3)]}
          desc="Every curio's original species skills."
        />
        <ScrollCategoryCard
          label="Alt"
          count={categoryCounts['alt'] ?? 0}
          costs={[scrollCost('alt', 1), scrollCost('alt', 2), scrollCost('alt', 3)]}
          desc="Trade raw damage for a themed secondary effect."
        />
        <ScrollCategoryCard
          label="Universal"
          count={categoryCounts['universal'] ?? 0}
          costs={[scrollCost('universal', 1), scrollCost('universal', 2), scrollCost('universal', 3)]}
          desc="Element-agnostic buffs/debuffs, no element required."
        />
      </div>
    </div>
  );
}

function ScrollCategoryCard({ label, count, costs, desc }: { label: string; count: number; costs: (number | undefined)[]; desc: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
      <p className="font-bold text-white text-sm">{label} <span className="text-gray-500 font-normal">({count})</span></p>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
      <p className="text-[11px] text-amber-400 font-mono mt-1.5">Tier 1/2/3: {costs.map(c => c ?? '—').join(' / ')}g</p>
    </div>
  );
}

function AchievementsSection() {
  return (
    <div>
      <SectionTitle>Achievements & Titles</SectionTitle>
      <TLDR>Titles and achievements are the world's own record of how reliable a keeper you've become.</TLDR>
      <div className="max-w-2xl space-y-4">
        <div>
          <p className="text-sm text-gray-300 mb-2">
            Your title rises automatically with your player level — no separate unlock needed.
          </p>
          <div className="flex flex-wrap gap-2">
            {TITLE_TIERS.map(t => (
              <div key={t.title} className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-full px-3 py-1.5">
                <span>{t.icon}</span>
                <span className="text-sm font-bold text-white">{t.title}</span>
                <span className="text-[11px] text-gray-500">Lv.{t.minLevel}+</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-300">
          There are <b className="text-white">{ACHIEVEMENTS.length} achievements</b> to earn across the whole app — leveling up,
          gold milestones, guild sessions, battles won, and more. Every one of them is the world noticing something you actually
          did, not something handed out for free.
        </p>
      </div>
    </div>
  );
}

function GlossarySection() {
  return (
    <div>
      <SectionTitle>Glossary</SectionTitle>
      <TLDR>Quick lookups for words used everywhere else in the app.</TLDR>
      <div className="max-w-2xl divide-y divide-neutral-800">
        {GLOSSARY.map(g => (
          <div key={g.term} className="py-2.5">
            <p className="font-bold text-white text-sm">{g.term}</p>
            <p className="text-xs text-gray-400 mt-0.5">{g.definition}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
