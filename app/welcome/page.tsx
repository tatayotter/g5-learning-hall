'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const GUILDS = [
  {
    key: 'lorekeeper', name: 'Lorekeeper', skill: 'Reading Comprehension',
    color: 'text-emerald-300', border: 'border-emerald-800', badgeBg: 'bg-emerald-900/40', cardBg: 'bg-[#121a16]',
    lore: 'Keeper of the Old Stories — rewards vivid words and brave paragraphs, in English and Filipino.',
    question: 'What is the main idea of the passage?',
    options: [{ label: 'They walked to school', correct: false }, { label: 'Kindness is repaid over time', correct: true }, { label: 'It rained heavily', correct: false }, { label: 'The dog was lost', correct: false }],
  },
  {
    key: 'spellcaster', name: 'SpellCaster', skill: 'Typing Speed',
    color: 'text-violet-300', border: 'border-violet-800', badgeBg: 'bg-violet-900/40', cardBg: 'bg-[#13111c]',
    lore: 'Word-Weaver of the Arcane Keys — speed and accuracy forge new spells under the clock.',
    question: 'Type this word before time runs out:',
    typingWord: 'necessary',
  },
  {
    key: 'numberrealm', name: 'Number Realm', skill: 'Mental Math',
    color: 'text-amber-300', border: 'border-amber-800', badgeBg: 'bg-amber-900/40', cardBg: 'bg-[#0d0c08]',
    lore: 'Warden of the Shifting Equations — logic is the key that never breaks.',
    question: '3/4 + 1/8 = ?',
    options: [{ label: '7/8', correct: true }, { label: '4/12', correct: false }, { label: '1', correct: false }, { label: '5/8', correct: false }],
  },
  {
    key: 'logiclabyrinth', name: 'Logic Labyrinth', skill: 'Critical Thinking & Reasoning',
    color: 'text-cyan-300', border: 'border-cyan-800', badgeBg: 'bg-cyan-900/40', cardBg: 'bg-[#0b0d12]',
    lore: 'Wayfinder through impossible mazes — every puzzle is a door waiting to open.',
    question: 'Which shape completes the pattern: ● ■ ● ■ ?',
    options: [{ label: '●', correct: false }, { label: '■', correct: true }, { label: '▲', correct: false }, { label: '★', correct: false }],
  },
  {
    key: 'lexiconarena', name: 'Lexicon Arena', skill: 'Spelling Recognition & Vocabulary',
    color: 'text-indigo-300', border: 'border-indigo-800', badgeBg: 'bg-indigo-900/40', cardBg: 'bg-neutral-900',
    lore: 'Champion of the Unbroken Word — precision wins duels in the Arena.',
    question: "Which spelling means 'a formal expression of praise'?",
    options: [{ label: 'Complement', correct: false }, { label: 'Compliment', correct: true }, { label: 'Complyment', correct: false }, { label: 'Compliement', correct: false }],
  },
] as const;

const MONSTERS = [
  { file: 'emberwyrm', name: 'Emberwyrm', element: 'fire', archetype: 'tank', legendary: true, hp: 140, atk: 26, def: 20, spd: 16, description: 'A legendary wyrm wreathed in slow, eternal flame. Sleeps coiled around dormant volcanoes. Its flame moves so slowly you can watch it crawl across its scales over days.' },
  { file: 'thundrake', name: 'Thundrake', element: 'storm', archetype: 'tank', legendary: false, hp: 120, atk: 15, def: 20, spd: 8, description: 'A serpentine dragon that lives inside storm clouds. It doesn’t create thunder — it lives where thunder already is. Often mistaken for distant thunder.' },
  { file: 'coralune', name: 'Coralune', element: 'water', archetype: 'balanced', legendary: false, hp: 100, atk: 18, def: 15, spd: 12, description: 'A shy reef seahorse that grows a small living coral crown. Coralune hums to keep the polyps calm. If water turns sour, it leaves.' },
  { file: 'brambleon', name: 'Brambleon', element: 'leaf', archetype: 'tank', legendary: false, hp: 120, atk: 15, def: 20, spd: 8, description: 'A lowland lion with a mane of thick leaves and vines. The leaves change color with the season, but never fall out completely.' },
  { file: 'umbraven', name: 'Umbraven', element: 'shadow', archetype: 'balanced', legendary: false, hp: 100, atk: 18, def: 15, spd: 12, description: 'A forest raven whose feathers have a soft ink-like edge that blurs in dim light. It is hard to photograph because cameras can’t focus on it.' },
  { file: 'luminos', name: 'Luminos', element: 'light', archetype: 'balanced', legendary: false, hp: 100, atk: 18, def: 15, spd: 12, description: 'A small glowing fox with a radiant tail. Its tail works like a lantern that dims and brightens with its breathing. Leaves faint light pawprints that fade by morning.' },
] as const;

