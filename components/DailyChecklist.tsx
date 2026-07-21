// components/DailyChecklist.tsx
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  fetchChecklistBattleFlags,
  hasClaimedChecklistBonus,
  isQuestDayDone,
  claimChecklistBonus,
  GUILDS,
  ChecklistBattleFlags,
} from '@/lib/dailyChecklist';
import { logAction } from '@/lib/playerlog';
import { playCoins } from '@/lib/sounds';
import GameButton from '@/components/GameButton';

interface DailyChecklistProps {
  userId: string;
  currentSunday: string;
  currentDayName: string;
  packageData: any;
  journalLogs: Record<string, unknown> | undefined | null;
  masteredQuizzes: string[] | undefined;
  onGoldAwarded: (amount: number) => void;
}

const BONUS_GOLD = 50;

interface ChecklistItem {
  label: string;
  done: boolean;
}

export default function DailyChecklist({
  userId,
  currentSunday,
  currentDayName,
  packageData,
  journalLogs,
  masteredQuizzes,
  onGoldAwarded,
}: DailyChecklistProps) {
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const [battleFlags, setBattleFlags] = useState<ChecklistBattleFlags>({
    last_wild_encounter_win: null,
    guild_last_played: {},
  });
  const [loading, setLoading] = useState(true);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const loadFlags = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    const [flags, claimedToday] = await Promise.all([
      fetchChecklistBattleFlags(userId),
      hasClaimedChecklistBonus(userId, todayKey),
    ]);
    setBattleFlags(flags);
    setClaimed(claimedToday);
    if (isInitial) setLoading(false);
  }, [userId, todayKey]);

  // Wild-encounter wins and guild sessions happen deep inside sibling tabs
  // (MonsterGuild, the 5 guild components) with no shared callback back to
  // this always-mounted sidebar widget, so poll for state changes instead.
  useEffect(() => {
    loadFlags(true);
    const interval = setInterval(() => loadFlags(false), 15000);
    return () => clearInterval(interval);
  }, [loadFlags]);

  const journalDone = !!journalLogs?.[todayKey];
  const questDone = isQuestDayDone(currentDayName, packageData, masteredQuizzes || []);
  const battleDone = battleFlags.last_wild_encounter_win === todayKey;
  const guildsPlayedToday = GUILDS.filter(g => battleFlags.guild_last_played?.[g.key] === todayKey);
  const guildsAllDone = guildsPlayedToday.length === GUILDS.length;

  const items: ChecklistItem[] = [
    { label: '📜 Fill out today\'s journal entry', done: journalDone },
    { label: questDone && Object.keys(packageData?.[currentDayName] || {}).length === 0
        ? `🗺️ No quest scheduled today`
        : `🗺️ Finish today's Main Quest`, done: questDone },
    { label: '🐉 Answer a training map question correctly', done: battleDone },
  ];

  const allDone = items.every(i => i.done) && guildsAllDone;
  const doneCount = items.filter(i => i.done).length + (guildsAllDone ? 1 : 0);
  const totalCount = items.length + 1;

  const handleClaim = async () => {
    if (claiming || claimed) return;
    setClaiming(true);
    const granted = await claimChecklistBonus(userId, todayKey, currentDayName, currentSunday, BONUS_GOLD);
    if (granted) {
      setClaimed(true);
      playCoins();
      onGoldAwarded(BONUS_GOLD);
      await logAction(userId, currentSunday, 'daily_checklist_bonus', 'Completed all daily to-dos', 0, BONUS_GOLD);
    }
    setClaiming(false);
  };

  if (loading) {
    return (
      <div className="bg-[#111] border border-[#333] rounded-xl p-5 mb-6 text-gray-500 animate-pulse">
        <h3 className="font-bold mb-2">✅ Loading Daily To-Dos...</h3>
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-[#333] rounded-xl p-5 mb-6 text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold">✅ Daily To-Dos</h3>
        <span className="text-xs text-gray-400">{doneCount}/{totalCount} done</span>
      </div>

      <div className="space-y-2 mb-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className={item.done ? 'text-green-500' : 'text-gray-600'}>
              {item.done ? '✅' : '⬜'}
            </span>
            <span className={item.done ? 'line-through text-gray-500' : 'text-gray-200'}>
              {item.label}
            </span>
          </div>
        ))}

        <div>
          <div className="flex items-center gap-2 text-sm">
            <span className={guildsAllDone ? 'text-green-500' : 'text-gray-600'}>
              {guildsAllDone ? '✅' : '⬜'}
            </span>
            <span className={guildsAllDone ? 'line-through text-gray-500' : 'text-gray-200'}>
              ⚔️ Play each Learning Guild ({guildsPlayedToday.length}/{GUILDS.length})
            </span>
          </div>
          <div className="flex gap-1 mt-1 ml-6">
            {GUILDS.map(g => {
              const done = battleFlags.guild_last_played?.[g.key] === todayKey;
              return (
                <span
                  key={g.key}
                  title={g.label}
                  className={`text-[10px] font-bold uppercase tracking-tight ${done ? 'opacity-100' : 'opacity-25 grayscale'}`}
                >
                  {g.label.slice(0, 3)}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {claimed ? (
        <div className="text-center text-xs text-green-500 font-bold"><img src="/icons/rewards/gift.svg" alt="Gift" className="inline w-4 h-4 align-[-2px]" /> Bonus claimed for today!</div>
      ) : allDone ? (
        <GameButton
          onClick={handleClaim}
          disabled={claiming}
          className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2 rounded transition-colors disabled:opacity-50"
        >
          <img src="/icons/rewards/gift.svg" alt="Gift" className="inline w-4 h-4 align-[-2px]" /> Claim {BONUS_GOLD} Gold
        </GameButton>
      ) : (
        <p className="text-[11px] text-gray-500 text-center">Complete every task to earn {BONUS_GOLD} bonus gold!</p>
      )}
    </div>
  );
}
