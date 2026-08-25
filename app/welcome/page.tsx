'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ensureAnonymousSession, supabase } from '@/lib/supabase';
import { setActiveUser, registerDemoUser, recordLastLogin } from '@/lib/userSession';

const GUILDS = [
  {
    key: 'lorekeeper', name: 'Lorekeeper', skill: 'Reading Comprehension',
    color: 'text-emerald-600', border: 'border-emerald-200', badgeBg: 'bg-emerald-50', cardBg: 'bg-emerald-50',
    headerBg: 'bg-emerald-50',
    lore: 'Keeper of the Old Stories — rewards vivid words and brave paragraphs, in English and Filipino.',
    question: 'What is the main idea of the passage?',
    options: [{ label: 'They walked to school', correct: false }, { label: 'Kindness is repaid over time', correct: true }, { label: 'It rained heavily', correct: false }, { label: 'The dog was lost', correct: false }],
  },
  {
    key: 'spellcaster', name: 'SpellCaster', skill: 'Typing Speed',
    color: 'text-violet-600', border: 'border-violet-200', badgeBg: 'bg-violet-50', cardBg: 'bg-violet-50',
    headerBg: 'bg-violet-50',
    lore: 'Word-Weaver of the Arcane Keys — speed and accuracy forge new spells under the clock.',
    question: 'Type this word before time runs out:',
    typingWord: 'necessary',
  },
  {
    key: 'numberrealm', name: 'Number Realm', skill: 'Mental Math',
    color: 'text-amber-600', border: 'border-amber-200', badgeBg: 'bg-amber-50', cardBg: 'bg-amber-50',
    headerBg: 'bg-amber-50',
    lore: 'Warden of the Shifting Equations — logic is the key that never breaks.',
    question: '3/4 + 1/8 = ?',
    options: [{ label: '7/8', correct: true }, { label: '4/12', correct: false }, { label: '1', correct: false }, { label: '5/8', correct: false }],
  },
  {
    key: 'logiclabyrinth', name: 'Logic Labyrinth', skill: 'Critical Thinking & Reasoning',
    color: 'text-cyan-600', border: 'border-cyan-200', badgeBg: 'bg-cyan-50', cardBg: 'bg-cyan-50',
    headerBg: 'bg-cyan-50',
    lore: 'Wayfinder through impossible mazes — every puzzle is a door waiting to open.',
    question: 'Which shape completes the pattern: ● ■ ● ■ ?',
    options: [{ label: '●', correct: false }, { label: '■', correct: true }, { label: '▲', correct: false }, { label: '★', correct: false }],
  },
  {
    key: 'lexiconarena', name: 'Lexicon Arena', skill: 'Spelling Recognition & Vocabulary',
    color: 'text-indigo-600', border: 'border-indigo-200', badgeBg: 'bg-indigo-50', cardBg: 'bg-indigo-50',
    headerBg: 'bg-indigo-50',
    lore: 'Champion of the Unbroken Word — precision wins duels in the Arena.',
    question: "Which spelling means 'a formal expression of praise'?",
    options: [{ label: 'Complement', correct: false }, { label: 'Compliment', correct: true }, { label: 'Complyment', correct: false }, { label: 'Compliement', correct: false }],
  },
] as const;

