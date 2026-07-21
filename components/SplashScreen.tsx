'use client';
import { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import { motion } from 'framer-motion';
import { UserId, USERS, setActiveUser, getClassmateIds, isFamilyProtected } from '@/lib/userSession';
import { supabase, ensureAnonymousSession } from '@/lib/supabase';
import { ALL_MONSTERS } from '@/lib/monsterConfig';
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

const CARD_STYLES: Record<string, { bg: string; border: string; hoverBorder: string; accent: string; goldColor: string; icon: string; tagline: string; cta: string }> = {
  damien: {
    bg: 'bg-[#1c1611]',
    border: 'border-amber-800',
    hoverBorder: 'hover:border-amber-500',
    accent: 'text-amber-400',
    goldColor: 'text-yellow-400',
    icon: '⚔️',
    tagline: 'Dark dungeon quests, guild raids, and ancient lore await.',
    cta: 'Enter the Dungeon →',
  },
  tala: {
    bg: 'bg-[#1a0a15]',
    border: 'border-rose-800/60',
    hoverBorder: 'hover:border-rose-400',
    accent: 'text-rose-300',
    goldColor: 'text-pink-300',
    icon: '✨',
    tagline: 'Enchanted quests, starlight spells, and royal adventures await.',
    cta: 'Enter the Kingdom →',
  },
  classmates: {
    bg: 'bg-[#0f1520]',
    border: 'border-indigo-800/60',
    hoverBorder: 'hover:border-indigo-400',
    accent: 'text-indigo-300',
    goldColor: 'text-yellow-400',
    icon: '🎓',
    tagline: "Join Damien's classmates for quests, battles, and glory.",
    cta: 'Open the Hall →',
  },
  _default: {
    bg: 'bg-[#0f1520]',
    border: 'border-indigo-800/60',
    hoverBorder: 'hover:border-indigo-400',
    accent: 'text-indigo-300',
    goldColor: 'text-yellow-400',
    icon: '🎮',
    tagline: 'Quests, battles, and glory await.',
    cta: 'Enter →',
  },
};

const FAMILY_IDS: UserId[] = ['damien', 'tala'];

function CardAvatar({ avatar, fallbackIcon, online, size = 'w-20 h-20' }: { avatar: string; fallbackIcon: string; online?: boolean; size?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative ${size} mb-4`}>
      {failed ? (
        <div className="text-5xl">{fallbackIcon}</div>
      ) : (
        <img
          src={avatar}
          alt=""
          onError={() => setFailed(true)}
          className={`${size} object-contain`}
        />
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-400 border-2 border-black"
          title="Online now"
        />
      )}
    </div>
  );
}

function CardStats({ id, stats, monster, lastLogin, accent, goldColor, loaded }: {
  id: UserId;
  stats: HeroStats | null | undefined;
  monster: ActiveMonsterInfo | null | undefined;
  lastLogin: string | null | undefined;
  accent: string;
  goldColor: string;
  loaded: boolean;
}) {
  return (
    <>
      {stats ? (
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="bg-black/40 rounded-lg py-2 px-1">
            <p className="text-xs text-gray-600 mb-1">Level</p>
            <p className={`${accent} font-bold font-mono text-sm`}>Lvl {stats.level}</p>
          </div>
          <div className="bg-black/40 rounded-lg py-2 px-1">
            <p className="text-xs text-gray-600 mb-1">XP</p>
            <p className={`${accent} font-bold font-mono text-sm`}>{stats.xp}</p>
          </div>
          <div className="bg-black/40 rounded-lg py-2 px-1">
            <p className="text-xs text-gray-600 mb-1">Gold</p>
            <p className={`${goldColor} font-bold font-mono text-sm`}><img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /> {stats.gold}</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 h-12 flex items-center">
          <p className="text-xs text-gray-700 italic">
            {loaded ? 'No stats yet' : 'Loading stats...'}
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 bg-black/30 rounded-lg py-1.5 px-2">
        {monster ? (
          <>
            <div className="w-6 h-6 flex-shrink-0">
              <MonsterImage monster={ALL_MONSTERS[monster.monster_id]} className="w-full h-full" emojiClassName="text-lg" />
            </div>
            <p className="text-xs text-gray-400 truncate">
              {monster.nickname || ALL_MONSTERS[monster.monster_id]?.name} <span className="text-gray-600">Lv{monster.monster_level}</span>
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-700 italic">No active curio</p>
        )}
      </div>

      <p className="mt-2 text-[11px] text-gray-600">
        🕓 Last seen: {formatLastSeen(lastLogin)}
      </p>
    </>
  );
}

export default function SplashScreen({ onSelect, onAdminSelect }: SplashScreenProps) {
  const [animationData, setAnimationData] = useState(null);
  const [statsMap, setStatsMap] = useState<Record<string, HeroStats | null>>({});
  const [lastLoginMap, setLastLoginMap] = useState<Record<string, string | null>>({});
  const [monsterMap, setMonsterMap] = useState<Record<string, ActiveMonsterInfo | null>>({});
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'root' | 'classmates'>('root');
  const [loginTarget, setLoginTarget] = useState<{ id: UserId; name: string; isAdmin?: boolean } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const allIds = [...FAMILY_IDS, ...getClassmateIds()];

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

      const [weeklyResults, lastLoginRes, battleStateRes, monstersRes] = await Promise.all([
        Promise.all(
          allIds.map((id) =>
            supabase
              .from('weekly_packages')
              .select('character_stats')
              .eq('user_id', id)
              .eq('week_starting_date', weekDate)
              .maybeSingle()
          )
        ),
        supabase.from('user_last_login').select('user_id, last_login').in('user_id', allIds),
        supabase.from('user_battle_state').select('user_id, active_monster_slot').in('user_id', allIds),
        supabase.from('user_monsters').select('user_id, slot, monster_id, nickname, monster_level').in('user_id', allIds),
      ]);

      const statsMapNext: Record<string, HeroStats | null> = {};
      allIds.forEach((id, i) => {
        statsMapNext[id] = weeklyResults[i].data?.character_stats ?? null;
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
  // sessions track themselves on, so cards can show who's online right now.
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginTarget) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      const endpoint = FAMILY_IDS.includes(loginTarget.id) ? '/api/family-login' : '/api/classmate-login';
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

  const classmateIds = getClassmateIds();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0807] px-6">

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
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-display font-bold text-amber-400 mb-3">Learning Hall</h1>
        <p className="text-gray-500 text-lg">
          {loginTarget ? `Welcome back, ${loginTarget.name}` : view === 'root' ? 'Choose your hero to begin' : "Choose your name, classmate"}
        </p>
      </motion.div>

      {/* Root view — Damien, Tala, and the Classmates folder */}
      {view === 'root' && !loginTarget && (
        <div className="flex flex-wrap justify-center gap-6 w-full max-w-5xl">
          {FAMILY_IDS.map((id, i) => {
            const user = USERS[id];
            const stats = statsMap[id];
            const style = CARD_STYLES[id] ?? CARD_STYLES['_default'];

            return (
              <motion.button
                key={id}
                onClick={() => isFamilyProtected(id) ? openLogin(id, user.name) : handleSelect(id)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className={`w-64 ${style.bg} border-2 ${style.border} ${style.hoverBorder} rounded-2xl p-8 text-left transition-colors group`}
              >
                <CardAvatar avatar={user.avatar} fallbackIcon={style.icon} online={onlineIds.has(id)} />
                <h2 className={`text-2xl font-display font-bold ${style.accent} mb-1`}>{user.name}</h2>
                <p className={`${style.accent} opacity-60 font-bold text-sm mb-3`}>{user.grade}</p>
                <p className="text-gray-500 text-sm">{style.tagline}</p>

                <CardStats
                  id={id}
                  stats={stats}
                  monster={monsterMap[id]}
                  lastLogin={lastLoginMap[id]}
                  accent={style.accent}
                  goldColor={style.goldColor}
                  loaded={statsLoaded}
                />

                <div className={`mt-4 ${style.accent} opacity-60 font-bold text-sm group-hover:opacity-100 transition-opacity`}>
                  {style.cta}
                </div>
              </motion.button>
            );
          })}

          {/* Classmates folder card */}
          <motion.button
            onClick={() => setView('classmates')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + FAMILY_IDS.length * 0.1 }}
            className={`w-64 ${CARD_STYLES.classmates.bg} border-2 ${CARD_STYLES.classmates.border} ${CARD_STYLES.classmates.hoverBorder} rounded-2xl p-8 text-left transition-colors group`}
          >
            <div className="text-5xl mb-4">{CARD_STYLES.classmates.icon}</div>
            <h2 className={`text-2xl font-display font-bold ${CARD_STYLES.classmates.accent} mb-1`}>Damien's Classmates</h2>
            <p className={`${CARD_STYLES.classmates.accent} opacity-60 font-bold text-sm mb-3`}>Grade 5</p>
            <p className="text-gray-500 text-sm">{CARD_STYLES.classmates.tagline}</p>
            <div className="mt-5 h-12 flex items-center">
              <p className="text-xs text-gray-600">
                {classmateIds.length} classmate{classmateIds.length === 1 ? '' : 's'} ready to battle
              </p>
            </div>
            <div className={`mt-4 ${CARD_STYLES.classmates.accent} opacity-60 font-bold text-sm group-hover:opacity-100 transition-opacity`}>
              {CARD_STYLES.classmates.cta}
            </div>
          </motion.button>
        </div>
      )}

      {/* Classmates picker — click a name, then enter password */}
      {view === 'classmates' && !loginTarget && (
        <div className="w-full max-w-5xl">
          <button
            onClick={() => setView('root')}
            className="mb-6 text-gray-500 hover:text-gray-300 text-sm font-bold transition-colors"
          >
            ← Back
          </button>
          {classmateIds.length === 0 ? (
            <p className="text-gray-600 text-sm">No classmates yet — ask Tatay to add one from the Admin Dashboard!</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-6">
              {classmateIds.map((id, i) => {
                const user = USERS[id];
                const style = CARD_STYLES['_default'];
                return (
                  <motion.button
                    key={id}
                    onClick={() => openLogin(id, user.name)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`w-56 ${style.bg} border-2 ${style.border} ${style.hoverBorder} rounded-2xl p-6 text-left transition-colors group`}
                  >
                    <CardAvatar avatar={user.avatar} fallbackIcon={style.icon} online={onlineIds.has(id)} size="w-16 h-16" />
                    <h2 className={`text-xl font-display font-bold ${style.accent} mb-1`}>{user.name}</h2>
                    <p className={`${style.accent} opacity-60 font-bold text-xs mb-2`}>{user.grade} · Classmate</p>

                    <CardStats
                      id={id}
                      stats={statsMap[id]}
                      monster={monsterMap[id]}
                      lastLogin={lastLoginMap[id]}
                      accent={style.accent}
                      goldColor={style.goldColor}
                      loaded={statsLoaded}
                    />

                    <div className={`mt-3 ${style.accent} opacity-60 font-bold text-xs group-hover:opacity-100 transition-opacity`}>
                      Enter password →
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Password prompt for the clicked classmate */}
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

      {view === 'root' && !loginTarget && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10"
          >
            <button
              onClick={() => isFamilyProtected('damien') ? openLogin('damien', 'Tatay Admin', true) : onAdminSelect('damien')}
              className="text-gray-700 hover:text-gray-400 text-xs font-mono transition-colors px-4 py-2 border border-neutral-900 hover:border-neutral-700 rounded-lg"
            >
              🔑 Tatay Admin
            </button>
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
