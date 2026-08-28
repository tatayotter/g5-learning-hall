// components/QuestCard.tsx
'use client';

import { CheckCircle2, AlertTriangle } from 'lucide-react';
import GameButton from '@/components/GameButton';

const SUBJECT_STYLE: Record<string, { emoji: string; bg: string; cardBg?: string }> = {
  GMRC: { emoji: '🤝', bg: 'bg-pink-500', cardBg: '/subjects/gmrc-card-bg.png' },
  English: { emoji: '📖', bg: 'bg-orange-500', cardBg: '/subjects/english-card-bg.png' },
  Filipino: { emoji: '📕', bg: 'bg-red-600', cardBg: '/subjects/filipino-card-bg.png' },
  Mathematics: { emoji: '➗', bg: 'bg-blue-600', cardBg: '/subjects/math-card-bg.png' },
  'Araling Panlipunan': { emoji: '🌏', bg: 'bg-emerald-600', cardBg: '/subjects/ap-card-bg.png' },
  Science: { emoji: '🔬', bg: 'bg-cyan-600', cardBg: '/subjects/science-card-bg.png' },
  MAPEH: { emoji: '🎨', bg: 'bg-purple-600', cardBg: '/subjects/mapeh-card-bg.png' },
  'EPP (ICT)': { emoji: '💻', bg: 'bg-indigo-600', cardBg: '/subjects/epp-card-bg.png' },
  'EPP (AFA/FCS/IA)': { emoji: '🛠️', bg: 'bg-indigo-600', cardBg: '/subjects/epp-card-bg.png' },
  'Weekly Review': { emoji: '📋', bg: 'bg-amber-600', cardBg: '/subjects/weekly-review-card-bg.png' },
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
  const hasBg = Boolean(style.cardBg);

  if (hasBg) {
    // Image is the card — content floats over it, no overlay
    return (
      <div className="rounded-2xl overflow-hidden grid transition-transform duration-200 ease-out hover:-translate-y-1">

        {/* Full scene image — occupies grid cell 1/1 */}
        <img
          src={style.cardBg}
          alt=""
          aria-hidden="true"
          className="w-full block [grid-area:1/1]"
          draggable={false}
        />

        {/* Radial white vignette — softens the scene without a flat overlay */}
        <div
          className="[grid-area:1/1]"
          style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.3) 50%, transparent 80%)' }}
        />

        {/* Quest Cleared stamp — bottom-right, slightly rotated, only when completed */}
        {completed && (
          <div className="[grid-area:1/1] flex items-end justify-end p-3 pointer-events-none">
            <img
              src="/subjects/quest_cleared.png"
              alt="Quest Cleared"
              className="w-20 h-20 object-contain"
              style={{ transform: 'rotate(12deg)', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}
              draggable={false}
            />
          </div>
        )}

        {/* Content overlaid via same grid cell — sits on top of image */}
        <div className="[grid-area:1/1] flex flex-col items-center justify-center p-3 gap-2 text-center">

          <h3 className="text-xl font-extrabold text-amber-900 leading-tight" style={{ textShadow: '0 0 8px rgba(255,255,255,1), 0 0 16px rgba(255,255,255,0.8), 0 1px 3px rgba(255,255,255,0.9)' }}>
            {subjectName}
          </h3>

          {!completed && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 bg-white rounded-full px-2 py-1 text-[10px] font-bold text-green-700">
                <img src="/icons/stats/stat_up.svg" alt="" className="w-3 h-3" /> {xp} EXP
              </span>
              <span className="flex items-center gap-1 bg-white rounded-full px-2 py-1 text-[10px] font-bold text-yellow-700">
                <img src="/icons/rewards/gold_coin.svg" alt="" className="w-3 h-3" /> {gold} GOLD
              </span>
            </div>
          )}

          <GameButton
            variant="quest"
            color={completed ? '#7f7f7f' : undefined}
            onClick={onEnter}
            disabled={completed}
            style={{ fontSize: '1.1rem' }}
          >
            {completed ? '✓ Completed' : 'Start Quest'}
          </GameButton>

        </div>
      </div>
    );
  }

  // Default card: plain dark panel with border
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

      <GameButton
        variant="quest"
        color={completed ? '#7f7f7f' : undefined}
        onClick={onEnter}
        disabled={completed}
        className="w-full"
        style={{ fontSize: '1.1rem' }}
      >
        {completed ? '✓ Completed' : 'Start Quest'}
      </GameButton>
    </div>
  );
}
