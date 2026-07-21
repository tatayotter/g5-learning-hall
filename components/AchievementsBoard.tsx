// components/AchievementsBoard.tsx
import { ACHIEVEMENTS } from '@/lib/achievements';
import { WeeklyData } from '@/hooks/useWeeklyData';

interface AchievementsBoardProps {
  // Use '?' to make data optional in the interface, 
  // or accept WeeklyData | undefined
  data?: WeeklyData; 
}

export default function AchievementsBoard({ data }: AchievementsBoardProps) {
  if (!data) return null;

  // A gold-threshold achievement (e.g. "Reach 300 Gold") can be met once and
  // then un-met later just by spending gold in the shop. Once the persisted
  // `achievements` record says it was earned, it must stay unlocked forever —
  // only fall back to the live criteria check for achievements not yet recorded.
  const isEarned = (a: typeof ACHIEVEMENTS[number]) => !!data.achievements?.[a.id] || a.criteria(data);

  const unlocked = ACHIEVEMENTS.filter(isEarned);
  const locked = ACHIEVEMENTS.filter(a => !isEarned(a));
  const sorted = [...unlocked, ...locked];

  return (
    <div className="mt-16 pt-10 border-t-2 border-neutral-800">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          <img src="/icons/achievements/trophy.svg" alt="" className="w-6 h-6 object-contain" /> Achievements
        </h2>
        <p className="text-xs text-gray-500 mt-1">{unlocked.length} of {ACHIEVEMENTS.length} unlocked</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sorted.map((achievement) => {
          const isUnlocked = isEarned(achievement);
          return (
            <div
              key={achievement.id}
              className={`p-3 rounded-xl border ${isUnlocked ? 'bg-[#111] border-green-900' : 'bg-[#111] border-[#333] opacity-60'}`}
            >
              <h3 className={`text-xs font-bold leading-tight mb-1 flex items-center gap-1 ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                <img
                  src={isUnlocked ? achievement.icon : '/icons/achievements/locked.svg'}
                  alt=""
                  className="w-4 h-4 object-contain flex-shrink-0"
                />
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
    </div>
  );
}