const MONSTERS = [
  { file: 'emberwyrm', name: 'Emberwyrm', element: 'fire', archetype: 'tank', legendary: true, hp: 140, atk: 26, def: 20, spd: 16, description: "A legendary wyrm wreathed in slow, eternal flame. Sleeps coiled around dormant volcanoes. Its flame moves so slowly you can watch it crawl across its scales over days." },
  { file: 'thundrake', name: 'Thundrake', element: 'storm', archetype: 'tank', legendary: false, hp: 120, atk: 15, def: 20, spd: 8, description: "A serpentine dragon that lives inside storm clouds. It doesn't create thunder — it lives where thunder already is. Often mistaken for distant thunder." },
  { file: 'coralune', name: 'Coralune', element: 'water', archetype: 'balanced', legendary: false, hp: 100, atk: 18, def: 15, spd: 12, description: "A shy reef seahorse that grows a small living coral crown. Coralune hums to keep the polyps calm. If water turns sour, it leaves." },
  { file: 'brambleon', name: 'Brambleon', element: 'leaf', archetype: 'tank', legendary: false, hp: 120, atk: 15, def: 20, spd: 8, description: "A lowland lion with a mane of thick leaves and vines. The leaves change color with the season, but never fall out completely." },
  { file: 'umbraven', name: 'Umbraven', element: 'shadow', archetype: 'balanced', legendary: false, hp: 100, atk: 18, def: 15, spd: 12, description: "A forest raven whose feathers have a soft ink-like edge that blurs in dim light. It is hard to photograph because cameras can't focus on it." },
  { file: 'luminos', name: 'Luminos', element: 'light', archetype: 'balanced', legendary: false, hp: 100, atk: 18, def: 15, spd: 12, description: "A small glowing fox with a radiant tail. Its tail works like a lantern that dims and brightens with its breathing. Leaves faint light pawprints that fade by morning." },
] as const;

const STAT_MAX = { hp: 150, atk: 30, def: 30, spd: 30 };

const APK_URL = 'https://github.com/tatayotter/g5-learning-hall/releases/latest/download/LearningHall.apk';

