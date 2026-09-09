'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

// Full-bleed hero, same art (welcome-hero.webp) and gradient-overlay technique
// as app/welcome/page.tsx's HeroBackdrop, but dark/legible rather than
// faded-behind-a-light-wash — a donation page needs the art to read as a
// backdrop for white text, not a subtle texture.
export default function SupportHero({ totalPhp, supporterCount }: { totalPhp: number; supporterCount: number }) {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center px-6 py-24 overflow-hidden bg-[#0a0e1a]">
      <div className="absolute inset-0">
        <Image
          src="/welcome-hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[30%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-[#0a0e1a]/70 to-[#0a0e1a]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0e1a]/80 via-transparent to-[#0a0e1a]/40" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-2xl text-center"
      >
        <p className="text-[11px] tracking-[0.28em] font-bold text-amber-400 uppercase mb-4">
          Support The Mission
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-black leading-[1.1] text-white mb-5 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
          Help Keep the Adventure Going
        </h1>
        <p className="text-base sm:text-lg text-slate-200 leading-relaxed mb-8 max-w-xl mx-auto">
          This game started as something built for two kids who needed to get off screens and into
          learning. If it&apos;s helped your family too, any contribution helps keep it alive and
          growing for more kids like them.
        </p>

        <div className="inline-flex items-center gap-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2.5">
          <span className="font-display text-lg font-black text-white">₱{totalPhp.toLocaleString()}</span>
          <span className="text-sm text-slate-300">
            raised from {supporterCount} {supporterCount === 1 ? 'supporter' : 'supporters'}
          </span>
        </div>
      </motion.div>
    </section>
  );
}
