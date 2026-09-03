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

// Buttons here previously ran a homemade comic-outline look (yellow-400 +
// hard black shadow) instead of the app's shared GameButton quest system —
// replaced below with GameButton so this page matches Trainers/ceremony
// modals/everywhere else per docs/STYLE_GUIDE.md's Buttons table: item
// actions and guild "Play" are blue (primary CTA, "go do something"), the
// gold-claim footer button is amber (matches the coin-reward theme used on
// DailyBonusModal/MonsterShop's own claim/purchase buttons).
const ACTION_BUTTON_COLOR = '#2563eb';
const CLAIM_BUTTON_COLOR = '#d97706';

const GUILD_SPRITE_KEY: Record<string, GuardianGuild> = {
  lorekeeper: 'lorekeeper',
  spellcaster: 'spellcaster',
  number_realm: 'numberrealm',
  logic_labyrinth: 'logiclabyrinth',
  lexicon_arena: 'lexiconarena',
};

interface DailyChecklistProps {
  userId: string;
  grade: number;
  currentSunday: string;
  currentDayName: string;
  packageData: any;
  journalLogs: Record<string, unknown> | undefined | null;
  masteredQuizzes: string[] | undefined;
  onGoldAwarded: (amount: number) => void;
  onPlayGuild: (guildKey: GuildKey) => void;
  onGoToJournal?: () => void;
  onGoToMainQuest?: () => void;
  onGoToTrainingMap?: () => void;
  onCountChange?: (done: number, total: number) => void;
}

interface ChecklistItem {
  label: string;
  done: boolean;
  actionLabel?: string;
  onAction?: () => void;
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
  onGoToJournal,
  onGoToMainQuest,
  onGoToTrainingMap,
  onCountChange,
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

  useEffect(() => {
    loadFlags(true);
  }, [loadFlags]);

  const journalDone = !!journalLogs?.[todayKey];
  const questDone = isQuestDayDone(currentDayName, packageData, masteredQuizzes || []);
  const battleDone = battleFlags.last_wild_encounter_win === todayKey;
  const guildsPlayedToday = GUILDS.filter(g => battleFlags.guild_last_played?.[g.key] === todayKey);
  const guildsAllDone = guildsPlayedToday.length === GUILDS.length;

  const items: ChecklistItem[] = [
    {
      label: "Fill out today's journal entry",
      done: journalDone,
      actionLabel: 'Write Journal',
      onAction: onGoToJournal,
    },
    {
      label: Object.keys(packageData?.[currentDayName] || {}).length === 0
        ? 'No quest scheduled today'
        : "Finish today's Main Quest",
      done: questDone,
      actionLabel: 'Go to Main Quest',
      onAction: onGoToMainQuest,
    },
    {
      label: 'Answer a training map question correctly',
      done: battleDone,
      actionLabel: 'Go to Map',
      onAction: onGoToTrainingMap,
    },
  ];

  const allDone = items.every(i => i.done) && guildsAllDone;
  const doneCount = items.filter(i => i.done).length + (guildsAllDone ? 1 : 0);
  const totalCount = items.length + 1;

  useEffect(() => {
    onCountChange?.(doneCount, totalCount);
  }, [doneCount, totalCount, onCountChange]);

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
      <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm mb-6 text-gray-400 animate-pulse">
        <p className="font-bold font-display">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mb-8">

      {/* ── Checklist items ── */}
      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 py-4 px-4 rounded-2xl border transition-all
              ${item.done
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-100 shadow-sm'
              }`}
          >
            <span className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
              ${item.done ? 'bg-green-500 border-green-600' : 'bg-white border-stone-300'}`}>
              {item.done && <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
            </span>
            <span className={`flex-1 text-sm font-bold leading-snug ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {item.label}
            </span>
            {!item.done && item.onAction && item.actionLabel && (
              <GameButton
                variant="quest"
                color={ACTION_BUTTON_COLOR}
                onClick={item.onAction}
                className="flex-shrink-0"
                style={{ fontSize: 13 }}
              >
                {item.actionLabel}
              </GameButton>
            )}
          </div>
        ))}

        {/* ── Guilds ── */}
        <div className={`py-4 px-4 rounded-2xl border transition-all
          ${guildsAllDone ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-100 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <span className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
              ${guildsAllDone ? 'bg-green-500 border-green-600' : 'bg-white border-stone-300'}`}>
              {guildsAllDone && <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
            </span>
            <span className={`flex-1 text-base font-bold leading-snug ${guildsAllDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              Play each Learning Guild
              <span className="ml-2 text-sm font-extrabold text-amber-600">({guildsPlayedToday.length}/{GUILDS.length})</span>
            </span>
          </div>
          {!guildsAllDone && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {GUILDS.map(g => {
                const done = battleFlags.guild_last_played?.[g.key] === todayKey;
                if (done) return null;
                return (
                  <div key={g.key} className="flex flex-col items-center gap-2 bg-white border border-stone-200 rounded-2xl px-3 pt-4 pb-3 shadow-sm">
                    <GuardianSprite guild={GUILD_SPRITE_KEY[g.key]} pose="idle" animate={false} className="w-14 h-14" />
                    <span className="text-xs font-bold text-gray-600 text-center leading-tight">{g.label}</span>
                    <GameButton
                      variant="quest"
                      color={ACTION_BUTTON_COLOR}
                      onClick={() => onPlayGuild(g.key)}
                      className="w-full"
                      style={{ fontSize: 13 }}
                    >
                      Play
                    </GameButton>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer — claim / claimed ── */}
      <div className="mt-4">
        {claimed ? (
          <div className="flex items-center justify-center gap-2 text-base text-green-700 font-extrabold py-4 bg-green-50 rounded-2xl border-2 border-green-200">
            Bonus claimed{streakInfo?.todayGold ? ` — ${streakInfo.todayGold} gold!` : '!'}
          </div>
        ) : allDone ? (
          <GameButton
            variant="quest"
            color={CLAIM_BUTTON_COLOR}
            onClick={handleClaim}
            disabled={claiming}
            className="w-full"
            style={{ fontSize: 20 }}
          >
            Claim {streakInfo?.nextGold ?? STREAK_GOLD_LADDER[0]} Gold!
          </GameButton>
        ) : (
          <div className="text-center py-2 space-y-1">
            <p className="text-sm text-gray-400 font-semibold">
              Finish all tasks to claim your gold!
            </p>
            <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-amber-700">
              Reward:
              <img src="/icons/rewards/gold_coin.svg" alt="gold" className="w-4 h-4" />
              {streakInfo?.nextGold ?? STREAK_GOLD_LADDER[0]}
              <span className="text-gray-400 font-normal text-xs">
                (Day {(streakInfo?.currentStreak ?? 0) + 1} streak bonus)
              </span>
            </p>
          </div>
        )}
      </div>

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
