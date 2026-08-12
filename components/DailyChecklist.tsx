// components/DailyChecklist.tsx
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  fetchChecklistBattleFlags,
  hasClaimedChecklistBonus,
  isQuestDayDone,
  claimChecklistBonus,
  fetchDailyChecklistStreak,
  STREAK_GOLD_LADDER,
  GUILDS,
  ChecklistBattleFlags,
  ChecklistStreakInfo,
  GuildKey,
} from '@/lib/dailyChecklist';
import { logAction } from '@/lib/playerlog';
import { trackEvent } from '@/lib/analytics';
import GameButton from '@/components/GameButton';
import GuardianSprite, { GuardianGuild } from '@/components/guilds/GuardianSprite';
import DailyBonusModal from '@/components/DailyBonusModal';

const GUILD_SPRITE_KEY: Record<string, GuardianGuild> = {
  lorekeeper: 'lorekeeper',
  spellcaster: 'spellcaster',
  number_realm: 'numberrealm',
  logic_labyrinth: 'logiclabyrinth',
  lexicon_arena: 'lexiconarena',
};

interface DailyChecklistProps {
  userId: string;
  // Needed by claim_daily_checklist_bonus to resolve this week's content —
  // see lib/dailyChecklist.ts's claimChecklistBonus.
  grade: number;
  currentSunday: string;
  currentDayName: string;
  packageData: any;
  journalLogs: Record<string, unknown> | undefined | null;
  masteredQuizzes: string[] | undefined;
  onGoldAwarded: (amount: number) => void;
  onPlayGuild: (guildKey: GuildKey) => void;
}

interface ChecklistItem {
  label: string;
  done: boolean;
}

