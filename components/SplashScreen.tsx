'use client';
import { useState, useEffect, useMemo } from 'react';
import Lottie from 'lottie-react';
import { motion } from 'framer-motion';
import { UserId, USERS, setActiveUser, getClassmateIds, getChildIds, isFamilyProtected } from '@/lib/userSession';
import { supabase, ensureAnonymousSession } from '@/lib/supabase';
import { ALL_MONSTERS, getGraduatedMonsterDisplay } from '@/lib/monsterConfig';
import { MonsterImage } from '@/components/battle/shared';

interface SplashScreenProps {
  onSelect: (id: UserId) => void;
  onAdminSelect: (id: UserId) => void;
}

interface HeroStats {
  level: number;
  xp: number;
  gold: number;
}

interface ActiveMonsterInfo {
  monster_id: string;
  nickname: string | null;
  monster_level: number;
  graduation_tier: number;
}

function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return 'Never logged in';
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function getWeekStartDate(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const sunday = new Date(now);
  sunday.setDate(diff);
  const yyyy = sunday.getFullYear();
  const mm = String(sunday.getMonth() + 1).padStart(2, '0');
  const dd = String(sunday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// One neutral style for every player — no family-vs-classmate distinction.
const ROSTER_STYLE = {
  bg: 'bg-[#0f1520]',
  border: 'border-indigo-800/60',
  hoverBorder: 'hover:border-indigo-400',
  accent: 'text-indigo-300',
  goldColor: 'text-yellow-400',
  icon: '🎮',
};

const FAMILY_IDS: UserId[] = ['damien', 'tala'];

function RosterAvatar({ avatar, online }: { avatar: string; online?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative w-12 h-12 shrink-0">
      {failed ? (
        <div className="text-3xl">{ROSTER_STYLE.icon}</div>
      ) : (
        <img
          src={avatar}
          alt=""
          onError={() => setFailed(true)}
          className="w-12 h-12 object-contain"
        />
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-black"
          title="Online now"
        />
      )}
    </div>
  );
}

export default function SplashScreen({ onSelect, onAdminSelect }: SplashScreenProps) {
  const [animationData, setAnimationData] = useState(null);
  const [statsMap, setStatsMap] = useState<Record<string, HeroStats | null>>({});
  const [lastLoginMap, setLastLoginMap] = useState<Record<string, string | null>>({});
  const [monsterMap, setMonsterMap] = useState<Record<string, ActiveMonsterInfo | null>>({});
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loginTarget, setLoginTarget] = useState<{ id: UserId; name: string; isAdmin?: boolean } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Single unified roster — family and classmates together, alphabetical.
  // By the time SplashScreen mounts, the parent has already awaited
  // loadClassmates()/loadAvatarOverrides(), so USERS is fully populated.
  const allIds = useMemo(
    () => [...FAMILY_IDS, ...getClassmateIds()].sort((a, b) => USERS[a].name.localeCompare(USERS[b].name)),
    []
  );

  const visibleIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allIds;
    return allIds.filter(id => USERS[id].name.toLowerCase().includes(q));
  }, [allIds, searchQuery]);

  useEffect(() => {
    fetch('/splash-animation.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error('Failed to load animation:', err));
  }, []);

  useEffect(() => {
    async function fetchStats() {
      await ensureAnonymousSession();
      const weekDate = getWeekStartDate();

      const [weeklyRes, lastLoginRes, battleStateRes, monstersRes] = await Promise.all([
        supabase
          .from('weekly_packages')
          .select('user_id, character_stats')
          .in('user_id', allIds)
          .eq('week_starting_date', weekDate),
        supabase.from('user_last_login').select('user_id, last_login').in('user_id', allIds),
        supabase.from('user_battle_state').select('user_id, active_monster_slot').in('user_id', allIds),
        supabase.from('user_monsters').select('user_id, slot, monster_id, nickname, monster_level, graduation_tier').in('user_id', allIds),
      ]);

      const statsMapNext: Record<string, HeroStats | null> = {};
      (weeklyRes.data || []).forEach((row: any) => {
        statsMapNext[row.user_id] = row.character_stats ?? null;
      });
      setStatsMap(statsMapNext);

      const lastLoginNext: Record<string, string | null> = {};
      (lastLoginRes.data || []).forEach((row: any) => {
        lastLoginNext[row.user_id] = row.last_login;
      });
      setLastLoginMap(lastLoginNext);

      const activeSlotByUser: Record<string, number | null> = {};
      (battleStateRes.data || []).forEach((row: any) => {
        activeSlotByUser[row.user_id] = row.active_monster_slot ?? null;
      });
      const monsterNext: Record<string, ActiveMonsterInfo | null> = {};
      (monstersRes.data || []).forEach((row: any) => {
        if (row.slot === activeSlotByUser[row.user_id]) {
          monsterNext[row.user_id] = {
            monster_id: row.monster_id,
            nickname: row.nickname,
            monster_level: row.monster_level,
            graduation_tier: row.graduation_tier ?? 0,
          };
        }
      });
      setMonsterMap(monsterNext);
      setStatsLoaded(true);
    }

    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen (read-only) to the app-wide presence channel that logged-in
  // sessions track themselves on, so rows can show who's online right now.
  useEffect(() => {
    const channel = supabase.channel('app-presence', {
      config: { presence: { key: '_splash_observer' } },
    });
    channel.on('presence', { event: 'sync' }, () => {
      setOnlineIds(new Set(Object.keys(channel.presenceState())));
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSelect = (id: UserId) => {
    setActiveUser(id);
    onSelect(id);
  };

  const openLogin = (id: UserId, name: string, isAdmin = false) => {
    setLoginTarget({ id, name, isAdmin });
    setPasswordInput('');
    setLoginError('');
  };

  const handleRowClick = (id: UserId) => {
    const user = USERS[id];
    if (FAMILY_IDS.includes(id)) {
      if (isFamilyProtected(id)) openLogin(id, user.name);
      else handleSelect(id);
    } else {
      openLogin(id, user.name);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginTarget) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      const endpoint = FAMILY_IDS.includes(loginTarget.id)
        ? '/api/family-login'
        : getChildIds().includes(loginTarget.id)
          ? '/api/child-login'
          : '/api/classmate-login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loginTarget.id, password: passwordInput }),
      });
      if (res.ok) {
        if (loginTarget.isAdmin) onAdminSelect(loginTarget.id);
        else handleSelect(loginTarget.id);
      } else {
        setLoginError('❌ Incorrect password. Try again.');
      }
    } catch {
      setLoginError('⚠️ Could not reach the server. Check your connection.');
    }
    setLoggingIn(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0807] px-6 py-10">

      {animationData && (
        <div className="flex justify-center items-center w-full -mt-24 -mb-36">
          <div className="relative w-full max-w-[600px] aspect-square">
            <Lottie animationData={animationData} loop={true} className="w-full h-full object-contain" />
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <h1 className="text-5xl font-display font-bold text-amber-400 mb-3">Learning Hall</h1>
        <p className="text-gray-500 text-lg">
          {loginTarget ? `Welcome back, ${loginTarget.name}` : 'Choose your hero to begin'}
        </p>
      </motion.div>

      {!loginTarget && (
        <div className="w-full max-w-xl">
          {allIds.length > 6 && (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players..."
              className="w-full bg-black/40 border border-neutral-800 rounded-lg py-2.5 px-4 mb-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
            />
          )}

          <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1">
            {visibleIds.length === 0 && (
              <p className="text-center text-gray-600 text-sm py-6">No players match &quot;{searchQuery}&quot;</p>
            )}
            {visibleIds.map((id, i) => {
              const user = USERS[id];
              const stats = statsMap[id];
              const monster = monsterMap[id];
              const monsterDef = monster ? ALL_MONSTERS[monster.monster_id] : null;
              const monsterDisplay = monsterDef && monster ? getGraduatedMonsterDisplay(monsterDef, monster.graduation_tier) : monsterDef;

              return (
                <motion.button
                  key={id}
                  onClick={() => handleRowClick(id)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.03 }}
                  className={`${ROSTER_STYLE.bg} border ${ROSTER_STYLE.border} ${ROSTER_STYLE.hoverBorder} rounded-xl px-4 py-3 flex items-center gap-4 text-left transition-colors group`}
                >
                  <RosterAvatar avatar={user.avatar} online={onlineIds.has(id)} />

                  <div className="flex-1 min-w-0">
                    <p className={`font-display font-bold ${ROSTER_STYLE.accent} truncate`}>{user.name}</p>
                    <p className="text-xs text-gray-500">{user.grade}</p>
                  </div>

                  {monsterDisplay && (
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                      <div className="w-6 h-6">
                        <MonsterImage monster={monsterDisplay} className="w-full h-full" emojiClassName="text-lg" />
                      </div>
                    </div>
                  )}

                  <div className="text-right shrink-0">
                    <p className={`text-sm font-mono font-bold ${ROSTER_STYLE.accent}`}>
                      {stats ? `Lvl ${stats.level}` : statsLoaded ? '—' : '···'}
                    </p>
                    <p className="text-[11px] text-gray-600">{formatLastSeen(lastLoginMap[id])}</p>
                  </div>

                  <span className={`${ROSTER_STYLE.accent} opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold shrink-0`}>
                    →
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Password prompt for the clicked player */}
      {loginTarget && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-[#0f1520] border-2 border-indigo-800/60 rounded-2xl p-8"
        >
          <h2 className="text-xl font-display font-bold text-indigo-300 mb-1">{loginTarget.name}</h2>
          <p className="text-gray-500 text-sm mb-5">Enter your password to continue.</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              autoFocus
              placeholder="Password"
              className="w-full bg-black border border-neutral-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
            />
            {loginError && <p className="text-red-400 text-xs">{loginError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLoginTarget(null)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-2 rounded-lg transition-colors"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loggingIn || !passwordInput}
                className="flex-1 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white font-bold py-2 rounded-lg transition-colors"
              >
                {loggingIn ? 'Checking...' : 'Enter →'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {!loginTarget && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <button
              onClick={() => isFamilyProtected('damien') ? openLogin('damien', 'Tatay Admin', true) : onAdminSelect('damien')}
              className="text-gray-700 hover:text-gray-400 text-xs font-mono transition-colors px-4 py-2 border border-neutral-900 hover:border-neutral-700 rounded-lg"
            >
              🔑 Tatay Admin
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="mt-3 flex items-center gap-3 text-xs"
          >
            <a href="/register" className="text-gray-600 hover:text-indigo-300 transition-colors">Register as a Parent</a>
            <span className="text-gray-800">·</span>
            <a href="/parent-login" className="text-gray-600 hover:text-indigo-300 transition-colors">Parent Login</a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-gray-700 text-xs mt-4"
          >
            Ruelo Learning Hall · Family Edition
          </motion.p>
        </>
      )}
    </div>
  );
}
