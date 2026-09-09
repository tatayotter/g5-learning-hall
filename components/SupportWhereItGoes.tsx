'use client';

import FadeIn from '@/components/FadeIn';

const ITEMS = [
  { emoji: '🖥️', title: 'Keeping It Running', desc: 'Hosting, database, and infrastructure costs — the plumbing that keeps the app online for every family using it.' },
  { emoji: '❤️', title: 'Staying Alive', desc: 'Ongoing operational costs so Learning Hall doesn’t just launch — it stays around for the long haul.' },
  { emoji: '🚀', title: 'Getting Better', desc: 'New features, fixes, and improvements based on what actually helps kids and parents.' },
  { emoji: '🎨', title: 'Bringing It to Life', desc: 'Animating characters and curios so they actually feel alive on screen, plus the design work behind every new world and creature added to the game.' },
] as const;

export default function SupportWhereItGoes() {
  return (
    <section className="px-6 py-20 bg-sky-50 border-y border-sky-100">
      <div className="max-w-4xl mx-auto">
        <FadeIn>
          <p className="text-[11px] tracking-[0.28em] font-bold text-sky-500 uppercase text-center mb-4">
            Where It Goes
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-center mb-12 text-slate-800">
            Every Peso, Accounted For
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {ITEMS.map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.06}>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 h-full shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-2xl mb-4">
                  {item.emoji}
                </div>
                <h3 className="font-bold text-slate-800 mb-1.5">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
