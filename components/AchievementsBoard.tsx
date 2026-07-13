// components/AchievementsBoard.tsx
import { ACHIEVEMENTS } from '@/lib/achievements';
import { WeeklyData } from '@/hooks/useWeeklyData';

interface AchievementsBoardProps {
  // Use '?' to make data optional in the interface, 
  // or accept WeeklyData | undefined
  data?: WeeklyData; 
}

export default function AchievementsBoard({ data }: AchievementsBoardProps) {
  // 1. ADD THIS GUARD CLAUSE
  // If data hasn't arrived from the API yet, don't try to render anything.
  if (!data) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ACHIEVEMENTS.map((achievement) => {
        // 2. Now safe to call criteria() because we know data exists
        const isUnlocked = achievement.criteria(data);
        
        return (
          <div 
            key={achievement.id} 
            className={`p-5 rounded-xl border ${isUnlocked ? 'bg-[#111] border-green-900' : 'bg-[#111] border-[#333]'}`}
          >
            <h3 className={`text-lg font-bold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
              {isUnlocked ? achievement.title : `🔒 ${achievement.title.replace('🔒 ', '')}`}
            </h3>
            
            <p className="text-sm text-gray-400 mt-1 mb-4 leading-relaxed">
              {achievement.description}
            </p>

            <div className="flex justify-between text-xs font-mono">
              <span className="text-blue-400">XP: {achievement.xpReward}</span>
              <span className="text-yellow-400">Gold: {achievement.goldReward}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}