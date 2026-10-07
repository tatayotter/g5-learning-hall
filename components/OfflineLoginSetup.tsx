// components/OfflineLoginSetup.tsx
//
// One-time ask for heroes who logged in before offline logins existed (lib/deviceHeroes.ts):
// they have no PIN check saved on this device, so they couldn't log back in here with no
// internet. Typing the password once (checked by the server, like the login screen) saves it.
// Same wood-plank dialog as the logout confirmation in SidebarRail.
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Nail, woodTextureStyle } from '@/components/battle/MonsterHpPanel';
import GameButton, { questButtonDropShadow } from '@/components/GameButton';
import { getChildIds, type UserId } from '@/lib/userSession';
import { rememberHeroOnDevice, snoozeOfflineLoginSetup } from '@/lib/deviceHeroes';
import { playPageFlip } from '@/lib/sounds';

export default function OfflineLoginSetup({ userId, onClose }: { userId: UserId; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || checking) return;
    setChecking(true);
    setError('');
    try {
      const res = await fetch(getChildIds().includes(userId) ? '/api/child-login' : '/api/classmate-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, password }),
      });
      if (!res.ok) {
        setError('❌ That password isn\'t right. Try again.');
      } else {
        await rememberHeroOnDevice(userId, password);
        playPageFlip();
        setDone(true);
      }
    } catch {
      setError("📡 Can't connect right now. Try again in a bit.");
    }
    setChecking(false);
  };

  const notNow = () => {
    snoozeOfflineLoginSetup(userId);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-[#0a0807]/70 z-[95] flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        role="dialog"
        aria-label="Play without internet"
        className="relative border-2 border-[#4a2f18] rounded-2xl p-6 w-full max-w-xs text-center"
        style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
      >
        <Nail className="top-2 left-2" />
        <Nail className="top-2 right-2" />
        <Nail className="bottom-2 left-2" />
        <Nail className="bottom-2 right-2" />
        <div className="text-4xl mb-2" aria-hidden>{done ? '✅' : '📡'}</div>
        {done ? (
          <>
            <p className="text-[#ffffff] font-bold text-lg mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>You&apos;re all set!</p>
            <p className="text-[#e8d0a0] text-xs mb-5">Now you can log in and play here even when there&apos;s no internet.</p>
            <GameButton variant="quest" color="#16a34a" className="w-full" onClick={onClose}>
              Got it
            </GameButton>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="text-[#ffffff] font-bold text-lg mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>Play without internet</p>
            <p className="text-[#e8d0a0] text-xs mb-4">
              Type your password once, so you can log in here even when there&apos;s no internet.
            </p>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Password"
              aria-label="Password"
              className="w-full rounded-lg border-2 border-[#8b5e2a] bg-[#fdf6e8] px-3 py-2 text-[16px] font-semibold text-[#2a1505] placeholder:text-[#8b5e2a]/70 focus:outline-none focus:border-[#d4a017]"
            />
            {error && <p className="mt-2 text-xs font-bold text-[#fca5a5]">{error}</p>}
            <div className="flex gap-3 mt-4" style={{ fontSize: 14 }}>
              <GameButton type="button" variant="quest" color="#57534e" className="flex-1" disabled={checking} onClick={notNow}>
                Not now
              </GameButton>
              <GameButton type="submit" variant="quest" color="#d4a017" className="flex-1" disabled={checking || !password}>
                {checking ? 'Checking…' : 'Done'}
              </GameButton>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
