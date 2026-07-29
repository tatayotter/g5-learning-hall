// components/HeroProfile.tsx
import { WeeklyData } from '@/hooks/useWeeklyData';
import { useEffect, useState } from 'react';
import { getTitleForLevel, getNextTitleTier } from '@/lib/titles';
import { USERS } from '@/lib/userSession';
import { saveAvatar } from '@/lib/userSession';
import { fetchInventory, InventoryMap } from '@/lib/inventory';
import { USERPIC_CATALOG, userpicPath } from '@/lib/userpicShop';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { fetchLifetimeBattleStats, LifetimeBattleStats } from '@/lib/lifetimeStats';
import AvatarPicker from '@/components/AvatarPicker';

interface HeroProfileProps {
  userId: string;
  data: WeeklyData;
  currentDay: string;
  onViewAchievements?: () => void;
}

export default function HeroProfile({ userId, data, currentDay, onViewAchievements }: HeroProfileProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [avatarTick, setAvatarTick] = useState(0);
  const [inventory, setInventory] = useState<InventoryMap>({});
  const [switchingAvatar, setSwitchingAvatar] = useState<string | null>(null);
  const [battleView, setBattleView] = useState<'week' | 'lifetime'>('week');
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeBattleStats | null>(null);
  const [lifetimeLoading, setLifetimeLoading] = useState(false);
  const activeUser = USERS[userId as keyof typeof USERS] ?? USERS['damien'];

  useEffect(() => {
    fetchInventory(userId).then(setInventory);
  }, [userId, avatarTick]);

  // Cached lifetime totals belong to whichever account fetched them —
  // switching accounts (e.g. an admin/parent flipping between kids) must
  // not show the previous user's numbers while the new fetch is pending.
  useEffect(() => {
    setLifetimeStats(null);
    setBattleView('week');
  }, [userId]);

  // guild_sessions_count/monster_battles_won/etc. reset every week (see
  // hooks/useWeeklyData.ts), so "lifetime" means summing across every past
  // weekly_packages row — fetched lazily, only once the toggle is used.
  useEffect(() => {
    if (battleView !== 'lifetime' || lifetimeStats) return;
    setLifetimeLoading(true);
    fetchLifetimeBattleStats(userId).then(stats => {
      setLifetimeStats(stats);
      setLifetimeLoading(false);
    });
  }, [battleView, userId, lifetimeStats]);

  const stats = data.character_stats;
  const level = stats?.level || 1;
  const xp = stats?.xp || 0;
  const gold = stats?.gold || 0;

  const xpNeeded = 500 + (level * 100);
  const progressPercentage = Math.min((xp / xpNeeded) * 100, 100);
  const currentTitle = getTitleForLevel(level);
  const nextTitle = getNextTitleTier(level);

  // A gold-threshold achievement can be met once and then un-met later just
  // by spending gold — once persisted as earned it must stay unlocked, so
  // only fall back to the live criteria check for ones not yet recorded.
  // Mirrors the same rule in AchievementsBoard.
  const isEarned = (a: typeof ACHIEVEMENTS[number]) => !!data.achievements?.[a.id] || a.criteria(data);
  const unlockedAchievements = ACHIEVEMENTS.filter(isEarned);

  const ownedUserpics = USERPIC_CATALOG.filter(item => (inventory[item.key] || 0) > 0);

  const handleQuickSwitch = async (avatar: string) => {
    if (avatar === activeUser.avatar || switchingAvatar) return;
    setSwitchingAvatar(avatar);
    const ok = await saveAvatar(userId, avatar);
    setSwitchingAvatar(null);
    if (ok) setAvatarTick(t => t + 1);
  };

  // These three carry forward and keep accumulating week over week (see
  // hooks/useWeeklyData.ts's carriedForward), so the current week's row
  // already holds the true career total — no toggle needed.
  const careerTiles: { label: string; value: number }[] = [
    { label: 'Masteries', value: data.mastery_count || 0 },
    { label: 'Honor Grants', value: data.honor_grants || 0 },
    { label: 'Items Purchased', value: data.purchased_items || 0 },
  ];

  const weekBattle = {
    guildSessions: data.guild_sessions_count || 0,
    trainerWins: data.monster_battles_won || 0,
    liveBattleWins: data.sibling_battles_won || 0,
    dummyWins: data.dummy_battles_won || 0,
    perfectQuizzes: data.perfect_quizzes || 0,
  };
  const activeBattle = battleView === 'lifetime' && lifetimeStats ? lifetimeStats : weekBattle;

  const battleTiles: { label: string; value: number }[] = [
    { label: 'Guild Sessions', value: activeBattle.guildSessions },
    { label: 'Trainer Wins', value: activeBattle.trainerWins },
    { label: 'Live Battle Wins', value: activeBattle.liveBattleWins },
    { label: 'Dummy Wins', value: activeBattle.dummyWins },
    { label: 'Perfect Quizzes', value: activeBattle.perfectQuizzes },
  ];

  return (
    <div className="text-white">
      <div className="bg-[#111] border border-[#333] rounded-xl p-5 mb-6">
        {/* --- Profile Header with Avatar --- */}
        <div className="flex items-center gap-4 mb-4 relative">
          <button
            onClick={() => setPickerOpen(true)}
            title="Change avatar"
            className="relative w-20 h-20 flex-shrink-0 group"
          >
            <img
              key={avatarTick}
              src={activeUser.avatar}
              alt="Character Portrait"
              className="w-20 h-20 object-contain"
            />
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white bg-black/40 rounded">
              ✏️
            </span>
          </button>
          <div>
            <h2 className="text-xl font-bold font-display">{activeUser?.fullName || 'Hero'}</h2>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wide">{currentTitle.icon} {currentTitle.title}</p>
            <p className="text-xs text-gray-400">Mode: <span className="text-green-400">{currentDay}</span></p>
            {nextTitle && (
              <p className="text-[10px] text-gray-500 mt-0.5">
                Next: {nextTitle.icon} {nextTitle.title} at Lvl {nextTitle.minLevel}
              </p>
            )}
          </div>
        </div>

        {/* --- Stats Grid --- */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="bg-neutral-900 p-2 rounded">
            <p className="text-xs text-gray-500">Level</p>
            <p className="font-bold font-mono">Lvl {level}</p>
          </div>
          <div className="bg-neutral-900 p-2 rounded">
            <p className="text-xs text-gray-500">XP</p>
            <p className="font-bold font-mono">{xp}/{xpNeeded}</p>
          </div>
          <div className="bg-neutral-900 p-2 rounded">
            <p className="text-xs text-gray-500">Wallet</p>
            <p className="font-bold font-mono text-yellow-400"><img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /> {gold}</p>
          </div>
        </div>

        {/* --- Progress Bar --- */}
        <div className="w-full bg-neutral-800 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* --- Career Totals --- */}
      <div className="bg-[#111] border border-[#333] rounded-xl p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Career Totals</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          {careerTiles.map(tile => (
            <div key={tile.label} className="bg-neutral-900 p-2 rounded">
              <p className="text-[10px] text-gray-500 leading-tight">{tile.label}</p>
              <p className="font-bold font-mono">{tile.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* --- Battle Record (This Week / Lifetime toggle) --- */}
      <div className="bg-[#111] border border-[#333] rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Battle Record</h3>
          <div className="flex bg-neutral-900 rounded-full p-0.5 text-xs font-bold">
            <button
              onClick={() => setBattleView('week')}
              className={`px-2.5 py-1 rounded-full transition-colors ${battleView === 'week' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              This Week
            </button>
            <button
              onClick={() => setBattleView('lifetime')}
              className={`px-2.5 py-1 rounded-full transition-colors ${battleView === 'lifetime' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Lifetime
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
          {battleTiles.map(tile => (
            <div key={tile.label} className="bg-neutral-900 p-2 rounded">
              <p className="text-[10px] text-gray-500 leading-tight">{tile.label}</p>
              <p className="font-bold font-mono">
                {battleView === 'lifetime' && lifetimeLoading ? '…' : tile.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* --- Achievements Summary --- */}
      <div className="bg-[#111] border border-[#333] rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Achievements</h3>
          {onViewAchievements && (
            <button
              onClick={onViewAchievements}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              View All →
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-3">{unlockedAchievements.length} of {ACHIEVEMENTS.length} unlocked</p>
        {unlockedAchievements.length === 0 ? (
          <p className="text-xs text-gray-600">No achievements unlocked yet — get out there!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {unlockedAchievements.slice(-6).reverse().map(a => (
              <div key={a.id} className="bg-neutral-900 border border-green-900 p-2 rounded-lg">
                <p className="text-xs font-bold text-white leading-tight">{a.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Cosmetics --- */}
      <div className="bg-[#111] border border-[#333] rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Your Cosmetics</h3>
          <button
            onClick={() => setPickerOpen(true)}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
          >
            All Avatars →
          </button>
        </div>
        {ownedUserpics.length === 0 ? (
          <p className="text-xs text-gray-600">No unlocked trainer sprites yet — check the Curio Arena Shop.</p>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
            {ownedUserpics.map(item => {
              const avatar = userpicPath(item.file);
              const isCurrent = avatar === activeUser.avatar;
              const isSwitching = switchingAvatar === avatar;
              return (
                <button
                  key={item.key}
                  onClick={() => handleQuickSwitch(avatar)}
                  disabled={!!switchingAvatar}
                  title={item.name}
                  className={`relative aspect-square rounded-lg border-2 overflow-hidden bg-neutral-950 transition-all disabled:opacity-50 ${
                    isCurrent ? 'border-amber-400' : 'border-neutral-700 hover:border-neutral-500'
                  }`}
                >
                  <img src={avatar} alt={item.name} className="w-full h-full object-cover" />
                  {isCurrent && (
                    <span className="absolute bottom-0.5 right-0.5 bg-amber-500 text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">✓</span>
                  )}
                  {isSwitching && (
                    <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-white">...</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {pickerOpen && (
        <AvatarPicker
          userId={userId}
          currentAvatar={activeUser.avatar}
          onClose={() => setPickerOpen(false)}
          onSaved={() => setAvatarTick(t => t + 1)}
        />
      )}
    </div>
  );
}
