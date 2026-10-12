'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { linkIdentity, loginReturningChild, setActiveUser, USERS } from '@/lib/userSession';
import { saveOfflineProfile } from '@/lib/offlineSnapshot';
import { rememberHeroOnDevice } from '@/lib/deviceHeroes';
import { trackParentEvent } from '@/lib/analytics';

export interface CreatedChild {
  id: string;
  username: string;
  pin: string;
  fullName: string;
  grade: string;
  gender: 'boy' | 'girl';
  avatar: string;
  schoolName: string;
}

const SITE_URL = 'https://learninghallph.com';

function loginMessage(child: CreatedChild): string {
  const first = child.fullName.trim().split(/\s+/)[0];
  return [
    `Learning Hall login for ${first}`,
    '',
    `1. Open ${SITE_URL}`,
    '2. Tap "Log In"',
    `3. Username: ${child.username}`,
    `4. PIN: ${child.pin}`,
  ].join('\n');
}

// Shown right after /register instead of jumping to the dashboard. Before it,
// only 38% of children a parent created this way ever logged in: the parent
// landed on the dashboard with no hint of where or how the child plays, and
// the PIN was one tap and a "Show" away. Here the parent either opens the game
// for the child on this phone, or sends the login to the child's own phone.
export default function ChildReadyToPlay({ kids }: { kids: CreatedChild[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<{ id: string; how: 'share' | 'copy' } | null>(null);
  const [copyFallbackId, setCopyFallbackId] = useState<string | null>(null);

  useEffect(() => {
    void trackParentEvent('parent_handoff_shown', { children: kids.length });
  }, [kids.length]);

  const playHere = async (child: CreatedChild) => {
    setBusyId(child.id);
    setError('');
    // Logged while the parent is still signed in: linkIdentity below swaps
    // this device over to the child.
    await trackParentEvent('parent_handoff_play_here');
    try {
      const res = await fetch('/api/child-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: child.id, password: child.pin }),
      });
      const body = await res.json().catch(() => null);
      // Signs the parent out on this device (lib/supabase.ts:ensureAnonymousSession).
      if (!res.ok || !body?.success || !(await linkIdentity(child.id, child.pin))) throw new Error('login failed');
      loginReturningChild({
        id: child.id,
        fullName: body.fullName,
        grade: body.grade,
        avatar: body.avatar,
        gender: body.gender === 'girl' ? 'girl' : 'boy',
        school: body.schoolName || undefined,
      });
      setActiveUser(child.id);
      saveOfflineProfile(USERS[child.id]);
      await rememberHeroOnDevice(child.id, child.pin);
      router.push('/');
    } catch {
      setError("Couldn't open the game. Check your internet and try again.");
      setBusyId(null);
    }
  };

  const sendLogin = async (child: CreatedChild) => {
    setError('');
    const text = loginMessage(child);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
        setSent({ id: child.id, how: 'share' });
        void trackParentEvent('parent_handoff_shared', { method: 'share' });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setSent({ id: child.id, how: 'copy' });
      void trackParentEvent('parent_handoff_shared', { method: 'copy' });
    } catch {
      setCopyFallbackId(child.id);
      void trackParentEvent('parent_handoff_shared', { method: 'manual' });
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-display font-bold text-slate-800">
          {kids.length > 1 ? 'Your children are ready to play' : `${kids[0].fullName.trim().split(/\s+/)[0]} is ready to play`}
        </h2>
        <p className="text-base text-slate-500">One last step: get the game open for them.</p>
      </div>

      {kids.map((child) => {
        const first = child.fullName.trim().split(/\s+/)[0];
        return (
          <div key={child.id} className="bg-[#ffffff] border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <img src={child.avatar} alt="" className="w-14 h-14 object-contain shrink-0" />
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-800 truncate">{child.fullName}</p>
                <p className="text-sm text-stone-500 truncate">{child.grade} · {child.schoolName}</p>
              </div>
            </div>

            <dl className="rounded-xl bg-amber-50 border border-amber-200 divide-y divide-amber-200 text-base">
              <div className="flex justify-between gap-3 px-4 py-2.5">
                <dt className="text-stone-500">Website</dt>
                <dd className="font-semibold text-slate-800">learninghallph.com</dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-2.5">
                <dt className="text-stone-500">Username</dt>
                <dd className="font-semibold text-slate-800 break-all text-right">{child.username}</dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-2.5">
                <dt className="text-stone-500">PIN</dt>
                <dd className="font-semibold text-slate-800 tabular-nums tracking-[0.15em]">{child.pin}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => playHere(child)}
              disabled={busyId !== null}
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 text-[#ffffff] font-bold text-lg py-3.5 shadow-lg shadow-orange-500/25 transition-all"
            >
              {busyId === child.id ? 'Opening the game…' : `Let ${first} play now on this phone`}
            </button>
            <button
              type="button"
              onClick={() => sendLogin(child)}
              disabled={busyId !== null}
              className="w-full rounded-xl border border-stone-300 text-slate-700 hover:border-orange-300 hover:text-orange-700 disabled:opacity-50 font-bold text-base py-3 transition-colors"
            >
              {sent?.id !== child.id ? `${first} has ${child.gender === 'girl' ? 'her' : 'his'} own phone? Send the login`
                : sent.how === 'share' ? 'Login sent. Send it again'
                : 'Login copied. Paste it in Messenger or a text'}
            </button>
            {copyFallbackId === child.id && (
              <p className="text-sm text-stone-500">Copy this and send it to {first}:</p>
            )}
            {copyFallbackId === child.id && (
              <textarea
                readOnly
                value={loginMessage(child)}
                rows={6}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-slate-700"
              />
            )}
          </div>
        );
      })}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <p className="text-base text-red-600">{error}</p>
        </div>
      )}

      <p className="text-sm text-stone-500 text-center">
        Playing on this phone signs you out of the parent dashboard here. Sign back in anytime from Parent Login.
        You can always see the username and PIN in your dashboard.
      </p>
      <button
        type="button"
        onClick={() => { void trackParentEvent('parent_handoff_dashboard'); router.push('/parent-dashboard'); }}
        disabled={busyId !== null}
        className="w-full rounded-xl text-stone-500 hover:text-slate-800 font-bold text-base py-2 transition-colors"
      >
        Go to my dashboard
      </button>
    </div>
  );
}
