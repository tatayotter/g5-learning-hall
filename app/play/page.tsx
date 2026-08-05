'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const GUILDS = [
  {
    key: 'lorekeeper', name: 'Lorekeeper', skill: 'Reading',
    color: 'text-emerald-300', border: 'border-emerald-700', glow: 'shadow-[0_0_30px_rgba(52,211,153,0.15)]',
    blurb: 'Read epic stories, crack the clues, and find the hidden meaning before time runs out.',
  },
  {
    key: 'spellcaster', name: 'SpellCaster', skill: 'Typing',
    color: 'text-violet-300', border: 'border-violet-700', glow: 'shadow-[0_0_30px_rgba(196,181,253,0.15)]',
    blurb: 'Cast words like spells — the faster and cleaner you type, the stronger the magic.',
  },
  {
    key: 'numberrealm', name: 'Number Realm', skill: 'Mental Math',
    color: 'text-amber-300', border: 'border-amber-700', glow: 'shadow-[0_0_30px_rgba(252,211,77,0.15)]',
    blurb: 'Solve equations on the clock and prove no puzzle in this realm can outsmart you.',
  },
  {
    key: 'logiclabyrinth', name: 'Logic Labyrinth', skill: 'Critical Thinking',
    color: 'text-cyan-300', border: 'border-cyan-700', glow: 'shadow-[0_0_30px_rgba(103,232,249,0.15)]',
    blurb: 'Every maze is a puzzle. Spot the pattern, find the trick, walk out a genius.',
  },
  {
    key: 'lexiconarena', name: 'Lexicon Arena', skill: 'Spelling & Vocabulary',
    color: 'text-pink-300', border: 'border-pink-700', glow: 'shadow-[0_0_30px_rgba(249,168,212,0.15)]',
    blurb: 'Duel other word champions — the sharpest speller wins the arena.',
  },
] as const;

const CURIOS = [
  { file: 'emberwyrm', name: 'Emberwyrm', element: 'fire', legendary: true, hp: 140, atk: 26, def: 20, spd: 16 },
  { file: 'thundrake', name: 'Thundrake', element: 'storm', legendary: false, hp: 120, atk: 15, def: 20, spd: 8 },
  { file: 'coralune', name: 'Coralune', element: 'water', legendary: false, hp: 100, atk: 18, def: 15, spd: 12 },
  { file: 'brambleon', name: 'Brambleon', element: 'leaf', legendary: false, hp: 120, atk: 15, def: 20, spd: 8 },
  { file: 'umbraven', name: 'Umbraven', element: 'shadow', legendary: false, hp: 100, atk: 18, def: 15, spd: 12 },
  { file: 'luminos', name: 'Luminos', element: 'light', legendary: false, hp: 100, atk: 18, def: 15, spd: 12 },
] as const;

const STAT_MAX = { hp: 150, atk: 30, def: 30, spd: 30 };

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-[#a89c86] mb-1">
        <span>{label}</span>
        <span className="text-[#ede4d3] font-bold">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-[#3d3225] rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay }}
    >
      {children}
    </motion.div>
  );
}

function CurioModal({ curio, onClose }: { curio: (typeof CURIOS)[number]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-[#1c1611] border-2 border-[#3d3225] rounded-2xl p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#241d16] hover:bg-[#2a2119] border border-[#3d3225] text-[#c9bfae] flex items-center justify-center"
          aria-label="Close"
        >
          ✕
        </button>
        <img src={`/monsters/${curio.file}.webp`} alt={curio.name} className="w-32 h-32 mx-auto object-contain mb-3" />
        <h3 className="font-display text-xl font-black text-[#ede4d3] text-center mb-1">
          {curio.legendary && <span className="text-[#f0b429] mr-1.5">★</span>}
          {curio.name}
        </h3>
        <p className="text-center text-[10px] uppercase tracking-widest text-[#8a7c66] mb-5">{curio.element} type</p>
        <div className="grid grid-cols-2 gap-4">
          <StatBar label="HP" value={curio.hp} max={STAT_MAX.hp} />
          <StatBar label="Attack" value={curio.atk} max={STAT_MAX.atk} />
          <StatBar label="Defense" value={curio.def} max={STAT_MAX.def} />
          <StatBar label="Speed" value={curio.spd} max={STAT_MAX.spd} />
        </div>
      </motion.div>
    </div>
  );
}

function PrimaryCTA() {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.a
        href="/child-signup"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="w-full sm:w-auto text-center bg-gradient-to-b from-[#f0b429] to-[#c9781a] hover:from-[#ffcc4d] hover:to-[#e2921e] text-[#241505] font-black text-lg px-10 py-4 rounded-2xl transition-colors shadow-[0_6px_28px_rgba(240,180,41,0.4)]"
      >
        🚀 Create My Account — It&apos;s Free!
      </motion.a>
      <p className="text-xs text-[#a89c86]">No parent needed to start. Takes less than a minute.</p>
      <a href="/" className="text-xs font-semibold text-[#d4b46a] hover:text-[#f0b429] underline underline-offset-2">
        I already have an account →
      </a>
    </div>
  );
}