const FAQS = [
  {
    q: "Is this actually free?",
    a: "Yes — the core game is free, forever, for one child: full gameplay, all five Learning Guilds, curio battles, and the progress dashboard. A ₱249/year Premium plan is available if you want to add more children under one account, view your child's journal entries, and earn gold coins to stock the Rewards Vault — but nothing about the actual learning is ever paywalled.",
  },
  {
    q: "Is my child's information safe?",
    a: "Only a parent can create the family account, and every child profile lives under it. There's no public chat, no ads, and no stranger contact — the only people your child battles or competes with are siblings and classmates you've already added.",
  },
  {
    q: "Will this replace my child's teacher or homework?",
    a: "No. Learning Hall runs alongside the classroom, not instead of it — Daily Quests are built from the same lesson schedule and DepEd curriculum your child's teacher is already following, so it reinforces what's being taught rather than replacing it.",
  },
  {
    q: "Which grades does it support?",
    a: "Learning Hall currently supports Grade 2 through Grade 6, following the Philippine DepEd curriculum. Content is released on a rolling basis aligned to each grade's actual school schedule — so whatever your child plays this week matches what their teacher is covering this week.",
  },
  {
    q: "Do we need to buy a tablet or download anything?",
    a: "No purchase needed. Learning Hall runs in any browser, and there's also a free Android app if you'd rather have an icon on the home screen.",
  },
  {
    q: "What if my kid just wants to battle curios and skip the actual learning?",
    a: "They can't, by design. Every quest cleared, skill unlocked, curio caught, and battle won is gated behind mastering the matching classroom lesson first — there's no way to grind the game part without doing the learning part.",
  },
  {
    q: "Can I control the rewards, or will my kid expect things I haven't agreed to?",
    a: "Yes. You stock the Rewards Vault yourself with whatever you're comfortable offering, and gold is only ever earned from mastered lessons — never bought. Reward-claim approvals are on the roadmap; for now you set the vault contents and stay in the loop through the parent dashboard.",
  },
  {
    q: "What if I have more than one child?",
    a: "Every family starts with one free child account. Add siblings under the same parent login with the ₱249/year Premium plan — it covers a couple of kids to start, with extra child slots available if you need more, and everyone shows up on one dashboard.",
  },
  {
    q: "What does the parent dashboard actually show me?",
    a: "Each child's learning streak, recent activity, and — on Premium — their in-game journal entries, so you can see how they're doing without having to ask.",
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
      {/* Sky gradient base */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-[#f0f8ff]" />
      {!failed && (
        <Image
          src="/welcome-hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          onError={() => setFailed(true)}
          className="object-cover object-center opacity-25 mix-blend-multiply"
        />
      )}
      {/* Light fade to page bg at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-50/30 to-[#f0f8ff]" />
      {/* Subtle vignette — light version */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(240,248,255,0.6)_100%)]" />
    </div>
  );
}

function SectionKicker({ children, align = 'center', color = 'sky' }: { children: React.ReactNode; align?: 'center' | 'left'; color?: string }) {
  const colorMap: Record<string, string> = {
    sky: 'text-sky-500',
    amber: 'text-amber-500',
    violet: 'text-violet-500',
    emerald: 'text-emerald-500',
    orange: 'text-orange-500',
    indigo: 'text-indigo-500',
  };
  const textColor = colorMap[color] ?? 'text-sky-500';
  return (
    <div className={`flex items-center gap-3 mb-4 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
      <div className={`h-px w-8 bg-gradient-to-r from-transparent to-current opacity-30 ${textColor}`} />
      <span className={`text-[11px] tracking-[0.28em] font-bold ${textColor} uppercase`}>{children}</span>
      {align === 'center' && <div className={`h-px w-8 bg-gradient-to-l from-transparent to-current opacity-30 ${textColor}`} />}
    </div>
  );
}

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
        <span>{label}</span>
        <span className="text-slate-700 font-bold">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 flex items-center justify-center transition-colors"
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
          <h3 className="font-display text-2xl font-black text-slate-800 mb-1.5">
            {monster.legendary && <span className="text-amber-400 mr-1.5">★</span>}
            {monster.name}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-slate-100 text-slate-600">
              <img src={`/elements/elem_${monster.element}_100.webp`} alt="" className="w-3 h-3" />
              {monster.element}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{monster.archetype.replace('_', ' ')}</span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed mb-5">{monster.description}</p>
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
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Game Snapshot</p>
      <h3 className={`font-display text-2xl font-black mb-4 ${guild.color}`}>{guild.name}</h3>

      <div className={`${guild.cardBg} border-2 ${guild.border} rounded-xl p-6`}>
        {/* HUD row */}
        <div className="flex items-center justify-between mb-4 text-xs font-bold">
          <span className="text-amber-500">12s</span>
          <span className={`inline-flex items-center gap-1 ${guild.color}`}>
            <img src="/icons/stats/burn.svg" alt="" className="w-3.5 h-3.5" />
            x3 streak
          </span>
          <span className="text-slate-700">Score: 180</span>
        </div>

        {/* Guardian */}
        <div className="flex justify-center mb-4">
          <img src={`/sidequests/${guild.key}.webp`} alt="" className="w-20 h-20 object-contain" />
        </div>

        {/* Question card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <p className="text-center text-[10px] tracking-widest text-slate-400 mb-2">★★☆</p>
          <p className="text-center font-bold text-slate-800 mb-4">{guild.question}</p>

          {'typingWord' in guild ? (
            <div className="text-center">
              <span className="inline-block bg-slate-100 border border-slate-200 rounded-lg px-6 py-3 font-mono text-lg tracking-wide text-amber-600">
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
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-4 leading-relaxed">{guild.lore}</p>
    </ModalOverlay>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <span className="font-bold text-slate-800 text-sm">{q}</span>
        <span className={`shrink-0 text-orange-400 font-bold text-lg transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

function CTAButtons({ align = 'center' }: { align?: 'center' | 'left' }) {
  const router = useRouter();
  const [demoState, setDemoState] = useState<'idle' | 'loading' | 'error'>('idle');

  const handleTryDemo = async () => {
    setDemoState('loading');
    try {
      const authUid = await ensureAnonymousSession();
      if (!authUid) throw new Error('no anonymous session');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('no session token');

      const res = await fetch('/api/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: session.access_token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'demo login failed');

      registerDemoUser(data.userId);
      setActiveUser(data.userId);
      await recordLastLogin(data.userId);
      router.push('/');
    } catch {
      setDemoState('error');
    }
  };

  return (
    <div className={`flex flex-col items-center mt-8 ${align === 'left' ? 'sm:items-start' : ''}`}>
      <div className={`flex flex-col sm:flex-row items-center gap-3 ${align === 'left' ? 'sm:justify-start' : 'justify-center'}`}>
        <motion.a
          href="/register"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full sm:w-auto text-center bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3.5 rounded-[14px] transition-colors shadow-[0_4px_20px_rgba(249,115,22,0.35)]"
        >
          Register Your Family
        </motion.a>
        <motion.button
          type="button"
          onClick={handleTryDemo}
          disabled={demoState === 'loading'}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full sm:w-auto text-center bg-white hover:bg-slate-50 border-2 border-dashed border-slate-300 hover:border-orange-400 text-slate-700 font-bold px-8 py-3.5 rounded-[14px] transition-colors disabled:opacity-60 shadow-sm"
        >
          {demoState === 'loading' ? 'Loading demo…' : 'Try the Demo'}
        </motion.button>
      </div>
      <p className={`text-xs text-slate-400 mt-2 ${align === 'left' ? 'sm:text-left' : ''}`}>
        No sign-up needed
      </p>
      {demoState === 'error' && (
        <p className="text-xs text-red-400 mt-1">
          Couldn&apos;t start the demo right now — please try again in a bit.
        </p>
      )}
    </div>
  );
}

export default function WelcomePage() {
  const [selectedMonster, setSelectedMonster] = useState<(typeof MONSTERS)[number] | null>(null);
  const [selectedGuild, setSelectedGuild] = useState<(typeof GUILDS)[number] | null>(null);

  return (
    <div className="min-h-screen bg-[#f0f8ff] text-slate-800 font-[Inter,system-ui,sans-serif] overflow-x-hidden selection:bg-amber-200 selection:text-amber-800">

      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] flex items-center justify-center px-6 py-20">
        <HeroBackdrop />
        <div className="relative z-10 max-w-3xl text-center">
          <Image
            src="/learning_hall_full_logo.webp"
            alt="Learning Hall"
            width={495}
            height={367}
            priority
            className="h-20 sm:h-28 w-auto mx-auto mb-6 object-contain drop-shadow-[0_6px_28px_rgba(0,0,0,0.18)]"
          />
          <h1 className="font-display text-4xl sm:text-6xl font-black leading-[1.05] tracking-[-0.02em] mb-6 text-slate-800">
            Turn Homework Into <span className="text-orange-500">An Epic Quest</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto mb-3 leading-relaxed">
            Where every worksheet is a battle, every lesson is a discovery.
          </p>
          <p className="text-sm text-slate-400 mb-8">
            For elementary-age learners who deserve more than boring drills.
          </p>

          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-sky-200 shadow-sm px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-[12px] font-semibold tracking-wide text-slate-600">Free · Early Access</span>
          </div>

          <div className="flex justify-center">
            <CTAButtons />
          </div>
        </div>
      </section>

      {/* ── ORIGIN STORY ── */}
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <FadeIn>
          <SectionKicker color="sky">Why Learning Hall Exists</SectionKicker>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-center mb-10 text-slate-800">
            Built by a Dad Who Didn&apos;t Want to Steal His Kids&apos; Free Time
          </h2>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="space-y-5 text-slate-600 leading-relaxed">
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
              style={{ background: 'radial-gradient(ellipse at 40% 50%, rgba(249,115,22,0.07), transparent 60%)' }}
            />
            <div className="relative bg-white border-l-4 border-orange-400 rounded-xl px-6 py-5 shadow-md overflow-hidden">
              <p className="relative text-slate-700 leading-relaxed italic">
                &ldquo;The lessons we went over in class today felt easy,&rdquo; she told me, &ldquo;because
                I already sort of learned it — from playing Learning Hall.&rdquo;
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="space-y-5 text-slate-600 leading-relaxed">
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
          <div className="flex flex-col items-end mt-8">
            <img
              src="/tatay sprite.webp"
              alt="Tatay"
              className="h-[250px] w-auto object-contain mb-2"
            />
            <p className="text-right text-sm text-slate-400 italic">
              — Tatay, creator of Learning Hall
            </p>
          </div>
        </FadeIn>
      </section>

      {/* ── SCREENTIME, RECLAIMED ── */}
      <section className="px-6 py-24 bg-sky-50 border-y border-sky-100">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <SectionKicker color="sky">Screentime Solved</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black mb-4 text-slate-800">
              Same Screen. Same Drive to Keep Playing. Different Payoff.
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
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
        <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          <FadeIn>
            <SectionKicker align="left" color="orange">The Core Hook</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black mb-4 text-slate-800">
              Every Quest Is a Real Lesson
            </h2>
            <p className="text-slate-600 mb-3 leading-relaxed">
              No fluff. No filler. Your child&apos;s daily subjects become campaign missions — built
              directly from the actual classroom schedule and DepEd curriculum. Complete Filipino to
              unlock the Lorekeeper&apos;s vault. Conquer Math to tame the Number Realm.
            </p>
            <p className="text-slate-400 mb-8 text-sm italic">
              A structured daily loop that turns &ldquo;I don&apos;t want to&rdquo; into &ldquo;What&apos;s next?&rdquo;
            </p>
            <div className="bg-white border-l-4 border-orange-400 rounded-xl px-6 py-5 shadow-md">
              <p className="text-slate-700 leading-relaxed">
                <strong className="text-amber-500">Nothing advances for free.</strong> Every quest
                cleared, every skill unlocked, every curio caught, and every battle won requires
                mastering the matching classroom lesson first. It feels like play — the mechanic
                underneath is 100% lesson mastery.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
              <div className="p-4 font-bold bg-amber-50 text-amber-600 border-b border-amber-100">
                🗺️ Active Campaign Map
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
                      row.status === 'today' ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-slate-400">{row.day}</p>
                      <p className="font-bold text-slate-800">{row.subject}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                        row.status === 'done'
                          ? 'bg-emerald-100 text-emerald-600'
                          : row.status === 'today'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {row.status === 'done' && <img src="/icons/stats/victory.svg" alt="" className="w-3.5 h-3.5" />}
                      {row.status === 'locked' && <img src="/icons/encounter/cage.svg" alt="" className="w-3.5 h-3.5 opacity-50" />}
                      {row.status === 'done' ? 'Mastered' : row.status === 'today' ? 'Today' : 'Upcoming'}
                    </span>
                  </div>
                ))}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                    <span>Progress</span>
                    <span className="text-amber-500 font-bold">2/3</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-orange-400 to-amber-400" />
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── LEARNING GUILDS ── */}
      <section className="relative px-6 py-24 bg-sky-50 border-y border-sky-100 overflow-hidden">
        <div className="relative max-w-6xl mx-auto">
          <FadeIn>
            <SectionKicker color="violet">Learning Guilds</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-center mb-4 text-slate-800">
              Five Guardians. Five Core Skills.
            </h2>
            <p className="text-slate-600 text-center max-w-2xl mx-auto mb-3 leading-relaxed">
              These aren&apos;t subject drills — they&apos;re focused skill-builders: typing speed, reading
              comprehension, critical thinking, mental math, and spelling &amp; vocabulary recall. Each
              is protected by a Guardian who tests, teaches, and celebrates every win.
            </p>
            <p className="text-slate-400 text-center max-w-2xl mx-auto mb-14 text-sm">
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
                  className={`text-left w-full bg-white border-2 ${g.border} rounded-2xl overflow-hidden h-full hover:shadow-lg transition-shadow cursor-pointer`}
                >
                  <div className={`h-36 ${g.headerBg} flex items-center justify-center p-4`}>
                    <img
                      src={`/sidequests/${g.key}.webp`}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="p-5">
                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${g.badgeBg} ${g.color} mb-2 border ${g.border}`}>
                      {g.skill}
                    </span>
                    <h3 className={`text-lg font-bold font-display ${g.color} mb-1`}>{g.name}</h3>
                    <p className="text-xs text-slate-500 leading-snug">{g.lore}</p>
                    <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-wider">Tap for a game snapshot →</p>
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
            <SectionKicker align="left" color="amber">Curio Arena</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-slate-800">
              Battle Curios. Collect Knowledge.
            </h2>
          </FadeIn>
          <FadeIn delay={0.05}>
            <p className="text-slate-600 leading-relaxed lg:pt-2 mb-5">
              Every correct answer weakens the wild Curios. Defeat them to capture their essence and
              fill your Codex — but catching, training, and battling a curio is only ever unlocked by
              mastering lessons, never by grinding.
            </p>
            <div className="bg-white border-l-4 border-amber-400 rounded-xl px-6 py-5 shadow-md">
              <p className="text-slate-700 leading-relaxed">
                <strong className="text-amber-500">What&apos;s a Curio?</strong>{' '}
                A collectible creature born from your child&apos;s own lesson mastery — the harder
                they study, the stronger it gets. Collect them all, train them, and battle friends
                with the ones you&apos;ve earned.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mt-4 flex items-start gap-3">
              <span className="text-amber-400 text-lg shrink-0">✦</span>
              <p className="text-sm text-slate-600 leading-relaxed">
                <strong className="text-amber-600">Curio Quality</strong> — every curio has a hidden quality tier (Normal → Good → Outstanding → Perfect) that permanently lifts its power. Spend gold in the Tutor to reroll a curio&apos;s tier and push it higher. The stronger the study habit, the more gold to invest.
              </p>
            </div>
          </FadeIn>
        </div>

        <div className="relative">
          <div className="relative grid grid-cols-3 sm:grid-cols-6 gap-4">
            {MONSTERS.map((m, i) => (
              <FadeIn key={m.file} delay={i * 0.05}>
                <button
                  type="button"
                  onClick={() => setSelectedMonster(m)}
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 text-center hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <img src={`/monsters/${m.file}.webp`} alt={m.name} className="w-full aspect-square object-contain mb-2" />
                  <p className="text-xs font-bold text-slate-700">{m.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{m.element}</p>
                  <p className="text-[9px] text-slate-300 mt-1 uppercase tracking-wider">Tap for stats</p>
                </button>
              </FadeIn>
            ))}
          </div>
        </div>

        <FadeIn delay={0.15}>
          <div className="mt-14 max-w-3xl mx-auto bg-white border-2 border-slate-200 rounded-2xl p-8 text-center shadow-md">
            <p className="flex items-center justify-center gap-2 text-[11px] tracking-[0.22em] font-bold text-amber-500 uppercase mb-3">
              <img src="/icons/encounter/atk.svg" alt="" className="w-4 h-4" />
              Live PvP
            </p>
            <h3 className="font-display text-2xl sm:text-3xl font-black mb-3 text-slate-800">
              Student vs. Student, In Real Time
            </h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              Beyond training curios against the computer, kids can send live battle invites to
              siblings and classmates and fight it out head-to-head — real-time, same platform,
              bragging rights included.
            </p>

            {/* Static preview of what a real live battle screen looks like */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="text-center flex-1">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Your Curio</p>
                  <img src="/monsters/emberwyrm.webp" alt="" className="w-14 h-14 mx-auto mb-1.5 object-contain" />
                  <p className="text-xs font-bold text-slate-700">Emberwyrm Lv.22</p>
                  <div className="w-full max-w-[100px] mx-auto bg-slate-200 rounded-full h-1.5 mt-1.5">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: '62%' }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">87/140 HP</p>
                </div>

                <div className="flex-1 max-w-[150px] bg-white border border-slate-200 rounded-xl p-3 self-center shadow-sm">
                  <p className="text-[10px] text-slate-600 leading-relaxed text-center">Emberwyrm used Flamethrower!</p>
                </div>

                <div className="text-center flex-1">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Opponent</p>
                  <img src="/monsters/thundrake.webp" alt="" className="w-14 h-14 mx-auto mb-1.5 object-contain scale-x-[-1]" />
                  <p className="text-xs font-bold text-slate-700">Thundrake Lv.19</p>
                  <div className="w-full max-w-[100px] mx-auto bg-slate-200 rounded-full h-1.5 mt-1.5">
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: '41%' }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">49/120 HP</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                {['Ember', 'Flamethrower', 'Solar Flare', 'Rest'].map((skill, i) => (
                  <div
                    key={skill}
                    className={`text-xs font-bold px-3 py-2 rounded-lg border text-center ${
                      i === 1 ? 'border-orange-300 bg-orange-50 text-orange-600' : 'border-slate-200 bg-white text-slate-400'
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
          <SectionKicker color="emerald">Special Events</SectionKicker>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-center mb-4 text-slate-800">
            Ahead of Every Summative Test
          </h2>
          <p className="text-slate-600 text-center max-w-2xl mx-auto mb-14 leading-relaxed">
            Because Learning Hall tracks the same lesson schedule as the classroom, it doesn&apos;t just
            keep pace with it — it gets ahead of it. When a summative test is coming up, Learning Hall
            can launch a limited-time Event: a themed quest chain covering exactly what&apos;s being
            tested, with an exclusive curio waiting at the end for anyone who clears it.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-center bg-white border-2 border-amber-200 rounded-2xl p-6 sm:p-8 mb-6 shadow-md">
            <img src="/monsters/tarsipling.webp" alt="Tarsipling" className="w-24 h-24 object-contain mx-auto" />
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                Live This Week
              </p>
              <h3 className="font-display text-xl font-black text-slate-800 mb-2">The Tarsipling Event</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Built around this term&apos;s review material, running right now. Clear every event quest
                and Tarsipling — a curious little forest sprite who can never stop asking &ldquo;why&rdquo;
                — joins the Codex as the reward.
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-center bg-white border-2 border-violet-200 rounded-2xl p-6 sm:p-8 shadow-md">
            <img src="/monsters/thundrake.webp" alt="The Forgetting" className="w-24 h-24 object-contain mx-auto opacity-90" />
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-500 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
                Now Live
              </p>
              <h3 className="font-display text-xl font-black text-slate-800 mb-2">Term Exams as Boss Fights</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                When a term ends, the Forgetting stirs. Instead of a quiz list, your child faces
                a Boss Fight built from everything covered that term — nine persona-shaped
                adversaries, one per subject, each defeated with the lessons that were already
                taught. Clear them all and a term-exclusive curio joins the Codex.
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── REWARDS VAULT ── */}
      <section className="relative px-6 py-24 bg-amber-50 border-y border-amber-100 overflow-hidden">
        <div className="relative max-w-4xl mx-auto text-center">
          <FadeIn>
            <SectionKicker color="amber">Rewards Vault</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black mb-4 text-slate-800">
              Effort Turned Into Treasure ✨
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto mb-14 leading-relaxed">
              Earn gold from every mastered lesson — no pay-to-win, just proof of work. Parents stock
              the vault with rewards that actually motivate: real-world treats, gaming time, and
              screen privileges, alongside in-game chests and Hall decorations.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { icon: '/icons/rewards/gold_coin.svg', label: 'Gold That Matters', desc: 'Earn gold from every mastered lesson. No pay-to-win, just proof of work.', color: 'bg-amber-100 border-amber-200' },
                { icon: '/icons/rewards/gift.svg', label: 'Stock the Vault', desc: 'Parents set the real-world rewards that actually motivate.', color: 'bg-sky-100 border-sky-200' },
                { icon: '/icons/rewards/package.svg', label: 'Claim & Track', desc: 'Kids redeem, parents approve and fulfill.', color: 'bg-emerald-100 border-emerald-200' },
              ].map((r) => (
                <div key={r.label} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-full ${r.color} border flex items-center justify-center p-2.5`}>
                    <img src={r.icon} alt="" className="w-full h-full object-contain" />
                  </div>
                  <h3 className="font-bold text-amber-600 mb-1">{r.label}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{r.desc}</p>
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
            <SectionKicker align="left" color="indigo">Built For Parents</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black mb-4 text-slate-800">
              Calm, Clear, No Surprises.
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We built this for families who want learning to feel like play, without losing track of
              what matters.
            </p>
          </FadeIn>
          <div className="space-y-4">
            {[
              { title: 'Daily 30-Minute Loop', desc: 'Predictable rhythm — Monday through Friday campaigns tied to the classroom schedule, with guilds, curio training, and PvP battles anytime in between. No doom-scrolling.', dot: 'bg-emerald-400' },
              { title: 'Real Curriculum, Zero Fluff', desc: 'Mapped to elementary subjects and DepEd curriculum. What they learn counts.', dot: 'bg-sky-400' },
              { title: 'Progress Dashboard Included', desc: "See each child's learning streak and recent activity, right from your free parent account — a gentle check-in, not a nagging report.", dot: 'bg-violet-400' },
              { title: 'Free for Your First Child, Premium for the Rest', desc: 'One child account is free forever. Add siblings under the same login, unlock journal viewing, and earn gold to stock the Rewards Vault with a ₱249/year Premium plan.', dot: 'bg-amber-400' },
            ].map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.05}>
                <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow">
                  <span className={`w-2.5 h-2.5 rounded-full ${f.dot} mt-1.5 shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.15)]`} />
                  <div>
                    <h3 className="font-bold text-slate-800 mb-1">{f.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FULL FEATURE LIST TEASER ── */}
      <section className="px-6 py-16 bg-sky-50 border-y border-sky-100">
        <FadeIn>
          <div className="max-w-xl mx-auto text-center">
            <SectionKicker color="sky">Still Curious?</SectionKicker>
            <h2 className="font-display text-2xl sm:text-3xl font-black mb-3 text-slate-800">
              There&apos;s More Under the Hood
            </h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Guilds, curios, PvP, events, dashboards — every feature explained plainly, one page.
            </p>
            <a
              href="/welcome/features"
              className="inline-block text-sm font-semibold text-sky-500 hover:text-sky-600 transition-colors tracking-wide"
            >
              See the Full Feature List →
            </a>
          </div>
        </FadeIn>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <SectionKicker color="sky">From Parents, For Parents</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-center mb-4 text-slate-800">
              Questions You&apos;d Actually Ask
            </h2>
            <p className="text-slate-500 text-center max-w-xl mx-auto mb-12 leading-relaxed">
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
      <section className="relative px-6 py-24 bg-gradient-to-b from-sky-100 to-[#f0f8ff] border-t border-sky-200 overflow-hidden">
        {/* Decorative cloud-like blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-orange-200/30 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-40 rounded-full bg-amber-100/50 blur-3xl" />
        </div>
        <FadeIn>
          <div className="relative max-w-xl mx-auto text-center">
            <SectionKicker color="orange">Begin Today</SectionKicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black mb-4 text-slate-800">
              Ready to Start the Campaign? 🚀
            </h2>
            <p className="text-slate-600 mb-8">
              Join families turning homework battles into legend. Free forever for your first
              child — no credit card.
            </p>
            <div className="flex justify-center">
              <CTAButtons />
            </div>
            <p className="text-[11px] text-slate-400 tracking-wide mt-5">
              Parent-created accounts · Child-safe by design
            </p>
          </div>
        </FadeIn>
      </section>

      <footer className="px-6 py-8 text-center border-t border-slate-200 bg-white">
        <a
          href="/blog"
          className="inline-block text-[12px] font-semibold text-sky-500 hover:text-sky-600 transition-colors tracking-wide mb-3"
        >
          Free Parent Guides — Reading, Math, Typing & More →
        </a>
        <p className="text-[11px] tracking-wide mb-3">
          <a href="/parent-login" className="text-slate-400 hover:text-slate-600 underline">Parent Login</a>
          <span className="text-slate-200 mx-2">·</span>
          <a href={APK_URL} className="text-slate-400 hover:text-slate-600 underline">Download Android APK</a>
        </p>
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

      {selectedMonster && <CurioModal monster={selectedMonster} onClose={() => setSelectedMonster(null)} />}
      {selectedGuild && <GuildSnapshotModal guild={selectedGuild} onClose={() => setSelectedGuild(null)} />}
    </div>
  );
}
