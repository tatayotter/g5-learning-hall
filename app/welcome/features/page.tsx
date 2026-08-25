'use client';

import { motion } from 'framer-motion';

type Feature = {
  icon: string;
  name: string;
  what: string;
  payoff: string;
};

const FEATURES: Feature[] = [
  {
    icon: '/sidequests/lorekeeper.webp',
    name: 'Learning Guilds',
    what: 'Five focused mini-games — Lorekeeper (reading), SpellCaster (typing), Number Realm (mental math), Logic Labyrinth (critical thinking), and Lexicon Arena (spelling & vocabulary).',
    payoff: 'Builds five core academic skills through short, repeatable practice — without it feeling like a worksheet.',
  },
  {
    icon: '/monsters/emberwyrm.webp',
    name: 'Curio Collection & Battling',
    what: "Collectible creatures with elemental strengths and weaknesses (fire, water, leaf, storm, shadow, light) that your child earns and trains by mastering lessons.",
    payoff: "Turns \"did I study enough\" into a visible, growing collection your child is proud to show off.",
  },
  {
    icon: '/icons/encounter/atk.svg',
    name: 'Live PvP Battles',
    what: "Real-time battles against siblings or classmates, using the curios your child has trained.",
    payoff: "Adds friendly competition with people they already know — no strangers, no public chat.",
  },
  {
    icon: '/maps/worldmap.webp',
    name: 'World Map & Codex',
    what: "An explorable map and lore reference where every region and creature entry ties back to something your child unlocked by learning.",
    payoff: "Gives schoolwork a sense of discovery and story, so lessons feel like progress in a world, not just checkboxes.",
  },
  {
    icon: '/monsters/tarsipling.webp',
    name: 'Weekly Quests & Special Events',
    what: 'A structured weekly quest line matched to the school schedule, plus limited-time Events built around upcoming summative tests.',
    payoff: "Keeps your child a step ahead of exams instead of cramming the night before.",
  },
  {
    icon: '/items/crown.png',
    name: 'Leaderboard',
    what: "Rankings by level, gold, battles won, and monsters collected, visible across the family/classmate group your child plays with.",
    payoff: "Gives quiet extra motivation from healthy comparison with people they know — no public strangers involved.",
  },
  {
    icon: '/icons/rewards/gift.svg',
    name: 'Achievements, Titles & Rewards',
    what: "XP and gold earned strictly from mastering lessons, spent on titles, unlockable profile art, and vault rewards you control.",
    payoff: "Rewards effort with proof of work — never pay-to-win, never disconnected from actual learning.",
  },
  {
    icon: '/items/iron_shield_100.webp',
    name: 'Safe, PIN-Based Child Login',
    what: "Kids sign in with a simple username and 4-digit PIN set by the parent — no email, no social accounts, no public exposure.",
    payoff: "One less password to manage, and no way for your child's account to be reached by anyone outside the family.",
  },
  {
    icon: '/items/blessed_charm_100.webp',
    name: 'Approval-Gated Parent Registration',
    what: "Every new parent account is reviewed and approved before it can access the dashboard — this isn't an open sign-up.",
    payoff: 'Keeps the platform a trusted, vetted space rather than an anonymous free-for-all.',
  },
  {
    icon: '/icons/stats/switch.svg',
    name: 'Multi-Child Support',
    what: 'Your first child account is free forever. Add siblings under the same parent login with a ₱249/year Premium plan, and manage everyone from a single dashboard.',
    payoff: 'No juggling separate logins per sibling — one account, the whole family.',
  },
  {
    icon: '/icons/stats/items.svg',
    name: 'Progress Dashboard',
    what: "See each child's current learning streak and recent activity right from your parent account, free.",
    payoff: "Know how they're doing without having to ask how school went.",
  },
  {
    icon: '/icons/rewards/package.svg',
    name: 'Journal Viewing & Gold Rewards',
    what: "A Premium-only window into your child's in-game journal, plus a yearly pool of gold coins you can hand out to stock the Rewards Vault.",
    payoff: "A closer look at how they think, and a way to reward real effort without spending on top of the subscription.",
  },
  {
    icon: '/items/graduation_scroll.svg',
    name: 'DepEd Curriculum Alignment',
    what: "Content is built from the official Budget of Work for Grades 2–6, released about two days ahead of the week it's taught in class — not a content dump your child can binge ahead of the teacher.",
    payoff: "Whatever your child plays this week is exactly what they're covering in class this week — genuine reinforcement, not a mismatch.",
  },
  {
    icon: '/monsters/thundrake.webp',
    name: 'Term Exams as Boss Fights',
    what: "When a term ends, nine persona-shaped adversaries (\"the Forgetting\") rise — one per subject. Your child fights each using the lessons already taught that term. Defeat all nine to unlock a term-exclusive curio.",
    payoff: 'Turns the most stressful school moment of the term into one more challenge your child is already used to facing.',
  },
  {
    icon: '/icons/rewards/gold_coin.svg',
    name: 'Curio Quality & Tutor',
    what: "Every curio has a quality tier — Normal, Good, Outstanding, or Perfect — that permanently boosts its HP and Attack. Spend gold in the Tutor to reroll a curio's tier upward. Optional Tomes of Knowledge consumables tilt the odds in your favor.",
    payoff: 'Gives engaged players a meaningful long-term gold sink that rewards dedication without gating any core gameplay behind it.',
  },
  {
    icon: '/icons/stats/items.svg',
    name: 'Growth Pills',
    what: "Rare consumables earned by defeating boss personas. Using one on a curio instantly grants a large burst of experience and levels — a shortcut for the curio you care about most.",
    payoff: 'A satisfying, earnable power-up that makes boss fight victories feel worth celebrating beyond just the curio reward.',
  },
];