export default function PlayPage() {
  const [selectedCurio, setSelectedCurio] = useState<(typeof CURIOS)[number] | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0807] text-[#ede4d3] font-[Inter,system-ui,sans-serif] overflow-x-hidden selection:bg-[#f0b429]/30 selection:text-[#f0b429]">
      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] flex items-center justify-center px-6 py-16 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[#0a0807]" />
          <Image
            src="/welcome-hero.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0807]/20 via-[#0a0807]/55 to-[#0a0807]" />
          {/* playful glow accents */}
          <div className="absolute top-[10%] left-[8%] w-40 h-40 rounded-full bg-[#f0b429]/20 blur-[60px]" />
          <div className="absolute bottom-[15%] right-[10%] w-52 h-52 rounded-full bg-emerald-400/10 blur-[70px]" />
        </div>

        <div className="relative z-10 max-w-3xl text-center">
          <Image
            src="/learning_hall_full_logo.webp"
            alt="Learning Hall"
            width={495}
            height={367}
            priority
            className="h-20 sm:h-28 w-auto mx-auto mb-6 object-contain drop-shadow-[0_6px_28px_rgba(0,0,0,0.55)]"
          />
          <div className="inline-flex items-center gap-2 rounded-full bg-[#1c1611] border border-[#3d3225] px-4 py-1.5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7fae52] shadow-[0_0_8px_rgba(127,174,82,0.8)]" />
            <span className="text-[12px] font-semibold tracking-wide text-[#c9bfae]">For Grade 2 – 6 Players · Totally Free</span>
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-black leading-[1.05] tracking-[-0.02em] mb-6">
            Pick Your Guild.<br /><span className="text-[#f0b429]">Catch Curios. Win Battles.</span>
          </h1>
          <p className="text-base sm:text-lg text-[#c9bfae] max-w-xl mx-auto mb-10 leading-relaxed">
            Learning Hall is a game made for YOU — where finishing lessons earns you gold, gear, and
            monsters to battle your friends with.
          </p>
          <PrimaryCTA />
        </div>
      </section>

      {/* ── GUILDS ── */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <FadeIn>
          <p className="text-center text-[11px] tracking-[0.28em] font-bold text-[#f0b429]/90 uppercase mb-3">Choose Your Path</p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-center mb-4">
            Five Guilds. Which One Is You?
          </h2>
          <p className="text-[#c9bfae] text-center max-w-xl mx-auto mb-12 leading-relaxed">
            Every guild trains a different skill. Play them all, or master your favorite.
          </p>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {GUILDS.map((g, i) => (
            <FadeIn key={g.key} delay={i * 0.06}>
              <div className={`h-full bg-[#1c1611] border-2 ${g.border} ${g.glow} rounded-2xl p-5 flex flex-col items-center text-center hover:-translate-y-1 transition-transform`}>
                <img src={`/sidequests/${g.key}.webp`} alt="" className="w-20 h-20 object-contain mb-3" />
                <h3 className={`font-display font-black text-lg mb-1 ${g.color}`}>{g.name}</h3>
                <p className="text-[10px] uppercase tracking-widest text-[#8a7c66] mb-3">{g.skill}</p>
                <p className="text-xs text-[#a89c86] leading-relaxed">{g.blurb}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── CURIOS ── */}
      <section className="px-6 py-20 bg-[#0d0a08] border-y border-[#241d16]">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <p className="text-center text-[11px] tracking-[0.28em] font-bold text-[#f0b429]/90 uppercase mb-3">Tap A Curio</p>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-center mb-4">
              Hatch, Train & Battle Curios
            </h2>
            <p className="text-[#c9bfae] text-center max-w-xl mx-auto mb-12 leading-relaxed">
              Win eggs from your lessons, hatch them into curios, and send them into battle.
            </p>
          </FadeIn>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CURIOS.map((c, i) => (
              <FadeIn key={c.file} delay={i * 0.05}>
                <button
                  type="button"
                  onClick={() => setSelectedCurio(c)}
                  className="w-full bg-[#1c1611] border border-[#3d3225] hover:border-[#c9781a] rounded-2xl p-4 flex flex-col items-center text-center transition-colors cursor-pointer"
                >
                  <img src={`/monsters/${c.file}.webp`} alt={c.name} className="w-16 h-16 object-contain mb-2" />
                  <span className="text-xs font-bold text-[#ede4d3]">
                    {c.legendary && <span className="text-[#f0b429]">★ </span>}
                    {c.name}
                  </span>
                </button>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <FadeIn>
          <p className="text-center text-[11px] tracking-[0.28em] font-bold text-[#f0b429]/90 uppercase mb-3">Super Simple</p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-center mb-14">
            How You Play
          </h2>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { num: '1', title: 'Clear Your Quest', desc: 'Finish a short daily lesson in your guild — reading, math, typing, whatever you pick.' },
            { num: '2', title: 'Earn Gold & Eggs', desc: 'Every quest you clear pays out gold coins and curio eggs. The better you do, the more you earn.' },
            { num: '3', title: 'Battle & Show Off', desc: 'Hatch your curios, gear them up, and battle your classmates or siblings for bragging rights.' },
          ].map((s, i) => (
            <FadeIn key={s.num} delay={i * 0.08}>
              <div className="bg-[#1c1611] border border-[#3d3225] rounded-2xl p-6 text-center h-full">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-b from-[#f0b429] to-[#c9781a] text-[#241505] font-display font-black text-xl flex items-center justify-center">
                  {s.num}
                </div>
                <h3 className="font-bold text-[#ede4d3] mb-2">{s.title}</h3>
                <p className="text-sm text-[#a89c86] leading-relaxed">{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative px-6 py-24 border-t border-[#241d16] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src="/welcome-hero.webp"
            alt=""
            fill
            quality={20}
            sizes="100vw"
            className="object-cover object-center opacity-25 blur-2xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0807]/40 via-[#0a0807]/75 to-[#0a0807]" />
        </div>
        <FadeIn>
          <div className="relative max-w-xl mx-auto text-center">
            <p className="text-center text-[11px] tracking-[0.28em] font-bold text-[#f0b429]/90 uppercase mb-3">Ready?</p>
            <h2 className="font-display text-3xl sm:text-4xl font-black mb-4">
              Your Guild Is Waiting
            </h2>
            <p className="text-[#c9bfae] mb-8">
              Free to play, no credit card, and you can start right now — in under a minute.
            </p>
            <div className="flex justify-center">
              <PrimaryCTA />
            </div>
          </div>
        </FadeIn>
      </section>

      <footer className="px-6 py-8 text-center border-t border-[#241d16]">
        <p className="text-[12px] text-[#a89c86] mb-3 max-w-sm mx-auto leading-relaxed">
          Playing on your own is great — later you can link a parent&apos;s account for a bonus and
          extra features. Want your family involved from the start?{' '}
          <a href="/welcome" className="text-[#d4b46a] hover:text-[#f0b429] underline underline-offset-2">
            Show this page to a parent →
          </a>
        </p>
        <p className="text-[11px] tracking-wide mb-3">
          <a href="/" className="text-white/40 hover:text-white/70 underline">Log In</a>
          <span className="text-white/20 mx-2">·</span>
          <a href="/welcome" className="text-white/40 hover:text-white/70 underline">For Parents</a>
        </p>
        <p className="text-[11px] tracking-[0.06em] text-white/25 font-medium">
          © {new Date().getFullYear()} Ruelo Learning Hall. All Rights Reserved.
        </p>
      </footer>

      <AnimatePresence>
        {selectedCurio && <CurioModal curio={selectedCurio} onClose={() => setSelectedCurio(null)} />}
      </AnimatePresence>
    </div>
  );
}
