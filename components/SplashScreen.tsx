'use client';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { UserId, USERS, setActiveUser, getClassmateIds, getChildIds, isFamilyProtected, linkIdentity, usernameToChildId, loginReturningChild } from '@/lib/userSession';
import GameButton from '@/components/GameButton';

interface SplashScreenProps {
  onSelect: (id: UserId) => void;
}

const FAMILY_IDS: UserId[] = ['damien', 'tala'];

// Cosmetic variety for the roster tiles — cycled by roster position so
// colors stay stable regardless of search filtering. Light pastel chips to
// match the parchment palette (docs/STYLE_GUIDE.md), swapped from the
// original dark/torchlight set when this screen moved to light theme
// (2026-08-29).
const AVATAR_PALETTES = [
  { bg: '#fdf3e0', border: '#e8c88a', text: '#c9781a' },
  { bg: '#fdece0', border: '#e8b088', text: '#c9581a' },
  { bg: '#eaf5e0', border: '#c5e0a8', text: '#5a8a3a' },
  { bg: '#f0ede6', border: '#d8d0c0', text: '#8b7c5e' },
  { bg: '#fbe4e4', border: '#e8b0b0', text: '#b5453a' },
  { bg: '#f5e8d0', border: '#e0c088', text: '#a5701a' },
];

