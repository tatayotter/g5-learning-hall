'use client';
import { useState, useEffect, useMemo } from 'react';
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

const FAMILY_IDS: UserId[] = ['damien', 'tala'];

// Cosmetic variety for the roster tiles — cycled by roster position so
// colors stay stable regardless of search filtering. Warm/earthy tones to
// match the in-game torchlight-dungeon palette (amber/ember/moss/stone).
const AVATAR_PALETTES = [
  { bg: '#2a1f0f', border: '#3d2e1a', text: '#c9911a' },
  { bg: '#2e1f1a', border: '#4a2e22', text: '#c9581a' },
  { bg: '#1a2416', border: '#2a3d22', text: '#7fae52' },
  { bg: '#201d1a', border: '#3a352e', text: '#a89c86' },
  { bg: '#2a1414', border: '#4a1c1c', text: '#b5453a' },
  { bg: '#241a10', border: '#3a2a18', text: '#b5824a' },
];

function RosterAvatar({
  avatar,
  name,
  palette,
  online,
}: {
  avatar: string;
  name: string;
  palette: { bg: string; border: string; text: string };
  online?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="shrink-0 w-[42px] h-[42px] rounded-[10px] border flex items-center justify-center relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]"
      style={{ backgroundColor: palette.bg, borderColor: palette.border }}
    >
      <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] bg-[size:6px_6px]" />
      {failed ? (
        <span
          className="relative text-[18px] font-black tracking-tighter"
          style={{ color: palette.text, fontFamily: 'monospace' }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      ) : (
        <img
          src={avatar}
          alt=""
          onError={() => setFailed(true)}
          className="relative w-full h-full object-contain"
        />
      )}
      <div className="absolute top-[2px] left-[3px] right-[3px] h-[1px] bg-white/10 rounded-full" />
      {online && (
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-black"
          title="Online now"
        />
      )}
    </div>
  );
}

