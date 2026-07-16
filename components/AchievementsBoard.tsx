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

  const unlocked = ACHIEVEMENTS.filter(a => a.criteria(data));
  const locked = ACHIEVEMENTS.filter(a => !a.criteria(data));
  const sorted = [...unlocked, ...locked];

  return (
    <div className="mt-16 pt-10 border-t-2 border-neutral-800">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-white">🏆 Achievements</h2>
        <p className="text-xs text-gray-500 mt-1">{unlocked.length} of {ACHIEVEMENTS.length} unlocked</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sorted.map((achievement) => {
          const isUnlocked = achievement.criteria(data);
          return (
            <div
              key={achievement.id}
              className={`p-3 rounded-xl border ${isUnlocked ? 'bg-[#111] border-green-900' : 'bg-[#111] border-[#333] opacity-60'}`}
            >
              <h3 className={`text-xs font-bold leading-tight mb-1 ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                {isUnlocked ? achievement.title : `🔒 ${achievement.title.replace('🔒 ', '')}`}
              </h3>
              <p className="text-[10px] text-gray-500 leading-relaxed mb-2">
                {achievement.description}
              </p>
              <div className="flex justify-between text-[10px] font-mono">
                <span className={isUnlocked ? 'text-blue-400' : 'text-gray-600'}>XP: {achievement.xpReward}</span>
                <span className={isUnlocked ? 'text-yellow-400' : 'text-gray-600'}>🪙 {achievement.goldReward}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}