const STAT_MAX = { hp: 150, atk: 30, def: 30, spd: 30 };

const APK_URL = 'https://github.com/tatayotter/g5-learning-hall/releases/latest/download/LearningHall.apk';

const FAQS = [
  {
    q: 'Is this actually free?',
    a: 'Yes — Learning Hall is free while it’s in Early Access, no credit card required. We haven’t locked in pricing for a wider release yet, but Early Access families won’t be blindsided by a sudden bill; you’ll hear about any change before it happens.',
  },
  {
    q: 'Is my child’s information safe?',
    a: 'Only a parent can create the family account, and every child profile lives under it. There’s no public chat, no ads, and no stranger contact — the only people your child battles or competes with are siblings and classmates you’ve already added.',
  },
  {
    q: 'Will this replace my child’s teacher or homework?',
    a: 'No. Learning Hall runs alongside the classroom, not instead of it — Daily Quests are built from the same lesson schedule and DepEd curriculum your child’s teacher is already following, so it reinforces what’s being taught rather than replacing it.',
  },
  {
    q: 'My child isn’t in Grade 5 — can they still use it?',
    a: 'Learning Hall is built for elementary-age learners and already supports more than one grade level. It’s actively growing grade by grade, so if your child’s exact level isn’t covered yet, it will be soon.',
  },
  {
    q: 'Do we need to buy a tablet or download anything?',
    a: 'No purchase needed. Learning Hall runs in any browser, and there’s also a free Android app if you’d rather have an icon on the home screen.',
  },
  {
    q: 'What if my kid just wants to battle curios and skip the actual learning?',
    a: 'They can’t, by design. Every quest cleared, skill unlocked, curio caught, and battle won is gated behind mastering the matching classroom lesson first — there’s no way to grind the game part without doing the learning part.',
  },
  {
    q: 'Can I control the rewards, or will my kid expect things I haven’t agreed to?',
    a: 'You stock the Rewards Vault yourself with whatever you’re comfortable offering, and every claim sits pending until you approve it. Nothing gets fulfilled without your sign-off.',
  },
  {
    q: 'What if I have more than one child?',
    a: 'One parent account manages your whole family — add every child once during registration, then switch between them and approve each one’s reward claims from a single dashboard.',
  },
] as const;

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

function HeroBackdrop() {
  const [failed, setFailed] = useState(false);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0807]" />
      {!failed && (
        <img
          src="/welcome-hero.webp"
          alt=""
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center opacity-70"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0807]/30 via-[#0a0807]/60 to-[#0a0807]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.85)_100%)] sm:bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.75)_100%)]" />
    </div>
  );
}

