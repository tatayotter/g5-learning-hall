// components/QuestCard.tsx
'use client';

import { CheckCircle2, AlertTriangle } from 'lucide-react';

const SUBJECT_STYLE: Record<string, { emoji: string; bg: string }> = {
  GMRC: { emoji: '🤝', bg: 'bg-pink-500' },
  English: { emoji: '📖', bg: 'bg-orange-500' },
  Filipino: { emoji: '📕', bg: 'bg-red-600' },
  Mathematics: { emoji: '➗', bg: 'bg-blue-600' },
  'Araling Panlipunan': { emoji: '🌏', bg: 'bg-emerald-600' },
  Science: { emoji: '🔬', bg: 'bg-cyan-600' },
};
const DEFAULT_STYLE = { emoji: '📘', bg: 'bg-neutral-600' };

interface QuestCardProps {
  subjectName: string;
  subtitle?: string;
  completed: boolean;
  xp?: number;
  gold?: number;
  onEnter: () => void;
}

export default function QuestCard({ subjectName, subtitle, completed, xp = 200, gold = 50, onEnter }: QuestCardProps) {
  const style = SUBJECT_STYLE[subjectName] ?? DEFAULT_STYLE;

  return (
    <div className="bg-[#161010] border-2 border-[#000000] rounded-2xl p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-12 h-12 rounded-xl border-2 border-[#000000] flex items-center justify-center text-2xl shrink-0 ${style.bg}`}>
          {style.emoji}
        </div>
        <div className="min-w-0 pt-1">
          <h3 className="text-lg font-bold text-white leading-tight truncate">{subjectName}</h3>
          {subtitle && (
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="mb-3">
        {completed ? (
          <span className="inline-flex items-center gap-1 bg-neutral-800 border border-neutral-700 text-gray-400 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">
            <CheckCircle2 size={12} /> Quest Completed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 bg-[#47982a] border-2 border-[#000000] text-black text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full shadow-[2px_2px_0_0_#000]">
            <AlertTriangle size={12} /> Quest Available
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4 text-xs font-bold">
        <span className="flex items-center gap-1 text-green-400">
          <img src="/icons/stats/stat_up.svg" alt="" className="w-4 h-4" /> {xp} EXP
        </span>
        <span className="flex items-center gap-1 text-yellow-400">
          <img src="/icons/rewards/gold_coin.svg" alt="" className="w-4 h-4" /> {gold} GOLD
        </span>
      </div>

      <button
        onClick={onEnter}
        disabled={completed}
        className={`w-full py-2.5 rounded-lg font-extrabold text-sm uppercase tracking-wide text-white bg-amber-600 hover:bg-amber-500 border-2 border-[#000000] shadow-[3px_3px_0_0_#000] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:bg-neutral-700 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 transition-all ${completed ? '' : 'btn-haptic'}`}
      >
        {completed ? 'Completed' : 'Enter Module'}
      </button>
    </div>
  );
}
