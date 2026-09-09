'use client';

import FadeIn from '@/components/FadeIn';
import QuestCard from '@/components/QuestCard';
import MonsterHpPanel from '@/components/battle/MonsterHpPanel';
import { ActionTile } from '@/components/battle/BattleStage';

// "Show, don't tell" section — grounds the pitch in the real product instead
// of more founder copy. These are the actual real components (QuestCard,
// MonsterHpPanel, ActionTile) fed static mock props, not a recreation —
// same technique as app/dev/ui-gallery's "real components, no live data"
// approach. Never call this a screenshot in copy: it's real component code,
// but not a literal screen capture, and the distinction matters.
const SKILLS = [
  { title: 'Fire Strike', element: 'fire' },
  { title: 'Water Strike', element: 'water' },
  { title: 'Leaf Strike', element: 'leaf' },
  { title: 'Storm Strike', element: 'storm' },
] as const;

export default function SupportGameplayPreview() {
  return (
    <section className="px-6 py-20 max-w-6xl mx-auto">
      <FadeIn>
        <p className="text-[11px] tracking-[0.28em] font-bold text-orange-500 uppercase text-center mb-4">
          See It In Action
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-black text-center mb-4 text-slate-800">
          A Look Inside the Game
        </h2>
        <p className="text-slate-500 text-center max-w-xl mx-auto mb-14 leading-relaxed">
          These are the actual quest and battle components from the live app — the same UI your
          support keeps running, not a recreation.
        </p>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Real QuestCard component */}
        <FadeIn delay={0.05}>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Daily Quest
            </div>
            <div className="p-5">
              <QuestCard subjectName="Mathematics" completed={false} xp={200} gold={50} onEnter={() => {}} />
            </div>
          </div>
        </FadeIn>

        {/* Real ActionTile + MonsterHpPanel components */}
        <FadeIn delay={0.1}>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Curio Battle
            </div>
            <div className="p-5 bg-[#f5f0e8]">
              <div className="grid grid-cols-2 gap-2 mb-4">
                {SKILLS.map((s) => (
                  <ActionTile
                    key={s.title}
                    variant="quest"
                    element={s.element}
                    icon={null}
                    title={s.title}
                    sub="Tier 1 · 1Q"
                  />
                ))}
              </div>
              <MonsterHpPanel name="Emberwyrm" level={22} currentHp={87} maxHp={140} status={null} />
            </div>
          </div>
        </FadeIn>

        {/* Real Curio Codex art */}
        <FadeIn delay={0.15}>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Curio Codex
            </div>
            <div className="p-5 grid grid-cols-3 gap-3">
              {[
                { file: 'emberwyrm', name: 'Emberwyrm' },
                { file: 'coralune', name: 'Coralune' },
                { file: 'brambleon', name: 'Brambleon' },
                { file: 'tarsipling', name: 'Tarsipling' },
                { file: 'umbraven', name: 'Umbraven' },
                { file: 'luminos', name: 'Luminos' },
              ].map((m) => (
                <div key={m.file} className="text-center">
                  <img src={`/monsters/${m.file}.webp`} alt={m.name} className="w-full aspect-square object-contain mb-1" />
                  <p className="text-[10px] font-bold text-slate-600 truncate">{m.name}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