function FilmGrain() {
  return (
    <div
      className="fixed inset-0 pointer-events-none opacity-[0.025]"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}

function SectionKicker({ children, align = 'center' }: { children: React.ReactNode; align?: 'center' | 'left' }) {
  return (
    <div className={`flex items-center gap-3 mb-4 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
      <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#c9aa6a]/40" />
      <span className="text-[11px] tracking-[0.28em] font-bold text-[#d4b46a]/90 uppercase">{children}</span>
      {align === 'center' && <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#c9aa6a]/40" />}
    </div>
  );
}

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-[#8a7c66] mb-1">
        <span>{label}</span>
        <span className="text-[#c9bfae] font-bold">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-[#3d3225] rounded-full overflow-hidden">
        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto bg-[#1c1611] border border-[#3d3225] rounded-2xl p-6 sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#241d16] hover:bg-[#2a2119] border border-[#3d3225] text-[#c9bfae] flex items-center justify-center"
          aria-label="Close"
        >
          ✕
        </button>
        {children}
      </motion.div>
    </div>
  );
}

function CurioModal({ monster, onClose }: { monster: (typeof MONSTERS)[number]; onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex flex-col sm:flex-row gap-6">
        <img src={`/monsters/${monster.file}.webp`} alt={monster.name} className="w-28 h-28 mx-auto sm:mx-0 object-contain shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl font-black text-[#ede4d3] mb-1.5">
            {monster.legendary && <span className="text-[#f0b429] mr-1.5">★</span>}
            {monster.name}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-[#241d16] text-[#c9bfae]">
              <img src={`/elements/elem_${monster.element}_100.webp`} alt="" className="w-3 h-3" />
              {monster.element}
            </span>
            <span className="text-[10px] text-[#8a7c66] uppercase tracking-wider">{monster.archetype.replace('_', ' ')}</span>
          </div>
          <p className="text-sm text-[#8a7c66] leading-relaxed mb-5">{monster.description}</p>
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            <StatBar label="HP" value={monster.hp} max={STAT_MAX.hp} />
            <StatBar label="Attack" value={monster.atk} max={STAT_MAX.atk} />
            <StatBar label="Defense" value={monster.def} max={STAT_MAX.def} />
            <StatBar label="Speed" value={monster.spd} max={STAT_MAX.spd} />
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

function GuildSnapshotModal({ guild, onClose }: { guild: (typeof GUILDS)[number]; onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#8a7c66] mb-1">Game Snapshot</p>
      <h3 className={`font-display text-2xl font-black mb-4 ${guild.color}`}>{guild.name}</h3>

      <div className={`${guild.cardBg} border-2 ${guild.border} rounded-xl p-6`}>
        {/* HUD row */}
        <div className="flex items-center justify-between mb-4 text-xs font-bold">
          <span className="text-[#f0b429]">12s</span>
          <span className={`inline-flex items-center gap-1 ${guild.color}`}>
            <img src="/icons/stats/burn.svg" alt="" className="w-3.5 h-3.5" />
            x3 streak
          </span>
          <span className="text-[#c9bfae]">Score: 180</span>
        </div>

        {/* Guardian */}
        <div className="flex justify-center mb-4">
          <img src={`/sidequests/${guild.key}.webp`} alt="" className="w-20 h-20 object-contain" />
        </div>

        {/* Question card */}
        <div className="bg-[#0a0807]/60 border border-[#3d3225] rounded-lg p-5">
          <p className="text-center text-[10px] tracking-widest text-[#8a7c66] mb-2">★★☆</p>
          <p className="text-center font-bold text-[#ede4d3] mb-4">{guild.question}</p>

          {'typingWord' in guild ? (
            <div className="text-center">
              <span className="inline-block bg-[#1c1611] border border-[#3d3225] rounded-lg px-6 py-3 font-mono text-lg tracking-wide text-[#f0b429]">
                {guild.typingWord}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {guild.options?.map((opt) => (
                <div
                  key={opt.label}
                  className={`w-full text-left px-4 py-2 rounded-lg border text-sm font-semibold ${
                    opt.correct
                      ? 'border-[#7fae52] bg-[#223616] text-[#c8dfa8]'
                      : 'border-[#3d3225] bg-[#1c1611] text-[#8a7c66]'
                  }`}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-[#8a7c66] mt-4 leading-relaxed">{guild.lore}</p>
    </ModalOverlay>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#1c1611] border border-[#3d3225] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 cursor-pointer"
      >
        <span className="font-bold text-[#ede4d3] text-sm">{q}</span>
        <span className={`shrink-0 text-[#c9781a] font-bold text-lg transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-[#8a7c66] leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

function CTAButtons({ align = 'center' }: { align?: 'center' | 'left' }) {
  return (
    <div className={`flex flex-col sm:flex-row items-center gap-3 mt-8 ${align === 'left' ? 'sm:justify-start' : 'justify-center'}`}>
      <motion.a
        href="/register"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full sm:w-auto text-center bg-[#c9781a] hover:bg-[#e2921e] text-white font-bold px-8 py-3.5 rounded-[14px] transition-colors shadow-[0_4px_20px_rgba(201,120,26,0.35)]"
      >
        Register Your Family
      </motion.a>
      <motion.a
        href="/parent-login"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full sm:w-auto text-center bg-[#1c1611] hover:bg-[#241d16] border border-[#3d3225] hover:border-[#c9781a] text-[#d8cdb8] font-bold px-8 py-3.5 rounded-[14px] transition-colors"
      >
        Parent Login
      </motion.a>
    </div>
  );
}

export default function WelcomePage() {
  const [selectedMonster, setSelectedMonster] = useState<(typeof MONSTERS)[number] | null>(null);
  const [selectedGuild, setSelectedGuild] = useState<(typeof GUILDS)[number] | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0807] text-[#ede4d3] font-[Inter,system-ui,sans-serif] overflow-x-hidden selection:bg-[#c9781a]/30 selection:text-[#f0b429]">
      <FilmGrain />

      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] flex items-center justify-center px-6 py-20">
        <HeroBackdrop />
        <div className="relative z-10 max-w-3xl text-center">
          <img
            src="/learning_hall_full_logo.webp"
            alt="Learning Hall"
            className="h-20 sm:h-28 w-auto mx-auto mb-6 object-contain drop-shadow-[0_6px_28px_rgba(0,0,0,0.55)]"
          />
          <h1 className="font-display text-4xl sm:text-6xl font-black leading-[1.05] tracking-[-0.02em] mb-6">
            Turn Homework Into <span className="text-[#f0b429]">An Epic Quest</span>
          </h1>
          <p className="text-base sm:text-lg text-[#c9bfae] max-w-xl mx-auto mb-3 leading-relaxed">
            Where every worksheet is a battle, every lesson is a discovery.
          </p>
          <p className="text-sm text-[#8a7c66] mb-8">
            For elementary-age learners who deserve more than boring drills.
          </p>

          <div className="inline-flex items-center gap-2 rounded-full bg-[#1c1611] border border-[#3d3225] px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7fae52] shadow-[0_0_8px_rgba(127,174,82,0.8)]" />
            <span className="text-[12px] font-semibold tracking-wide text-[#c9bfae]">Free · Early Access</span>
          </div>

          <div className="flex justify-center">
            <CTAButtons />
          </div>

          <div className="mt-6 flex flex-col items-center gap-2">
            <a
              href="/welcome/features"
              className="inline-block text-[12.5px] font-semibold text-[#d4b46a] hover:text-[#f0b429] transition-colors tracking-wide"
            >
              See the Full Feature List →
            </a>
            <a
              href={APK_URL}
              className="inline-block text-[12.5px] text-[#8a7c66] hover:text-[#d4b46a] transition-colors tracking-wide"
            >
              Also available on Android — Download APK
            </a>
          </div>
        </div>
      </section>

      {/* ── ORIGIN STORY ── */}
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <FadeIn>
          <SectionKicker>Why Learning Hall Exists</SectionKicker>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-center mb-10">
            Built by a Dad Who Didn&apos;t Want to Steal His Kids&apos; Free Time
          </h2>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="space-y-5 text-[#c9bfae] leading-relaxed">
            <p>
              A while back, we looked into hiring a private tutor for Tala and Damien. The closest
              one we could find was six kilometers away — which meant traffic, a late pickup, and a
              long ride home. By the time they walked through the door it was almost 6 PM, and they
              were wiped out. Did they learn something? Sure. Did they complain the entire way home?
              Also sure.
            </p>
            <p>
              Every afternoon in the car, I&apos;d ask the same question: &ldquo;How was school
              today?&rdquo; For the longest time I got the usual one-word shrug. Then, about a week
              after Tala started playing the game I&apos;d been building at home, something changed.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="relative my-8">
            <div
              className="absolute -inset-8 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 40% 50%, rgba(201,120,26,0.10), transparent 60%)' }}
            />
            <div className="relative bg-[#1c1611] border-l-4 border-[#c9781a] rounded-xl px-6 py-5 overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.05]"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E\")",
                }}
              />
              <p className="relative text-[#ede4d3] leading-relaxed italic">
                &ldquo;The lessons we went over in class today felt easy,&rdquo; she told me, &ldquo;because
                I already sort of learned it — from playing Learning Hall.&rdquo;
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="space-y-5 text-[#c9bfae] leading-relaxed">
            <p>
              That was the moment it clicked for me. If a game I&apos;d built just to survive our own
              homework routine could do that for my own kids, I probably wasn&apos;t the only parent
              who needed something like it. So I&apos;m opening Learning Hall up to a small group of
              families first — parents who share the same idea I did: that learning can be fun and
              engaging enough that it stops feeling like studying at all.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-right text-sm text-[#8a7c66] italic mt-8">
            — Tatay, creator of Learning Hall
          </p>
        </FadeIn>
      </section>

      {/* ── SCREENTIME, RECLAIMED ── */}
      <section className="px-6 py-24 bg-[#0d0a08] border-y border-[#241d16]">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <SectionKicker>Screentime Solved</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black mb-4">
              Same Screen. Same Drive to Keep Playing. Different Payoff.
            </h2>
            <p className="text-[#c9bfae] max-w-2xl mx-auto leading-relaxed">
              Kids already want screen time — Learning Hall redirects it. Instead of chasing the next
              attention-grabbing game, they&apos;re chasing quest completions, curio catches, and PvP
              wins. Every one of those runs straight through mastering the day&apos;s actual lesson, so
              the minutes they&apos;d spend anyway start compounding into real classroom progress.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── THE CORE HOOK (split) ── */}
      <section className="relative px-6 py-24 max-w-6xl mx-auto overflow-hidden">
        <div
          className="hidden sm:block absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Cg fill='none' stroke='%23c9bfae' stroke-width='1'%3E%3Cpath d='M0 40 Q60 10 120 40 T240 40'/%3E%3Cpath d='M0 90 Q60 60 120 90 T240 90'/%3E%3Cpath d='M0 140 Q60 110 120 140 T240 140'/%3E%3Cpath d='M0 190 Q60 160 120 190 T240 190'/%3E%3Ccircle cx='40' cy='60' r='2'/%3E%3Ccircle cx='170' cy='120' r='2'/%3E%3Ccircle cx='90' cy='180' r='2'/%3E%3C/g%3E%3C/svg%3E\")",
            backgroundSize: '240px 240px',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
          }}
        />
        <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          <FadeIn>
            <SectionKicker align="left">The Core Hook</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black mb-4">
              Every Quest Is a Real Lesson
            </h2>
            <p className="text-[#c9bfae] mb-3 leading-relaxed">
              No fluff. No filler. Your child&apos;s daily subjects become campaign missions — built
              directly from the actual classroom schedule and DepEd curriculum. Complete Filipino to
              unlock the Lorekeeper&apos;s vault. Conquer Math to tame the Number Realm.
            </p>
            <p className="text-[#8a7c66] mb-8 text-sm italic">
              A structured daily loop that turns &ldquo;I don&apos;t want to&rdquo; into &ldquo;What&apos;s next?&rdquo;
            </p>
            <div className="bg-[#1c1611] border-l-4 border-[#c9781a] rounded-xl px-6 py-5">
              <p className="text-[#ede4d3] leading-relaxed">
                <strong className="text-[#f0b429]">Nothing advances for free.</strong> Every quest
                cleared, every skill unlocked, every curio caught, and every battle won requires
                mastering the matching classroom lesson first. It feels like play — the mechanic
                underneath is 100% lesson mastery.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="bg-[#1c1611] border border-[#3d3225] rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.4)]">
              <div className="p-4 font-bold bg-[#241d16] text-[#f0b429] border-b border-[#3d3225]">
                Active Campaign Map
              </div>
              <div className="p-5 space-y-3">
                {[
                  { day: 'Monday', subject: 'Filipino', status: 'done' },
                  { day: 'Tuesday', subject: 'Mathematics', status: 'today' },
                  { day: 'Wednesday', subject: 'Science', status: 'locked' },
                ].map((row) => (
                  <div
                    key={row.day}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                      row.status === 'today' ? 'border-[#c9781a] bg-[#2a1f12]' : 'border-[#3d3225] bg-[#14100d]'
                    }`}
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#8a7c66]">{row.day}</p>
                      <p className="font-bold text-[#ede4d3]">{row.subject}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                        row.status === 'done'
                          ? 'bg-[#223616] text-[#7fae52]'
                          : row.status === 'today'
                          ? 'bg-[#4a2e0a] text-[#f0b429]'
                          : 'bg-[#241d16] text-[#5c5245]'
                      }`}
                    >
                      {row.status === 'done' && <img src="/icons/stats/victory.svg" alt="" className="w-3.5 h-3.5" />}
                      {row.status === 'locked' && <img src="/icons/encounter/cage.svg" alt="" className="w-3.5 h-3.5 opacity-70" />}
                      {row.status === 'done' ? 'Mastered' : row.status === 'today' ? 'Today' : 'Upcoming'}
                    </span>
                  </div>
                ))}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] text-[#8a7c66] uppercase tracking-wider mb-1.5">
                    <span>Progress</span>
                    <span className="text-[#f0b429] font-bold">2/3</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#3d3225] overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#c9781a] to-[#f0b429]" />
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── LEARNING GUILDS ── */}
      <section className="relative px-6 py-24 bg-[#0d0a08] border-y border-[#241d16] overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #c9bfae 0px, #c9bfae 1px, transparent 1px, transparent 28px), repeating-linear-gradient(90deg, #c9bfae 0px, #c9bfae 1px, transparent 1px, transparent 56px)",
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[420px] pointer-events-none"
          style={{ background: 'radial-gradient(600px 300px at 50% 0%, rgba(201,120,26,0.08), transparent 70%)' }}
        />
        <div className="relative max-w-6xl mx-auto">
          <FadeIn>
            <SectionKicker>Learning Guilds</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-center mb-4">
              Five Guardians. Five Core Skills.
            </h2>
            <p className="text-[#c9bfae] text-center max-w-2xl mx-auto mb-3 leading-relaxed">
              These aren&apos;t subject drills — they&apos;re focused skill-builders: typing speed, reading
              comprehension, critical thinking, mental math, and spelling &amp; vocabulary recall. Each
              is protected by a Guardian who tests, teaches, and celebrates every win.
            </p>
            <p className="text-[#8a7c66] text-center max-w-2xl mx-auto mb-14 text-sm">
              Content spans both English and Filipino, custom-tuned to your child&apos;s specific
              grade-level curriculum.
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {GUILDS.map((g, i) => (
              <FadeIn key={g.key} delay={i * 0.06}>
                <button
                  type="button"
                  onClick={() => setSelectedGuild(g)}
                  className={`text-left w-full bg-[#1c1611] border ${g.border} rounded-xl overflow-hidden h-full hover:brightness-110 transition-[filter] cursor-pointer`}
                >
                  <div className="h-36 bg-[#14100d] flex items-center justify-center p-4">
                    <img
                      src={`/sidequests/${g.key}.webp`}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="p-5">
                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${g.badgeBg} ${g.color} mb-2`}>
                      {g.skill}
                    </span>
                    <h3 className={`text-lg font-bold font-display ${g.color} mb-1`}>{g.name}</h3>
                    <p className="text-xs text-[#8a7c66] leading-snug">{g.lore}</p>
                    <p className="text-[10px] text-[#5c5245] mt-2 uppercase tracking-wider">Tap for a game snapshot →</p>
                  </div>
                </button>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CURIO ARENA (split intro) ── */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-16 items-start mb-14">
          <FadeIn>
            <SectionKicker align="left">Curio Arena</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black">
              Battle Curios. Collect Knowledge.
            </h2>
          </FadeIn>
          <FadeIn delay={0.05}>
            <p className="text-[#c9bfae] leading-relaxed lg:pt-2 mb-5">
              Every correct answer weakens the wild Curios. Defeat them to capture their essence and
              fill your Codex — but catching, training, and battling a curio is only ever unlocked by
              mastering lessons, never by grinding.
            </p>
            <div className="bg-[#1c1611] border-l-4 border-[#c9781a] rounded-xl px-6 py-5">
              <p className="text-[#ede4d3] leading-relaxed">
                <strong className="text-[#f0b429]">What&apos;s a Curio?</strong>{' '}
                A collectible creature born from your child&apos;s own lesson mastery — the harder
                they study, the stronger it gets. Collect them all, train them, and battle friends
                with the ones you&apos;ve earned.
              </p>
            </div>
          </FadeIn>
        </div>

        <div className="relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: [
                'radial-gradient(180px 180px at 8% 20%, rgba(240,180,41,0.06), transparent 70%)',
                'radial-gradient(180px 180px at 25% 80%, rgba(56,189,248,0.06), transparent 70%)',
                'radial-gradient(180px 180px at 42% 20%, rgba(148,163,184,0.06), transparent 70%)',
                'radial-gradient(180px 180px at 58% 80%, rgba(127,174,82,0.06), transparent 70%)',
                'radial-gradient(180px 180px at 75% 20%, rgba(99,102,241,0.06), transparent 70%)',
                'radial-gradient(180px 180px at 92% 80%, rgba(240,229,169,0.06), transparent 70%)',
              ].join(', '),
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(201,120,26,0.10), transparent 70%)' }}
          />
          <div className="relative grid grid-cols-3 sm:grid-cols-6 gap-4">
            {MONSTERS.map((m, i) => (
              <FadeIn key={m.file} delay={i * 0.05}>
                <button
                  type="button"
                  onClick={() => setSelectedMonster(m)}
                  className="w-full bg-[#1c1611] border border-[#3d3225] rounded-xl p-4 text-center hover:border-[#c9781a] transition-colors cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                >
                  <img src={`/monsters/${m.file}.webp`} alt={m.name} className="w-full aspect-square object-contain mb-2" />
                  <p className="text-xs font-bold text-[#ede4d3]">{m.name}</p>
                  <p className="text-[10px] text-[#8a7c66] capitalize">{m.element}</p>
                  <p className="text-[9px] text-[#5c5245] mt-1 uppercase tracking-wider">Tap for stats</p>
                </button>
              </FadeIn>
            ))}
          </div>
        </div>

        <FadeIn delay={0.15}>
          <div className="mt-14 max-w-3xl mx-auto bg-[#1c1611] border border-[#3d3225] rounded-2xl p-8 text-center">
            <p className="flex items-center justify-center gap-2 text-[11px] tracking-[0.22em] font-bold text-[#f0b429] uppercase mb-3">
              <img src="/icons/encounter/atk.svg" alt="" className="w-4 h-4" />
              Live PvP
            </p>
            <h3 className="font-display text-2xl sm:text-3xl font-black mb-3">
              Student vs. Student, In Real Time
            </h3>
            <p className="text-[#c9bfae] leading-relaxed mb-6">
              Beyond training curios against the computer, kids can send live battle invites to
              siblings and classmates and fight it out head-to-head — real-time, same platform,
              bragging rights included.
            </p>

            {/* Static preview of what a real live battle screen looks like */}
            <div className="bg-[#14100d] border border-[#3d3225] rounded-2xl p-6 text-left">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="text-center flex-1">
                  <p className="text-[10px] text-[#8a7c66] uppercase tracking-wider mb-1">Your Curio</p>
                  <img src="/monsters/emberwyrm.webp" alt="" className="w-14 h-14 mx-auto mb-1.5 object-contain" />
                  <p className="text-xs font-bold text-[#ede4d3]">Emberwyrm Lv.22</p>
                  <div className="w-full max-w-[100px] mx-auto bg-[#3d3225] rounded-full h-1.5 mt-1.5">
                    <div className="h-full bg-[#7fae52] rounded-full" style={{ width: '62%' }} />
                  </div>
                  <p className="text-[10px] text-[#8a7c66] mt-1">87/140 HP</p>
                </div>

                <div className="flex-1 max-w-[150px] bg-black/30 rounded-xl p-3 self-center">
                  <p className="text-[10px] text-[#c9bfae] leading-relaxed text-center">Emberwyrm used Flamethrower!</p>
                </div>

                <div className="text-center flex-1">
                  <p className="text-[10px] text-[#8a7c66] uppercase tracking-wider mb-1">Opponent</p>
                  <img src="/monsters/thundrake.webp" alt="" className="w-14 h-14 mx-auto mb-1.5 object-contain scale-x-[-1]" />
                  <p className="text-xs font-bold text-[#ede4d3]">Thundrake Lv.19</p>
                  <div className="w-full max-w-[100px] mx-auto bg-[#3d3225] rounded-full h-1.5 mt-1.5">
                    <div className="h-full bg-[#c9781a] rounded-full" style={{ width: '41%' }} />
                  </div>
                  <p className="text-[10px] text-[#8a7c66] mt-1">49/120 HP</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                {['Ember', 'Flamethrower', 'Solar Flare', 'Rest'].map((skill, i) => (
                  <div
                    key={skill}
                    className={`text-xs font-bold px-3 py-2 rounded-lg border text-center ${
                      i === 1 ? 'border-[#c9781a] bg-[#2a1f12] text-[#f0b429]' : 'border-[#3d3225] bg-[#1c1611] text-[#8a7c66]'
                    }`}
                  >
                    {skill}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── SPECIAL EVENTS ── */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <FadeIn>
          <SectionKicker>Special Events</SectionKicker>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-center mb-4">
            Ahead of Every Summative Test
          </h2>
          <p className="text-[#c9bfae] text-center max-w-2xl mx-auto mb-14 leading-relaxed">
            Because Learning Hall tracks the same lesson schedule as the classroom, it doesn&apos;t just
            keep pace with it — it gets ahead of it. When a summative test is coming up, Learning Hall
            can launch a limited-time Event: a themed quest chain covering exactly what&apos;s being
            tested, with an exclusive curio waiting at the end for anyone who clears it.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-center bg-[#1c1611] border border-amber-800/60 rounded-2xl p-6 sm:p-8 mb-6 shadow-[0_0_24px_rgba(201,120,26,0.18)]">
            <img src="/monsters/tarsipling.webp" alt="Tarsipling" className="w-24 h-24 object-contain mx-auto" />
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#f0b429] mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f0b429] animate-pulse shadow-[0_0_8px_rgba(240,180,41,0.8)]" />
                Live This Week
              </p>
              <h3 className="font-display text-xl font-black text-[#ede4d3] mb-2">The Tarsipling Event</h3>
              <p className="text-sm text-[#8a7c66] leading-relaxed">
                Built around this term&apos;s review material, running right now. Clear every event quest
                and Tarsipling — a curious little forest sprite who can never stop asking &ldquo;why&rdquo;
                — joins the Codex as the reward.
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="bg-[#1c1611] border border-dashed border-[#3d3225] rounded-2xl p-6 sm:p-8 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a7c66] mb-1.5">Coming Soon</p>
            <h3 className="font-display text-xl font-black text-[#ede4d3] mb-2">Term Exams as Boss Fights</h3>
            <p className="text-sm text-[#8a7c66] max-w-xl mx-auto leading-relaxed">
              Term exams are getting a glow-up: instead of a quiz list, your child faces a full
              Boss Fight built entirely from that term&apos;s material — one last stand before the report
              card.
            </p>
          </div>
        </FadeIn>
      </section>

      {/* ── REWARDS VAULT ── */}
      <section className="relative px-6 py-24 bg-[#0d0a08] border-y border-[#241d16] overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-40 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(240,180,41,0.12), transparent 40%)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(#f0b429 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 160px rgba(0,0,0,0.5)' }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <FadeIn>
            <SectionKicker>Rewards Vault</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black mb-4">
              Effort Turned Into Treasure
            </h2>
            <p className="text-[#c9bfae] max-w-2xl mx-auto mb-14 leading-relaxed">
              Earn gold from every mastered lesson — no pay-to-win, just proof of work. Parents stock
              the vault with rewards that actually motivate: real-world treats, gaming time, and
              screen privileges, alongside in-game chests and Hall decorations.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { icon: '/icons/rewards/gold_coin.svg', label: 'Gold That Matters', desc: 'Earn gold from every mastered lesson. No pay-to-win, just proof of work.' },
                { icon: '/icons/rewards/gift.svg', label: 'Stock the Vault', desc: 'Parents set the real-world rewards that actually motivate.' },
                { icon: '/icons/rewards/package.svg', label: 'Claim & Track', desc: 'Kids redeem, parents approve and fulfill.' },
              ].map((r) => (
                <div key={r.label} className="bg-[#1c1611] border border-[#3d3225] rounded-xl p-6">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[#241d16] flex items-center justify-center p-2">
                    <img src={r.icon} alt="" className="w-full h-full object-contain" />
                  </div>
                  <h3 className="font-bold text-[#f0b429] mb-1">{r.label}</h3>
                  <p className="text-xs text-[#8a7c66] leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PARENT DASHBOARD (split) ── */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-start">
          <FadeIn>
            <SectionKicker align="left">Built For Parents</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black mb-4">
              Calm, Clear, No Surprises.
            </h2>
            <p className="text-[#c9bfae] leading-relaxed">
              We built this for families who want learning to feel like play, without losing track of
              what matters.
            </p>
          </FadeIn>
          <div className="space-y-4">
            {[
              { title: 'Daily 30-Minute Loop', desc: 'Predictable rhythm — Monday through Friday campaigns tied to the classroom schedule, with guilds, curio training, and PvP battles anytime in between. No doom-scrolling.' },
              { title: 'Real Curriculum, Zero Fluff', desc: 'Mapped to elementary subjects and DepEd curriculum. What they learn counts.' },
              { title: 'Parent Dashboard Included', desc: 'See time spent, lessons mastered, and gold earned — gentle nudges, not nagging reports.' },
              { title: 'One Login, Whole Family', desc: 'Manage every registered child from a single parent account, approve every reward claim.' },
            ].map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.05}>
                <div className="bg-[#1c1611] border border-[#3d3225] rounded-xl px-5 py-4 flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#7fae52] mt-1.5 shrink-0 shadow-[0_0_8px_rgba(127,174,82,0.8)]" />
                  <div>
                    <h3 className="font-bold text-[#ede4d3] mb-1">{f.title}</h3>
                    <p className="text-xs text-[#8a7c66] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 py-24 bg-[#0d0a08] border-y border-[#241d16]">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <SectionKicker>From Parents, For Parents</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-center mb-4">
              Questions You&apos;d Actually Ask
            </h2>
            <p className="text-[#c9bfae] text-center max-w-xl mx-auto mb-12 leading-relaxed">
              The things we&apos;d want to know before handing our own kid another screen.
            </p>
          </FadeIn>
          <FadeIn delay={0.05}>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative px-6 py-24 border-t border-[#241d16] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <img
            src="/welcome-hero.webp"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center opacity-20 blur-2xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0807]/40 via-[#0a0807]/75 to-[#0a0807]" />
        </div>
        <FadeIn>
          <div className="relative max-w-xl mx-auto text-center">
            <SectionKicker>Begin Today</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black mb-4">
              Ready to Start the Campaign?
            </h2>
            <p className="text-[#c9bfae] mb-8">
              Join families turning homework battles into legend. Free during Early Access — no
              credit card.
            </p>
            <div className="flex justify-center">
              <CTAButtons />
            </div>
            <p className="text-[11px] text-[#5c5245] tracking-wide mt-5">
              Parent-created accounts · Child-safe by design
            </p>
          </div>
        </FadeIn>
      </section>

      <footer className="px-6 py-8 text-center border-t border-[#241d16]">
        <p className="text-[11px] tracking-[0.06em] text-white/25 font-medium">
          © {new Date().getFullYear()} Ruelo Learning Hall. All Rights Reserved.
        </p>
      </footer>

      {selectedMonster && <CurioModal monster={selectedMonster} onClose={() => setSelectedMonster(null)} />}
      {selectedGuild && <GuildSnapshotModal guild={selectedGuild} onClose={() => setSelectedGuild(null)} />}
    </div>
  );
}
