// components/HeroProfile.tsx
import { WeeklyData } from '@/hooks/useWeeklyData';
import { useEffect, useRef, useState } from 'react';
import { getTitleForLevel, getNextTitleTier } from '@/lib/titles';
import { USERS } from '@/lib/userSession';
import { saveAvatar } from '@/lib/userSession';
import { fetchInventory, InventoryMap } from '@/lib/inventory';
import { USERPIC_CATALOG, userpicPath } from '@/lib/userpicShop';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { fetchLifetimeBattleStats, LifetimeBattleStats, fetchPlayerProgress, PlayerProgress, mergeProgressForAchievements } from '@/lib/lifetimeStats';
import { fetchDailyChecklistStreak } from '@/lib/dailyChecklist';
import AvatarPicker from '@/components/AvatarPicker';
import { supabase } from '@/lib/supabase';
import {
  ALL_MONSTERS, GUILD_MONSTERS, MonsterDef,
  getGuildMonsterDisplay, getGraduatedMonsterDisplay, getOwnedMonsterDisplay,
} from '@/lib/monsterConfig';
import { fetchSubclassProfile, guildLevelForKey } from '@/lib/guildEngine';
import { MonsterImage } from '@/components/battle/shared';
import { isOfflineStorageAvailable } from '@/lib/localDataSource';
import { isAppOffline } from '@/lib/offlineState';
import ReferralKeyDisplay from '@/components/ReferralKeyDisplay';
import { getMyReferralKey } from '@/lib/referral';

// Scene grid: 3 cols × 2 rows (back row behind, front row in front)
const GRID_CELLS = [
  { left: '20%', bottom: 80 }, // 0 back-left
  { left: '50%', bottom: 80 }, // 1 back-center
  { left: '80%', bottom: 80 }, // 2 back-right
  { left: '20%', bottom: 10 }, // 3 front-left
  { left: '50%', bottom: 10 }, // 4 front-center
  { left: '80%', bottom: 10 }, // 5 front-right
];
const DEFAULT_SCENE_LAYOUT: Record<string, number> = {
  avatar: 4, curio_0: 5, curio_1: 3, curio_2: 2,
};

