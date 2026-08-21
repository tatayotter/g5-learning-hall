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
import {
  QUALITY_TIERS, QUALITY_LABEL, QUALITY_STAT_MULTIPLIER, TUTOR_COST_BY_TIER, TUTOR_ROLL_TABLE,
} from '@/lib/curioQuality';
import { TOME_CATALOG } from '@/lib/tomeShop';
import { eggReadyLevel } from '@/lib/curioEggs';
import { STREAK_GOLD_LADDER } from '@/lib/dailyChecklist';
import { TRASH_DEFS, TRASH_ORDER, TRASH_SPAWN_COUNT, TRASH_RESPAWN_MS } from '@/lib/trashConfig';

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
  lorekeeper: { text: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50' },
  spellcaster: { text: 'text-violet-700', border: 'border-violet-200', bg: 'bg-violet-50' },
  number_realm: { text: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50' },
  logic_labyrinth: { text: 'text-cyan-700', border: 'border-cyan-200', bg: 'bg-cyan-50' },
  lexicon_arena: { text: 'text-rose-700', border: 'border-rose-200', bg: 'bg-rose-50' },
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
  { id: 'daily', label: 'Daily Rituals' },
  { id: 'curios', label: 'Curios & Evolution' },
  { id: 'tutoring', label: 'Tutoring & Quality' },
  { id: 'eggs', label: 'Eggs & The Hatchery' },
  { id: 'items', label: 'Items & Scrolls' },
  { id: 'trading', label: 'Trading' },
  { id: 'trainers', label: 'Trainers & Classmates' },
  { id: 'trash', label: 'Trash & Recycling' },
  { id: 'achievements', label: 'Achievements & Titles' },
  { id: 'family', label: 'Family & Parents' },
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
  { term: 'Vault', definition: 'The Rewards Vault tab — spend gold on Items, Skill Scrolls, and Tomes of Knowledge.' },
  { term: 'Scroll', definition: "Teaches a curio a new skill in one of its 3 slots, or clears a slot so a different skill can be taught in." },
  { term: 'Quality Tier', definition: 'A permanent HP/Attack multiplier on one owned curio — Normal, Good, Outstanding, or Perfect. Rises only through Tutoring (or a lucky egg hatch), never falls.' },
  { term: 'Tutor', definition: "Spend gold at a curio's detail screen for a chance to roll its quality up a tier. A roll only ever holds or improves — it can never downgrade a curio." },
  { term: 'Tome of Knowledge', definition: "A single-use Vault item that boosts one Tutor attempt's odds. Three tiers (Novice/Adept/Master), each matched to the quality tier it helps a curio climb past." },
  { term: 'Egg', definition: "A one-time reward from a graduated curio that's leveled far enough past its graduation. Claiming it starts a 5-day incubation in the Hatchery." },
  { term: 'Hatchery', definition: 'A tab inside Curio Arena that tracks every egg you own — incubating, stalled, or freshly hatched.' },
  { term: 'Incubate', definition: "The button that restarts a stalled egg's growth after a missed check-in day — resets the countdown, doesn't lose the egg itself." },
  { term: 'Trade', definition: 'A negotiated curio-for-curio (and optionally gold) exchange with another player, agreed through offer/counter-offer requests.' },
  { term: 'Catch Inbox', definition: "Where a duplicate catch of a curio you already own lands — keep it as a second copy, or convert it straight to gold." },
  { term: 'Deed', definition: 'A real-world chore or good behavior an adult logs by hand for bonus gold — tracked separately in Deed History.' },
  { term: 'Daily To-Dos', definition: "A short daily checklist that pays escalating bonus gold the more days in a row you clear it, up to a 5-day streak cap." },
  { term: "Journal", definition: "A short daily reflection (what you did, tomorrow's plan, hardest part, one gratitude) — submitted once per day for flat XP and gold." },
  { term: 'Trainer NPC', definition: 'A challenger that spawns on the World Map after a correct guild answer. Walk within one tile to trigger a dialogue, then Accept or Run Away.' },
  { term: 'Bot Classmate', definition: 'One of ten simulated Filipino student bots that wander the map. They appear on the leaderboard, can be challenged to battle, and carry real curio teams.' },
  { term: 'Scavenger Bag', definition: 'Your on-map inventory for trash items. Shown as a counter on the map HUD; emptied at the Recycler NPC when you trade bundles for gold.' },
  { term: 'Recycler NPC', definition: 'A fixed character in every region. Trade trash bundles here — the rarer the trash type, the fewer items needed to earn one gold.' },
];

// ─── Small shared UI ────────────────────────────────────────────────────────

function TLDR({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
      {children}
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-2xl font-bold text-gray-900 mb-3">{children}</h3>;
}

// ─── Element wheel (SVG, relationships derived live from getCounterElement) ─

function ElementWheel() {
  const size = 460;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 170;
  const iconSize = 100;
  const iconHalf = iconSize / 2;

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
      const startX = from.x + (dx / dist) * (iconHalf + 4);
      const startY = from.y + (dy / dist) * (iconHalf + 4);
      const endX = to.x - (dx / dist) * (iconHalf + 10);
      const endY = to.y - (dy / dist) * (iconHalf + 10);
      return { key: `${el}-${target}`, startX, startY, endX, endY };
    })
  );

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[460px] mx-auto">
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
        return (
          <image
            key={el}
            href={ELEMENT_ICON_SRC[el]}
            x={p.x - iconHalf} y={p.y - iconHalf}
            width={iconSize} height={iconSize}
          />
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
        <h1 className="text-3xl font-display font-bold text-gray-900">The Codex</h1>
        <p className="text-sm text-gray-500 mt-1">Everything about this world, and how it actually works.</p>
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
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-stone-100 border border-transparent'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0 border border-stone-200 rounded-2xl p-5" style={{ background: 'linear-gradient(150deg, #fefce8 0%, #ffffff 55%)' }}>
          {activeSection === 'ledger' && <LedgerSection />}
          {activeSection === 'elements' && <ElementsSection />}
          {activeSection === 'worldmap' && <WorldMapSection />}
          {activeSection === 'guilds' && <GuildsSection />}
          {activeSection === 'growth' && <GrowthSection />}
          {activeSection === 'daily' && <DailySection />}
          {activeSection === 'curios' && <CuriosSection />}
          {activeSection === 'tutoring' && <TutoringSection />}
          {activeSection === 'eggs' && <EggsSection />}
          {activeSection === 'items' && <ItemsSection />}
          {activeSection === 'trading' && <TradingSection />}
          {activeSection === 'trainers' && <TrainersSection />}
          {activeSection === 'trash' && <TrashSection />}
          {activeSection === 'achievements' && <AchievementsSection />}
          {activeSection === 'family' && <FamilySection />}
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
      <img
        src="/codex/ledger_header.webp"
        alt="The Ledger"
        className="w-full max-w-2xl rounded-xl border border-stone-200 mb-4 object-cover"
      />
      <SectionTitle>The Ledger</SectionTitle>
      <TLDR>Everything in this world — every curio, every guild, every point of XP — is part of one story: the fight to keep knowledge from fading.</TLDR>
      <div className="space-y-3 text-gray-700 text-sm leading-relaxed max-w-2xl">
        <p>
          Long before anyone kept score, the world was held together by something called the <b className="text-gray-900">Ledger</b> — a
          living record that remembered everything worth remembering: every story, every word, every number, every path, every true
          thing. The Ledger never sat still in one place. It broke apart and hid itself inside small sleeping creatures called{' '}
          <b className="text-gray-900">curios</b> — so every curio you catch, raise, or battle with is really a tiny piece of that memory,
          waking up because you're paying attention to it.
        </p>
        <p>
          The Ledger has one enemy, and it isn't a monster. It's called the <b className="text-gray-900">Forgetting</b> — and it's just
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
        {ELEMENTS.map(el => {
          const strongAgainst = getCounterElements(el);
          const weakAgainst = ELEMENTS.filter(other => getCounterElements(other).includes(el));
          return (
            <div key={el} className="flex items-start gap-2 bg-stone-50 border border-stone-200 rounded-lg p-3">
              <img src={ELEMENT_ICON_SRC[el]} alt={el} className="w-6 h-6 mt-0.5" />
              <div>
                <p className="text-sm text-gray-700">{ELEMENT_MEANING[el]}</p>
                <p className="text-xs text-emerald-600 mt-1.5">
                  Strong against: {strongAgainst.map(e => e[0].toUpperCase() + e.slice(1)).join(', ')}
                </p>
                <p className="text-xs text-rose-600 mt-0.5">
                  Weak against: {weakAgainst.length > 0 ? weakAgainst.map(e => e[0].toUpperCase() + e.slice(1)).join(', ') : 'None'}
                </p>
              </div>
            </div>
          );
        })}
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
      <p className="text-sm text-gray-700 max-w-2xl mb-4">
        The World Map is where wild encounters happen. <b className="text-gray-900">The Ledger's Heart</b> holds every element mixed
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
      <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
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

function DailySection() {
  return (
    <div>
      <SectionTitle>Daily Rituals</SectionTitle>
      <TLDR>Two short daily habits — a to-do checklist and a journal entry — each pay their own gold and stack on top of everything else.</TLDR>
      <div className="space-y-3 max-w-2xl text-sm">
        <Fact label="Daily To-Dos streak ladder" value={STREAK_GOLD_LADDER.map(g => `${g}g`).join(' → ')}>
          Clear every task in a day to claim that day's gold — the payout climbs each consecutive day, capping at a{' '}
          {STREAK_GOLD_LADDER.length}-day streak. Miss a day and the ladder resets to the first rung.
        </Fact>
        <Fact label="Journal entry" value="+50 XP, +50 Gold">
          One submission per day — done today, tomorrow's plan, hardest challenge, and one thing you're grateful for. Flat
          reward, no streak involved.
        </Fact>
        <Fact label="Deeds" value="Gold only, no XP">
          Real-world chores or good behavior an adult logs by hand from the admin Tools panel — shows up in your Deed
          History alongside everything else.
        </Fact>
      </div>
    </div>
  );
}

function TutoringSection() {
  const tierCosts = QUALITY_TIERS.slice(0, -1).map(t => `${QUALITY_LABEL[t]} → ${TUTOR_COST_BY_TIER[t]}g`);
  return (
    <div>
      <SectionTitle>Tutoring & Quality</SectionTitle>
      <TLDR>Every curio has a hidden Quality Tier — a permanent stat boost you can only raise by spending gold at the Tutor.</TLDR>
      <div className="space-y-3 max-w-2xl text-sm text-gray-700">
        <p>
          Open any owned curio's detail screen in <b className="text-gray-900">My Team</b> and, once it's not still climbing
          levels for its next Graduation, a <b className="text-gray-900">Tutor</b> option appears. Spend gold and roll — a
          roll only ever holds a curio's tier or bumps it up one step. It can never make a curio worse.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
            <p className="font-bold text-white text-sm mb-1.5">Quality tiers & stat bonus</p>
            <div className="space-y-1 text-xs">
              {QUALITY_TIERS.map(t => (
                <p key={t} className="flex justify-between">
                  <span className="text-gray-400">{QUALITY_LABEL[t]}</span>
                  <span className="text-amber-400 font-mono">×{QUALITY_STAT_MULTIPLIER[t].toFixed(2)} HP/ATK</span>
                </p>
              ))}
            </div>
          </div>
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
            <p className="font-bold text-white text-sm mb-1.5">Tutor cost by current tier</p>
            <div className="space-y-1 text-xs">
              {tierCosts.map(c => (
                <p key={c} className="text-gray-400">{c}</p>
              ))}
              <p className="text-gray-600 italic mt-1">Perfect is terminal — nothing left to roll for.</p>
            </div>
          </div>
        </div>
        <p>
          Roll odds are the same every attempt regardless of current tier: <b className="text-gray-900">{Math.round(TUTOR_ROLL_TABLE.fail * 100)}%</b> no
          change, <b className="text-gray-900">{Math.round(TUTOR_ROLL_TABLE.good * 100)}%</b> Good, <b className="text-gray-900">{Math.round(TUTOR_ROLL_TABLE.outstanding * 100)}%</b> Outstanding,{' '}
          <b className="text-gray-900">{(TUTOR_ROLL_TABLE.perfect * 100).toFixed(1)}%</b> Perfect — only the outcomes ranked above a curio's
          current tier actually count as an upgrade.
        </p>
        <p>
          A <b className="text-gray-900">Tome of Knowledge</b> (bought in the Vault, {TOME_CATALOG.length} tiers) boosts the odds on
          one specific attempt, consumed automatically the moment it's used. Each tome is matched to the tier it helps a
          curio climb past — a Tome of Novice Knowledge only helps a Normal-quality roll, and so on up the ladder.
        </p>
      </div>
    </div>
  );
}

function EggsSection() {
  return (
    <div>
      <SectionTitle>Eggs & The Hatchery</SectionTitle>
      <TLDR>A graduated, high-leveled curio can lay one egg in its lifetime — hatch it with a 5-day login streak into a different, earlier species.</TLDR>
      <div className="space-y-3 max-w-2xl text-sm text-gray-700">
        <p>
          Once a curio has graduated and reached <b className="text-gray-900">Graduation level + 3</b> (Tier 1 → Lv.{eggReadyLevel(1)},
          Tier 2 → Lv.{eggReadyLevel(2)}), a "Claim Egg" prompt appears on its card in My Team. Claiming is one-time and
          permanent — the parent curio itself is untouched, staying exactly where it was.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
            <p className="font-bold text-gray-900 text-sm">Incubating</p>
            <p className="text-xs text-gray-400 mt-1">
              Counts a consecutive daily login streak toward 5 days. Opening the app each day is all it takes to keep it
              growing.
            </p>
          </div>
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
            <p className="font-bold text-gray-900 text-sm">Stalled</p>
            <p className="text-xs text-gray-400 mt-1">
              Missing a day resets progress to 0 and pauses it — nothing is lost, but growth won't resume until you press{' '}
              <b className="text-gray-900">Incubate</b> in the Hatchery.
            </p>
          </div>
        </div>
        <p>
          At 5 days, the egg hatches into an admin-defined <b className="text-gray-900">predecessor species</b> — an earlier
          curio in that species' own line, not another copy of the parent — starting at level 1, ungraduated, benched and
          ready to raise. It also gets a free quality-tier roll on the spot, using the same odds as a Tutor attempt.
        </p>
        <p className="text-xs text-gray-500">
          Not every species has a predecessor assigned yet — chains are added over time, so a "no egg content configured"
          message just means that curio's line hasn't been authored in yet.
        </p>
      </div>
    </div>
  );
}

function TradingSection() {
  return (
    <div>
      <SectionTitle>Trading</SectionTitle>
      <TLDR>Offer a curio (and optionally gold) to another player; they can accept, decline, or counter — nothing moves until both sides agree.</TLDR>
      <div className="space-y-3 max-w-2xl text-sm text-gray-700">
        <p>
          Trading lives in the Curio Arena's <b className="text-gray-900">Trade</b> tab. Search for another player, build an
          offer from your own team/bench, and send it. They can accept it outright, decline it, or send back a counter-offer
          — every back-and-forth on the same deal is kept together as one negotiation thread.
        </p>
        <p>
          A small gold fee applies to any completed trade — charged per curio moved and on any gold either side includes —
          so trades always cost a little to discourage spam, but nothing ever changes hands until someone actually accepts.
        </p>
        <p className="text-xs text-gray-500">Not available on demo accounts.</p>
      </div>
    </div>
  );
}

function FamilySection() {
  return (
    <div>
      <SectionTitle>Family & Parents</SectionTitle>
      <TLDR>A self-registered child can link a parent from inside the app — it unlocks leaderboards and PvP, and pays a one-time gold bonus.</TLDR>
      <div className="space-y-3 max-w-2xl text-sm text-gray-700">
        <p>
          Kids who sign themselves up start unlinked. A small "Link a Parent" prompt lets them send their parent's email
          an invite; once the parent confirms it, the two accounts are connected. Linking unlocks leaderboards and PvP
          challenges, and rewards the child <b className="text-gray-900">100 gold</b> for finishing the link.
        </p>
        <p>
          Parents get their own dashboard to follow a linked child's progress, streaks, and journal entries, and can view
          — never change — that child's login PIN if it's ever forgotten.
        </p>
      </div>
    </div>
  );
}

function Fact({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
      <p className="flex items-baseline justify-between gap-2">
        <span className="font-bold text-gray-900">{label}</span>
        <span className="text-amber-600 text-xs font-mono">{value}</span>
      </p>
      <p className="text-gray-500 text-xs mt-1">{children}</p>
    </div>
  );
}

function CuriosSection() {
  return (
    <div>
      <SectionTitle>Curios & Evolution</SectionTitle>
      <TLDR>Curios are fragments of the Ledger — some grow with their guild, some graduate on their own, and the rarest are barely ever found at all.</TLDR>
      <div className="space-y-3 max-w-2xl text-sm text-gray-700">
        <p>
          Every curio is a small piece of the world's memory, sorted by element and by where it was found. Want to browse every
          species in the game, one by one? That's what the <b className="text-gray-900">Compendium</b> tab (inside Curio Arena) is for
          — the Codex only covers the systems, not each individual curio.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
            <p className="font-bold text-gray-900 text-sm">Guild Evolution</p>
            <p className="text-xs text-gray-400 mt-1">
              Free, and tied to your guild's level — not the curio's own level. Each guild has one dedicated familiar that changes
              shape as its guild grows stronger.
            </p>
          </div>
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
            <p className="font-bold text-gray-900 text-sm">Graduation</p>
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
        <p>
          Two more permanent upgrades live outside leveling entirely: a curio's <b className="text-gray-900">Quality Tier</b> (see{' '}
          <b className="text-gray-900">Tutoring & Quality</b>) is a separate stat boost bought with gold, and a graduated curio
          can eventually lay a one-time <b className="text-gray-900">Egg</b> (see <b className="text-gray-900">Eggs & The Hatchery</b>)
          that hatches into a whole new curio of its own.
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

      <p className="text-sm font-bold text-gray-900 mb-2">Items</p>
      <p className="text-xs text-gray-500 mb-3 max-w-2xl">
        Bought with gold in the <b className="text-gray-300">Rewards Vault</b>, used mid-battle for a one-time effect.
      </p>
      <div className="grid sm:grid-cols-2 gap-2 max-w-2xl mb-6">
        {SHOP_CATALOG.map(item => (
          <div key={item.key} className="flex items-center gap-2.5 bg-stone-50 border border-stone-200 rounded-lg p-2.5">
            <img src={item.icon} alt={item.name} className="w-8 h-8 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 flex items-baseline gap-1.5">
                {item.name}
                <span className="text-[11px] text-amber-600 font-mono">{item.cost}g</span>
              </p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm font-bold text-gray-900 mb-2">Scrolls</p>
      <p className="text-xs text-gray-500 mb-3 max-w-2xl">
        Also bought in the Vault, then taught to a specific curio from its loadout screen in the{' '}
        <b className="text-gray-300">Compendium</b>. There are <b className="text-gray-900">{SCROLL_CATALOG.length} scrolls</b> in
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

      <p className="text-sm font-bold text-gray-900 mb-2 mt-6">Tomes of Knowledge</p>
      <p className="text-xs text-gray-500 mb-3 max-w-2xl">
        Also bought in the Vault — a one-time boost to a single Tutor roll's odds, consumed the moment it's used. See{' '}
        <b className="text-gray-300">Tutoring & Quality</b> for the full mechanic.
      </p>
      <div className="grid sm:grid-cols-3 gap-2 max-w-2xl">
        {TOME_CATALOG.map(tome => (
          <div key={tome.key} className="flex items-center gap-2.5 bg-stone-50 border border-stone-200 rounded-lg p-2.5">
            <img src={tome.icon} alt={tome.name} className="w-8 h-8 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 flex items-baseline gap-1.5">
                {tome.name}
                <span className="text-[11px] text-amber-600 font-mono">{tome.cost}g</span>
              </p>
              <p className="text-xs text-gray-500">{tome.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScrollCategoryCard({ label, count, costs, desc }: { label: string; count: number; costs: (number | undefined)[]; desc: string }) {
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
      <p className="font-bold text-gray-900 text-sm">{label} <span className="text-gray-400 font-normal">({count})</span></p>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
      <p className="text-[11px] text-amber-600 font-mono mt-1.5">Tier 1/2/3: {costs.map(c => c ?? '—').join(' / ')}g</p>
    </div>
  );
}

function TrainersSection() {
  return (
    <div>
      <SectionTitle>Trainers &amp; Classmates</SectionTitle>
      <TLDR>Answer a question right and a Trainer NPC may appear on the map — walk up to challenge them. Classmate bots are always wandering, and always ready for a battle.</TLDR>
      <div className="space-y-4 max-w-2xl text-sm text-gray-700">

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
          <p className="font-bold text-gray-900 mb-1.5">Trainer NPCs</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Every correct answer in a guild has a chance to spawn a <b className="text-gray-900">Trainer NPC</b> on the World Map near
            you. Trainers look like standee sprites with a ⚔️ badge. Walk within one tile and a short dialogue pops up — you can{' '}
            <b className="text-gray-900">Accept</b> the challenge or <b className="text-gray-900">Run Away</b>. Accept, and it's a
            standard curio battle, same rules as any other fight. The trainer disappears after you beat them (or flee).
          </p>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
          <p className="font-bold text-gray-900 mb-1.5">Bot Classmates</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Ten Filipino student bots share the map with you — they wander on their own, each with a unique name tag and avatar.
            Bots behave like real players: they show up on the leaderboard, wander the region, and can be challenged via their
            floating toast. A bot's team grows with its simulated level — lower-level bots field only a starter; higher-level bots
            bring wilds too. Battles against bots count as real PvP matches for your record.
          </p>
        </div>

      </div>
    </div>
  );
}

function TrashSection() {
  const respawnMin = Math.round(TRASH_RESPAWN_MS / 60000);
  return (
    <div>
      <SectionTitle>Trash &amp; Recycling</SectionTitle>
      <TLDR>Litter spawns on every region's map. Pick it up, bring a full bundle to the Recycler NPC, and turn garbage into gold.</TLDR>
      <div className="space-y-3 max-w-2xl text-sm text-gray-700">
        <p>
          Up to <b className="text-gray-900">{TRASH_SPAWN_COUNT} trash items</b> scatter across the grass tiles of each
          region whenever you enter. Walk over any piece to pick it up (a small animation plays). Items go straight into your{' '}
          <b className="text-gray-900">Scavenger Bag</b> — a counter visible on the map HUD. Once the field is completely
          cleared, it respawns after <b className="text-gray-900">{respawnMin} minutes</b>.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {TRASH_ORDER.map(type => {
            const def = TRASH_DEFS[type];
            return (
              <div key={type} className="flex items-center gap-2.5 bg-stone-50 border border-stone-200 rounded-lg p-2.5">
                <span className="text-2xl leading-none">{def.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">{def.label}</p>
                  <p className="text-xs text-gray-500">{def.bundleSize} = 1 gold at the Recycler</p>
                </div>
              </div>
            );
          })}
        </div>
        <p>
          Each region has a fixed <b className="text-gray-900">Recycler NPC</b> — a small character standing on the map.
          Walk up to it to open a trade screen showing how many bundles you can cash out right now. Any leftover items stay
          in your bag for next time. Rarer trash types have smaller bundle sizes, so a single chip bag is worth as much as
          ten crumpled papers.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p className="text-xs font-bold text-amber-800">Trash Achievements</p>
          <ul className="text-xs text-amber-700 mt-1 space-y-0.5 list-disc list-inside">
            <li><b>Litter Picker</b> — pick up 10 items (+25 gold)</li>
            <li><b>Litter Patrol</b> — pick up 100 items (+100 gold)</li>
            <li><b>Eco Starter</b> — earn 5 gold from the Recycler (+25 gold)</li>
            <li><b>Eco Warrior</b> — earn 50 gold from the Recycler (+50 gold)</li>
          </ul>
        </div>
      </div>
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
          <p className="text-sm text-gray-700 mb-2">
            Your title rises automatically with your player level — no separate unlock needed.
          </p>
          <div className="flex flex-wrap gap-2">
            {TITLE_TIERS.map(t => (
              <div key={t.title} className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-full px-3 py-1.5">
                <span>{t.icon}</span>
                <span className="text-sm font-bold text-gray-900">{t.title}</span>
                <span className="text-[11px] text-gray-500">Lv.{t.minLevel}+</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-700">
          There are <b className="text-gray-900">{ACHIEVEMENTS.length} achievements</b> to earn across the whole app — leveling up,
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
      <div className="max-w-2xl divide-y divide-stone-200">
        {GLOSSARY.map(g => (
          <div key={g.term} className="py-2.5">
            <p className="font-bold text-gray-900 text-sm">{g.term}</p>
            <p className="text-xs text-gray-500 mt-0.5">{g.definition}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
