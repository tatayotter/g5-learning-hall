'use client';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { UserId, USERS, setActiveUser, getClassmateIds, getChildIds, isFamilyProtected, linkIdentity } from '@/lib/userSession';

interface SplashScreenProps {
  onSelect: (id: UserId) => void;
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
}: {
  avatar: string;
  name: string;
  palette: { bg: string; border: string; text: string };
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
    </div>
  );
}

export default function SplashScreen({ onSelect }: SplashScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loginTarget, setLoginTarget] = useState<{ id: UserId; name: string } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Single unified roster — family and classmates together, alphabetical.
  // By the time SplashScreen mounts, the parent has already awaited
  // loadClassmates()/loadAvatarOverrides(), so USERS is fully populated.
  const allIds = useMemo(
    () => [...FAMILY_IDS, ...getClassmateIds(), ...getChildIds()].sort((a, b) => USERS[a].name.localeCompare(USERS[b].name)),
    []
  );

  const visibleIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allIds;
    return allIds.filter(id => USERS[id].name.toLowerCase().includes(q));
  }, [allIds, searchQuery]);

  const handleSelect = (id: UserId) => {
    setActiveUser(id);
    onSelect(id);
  };

  const openLogin = (id: UserId, name: string) => {
    setLoginTarget({ id, name });
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
        // Claim this app_user_id for the browser's auth.uid() now, while the
        // just-entered password is still in memory — link_verified_identity
        // re-checks it server-side before granting RLS access to this
        // account's gold/monsters/inventory. See lib/userSession.ts:linkIdentity.
        const linked = await linkIdentity(loginTarget.id, passwordInput);
        if (!linked) {
          setLoginError('❌ Incorrect password. Try again.');
          setLoggingIn(false);
          return;
        }
        handleSelect(loginTarget.id);
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
          <img
            src="/learning_hall_full_logo_optimize.png"
            alt="Learning Hall"
            className="h-20 w-auto object-contain"
          />
          {loginTarget && (
            <h1 className="text-[11px] tracking-[0.18em] text-white/20 font-medium uppercase text-center px-4">
              {`Welcome back, ${loginTarget.name}`}
            </h1>
          )}
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
                    <RosterAvatar avatar={user.avatar} name={user.name} palette={palette} />

                    <div className="flex-1 min-w-0 flex flex-col gap-[1px]">
                      <span className="text-[15px] font-bold leading-none tracking-[-0.01em] text-white/90 group-hover:text-white transition-colors truncate">
                        {user.name}
                      </span>
                      <span className="text-[11.5px] font-medium tracking-wide text-[#a89c86] mt-[3px]">{user.grade}</span>
                    </div>

                    {user.school && (
                      <span className="shrink-0 max-w-[110px] text-right text-[11px] font-medium text-[#6b5f4a] tracking-wide truncate">
                        {user.school}
                      </span>
                    )}
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="flex items-center gap-2.5 text-[12.5px] font-medium"
            >
              <a href="/register" className="text-[#b5824a] hover:text-[#f0b429] transition-colors tracking-wide">Register as a Parent</a>
              <span className="text-[#4a4038] text-[10px]">·</span>
              <a href="/parent-login" className="text-[#b5824a] hover:text-[#f0b429] transition-colors tracking-wide">Parent Login</a>
              <span className="text-[#4a4038] text-[10px]">·</span>
              <a href="/child-signup" className="text-[#b5824a] hover:text-[#f0b429] transition-colors tracking-wide">Kids: Play Now</a>
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
