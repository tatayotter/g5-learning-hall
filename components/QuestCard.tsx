// components/QuestCard.tsx
'use client';

import GameButton from '@/components/GameButton';

const SUBJECT_STYLE: Record<string, { cardBg: string }> = {
  GMRC: { cardBg: '/subjects/gmrc-card-bg.png' },
  English: { cardBg: '/subjects/english-card-bg.png' },
  Filipino: { cardBg: '/subjects/filipino-card-bg.png' },
  Mathematics: { cardBg: '/subjects/math-card-bg.png' },
  'Araling Panlipunan': { cardBg: '/subjects/ap-card-bg.png' },
  Science: { cardBg: '/subjects/science-card-bg.png' },
  MAPEH: { cardBg: '/subjects/mapeh-card-bg.png' },
  'EPP (ICT)': { cardBg: '/subjects/epp-card-bg.png' },
  'EPP (AFA/FCS/IA)': { cardBg: '/subjects/epp-card-bg.png' },
  'Weekly Review': { cardBg: '/subjects/weekly-review-card-bg.png' },
};
// Unassigned/unknown subjects get the same real-card treatment as everyone
// else — just borrowing the Weekly Review art, rather than falling back to a
// separate plain-dark-panel look (2026-08-29: "default should look like the
// active ones now").
const DEFAULT_STYLE = { cardBg: '/subjects/weekly-review-card-bg.png' };

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

  // Image is the card — content floats over it, no overlay. Every subject
  // (assigned or falling back to DEFAULT_STYLE) has a cardBg now, so this is
  // the only card look.
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