const COMING_SOON: Feature[] = [
  {
    icon: '/icons/rewards/package.svg',
    name: 'Reward-Claim Approvals',
    what: 'When a child redeems a reward from the Vault, it will sit pending until a parent approves and fulfills it.',
    payoff: "You stay in control of what your child actually receives — nothing is granted without your sign-off.",
  },
];

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}

function SectionKicker({ children, color = 'sky' }: { children: React.ReactNode; color?: string }) {
  const colorMap: Record<string, string> = {
    sky: 'text-sky-500',
    amber: 'text-amber-500',
    orange: 'text-orange-500',
  };
  const textColor = colorMap[color] ?? 'text-sky-500';
  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      <div className={`h-px w-8 bg-gradient-to-r from-transparent to-current opacity-30 ${textColor}`} />
      <span className={`text-[11px] tracking-[0.28em] font-bold ${textColor} uppercase`}>{children}</span>
      <div className={`h-px w-8 bg-gradient-to-l from-transparent to-current opacity-30 ${textColor}`} />
    </div>
  );
}

// Assign a soft pastel accent per card based on index, cycling through a kid-friendly palette
const CARD_ACCENTS = [
  { icon: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-400' },
  { icon: 'bg-orange-50',  border: 'border-orange-200',  dot: 'bg-orange-400'  },
  { icon: 'bg-violet-50',  border: 'border-violet-200',  dot: 'bg-violet-400'  },
  { icon: 'bg-sky-50',     border: 'border-sky-200',     dot: 'bg-sky-400'     },
  { icon: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-400'   },
  { icon: 'bg-cyan-50',    border: 'border-cyan-200',    dot: 'bg-cyan-400'    },
  { icon: 'bg-rose-50',    border: 'border-rose-200',    dot: 'bg-rose-400'    },
  { icon: 'bg-indigo-50',  border: 'border-indigo-200',  dot: 'bg-indigo-400'  },
  { icon: 'bg-teal-50',    border: 'border-teal-200',    dot: 'bg-teal-400'    },
  { icon: 'bg-lime-50',    border: 'border-lime-200',    dot: 'bg-lime-500'    },
  { icon: 'bg-pink-50',    border: 'border-pink-200',    dot: 'bg-pink-400'    },
  { icon: 'bg-fuchsia-50', border: 'border-fuchsia-200', dot: 'bg-fuchsia-400' },
  { icon: 'bg-yellow-50',  border: 'border-yellow-200',  dot: 'bg-yellow-400'  },
];

function FeatureCard({ feature, delay, index, muted = false }: { feature: Feature; delay: number; index: number; muted?: boolean }) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  return (
    <FadeIn delay={delay}>
      <div
        className={`h-full rounded-2xl border-2 p-6 bg-white transition-shadow hover:shadow-md ${
          muted ? `border-dashed ${accent.border} opacity-80` : accent.border
        }`}
      >
        <div className={`w-14 h-14 rounded-xl ${accent.icon} flex items-center justify-center mb-4`}>
          <img src={feature.icon} alt="" className="w-9 h-9 object-contain" />
        </div>
        <h3 className="font-display text-base font-bold text-slate-800 mb-2">{feature.name}</h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-3">{feature.what}</p>
        <div className="flex items-start gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${accent.dot} mt-1.5 shrink-0`} />
          <p className="text-sm text-slate-700 font-semibold leading-relaxed">{feature.payoff}</p>
        </div>
      </div>
    </FadeIn>
  );
}

function CTAButtons() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
      <motion.a
        href="/register"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full sm:w-auto text-center bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3.5 rounded-[14px] transition-colors shadow-[0_4px_20px_rgba(249,115,22,0.35)]"
      >
        Register Your Family
      </motion.a>
      <motion.a
        href="/welcome"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full sm:w-auto text-center bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-orange-300 text-slate-700 font-bold px-8 py-3.5 rounded-[14px] transition-colors shadow-sm"
      >
        Back to Welcome
      </motion.a>
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#f0f8ff] text-slate-800 font-[Inter,system-ui,sans-serif] overflow-x-hidden selection:bg-amber-200 selection:text-amber-800">

      {/* ── HEADER ── */}
      <section className="px-6 pt-20 pb-16 max-w-4xl mx-auto text-center">
        <FadeIn>
          <SectionKicker color="sky">Full Feature List</SectionKicker>
          <h1 className="font-display text-3xl sm:text-5xl font-black leading-[1.1] tracking-[-0.02em] mb-5 text-slate-800">
            Everything Your Child Gets, <span className="text-orange-500">Explained Plainly</span>
          </h1>
          <p className="text-slate-600 max-w-xl mx-auto leading-relaxed">
            Every feature below is live in the app today for Grade 2–6 learners, unless marked &ldquo;Coming Soon.&rdquo; No marketing fluff — just what it is, and why it matters for your child.
          </p>
        </FadeIn>
      </section>

      {/* ── FEATURE GRID ── */}
      <section className="px-6 pb-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.name} feature={f} delay={i * 0.04} index={i} />
          ))}
        </div>
      </section>

      {/* ── COMING SOON ── */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <FadeIn>
          <SectionKicker color="amber">On the Roadmap</SectionKicker>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-center mb-3 text-slate-800">
            Coming Soon
          </h2>
          <p className="text-slate-400 text-center max-w-xl mx-auto mb-10 text-sm leading-relaxed">
            Being built now — not yet live, so you know exactly where things stand.
          </p>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {COMING_SOON.map((f, i) => (
            <FeatureCard key={f.name} feature={f} delay={i * 0.04} index={i + FEATURES.length} muted />
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-6 py-20 border-t border-slate-200 bg-sky-50">
        <FadeIn>
          <div className="max-w-xl mx-auto text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-black mb-4 text-slate-800">
              Ready to Start the Campaign? 🚀
            </h2>
            <p className="text-slate-600 mb-2">
              Free forever for your first child — no credit card.
            </p>
            <CTAButtons />
            <a
              href="/parent-dashboard/pricing"
              className="inline-block mt-4 text-[12.5px] text-slate-400 hover:text-sky-500 transition-colors tracking-wide"
            >
              Free vs. Premium — See Pricing →
            </a>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-6 py-8 text-center border-t border-slate-200 bg-white">
        <p className="text-[11px] tracking-[0.06em] text-slate-300 font-medium">
          © {new Date().getFullYear()} Ruelo Learning Hall. All Rights Reserved.
        </p>
        <p className="mt-2 text-[11px] tracking-wide">
          <a href="https://www.facebook.com/learninghallph" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600 underline">Facebook</a>
          <span className="text-slate-200 mx-2">·</span>
          <a href="/privacy" className="text-slate-400 hover:text-slate-600 underline">Privacy Policy</a>
          <span className="text-slate-200 mx-2">·</span>
          <a href="/account-deletion" className="text-slate-400 hover:text-slate-600 underline">Delete Account</a>
        </p>
      </footer>
    </div>
  );
}