export default function DailyChecklist({
  userId,
  grade,
  currentSunday,
  currentDayName,
  packageData,
  journalLogs,
  masteredQuizzes,
  onGoldAwarded,
  onPlayGuild,
}: DailyChecklistProps) {
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const [battleFlags, setBattleFlags] = useState<ChecklistBattleFlags>({
    last_wild_encounter_win: null,
    guild_last_played: {},
  });
  const [loading, setLoading] = useState(true);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [streakInfo, setStreakInfo] = useState<ChecklistStreakInfo | null>(null);
  const [bonusEvent, setBonusEvent] = useState<{ streak: number; gold: number } | null>(null);

  const loadFlags = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    const [flags, claimedToday, streak] = await Promise.all([
      fetchChecklistBattleFlags(userId),
      hasClaimedChecklistBonus(userId, todayKey),
      fetchDailyChecklistStreak(userId, todayKey),
    ]);
    setBattleFlags(flags);
    setClaimed(claimedToday);
    setStreakInfo(streak);
    if (isInitial) setLoading(false);
  }, [userId, todayKey]);

  // Wild-encounter wins and guild sessions happen on sibling tabs (MonsterGuild,
  // the 5 guild components) — but this component is itself gated behind
  // `activeTab === 'todo'` in app/page.tsx, so it fully unmounts when the user
  // switches away and remounts (re-running this effect) when they come back.
  // That remount-triggered fetch is already exactly-when-needed fresh data, so
  // no background polling is required — a 15s setInterval used to run here
  // regardless of whether the tab was even visible, costing 3 queries every
  // 15s per active user for no reason (see docs/weekly-progress-redesign-plan.md-
  // adjacent capacity notes). Removed 2026-08-11.
  useEffect(() => {
    loadFlags(true);
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
    const result = await claimChecklistBonus(userId, todayKey, currentDayName, grade);
    if (result.granted) {
      setClaimed(true);
      const gold = result.gold ?? STREAK_GOLD_LADDER[0];
      const streak = result.streak ?? 1;
      onGoldAwarded(gold);
      await logAction(userId, currentSunday, 'daily_checklist_bonus', 'Completed all daily to-dos', 0, gold);
      trackEvent('daily_checklist_bonus_claimed', { gold_earned: gold, streak });
      setBonusEvent({ streak, gold });
      loadFlags(false);
    }
    setClaiming(false);
  };

  if (loading) {
    return (
      <div className="bg-[#111] border border-[#333] p-8 rounded-xl shadow-2xl mb-6 text-gray-500 animate-pulse">
        <h3 className="font-bold mb-2 font-display">✅ Loading Daily To-Dos...</h3>
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-[#333] p-8 rounded-xl shadow-2xl mb-6 text-white">
      <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-blue-400 font-display">Daily To-Dos</h2>
        <span className="bg-blue-900/30 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-800">
          {doneCount}/{totalCount} DONE
        </span>
      </div>

      {streakInfo && (
        <div className="mb-6 bg-black border border-neutral-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="text-xs font-bold text-gray-300 whitespace-nowrap">
              🔥 {streakInfo.currentStreak}-day streak
            </span>
            <span className="text-[10px] text-gray-500 text-right">
              {streakInfo.claimedToday
                ? 'Come back tomorrow to keep it going!'
                : `Finish today's to-dos for ${streakInfo.nextGold} gold`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {STREAK_GOLD_LADDER.map((tierGold, i) => {
              const day = i + 1;
              const achieved = streakInfo.currentStreak >= day;
              const isNextTarget = !streakInfo.claimedToday && streakInfo.nextStreak === day;
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full h-1.5 rounded-full ${
                      achieved ? 'bg-blue-500' : isNextTarget ? 'bg-blue-900/50 border border-dashed border-blue-700' : 'bg-neutral-800'
                    }`}
                  />
                  <span className={`text-[9px] ${achieved ? 'text-blue-400 font-bold' : 'text-gray-600'}`}>{tierGold}g</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center gap-3 bg-black border rounded-lg p-4 text-sm ${item.done ? 'border-green-800' : 'border-neutral-800'}`}>
            <span className={item.done ? 'text-green-500' : 'text-gray-600'}>
              {item.done ? '✅' : '⬜'}
            </span>
            <span className={item.done ? 'line-through text-gray-500' : 'text-gray-200'}>
              {item.label}
            </span>
          </div>
        ))}

        <div className={`bg-black border rounded-lg p-4 ${guildsAllDone ? 'border-green-800' : 'border-neutral-800'}`}>
          <div className="flex items-center gap-3 text-sm">
            <span className={guildsAllDone ? 'text-green-500' : 'text-gray-600'}>
              {guildsAllDone ? '✅' : '⬜'}
            </span>
            <span className={guildsAllDone ? 'line-through text-gray-500' : 'text-gray-200'}>
              ⚔️ Play each Learning Guild ({guildsPlayedToday.length}/{GUILDS.length})
            </span>
          </div>
          <div className="flex gap-1.5 mt-2 ml-6">
            {GUILDS.map(g => {
              const done = battleFlags.guild_last_played?.[g.key] === todayKey;
              return (
                <button
                  key={g.key}
                  type="button"
                  title={done ? g.label : `Play ${g.label}`}
                  onClick={() => onPlayGuild(g.key)}
                  className={`w-7 h-7 rounded-full bg-black/30 overflow-hidden transition-opacity ${done ? 'opacity-100' : 'opacity-30 grayscale hover:opacity-60'}`}
                >
                  <GuardianSprite guild={GUILD_SPRITE_KEY[g.key]} pose="idle" animate={false} className="w-full h-full" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {claimed ? (
        <div className="border-t border-neutral-800 pt-6 text-center text-sm text-green-500 font-bold">
          <img src="/icons/rewards/gift.svg" alt="Gift" className="inline w-4 h-4 align-[-2px]" /> Bonus claimed for today
          {streakInfo?.todayGold ? ` — ${streakInfo.todayGold} gold!` : '!'}
        </div>
      ) : allDone ? (
        <div className="border-t border-neutral-800 pt-6 flex justify-center">
          <GameButton
            onClick={handleClaim}
            disabled={claiming}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-10 rounded transition-colors font-display text-lg disabled:opacity-50"
          >
            <img src="/icons/rewards/gift.svg" alt="Gift" className="inline w-4 h-4 align-[-2px] mr-1" /> Claim {streakInfo?.nextGold ?? STREAK_GOLD_LADDER[0]} Gold
          </GameButton>
        </div>
      ) : (
        <p className="text-[11px] text-gray-500 text-center border-t border-neutral-800 pt-6">
          Complete every task to earn {streakInfo?.nextGold ?? STREAK_GOLD_LADDER[0]} bonus gold!
        </p>
      )}

      {bonusEvent && (
        <DailyBonusModal
          streak={bonusEvent.streak}
          gold={bonusEvent.gold}
          userId={userId}
          onClose={() => setBonusEvent(null)}
        />
      )}
    </div>
  );
}
