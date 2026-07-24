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
    icon: '📖',
    name: 'Learning Guilds',
    what: 'Five focused mini-games — Lorekeeper (reading), SpellCaster (typing), Number Realm (mental math), Logic Labyrinth (critical thinking), and Lexicon Arena (spelling & vocabulary).',
    payoff: 'Builds five core academic skills through short, repeatable practice — without it feeling like a worksheet.',
  },
  {
    icon: '🐲',
    name: 'Curio Collection & Battling',
    what: 'Collectible creatures with elemental strengths and weaknesses (fire, water, leaf, storm, shadow, light) that your child earns and trains by mastering lessons.',
    payoff: 'Turns "did I study enough" into a visible, growing collection your child is proud to show off.',
  },
  {
    icon: '⚔️',
    name: 'Live PvP Battles',
    what: 'Real-time battles against siblings or classmates, using the curios your child has trained.',
    payoff: 'Adds friendly competition with people they already know — no strangers, no public chat.',
  },
  {
    icon: '🗺️',
    name: 'World Map & Codex',
    what: 'An explorable map and lore reference where every region and creature entry ties back to something your child unlocked by learning.',
    payoff: 'Gives schoolwork a sense of discovery and story, so lessons feel like progress in a world, not just checkboxes.',
  },
  {
    icon: '🎯',
    name: 'Weekly Quests & Special Events',
    what: 'A structured weekly quest line matched to the school schedule, plus limited-time Events built around upcoming summative tests.',
    payoff: 'Keeps your child a step ahead of exams instead of cramming the night before.',
  },
  {
    icon: '🏆',
    name: 'Leaderboard',
    what: 'Rankings by level, gold, battles won, and monsters collected, visible across the family/classmate group your child plays with.',
    payoff: 'Gives quiet extra motivation from healthy comparison with people they know — no public strangers involved.',
  },
  {
    icon: '🎁',
    name: 'Achievements, Titles & Rewards',
    what: 'XP and gold earned strictly from mastering lessons, spent on titles, unlockable profile art, and vault rewards you control.',
    payoff: 'Rewards effort with proof of work — never pay-to-win, never disconnected from actual learning.',
  },
  {
    icon: '🔒',
    name: 'Safe, PIN-Based Child Login',
    what: 'Kids sign in with a simple username and 4-digit PIN set by the parent — no email, no social accounts, no public exposure.',
    payoff: "One less password to manage, and no way for your child's account to be reached by anyone outside the family.",
  },
  {
    icon: '👪',
    name: 'Approval-Gated Parent Registration',
    what: 'Every new parent account is reviewed and approved before it can access the dashboard — this isn\'t an open sign-up.',
    payoff: 'Keeps the platform a trusted, vetted space rather than an anonymous free-for-all.',
  },
  {
    icon: '👨‍👩‍👧‍👦',
    name: 'Multi-Child Support',
    what: 'Add every child in the family under one parent account and manage them all from a single login.',
    payoff: 'No juggling separate logins per sibling — one account, the whole family.',
  },
  {
    icon: '📚',
    name: 'DepEd Curriculum Alignment',
    what: "Content is built from the official Budget of Work for Grades 2–6, released about two days ahead of the week it's taught in class — not a content dump your child can binge ahead of the teacher.",
    payoff: "Whatever your child plays this week is exactly what they're covering in class this week — genuine reinforcement, not a mismatch.",
  },
];

const COMING_SOON: Feature[] = [
  {
    icon: '📊',
    name: 'Parent Dashboard Analytics',
    what: 'Time spent, lessons mastered, and progress trends for each child, visible right from the parent dashboard.',
    payoff: "See what's working without having to ask your child how school went.",
  },
  {
    icon: '✅',
    name: 'Reward-Claim Approvals',
    what: 'When a child redeems a reward from the Vault, it will sit pending until a parent approves and fulfills it.',
    payoff: 'You stay in control of what your child actually receives — nothing is granted without your sign-off.',
  },
  {
    icon: '🐉',
    name: 'Term Exams as Boss Fights',
    what: "Instead of a plain quiz list, term exams become a full Boss Fight built from that term's material.",
    payoff: 'Turns the most stressful school moment of the term into one more challenge your child is already used to facing.',
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

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#c9aa6a]/40" />
      <span className="text-[11px] tracking-[0.28em] font-bold text-[#d4b46a]/90 uppercase">{children}</span>
      <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#c9aa6a]/40" />
    </div>
  );
}

