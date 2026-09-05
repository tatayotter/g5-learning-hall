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
}: {
  avatar: string;
  name: string;
  palette: { bg: string; border: string; text: string };
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="shrink-0 w-[42px] h-[42px] rounded-[10px] border flex items-center justify-center relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]"
      style={{ backgroundColor: palette.bg, borderColor: palette.border }}
    >
      <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(#2a1505_1px,transparent_1px),linear-gradient(90deg,#2a1505_1px,transparent_1px)] bg-[size:6px_6px]" />
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

      <div className="relative z-10 w-full max-w-[480px] h-[100dvh] flex flex-col px-[18px] sm:px-6 py-5 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 pt-2 pb-5">
          <img
            src="/learning_hall_full_logo_optimize.png"
            alt="Learning Hall"
            className="h-20 w-auto object-contain"
          />
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
          <div className="relative group mb-5">
            <div className="absolute -inset-px rounded-[14px] bg-gradient-to-b from-[#c9781a]/40 to-transparent opacity-0 group-focus-within:opacity-100 blur-[1px] transition-opacity" />
            <div className="relative flex items-center rounded-[14px] bg-white border border-[#c9a87a] shadow-[0_0_0_1px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.6)]">
              <div className="pl-4 pr-2 text-[#8b5e2a]">
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
                className="w-full bg-transparent py-[13px] pr-4 text-[14px] font-medium text-[#2a1505] placeholder:text-[#8b5e2a]/70 focus:outline-none"
              />
            </div>
          </div>
        )}

        {!loginTarget && !returningLogin && (
          <div className="flex-1 min-h-0 relative">
            <div className="h-full overflow-y-auto pr-1 -mr-1 custom-scrollbar space-y-[10px] pb-4">
              {visibleIds.length === 0 && (
                <p className="text-center text-blue-100/60 text-sm py-6">No players match &quot;{searchQuery}&quot;</p>
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
                    className="group w-full text-left relative rounded-[14px] bg-white border border-[#c9a87a] p-3 flex items-center gap-3 transition-colors duration-200 hover:border-[#c9781a] hover:bg-[#fdf6e8]"
                  >
                    <RosterAvatar avatar={user.avatar} name={user.name} palette={palette} />

                    <div className="flex-1 min-w-0 flex flex-col gap-[1px]">
                      <span className="text-[15px] font-bold leading-none tracking-[-0.01em] text-[#2a1505] transition-colors truncate">
                        {user.name}
                      </span>
                      <span className="text-[11.5px] font-medium tracking-wide text-[#6b4820] mt-[3px]">{user.grade}</span>
                    </div>

                    {user.school && (
                      <span className="shrink-0 max-w-[110px] text-right text-[11px] font-medium text-[#8b5e2a] tracking-wide truncate">
                        {user.school}
                      </span>
                    )}
                  </motion.button>
                );
              })}
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
              className="w-full rounded-[14px] bg-white border border-[#c9a87a] p-8 shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_10px_30px_rgba(201,120,26,0.15)]"
            >
              <h2 className="text-lg font-bold text-[#2a1505] mb-1">{loginTarget.name}</h2>
              <p className="text-[#6b4820] text-sm mb-5">Enter your password to continue.</p>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <input
                  type="password"
                  autoFocus
                  placeholder="Password"
                  className="w-full bg-white border border-[#c9a87a] rounded-[14px] p-3 text-[#2a1505] placeholder:text-[#8b5e2a]/60 focus:border-[#c9781a] outline-none"
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
              className="w-full rounded-[14px] bg-white border border-[#c9a87a] p-8 shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_10px_30px_rgba(201,120,26,0.15)]"
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
                  className="w-full bg-white border border-[#c9a87a] rounded-[14px] p-3 text-[#2a1505] placeholder:text-[#8b5e2a]/60 focus:border-[#c9781a] outline-none"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="PIN"
                  className="w-full bg-white border border-[#c9a87a] rounded-[14px] p-3 text-[#2a1505] placeholder:text-[#8b5e2a]/60 focus:border-[#c9781a] outline-none"
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
          <div className="pt-4 pb-2 flex flex-col items-center gap-3.5 shrink-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="flex items-center gap-2.5 text-[12.5px] font-medium"
            >
              <a href="/register" className="text-[#f5c542] hover:text-[#ffdd88] transition-colors tracking-wide">Register as a Parent</a>
              <span className="text-blue-100/30 text-[10px]">·</span>
              <a href="/parent-login" className="text-[#f5c542] hover:text-[#ffdd88] transition-colors tracking-wide">Parent Login</a>
              <span className="text-blue-100/30 text-[10px]">·</span>
              <a href="/child-signup" className="text-[#f5c542] hover:text-[#ffdd88] transition-colors tracking-wide">Kids: Play Now</a>
              <span className="text-blue-100/30 text-[10px]">·</span>
              <button type="button" onClick={openReturningLogin} className="text-[#f5c542] hover:text-[#ffdd88] transition-colors tracking-wide">Kids: Log In</button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-[11px] tracking-[0.06em] text-blue-100/40 font-medium mt-1"
            >
              Ruelo Learning Hall · Family Edition
            </motion.p>
          </div>
        )}
      </div>
    </div>
  );
}