interface ActiveCurio {
  slot: number;
  monster_id: string;
  nickname: string | null;
  monster_level: number;
  graduation_tier: number;
}

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
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [activeCurios, setActiveCurios] = useState<ActiveCurio[]>([]);
  const [ownedCuriosCount, setOwnedCuriosCount] = useState(0);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [subclassProfile, setSubclassProfile] = useState<Awaited<ReturnType<typeof fetchSubclassProfile>> | null>(null);
  const [referralKey, setReferralKey] = useState<string | null>(null);
  const activeUser = USERS[userId as keyof typeof USERS] ?? USERS['damien'];

  // Scene editor
  const [sceneLayout, setSceneLayout] = useState<Record<string, number>>(() => {
    try {
      const saved = typeof window !== 'undefined' && localStorage.getItem(`scene_layout_${userId}`);
      return saved ? JSON.parse(saved) : { ...DEFAULT_SCENE_LAYOUT };
    } catch { return { ...DEFAULT_SCENE_LAYOUT }; }
  });
  const [editMode, setEditMode] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<number | null>(null);
  const [sceneFlips, setSceneFlips] = useState<Record<string, boolean>>(() => {
    try {
      const saved = typeof window !== 'undefined' && localStorage.getItem(`scene_flips_${userId}`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const scenePanelRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const getNearestCell = (clientX: number, clientY: number) => {
    const panel = scenePanelRef.current;
    if (!panel) return 0;
    const rect = panel.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    let nearest = 0, minDist = Infinity;
    GRID_CELLS.forEach((cell, i) => {
      const cx = (parseFloat(cell.left) / 100) * rect.width;
      const cy = rect.height - cell.bottom;
      const d = Math.hypot(relX - cx, relY - cy);
      if (d < minDist) { minDist = d; nearest = i; }
    });
    return nearest;
  };

  const handleScenePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setHoverCell(getNearestCell(e.clientX, e.clientY));
  };

  const toggleFlip = (key: string) => {
    const next = { ...sceneFlips, [key]: !sceneFlips[key] };
    setSceneFlips(next);
    localStorage.setItem(`scene_flips_${userId}`, JSON.stringify(next));
  };

  const handleScenePointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = dragStartPos.current ? Math.abs(e.clientX - dragStartPos.current.x) : 0;
    const dy = dragStartPos.current ? Math.abs(e.clientY - dragStartPos.current.y) : 0;
    const isTap = dx < 8 && dy < 8;

    if (isTap) {
      // Tap = flip
      toggleFlip(dragging);
    } else {
      // Drag = move to nearest cell
      const target = getNearestCell(e.clientX, e.clientY);
      const occupant = Object.entries(sceneLayout).find(([k, v]) => v === target && k !== dragging);
      const next = { ...sceneLayout };
      if (occupant) next[occupant[0]] = sceneLayout[dragging]; // swap
      next[dragging] = target;
      setSceneLayout(next);
      localStorage.setItem(`scene_layout_${userId}`, JSON.stringify(next));
    }
    setDragging(null);
    setHoverCell(null);
    dragStartPos.current = null;
  };

  // Cosmetics/inventory, team roster, and lifetime stats are all live-only
  // fetches with no offline cache — skip cleanly (empty state) rather than
  // hang or error; the core stats/level/achievements below all render from
  // the already-cached `data` prop regardless.
  const offline = isOfflineStorageAvailable() && isAppOffline();

  useEffect(() => {
    if (offline) return;
    fetchInventory(userId).then(setInventory);
  }, [userId, avatarTick, offline]);

  // Team roster for the Trainer Card — same fetch shape as PlayerStatsPopup's
  // "Team" section, so a guild companion or graduated species displays
  // identically here as it does when a classmate looks this player up.
  useEffect(() => {
    if (offline) return;
    let cancelled = false;
    async function loadTeam() {
      const [stateRes, monstersRes, ownedRes, subProfile] = await Promise.all([
        supabase.from('user_battle_state').select('active_monster_slot').eq('user_id', userId).single(),
        supabase.from('user_monsters').select('slot, monster_id, nickname, monster_level, graduation_tier').eq('user_id', userId).not('slot', 'is', null).order('slot'),
        supabase.from('user_monsters').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        fetchSubclassProfile(userId),
      ]);
      if (cancelled) return;
      setActiveSlot(stateRes.data?.active_monster_slot ?? null);
      setActiveCurios(monstersRes.data || []);
      setOwnedCuriosCount(ownedRes.count ?? 0);
      setSubclassProfile(subProfile);
    }
    loadTeam();
    return () => { cancelled = true; };
  }, [userId, avatarTick, offline]);

  // Same display-override pattern as MonsterGuild.tsx/PlayerStatsPopup: guild
  // companions show the name/sprite their owner's guild level currently
  // unlocks. Graduation is NOT baked in here — it's per owned user_monsters
  // instance, and since the egg mechanism a player can hold more than one
  // instance of the same species at different tiers (a graduated adult plus
  // its own freshly hatched, ungraduated egg-child), so it must be layered
  // on per-row at render time via getOwnedMonsterDisplay instead.
  const curioDisplayMonsters: Record<string, MonsterDef> = { ...ALL_MONSTERS };
  for (const id of Object.keys(GUILD_MONSTERS)) {
    const def = GUILD_MONSTERS[id];
    const guildLevel = guildLevelForKey(subclassProfile, def.guildEvolution?.guildKey);
    const { name, emoji, isLegendary, spriteId } = getGuildMonsterDisplay(def, guildLevel);
    curioDisplayMonsters[id] = { ...def, name, emoji, isLegendary, spriteId };
  }

  // Cached lifetime totals belong to whichever account fetched them —
  // switching accounts (e.g. an admin/parent flipping between kids) must
  // not show the previous user's numbers while the new fetch is pending.
  useEffect(() => {
    setLifetimeStats(null);
    setBattleView('week');
    setProgress(null);
  }, [userId]);

  // Fetched eagerly (not gated behind the This Week/Lifetime toggle like lifetimeStats below)
  // because achievement criteria (isEarned, below) need lifetime counters/level/xp/gold
  // regardless of which battle-record view is showing — see
  // docs/weekly-progress-redesign-plan.md Phase 4 Wave 2.
  useEffect(() => {
    if (offline) return;
    fetchPlayerProgress(userId).then(setProgress);
  }, [userId, offline]);

  // Fetch this player's referral key via RPC (children RLS blocks direct reads).
  useEffect(() => {
    if (offline) return;
    getMyReferralKey().then(key => { if (key) setReferralKey(key); });
  }, [userId, offline]);

  // guild_sessions_count/monster_battles_won/etc. reset every week (see
  // hooks/useWeeklyData.ts), so "lifetime" means summing across every past
  // weekly_packages row — fetched eagerly now so the Trainer Card stat panel
  // always shows lifetime totals without needing a toggle click.
  useEffect(() => {
    if (offline || lifetimeStats) return;
    setLifetimeLoading(true);
    fetchLifetimeBattleStats(userId).then(stats => {
      setLifetimeStats(stats);
      setLifetimeLoading(false);
    });
  }, [userId, lifetimeStats, offline]);

  useEffect(() => {
    if (offline) return;
    const today = new Date().toISOString().slice(0, 10);
    fetchDailyChecklistStreak(userId, today).then(info => setCurrentStreak(info.currentStreak));
  }, [userId, offline]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // Criteria checked against lifetime totals (player_progress), not the current week's
  // weekly-reset counters — thresholds unchanged, only the data source moved (Phase 4 Wave 2).
  const achievementData = mergeProgressForAchievements(data, progress);
  const isEarned = (a: typeof ACHIEVEMENTS[number]) => !!data.achievements?.[a.id] || a.criteria(achievementData);
  const unlockedAchievements = ACHIEVEMENTS.filter(isEarned);

  const ownedUserpics = USERPIC_CATALOG.filter(item => (inventory[item.key] || 0) > 0);

  const handleQuickSwitch = async (avatar: string) => {
    if (avatar === activeUser.avatar || switchingAvatar || offline) return;
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
    <div>
      {/* ===== TRAINER CARD — 2-column scene layout ===== */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm mb-6 flex flex-col lg:flex-row">

        {/* LEFT — scene panel */}
        <div
          ref={scenePanelRef}
          className="relative lg:w-5/12 min-h-[300px] overflow-hidden select-none"
          onPointerMove={handleScenePointerMove}
          onPointerUp={handleScenePointerUp}
          onPointerLeave={() => { setDragging(null); setHoverCell(null); }}
        >
          {/* Blurred background */}
          <div
            className="absolute inset-0 bg-cover bg-center scale-110"
            style={{ backgroundImage: "url('/guilds/lorekeeper-bg.png')", filter: 'blur(6px)' }}
          />
          <div className="absolute inset-0 bg-black/35" />

          {/* Edit mode toggle */}
          <button
            onClick={() => { setEditMode(m => !m); setDragging(null); setHoverCell(null); }}
            title={editMode ? 'Exit arrange mode' : 'Drag to move · Tap to flip'}
            className="absolute top-2 right-2 z-30 text-[11px] font-bold px-2 py-1 rounded-full backdrop-blur-sm transition-colors"
            style={{ background: editMode ? 'rgba(251,191,36,0.85)' : 'rgba(0,0,0,0.35)', color: editMode ? '#000' : '#fff' }}
          >
            {editMode ? '✓ Done' : '✏️ Arrange'}
          </button>

          {/* Grid cell targets — visible in edit mode */}
          {GRID_CELLS.map((cell, i) => {
            const isHover = hoverCell === i && dragging !== null;
            const isBack = i < 3;
            return (
              <div
                key={i}
                className={`absolute w-12 h-12 rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-dashed transition-all pointer-events-none ${
                  editMode ? 'opacity-100' : 'opacity-0'
                } ${isHover ? 'border-amber-400 bg-amber-400/25 scale-125' : isBack ? 'border-white/25' : 'border-white/40'}`}
                style={{ left: cell.left, bottom: cell.bottom }}
              />
            );
          })}

          {/* Avatar — display only, no click-to-change */}
          {(() => {
            const cellIdx = sceneLayout.avatar ?? DEFAULT_SCENE_LAYOUT.avatar;
            const cell = GRID_CELLS[cellIdx];
            const isBack = cellIdx < 3;
            return (
              <div
                className={`absolute transition-opacity ${editMode ? 'cursor-grab active:cursor-grabbing' : ''} ${dragging === 'avatar' ? 'opacity-40' : 'opacity-100'}`}
                style={{ left: cell.left, bottom: cell.bottom, zIndex: isBack ? 5 : 10, transform: `translateX(-50%)${sceneFlips.avatar ? ' scaleX(-1)' : ''}` }}
                onPointerDown={editMode ? (e) => { e.preventDefault(); dragStartPos.current = { x: e.clientX, y: e.clientY }; setDragging('avatar'); setHoverCell(cellIdx); } : undefined}
              >
                <img
                  key={avatarTick}
                  src={activeUser.avatar}
                  alt="Character Portrait"
                  className="w-40 h-40 object-contain drop-shadow-2xl"
                  draggable={false}
                />
              </div>
            );
          })()}

          {/* Curios — only as many as the player has in their team */}
          {activeCurios.slice(0, 3).map((m, i) => {
            const key = `curio_${i}`;
            const cellIdx = sceneLayout[key] ?? DEFAULT_SCENE_LAYOUT[key];
            if (cellIdx === undefined) return null;
            const cell = GRID_CELLS[cellIdx];
            const isBack = cellIdx < 3;
            const avatarLeft = parseFloat(GRID_CELLS[sceneLayout.avatar ?? DEFAULT_SCENE_LAYOUT.avatar].left);
            const autoFlip = parseFloat(cell.left) < avatarLeft;
            const flip = autoFlip !== !!sceneFlips[key]; // XOR: tap toggles away from auto
            const def = getOwnedMonsterDisplay(curioDisplayMonsters[m.monster_id], m.graduation_tier);
            return (
              <div
                key={m.slot}
                className={`absolute drop-shadow-lg transition-opacity ${editMode ? 'cursor-grab active:cursor-grabbing' : ''} ${dragging === key ? 'opacity-40' : 'opacity-100'}`}
                style={{
                  left: cell.left,
                  bottom: cell.bottom,
                  zIndex: isBack ? 5 : 10,
                  transform: `translateX(-50%)${flip ? ' scaleX(-1)' : ''}`,
                }}
                onPointerDown={editMode ? (e) => { e.preventDefault(); dragStartPos.current = { x: e.clientX, y: e.clientY }; setDragging(key); setHoverCell(cellIdx); } : undefined}
              >
                <MonsterImage monster={def} className="w-24 h-24" emojiClassName="text-5xl" />
              </div>
            );
          })}
        </div>

        {/* RIGHT — stats panel */}
        <div className="lg:w-7/12 p-6 flex flex-col gap-4" style={{ background: 'linear-gradient(150deg, #fefce8 0%, #ffffff 55%)' }}>

          {/* Name + floating level badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 leading-tight truncate">
                {activeUser?.fullName || 'Hero'}
              </h2>
              <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-800 text-xs font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full mt-1">
                {currentTitle.icon} {currentTitle.title}
              </span>
              {nextTitle && (
                <p className="text-[11px] text-gray-400 mt-1">↑ {nextTitle.icon} {nextTitle.title} at Lv {nextTitle.minLevel}</p>
              )}
            </div>
            <div className="flex-shrink-0 bg-amber-500 text-white rounded-2xl px-3 py-2 text-center min-w-[52px]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-amber-100 leading-none mb-0.5">LVL</p>
              <p className="text-2xl font-black font-mono leading-none">{level}</p>
            </div>
          </div>

          {/* XP bar */}
          <div>
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="font-bold text-gray-500 uppercase tracking-wide">Experience</span>
              <span className="font-mono text-gray-400">{xp.toLocaleString()} / {xpNeeded.toLocaleString()}</span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%`, background: 'linear-gradient(90deg, #059669, #34d399)' }}
              />
            </div>
          </div>

          <div className="border-t border-stone-100" />

          {/* Icon-driven stats */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              { icon: '/icons/rewards/gold_coin.svg', label: 'Gold', value: gold.toLocaleString(), gold: true },
              { icon: '/icons/encounter/cage.svg', label: 'Owned Curios', value: ownedCuriosCount },
              { icon: '/icons/stats/victory.svg', label: 'Lifetime Quizzes', value: lifetimeLoading ? '…' : (lifetimeStats?.guildSessions ?? data.guild_sessions_count ?? 0) },
              { icon: '/icons/encounter/atk.svg', label: 'Trainer Wins', value: lifetimeLoading ? '…' : (lifetimeStats?.trainerWins ?? data.monster_battles_won ?? 0) },
              { icon: '/icons/stats/atk.svg', label: 'PvP Wins', value: lifetimeLoading ? '…' : (lifetimeStats?.liveBattleWins ?? data.sibling_battles_won ?? 0) },
              { icon: '/icons/stats/stat_up.svg', label: 'Current Streak', value: `${currentStreak}d` },
              { icon: '/icons/rewards/gem.svg', label: 'Achievements', value: `${unlockedAchievements.length} / ${ACHIEVEMENTS.length}` },
              { icon: '/icons/rewards/package.svg', label: 'Lifetime Trades', value: (progress as any)?.trades_completed ?? 0 },
            ].map(({ icon, label, value, gold: isGold }) => (
              <div key={label} className="flex items-center gap-2.5">
                {typeof icon === 'string' && icon.startsWith('/') ? (
                  <img src={icon} alt="" className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <span className="text-xl leading-none flex-shrink-0">{icon}</span>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-none">{label}</p>
                  <p className={`font-bold font-mono text-base leading-tight ${isGold ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- Career Totals --- */}
      <div className="border border-stone-200 p-6 rounded-xl shadow-sm mb-6" style={{ background: 'linear-gradient(150deg, #fefce8 0%, #ffffff 55%)' }}>
        <div className="flex justify-between items-center border-b border-stone-100 pb-4 mb-5">
          <h2 className="text-xl font-bold text-gray-900">Career Totals</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {careerTiles.map(tile => (
            <div key={tile.label} className="bg-stone-50 border border-stone-200 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">{tile.label}</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{tile.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* --- Battle Record (This Week / Lifetime toggle) --- */}
      <div className="border border-stone-200 p-6 rounded-xl shadow-sm mb-6" style={{ background: 'linear-gradient(150deg, #fefce8 0%, #ffffff 55%)' }}>
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-5">
          <h2 className="text-xl font-bold text-gray-900">Battle Record</h2>
          <div className="flex bg-stone-100 border border-stone-200 rounded-full p-0.5 text-xs font-bold">
            <button
              onClick={() => setBattleView('week')}
              className={`px-2.5 py-1 rounded-full transition-colors ${battleView === 'week' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              This Week
            </button>
            <button
              onClick={() => setBattleView('lifetime')}
              className={`px-2.5 py-1 rounded-full transition-colors ${battleView === 'lifetime' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Lifetime
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
          {battleTiles.map(tile => (
            <div key={tile.label} className="bg-stone-50 border border-stone-200 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">{tile.label}</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">
                {battleView === 'lifetime' && lifetimeLoading ? '…' : tile.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* --- Achievements Summary --- */}
      <div className="border border-stone-200 p-6 rounded-xl shadow-sm mb-6" style={{ background: 'linear-gradient(150deg, #fefce8 0%, #ffffff 55%)' }}>
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-5">
          <h2 className="text-xl font-bold text-gray-900">Achievements</h2>
          {onViewAchievements && (
            <button
              onClick={onViewAchievements}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
            >
              View All →
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-3">{unlockedAchievements.length} of {ACHIEVEMENTS.length} unlocked</p>
        {unlockedAchievements.length === 0 ? (
          <p className="text-xs text-gray-400">No achievements unlocked yet — get out there!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {unlockedAchievements.slice(-6).reverse().map(a => (
              <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                <p className="text-xs font-bold text-gray-900 leading-tight">{a.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Cosmetics --- */}
      <div className="border border-stone-200 p-6 rounded-xl shadow-sm mb-6" style={{ background: 'linear-gradient(150deg, #fefce8 0%, #ffffff 55%)' }}>
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-5">
          <h2 className="text-xl font-bold text-gray-900">Your Cosmetics</h2>
          <button
            onClick={() => setPickerOpen(true)}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
          >
            All Avatars →
          </button>
        </div>
        {ownedUserpics.length === 0 ? (
          <p className="text-xs text-gray-400">No unlocked trainer sprites yet — check the Curio Arena Shop.</p>
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
                  className={`relative aspect-square rounded-lg border-2 overflow-hidden bg-stone-100 transition-all disabled:opacity-50 ${
                    isCurrent ? 'border-amber-400' : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <img src={avatar} alt={item.name} className="w-full h-full object-contain bg-neutral-950" />
                  {isCurrent && (
                    <span className="absolute bottom-0.5 right-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">✓</span>
                  )}
                  {isSwitching && (
                    <span className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs text-gray-700">...</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* --- Referral --- */}
      {referralKey && (
        <div className="border border-stone-200 p-6 rounded-xl shadow-sm mb-6" style={{ background: 'linear-gradient(150deg, #fffbeb 0%, #ffffff 55%)' }}>
          <h2 className="text-xl font-bold text-gray-900 border-b border-stone-100 pb-4 mb-5">
            Invite Friends
          </h2>
          <ReferralKeyDisplay referralKey={referralKey} />
        </div>
      )}

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