function RosterAvatar({
  avatar,
  name,
  palette,
  size = 42,
}: {
  avatar: string;
  name: string;
  palette: { bg: string; border: string; text: string };
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="shrink-0 rounded-[12px] border flex items-center justify-center relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]"
      style={{ backgroundColor: palette.bg, borderColor: palette.border, width: size, height: size }}
    >
      <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(#2a1505_1px,transparent_1px),linear-gradient(90deg,#2a1505_1px,transparent_1px)] bg-[size:6px_6px]" />
      {failed ? (
        <span
          className="relative font-black tracking-tighter"
          style={{ color: palette.text, fontFamily: 'monospace', fontSize: size * 0.42 }}
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
    </div>
  );
}

export default function SplashScreen({ onSelect }: SplashScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loginTarget, setLoginTarget] = useState<{ id: UserId; name: string } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // A self-registered child who hasn't linked a parent yet (parent_id IS
  // NULL) never appears in children_public, so they never make it into
  // USERS/the roster below past their first session — see
  // lib/userSession.ts:loginReturningChild. This is their only way back in:
  // typing the username+PIN they signed up with directly, instead of
  // picking a roster row.
  const [returningLogin, setReturningLogin] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');

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

  const openReturningLogin = () => {
    setReturningLogin(true);
    setUsernameInput('');
    setPasswordInput('');
    setLoginError('');
  };

  const closeReturningLogin = () => {
    setReturningLogin(false);
    setLoginError('');
  };

  const handleReturningLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = usernameToChildId(usernameInput);
    if (!id) {
      setLoginError('❌ Enter your username.');
      return;
    }
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/child-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password: passwordInput }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.success) {
        const linked = await linkIdentity(id, passwordInput);
        if (!linked) {
          setLoginError('❌ Incorrect username or PIN. Try again.');
          setLoggingIn(false);
          return;
        }
        loginReturningChild({
          id,
          fullName: body.fullName,
          grade: body.grade,
          avatar: body.avatar,
          gender: body.gender === 'girl' ? 'girl' : 'boy',
          school: body.schoolName || undefined,
        });
        setReturningLogin(false);
        handleSelect(id);
      } else {
        setLoginError('❌ Incorrect username or PIN. Try again.');
      }
    } catch {
      setLoginError('⚠️ Could not reach the server. Check your connection.');
    }
    setLoggingIn(false);
  };

  return (
    <div className="relative h-[100dvh] w-full bg-[#0c2456] overflow-hidden flex justify-center font-[Inter,system-ui,sans-serif] selection:bg-[#0c2456]">
      <div className="absolute inset-0">
        <img src="/splash1.webp" alt="" className="w-full h-full object-cover object-center" />
        {/* Logo-blue wash over the art (2026-08-29: swapped from an earlier
            parchment-beige wash to match the logo's blue) — the art stays a
            faint backdrop, white content cards do the actual "light" work. */}
        <div className="absolute inset-0 bg-[#0c2456]/85" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c2456]/30 via-transparent to-[#0c2456]/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(12,36,86,0.75)_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[480px] h-[100dvh] flex flex-col px-4 sm:px-6 py-4 sm:py-5 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 pt-1 pb-4 shrink-0">
          <img
            src="/learning_hall_full_logo_optimize.png"
            alt="Learning Hall"
            className="h-16 sm:h-20 w-auto object-contain"
          />
          {!loginTarget && !returningLogin && (
            <h1 className="text-[11px] tracking-[0.18em] text-blue-100/60 font-medium uppercase text-center">
              Choose your hero
            </h1>
          )}
          {loginTarget && (
            <h1 className="text-[11px] tracking-[0.18em] text-blue-100/70 font-medium uppercase text-center px-4">
              {`Welcome back, ${loginTarget.name}`}
            </h1>
          )}
          {returningLogin && (
            <h1 className="text-[11px] tracking-[0.18em] text-blue-100/70 font-medium uppercase text-center px-4">
              Log in with your username
            </h1>
          )}
        </div>

        {!loginTarget && !returningLogin && allIds.length > 6 && (
          <motion.div
            className="relative group mb-3.5 shrink-0 rounded-[14px]"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(255,214,0,0.65), 0 2px 16px rgba(255,214,0,0.45)',
                '0 0 0 10px rgba(255,214,0,0), 0 2px 16px rgba(255,214,0,0.45)',
              ],
            }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          >
            <div className="relative flex items-center rounded-[14px] bg-white border-2 border-[#c9781a]">
              <div className="pl-4 pr-2 text-[#c9781a]">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players..."
                className="w-full bg-transparent py-[14px] pr-4 text-[16px] sm:text-[15px] font-semibold text-[#2a1505] placeholder:text-[#8b5e2a]/70 placeholder:font-medium focus:outline-none"
              />
            </div>
          </motion.div>
        )}

        {!loginTarget && !returningLogin && (
          <div className="flex-1 min-h-0 relative">
            <div className="h-full overflow-y-auto pr-1 -mr-1 custom-scrollbar pb-4">
              {visibleIds.length === 0 && (
                <p className="text-center text-blue-100/60 text-sm py-6">No players match &quot;{searchQuery}&quot;</p>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                {visibleIds.map((id, i) => {
                  const user = USERS[id];
                  const palette = AVATAR_PALETTES[allIds.indexOf(id) % AVATAR_PALETTES.length];

                  return (
                    <motion.button
                      key={id}
                      onClick={() => handleRowClick(id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 10) * 0.03 }}
                      className="group text-left relative rounded-[16px] bg-white border border-[#c9a87a] p-3 flex flex-col items-center gap-2 text-center transition-colors duration-200 hover:border-[#c9781a] hover:bg-[#fdf6e8] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    >
                      <RosterAvatar avatar={user.avatar} name={user.name} palette={palette} size={56} />

                      <div className="min-w-0 w-full flex flex-col gap-[1px]">
                        <span className="text-[13.5px] font-bold leading-tight tracking-[-0.01em] text-[#2a1505] transition-colors truncate">
                          {user.name}
                        </span>
                        <span className="text-[10.5px] font-medium tracking-wide text-[#6b4820]">{user.grade}</span>
                        {user.school && (
                          <span className="text-[9.5px] font-medium text-[#8b5e2a] tracking-wide truncate">
                            {user.school}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              <div className="h-2" />
            </div>
          </div>
        )}

        {/* Password prompt for the clicked player */}
        {loginTarget && (
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-[18px] bg-white border border-[#c9a87a] p-6 sm:p-8 shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_10px_30px_rgba(201,120,26,0.15)]"
            >
              <div className="flex flex-col items-center text-center mb-5">
                <RosterAvatar
                  avatar={USERS[loginTarget.id].avatar}
                  name={loginTarget.name}
                  palette={AVATAR_PALETTES[allIds.indexOf(loginTarget.id) % AVATAR_PALETTES.length]}
                  size={64}
                />
                <h2 className="text-lg font-bold text-[#2a1505] mt-3 mb-1">{loginTarget.name}</h2>
                <p className="text-[#6b4820] text-sm">Enter your password to continue.</p>
              </div>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <input
                  type="password"
                  autoFocus
                  placeholder="Password"
                  className="w-full bg-white border border-[#c9a87a] rounded-[14px] p-3.5 text-[16px] text-[#2a1505] placeholder:text-[#8b5e2a]/60 focus:border-[#c9781a] outline-none"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
                {loginError && <p className="text-red-600 text-xs">{loginError}</p>}
                <div className="flex gap-3 items-stretch">
                  <GameButton
                    type="button"
                    variant="quest"
                    color="#d4d4d4"
                    onClick={() => setLoginTarget(null)}
                    className="flex-1"
                    style={{ fontSize: 15 }}
                  >
                    ← Back
                  </GameButton>
                  <GameButton
                    type="submit"
                    variant="quest"
                    color="#d97706"
                    disabled={loggingIn || !passwordInput}
                    className="flex-1"
                    style={{ fontSize: 15 }}
                  >
                    {loggingIn ? 'Checking...' : 'Enter →'}
                  </GameButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Returning-player login: username + PIN, for accounts that don't
            (or no longer) appear as a roster row above — chiefly a
            self-registered child who hasn't linked a parent yet. */}
        {returningLogin && (
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-[18px] bg-white border border-[#c9a87a] p-6 sm:p-8 shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_10px_30px_rgba(201,120,26,0.15)]"
            >
              <h2 className="text-lg font-bold text-[#2a1505] mb-1">Log In</h2>
              <p className="text-[#6b4820] text-sm mb-5">Don&apos;t see your name above? Enter your username and PIN.</p>
              <form onSubmit={handleReturningLoginSubmit} className="space-y-4">
                <input
                  type="text"
                  autoFocus
                  placeholder="Username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full bg-white border border-[#c9a87a] rounded-[14px] p-3.5 text-[16px] text-[#2a1505] placeholder:text-[#8b5e2a]/60 focus:border-[#c9781a] outline-none"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="PIN"
                  className="w-full bg-white border border-[#c9a87a] rounded-[14px] p-3.5 text-[16px] text-[#2a1505] placeholder:text-[#8b5e2a]/60 focus:border-[#c9781a] outline-none"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
                {loginError && <p className="text-red-600 text-xs">{loginError}</p>}
                <div className="flex gap-3 items-stretch">
                  <GameButton
                    type="button"
                    variant="quest"
                    color="#d4d4d4"
                    onClick={closeReturningLogin}
                    className="flex-1"
                    style={{ fontSize: 15 }}
                  >
                    ← Back
                  </GameButton>
                  <GameButton
                    type="submit"
                    variant="quest"
                    color="#d97706"
                    disabled={loggingIn || !usernameInput || !passwordInput}
                    className="flex-1"
                    style={{ fontSize: 15 }}
                  >
                    {loggingIn ? 'Checking...' : 'Enter →'}
                  </GameButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {!loginTarget && !returningLogin && (
          <div className="pt-3.5 pb-1 flex flex-col items-center gap-3 shrink-0">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex gap-2.5 w-full"
            >
              <a
                href="/child-signup"
                className="flex-1 text-center rounded-full bg-[#f5c542] text-[#2a1505] font-extrabold text-[13px] py-3 border border-black/10 shadow-[0_2px_0_rgba(0,0,0,0.25)] hover:brightness-105 active:translate-y-px transition"
              >
                Create Account
              </a>
              <button
                type="button"
                onClick={openReturningLogin}
                className="flex-1 text-center rounded-full bg-white text-[#2a1505] font-extrabold text-[13px] py-3 border border-[#c9a87a] shadow-[0_2px_0_rgba(0,0,0,0.08)] hover:bg-[#fdf6e8] active:translate-y-px transition"
              >
                Can&apos;t Find Account
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="flex items-center gap-2.5 text-[12px] font-medium"
            >
              <a href="/parent-login" className="text-[#f5c542] hover:text-[#ffdd88] transition-colors tracking-wide py-1">Parent Login</a>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-[10.5px] tracking-[0.06em] text-blue-100/40 font-medium"
            >
              Learning Hall Technologies
            </motion.p>
          </div>
        )}
      </div>
    </div>
  );
}