function FeatureCard({ feature, delay, muted = false }: { feature: Feature; delay: number; muted?: boolean }) {
  return (
    <FadeIn delay={delay}>
      <div
        className={`h-full rounded-xl border p-6 ${
          muted
            ? 'bg-[#1c1611] border-dashed border-[#3d3225]'
            : 'bg-[#1c1611] border-[#3d3225]'
        }`}
      >
        <div className="text-3xl mb-3">{feature.icon}</div>
        <h3 className="font-display text-lg font-bold text-[#ede4d3] mb-2">{feature.name}</h3>
        <p className="text-xs text-[#8a7c66] leading-relaxed mb-3">{feature.what}</p>
        <p className="text-sm text-[#f0b429] font-semibold leading-relaxed">{feature.payoff}</p>
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
        className="w-full sm:w-auto text-center bg-[#c9781a] hover:bg-[#e2921e] text-white font-bold px-8 py-3.5 rounded-[14px] transition-colors shadow-[0_4px_20px_rgba(201,120,26,0.35)]"
      >
        Register Your Family
      </motion.a>
      <motion.a
        href="/welcome"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full sm:w-auto text-center bg-[#1c1611] hover:bg-[#241d16] border border-[#3d3225] hover:border-[#c9781a] text-[#d8cdb8] font-bold px-8 py-3.5 rounded-[14px] transition-colors"
      >
        Back to Welcome
      </motion.a>
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#0a0807] text-[#ede4d3] font-[Inter,system-ui,sans-serif] overflow-x-hidden selection:bg-[#c9781a]/30 selection:text-[#f0b429]">
      <section className="px-6 pt-20 pb-16 max-w-4xl mx-auto text-center">
        <FadeIn>
          <SectionKicker>Full Feature List</SectionKicker>
          <h1 className="font-display text-3xl sm:text-5xl font-black leading-[1.1] tracking-[-0.02em] mb-5">
            Everything Your Child Gets, <span className="text-[#f0b429]">Explained Plainly</span>
          </h1>
          <p className="text-[#c9bfae] max-w-xl mx-auto leading-relaxed">
            Every feature below is live in the app today, unless marked &ldquo;Coming Soon.&rdquo; No
            marketing fluff — just what it is, and why it matters for your child.
          </p>
        </FadeIn>
      </section>

      <section className="px-6 pb-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.name} feature={f} delay={i * 0.04} />
          ))}
        </div>
      </section>

      <section className="px-6 py-20 max-w-6xl mx-auto">
        <FadeIn>
          <SectionKicker>On the Roadmap</SectionKicker>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-center mb-3">
            Coming Soon
          </h2>
          <p className="text-[#8a7c66] text-center max-w-xl mx-auto mb-10 text-sm leading-relaxed">
            Being built now — not yet live, so you know exactly where things stand.
          </p>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {COMING_SOON.map((f, i) => (
            <FeatureCard key={f.name} feature={f} delay={i * 0.04} muted />
          ))}
        </div>
      </section>

      <section className="px-6 py-20 border-t border-[#241d16]">
        <FadeIn>
          <div className="max-w-xl mx-auto text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-black mb-4">
              Ready to Start the Campaign?
            </h2>
            <p className="text-[#c9bfae] mb-2">
              Free during Early Access — no credit card.
            </p>
            <CTAButtons />
          </div>
        </FadeIn>
      </section>

      <footer className="px-6 py-8 text-center border-t border-[#241d16]">
        <p className="text-[11px] tracking-[0.06em] text-white/25 font-medium">
          © {new Date().getFullYear()} Ruelo Learning Hall. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
