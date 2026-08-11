// components/AchievementsBoard.tsx
'use client';
import { useEffect, useState } from 'react';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { WeeklyData } from '@/hooks/useWeeklyData';
import { fetchPlayerProgress, PlayerProgress, mergeProgressForAchievements } from '@/lib/lifetimeStats';

interface AchievementsBoardProps {
  // Use '?' to make data optional in the interface,
  // or accept WeeklyData | undefined
  data?: WeeklyData;
  userId?: string;
}

const PAGE_SIZE = 12;

export default function AchievementsBoard({ data, userId }: AchievementsBoardProps) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [progress, setProgress] = useState<PlayerProgress | null>(null);

  // Criteria checked against lifetime totals (player_progress), not the current week's
  // weekly-reset counters — thresholds unchanged, only the data source moved (Phase 4 Wave 2,
  // see docs/weekly-progress-redesign-plan.md). Mirrors the same fetch in HeroProfile.tsx.
  useEffect(() => {
    if (!userId) return;
    setProgress(null);
    fetchPlayerProgress(userId).then(setProgress);
  }, [userId]);

  if (!data) return null;

  const achievementData = mergeProgressForAchievements(data, progress);

  // A gold-threshold achievement (e.g. "Reach 300 Gold") can be met once and
  // then un-met later just by spending gold in the shop. Once the persisted
  // `achievements` record says it was earned, it must stay unlocked forever —
  // only fall back to the live criteria check for achievements not yet recorded.
  const isEarned = (a: typeof ACHIEVEMENTS[number]) => !!data.achievements?.[a.id] || a.criteria(achievementData);

  const unlocked = ACHIEVEMENTS.filter(isEarned);
  const locked = ACHIEVEMENTS.filter(a => !isEarned(a));
  const sorted = [...unlocked, ...locked];

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="mt-16 pt-10 border-t-2 border-neutral-800">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between gap-4 p-4 rounded-xl bg-[#111] border border-[#333] hover:border-neutral-600 transition-colors text-left"
      >
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Achievements</h2>
          <p className="text-xs text-gray-500 mt-1">{unlocked.length} of {ACHIEVEMENTS.length} unlocked</p>
        </div>
        <span className={`text-gray-500 text-xl transition-transform ${expanded ? 'rotate-90' : ''}`}>▸</span>
      </button>

      {expanded && (
        <div className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {pageItems.map((achievement) => {
              const isUnlocked = isEarned(achievement);
              return (
                <div
                  key={achievement.id}
                  className={`p-3 rounded-xl border ${isUnlocked ? 'bg-[#111] border-green-900' : 'bg-[#111] border-[#333] opacity-60'}`}
                >
                  <h3 className={`text-xs font-bold leading-tight mb-1 ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                    {achievement.title}
                  </h3>
                  <p className="text-[10px] text-gray-500 leading-relaxed mb-2">
                    {achievement.description}
                  </p>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className={isUnlocked ? 'text-blue-400' : 'text-gray-600'}>XP: {achievement.xpReward}</span>
                    <span className={isUnlocked ? 'text-yellow-400' : 'text-gray-600'}><img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /> {achievement.goldReward}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="px-3 py-1 text-xs font-bold rounded-lg bg-[#111] border border-[#333] text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-neutral-600"
              >
                ← Prev
              </button>
              <span className="text-[11px] text-gray-500 font-mono">Page {safePage + 1} of {pageCount}</span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                disabled={safePage === pageCount - 1}
                className="px-3 py-1 text-xs font-bold rounded-lg bg-[#111] border border-[#333] text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-neutral-600"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