export default function SplashScreen({ onSelect, onAdminSelect }: SplashScreenProps) {
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
    <div className="relative h-[100dvh] w-full bg-[#0a0807] overflow-hidden flex justify-center font-[Inter,system-ui,sans-serif] selection:bg-[#4a2e0a]">
      <div className="absolute inset-0">
        <img src="/splash1.webp" alt="" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-black/75" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0807]/40 via-transparent to-[#0a0807]/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.7)_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[480px] h-[100dvh] flex flex-col px-[18px] sm:px-6 py-5 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 pt-2 pb-5">
          <div className="flex items-center gap-2">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#c9aa6a]/40" />
            <span className="text-[10px] tracking-[0.32em] font-bold text-[#d4b46a]/90 uppercase">Learning Hall</span>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#c9aa6a]/40" />
          </div>
          <h1 className="text-[11px] tracking-[0.18em] text-white/20 font-medium uppercase text-center px-4">
            {loginTarget ? `Welcome back, ${loginTarget.name}` : 'Family Edition'}
          </h1>
        </div>

        {!loginTarget && allIds.length > 6 && (
          <div className="relative group mb-5">
            <div className="absolute -inset-px rounded-[14px] bg-gradient-to-b from-[#7a4a0f]/50 to-transparent opacity-0 group-focus-within:opacity-100 blur-[1px] transition-opacity" />
            <div className="relative flex items-center rounded-[14px] bg-[#1c1611] border border-[#3d3225] shadow-[0_0_0_1px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04),0_0_20px_rgba(100,60,20,0.15)]">
              <div className="pl-4 pr-2 text-[#8a7c66]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players..."
                className="w-full bg-transparent py-[13px] pr-4 text-[14px] font-medium text-white/80 placeholder:text-[#8a7c66] focus:outline-none"
              />
            </div>
          </div>
        )}

        {!loginTarget && (
          <div className="flex-1 min-h-0 relative">
            <div className="h-full overflow-y-auto pr-1 -mr-1 custom-scrollbar space-y-[10px] pb-4">
              {visibleIds.length === 0 && (
                <p className="text-center text-gray-600 text-sm py-6">No players match &quot;{searchQuery}&quot;</p>
              )}
              {visibleIds.map((id, i) => {
                const user = USERS[id];
                const stats = statsMap[id];
                const monster = monsterMap[id];
                const monsterDef = monster ? ALL_MONSTERS[monster.monster_id] : null;
                const monsterDisplay = monsterDef && monster ? getGraduatedMonsterDisplay(monsterDef, monster.graduation_tier) : monsterDef;
                const palette = AVATAR_PALETTES[allIds.indexOf(id) % AVATAR_PALETTES.length];

                return (
                  <motion.button
                    key={id}
                    onClick={() => handleRowClick(id)}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.99 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 10) * 0.03 }}
                    className="group w-full text-left relative rounded-[14px] bg-[#1c1611] border border-[#3d3225] p-3 flex items-center gap-3 transition-colors duration-200 hover:border-[#c9781a] hover:bg-[#241d16]"
                  >
                    <RosterAvatar avatar={user.avatar} name={user.name} palette={palette} online={onlineIds.has(id)} />

                    <div className="flex-1 min-w-0 flex flex-col gap-[1px]">
                      <span className="text-[15px] font-bold leading-none tracking-[-0.01em] text-white/90 group-hover:text-white transition-colors truncate">
                        {user.name}
                      </span>
                      <span className="text-[11.5px] font-medium tracking-wide text-[#a89c86] mt-[3px]">{user.grade}</span>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-[3px] min-w-[86px]">
                      {stats ? (
                        <div className="flex items-center gap-1.5">
                          {monsterDisplay && (
                            <MonsterImage monster={monsterDisplay} className="w-4 h-4" emojiClassName="text-[13px]" />
                          )}
                          <span className="text-[12.5px] font-bold tracking-wide text-[#f0b429]">Lvl {stats.level}</span>
                        </div>
                      ) : (
                        <span className="text-[13px] leading-none text-[#3d3225] font-bold tracking-widest">
                          {statsLoaded ? '—' : '···'}
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-[#6b5f4a] tracking-wide">{formatLastSeen(lastLoginMap[id])}</span>
                    </div>
                  </motion.button>
                );
              })}
              <div className="h-2" />
            </div>
            <div className="pointer-events-none absolute top-0 left-0 right-1 h-4 bg-gradient-to-b from-[#0a0807] to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-0 right-1 h-6 bg-gradient-to-t from-[#0a0807]/80 to-transparent" />
          </div>
        )}

        {/* Password prompt for the clicked player */}
        {loginTarget && (
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-[14px] bg-[#1c1611] border border-[#3d3225] p-8 shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_0_30px_rgba(100,60,20,0.15)]"
            >
              <h2 className="text-lg font-bold text-white/90 mb-1">{loginTarget.name}</h2>
              <p className="text-[#8a7c66] text-sm mb-5">Enter your password to continue.</p>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <input
                  type="password"
                  autoFocus
                  placeholder="Password"
                  className="w-full bg-[#14100d] border border-[#3d3225] rounded-[14px] p-3 text-white focus:border-[#c9781a] outline-none"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
                {loginError && <p className="text-red-400 text-xs">{loginError}</p>}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setLoginTarget(null)}
                    className="flex-1 bg-[#2a2119] hover:bg-[#3d3225] border border-[#3d3225] text-white font-bold py-2 rounded-[14px] transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loggingIn || !passwordInput}
                    className="flex-1 bg-[#c9781a] hover:bg-[#e2921e] disabled:opacity-40 text-white font-bold py-2 rounded-[14px] transition-colors"
                  >
                    {loggingIn ? 'Checking...' : 'Enter →'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {!loginTarget && (
          <div className="pt-4 pb-2 flex flex-col items-center gap-3.5 shrink-0">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={() => isFamilyProtected('damien') ? openLogin('damien', 'Tatay Admin', true) : onAdminSelect('damien')}
              className="group inline-flex items-center gap-2 rounded-full bg-[#1c1611] border border-[#4a4038] px-4 py-2 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_2px_12px_rgba(0,0,0,0.5)] hover:border-[#c9781a] hover:bg-[#241d16] transition-all"
            >
              <span className="w-5 h-5 rounded-full bg-[#2a2119] border border-[#4a4038] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#e0a92c]">
                  <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
                  <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
                </svg>
              </span>
              <span className="text-[13px] font-semibold tracking-wide text-[#d8cdb8]">Tatay Admin</span>
            </motion.button>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="flex items-center gap-2.5 text-[12.5px] font-medium"
            >
              <a href="/register" className="text-[#b5824a] hover:text-[#f0b429] transition-colors tracking-wide">Register as a Parent</a>
              <span className="text-[#4a4038] text-[10px]">·</span>
              <a href="/parent-login" className="text-[#b5824a] hover:text-[#f0b429] transition-colors tracking-wide">Parent Login</a>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-[11px] tracking-[0.06em] text-white/25 font-medium mt-1"
            >
              Ruelo Learning Hall · Family Edition
            </motion.p>
          </div>
        )}
      </div>
    </div>
  );
}
