'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Stage =
  | 'loading'
  | 'invalid'
  | 'ready'
  | 'awaiting-email-confirmation'
  | 'confirming'
  | 'done'
  | 'error';

type AuthMode = 'signup' | 'signin';

// Landing page for the link a parent clicks from their invite email — see
// docs/parent-child-linking-design.md. Every failure path (bad token,
// expired token, wrong-email sign-in) surfaces the same generic message
// deliberately, matching preview_parent_link/confirm_parent_link's own
// anti-enumeration design; this page adds a client-side hint rather than
// a distinct error, since the RPCs won't tell us which case occurred.
export default function LinkParentConfirm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [stage, setStage] = useState<Stage>('loading');
  const [childFirstName, setChildFirstName] = useState('');
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [goldAwarded, setGoldAwarded] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stage === 'ready') firstFieldRef.current?.focus();
  }, [stage, mode]);

  useEffect(() => {
    if (!token) {
      setStage('invalid');
      return;
    }
    supabase.rpc('preview_parent_link', { p_token: token }).then(({ data, error }) => {
      if (error || !data || !data[0]) {
        setStage('invalid');
        return;
      }
      setChildFirstName(data[0].child_first_name);
      setStage('ready');
    });
  }, [token]);

  const attemptConfirm = async () => {
    setStage('confirming');
    setError('');
    const { data, error: confirmError } = await supabase.rpc('confirm_parent_link', { p_token: token });
    if (confirmError || !data) {
      setError(
        'This link is invalid or has expired, or the account you\'re signed in with doesn\'t match ' +
        'the email the invite was sent to. Make sure you\'re signed in with the same email that ' +
        'received this invite.'
      );
      setStage('ready');
      return;
    }
    setGoldAwarded(Boolean(data.gold_awarded));
    setStage('done');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup') {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (!signUpData.session) {
        // Email confirmation is required on this project before a session
        // is issued — wait for the parent to confirm, then let them retry.
        setStage('awaiting-email-confirmation');
        return;
      }
      await attemptConfirm();
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError('Incorrect email or password.');
        return;
      }
      await attemptConfirm();
    }
  };

  const retryAfterEmailConfirmation = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Still not confirmed yet — check your inbox for the confirmation email, then try again.');
      return;
    }
    await attemptConfirm();
  };

  if (stage === 'loading') {
    return <p className="text-center text-stone-500 text-base">Checking your invite…</p>;
  }

  if (stage === 'invalid') {
    return (
      <div className="text-center space-y-2">
        <p className="text-red-500 font-semibold text-lg">This link is invalid or has expired.</p>
        <p className="text-stone-500 text-base">
          Invite links only last 30 minutes and can only be used once. Ask your child to send a new one
          from inside the game.
        </p>
      </div>
    );
  }

  if (stage === 'done') {
    return (
      <div className="text-center space-y-3">
        <p className="text-3xl">🎉</p>
        <p className="text-slate-800 font-bold">You&apos;re linked to {childFirstName}!</p>
        {goldAwarded && (
          <p className="text-amber-600 text-base font-semibold">{childFirstName} just earned a 100 gold bonus.</p>
        )}
        <button
          onClick={() => router.push('/parent-dashboard')}
          className="mt-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-[#ffffff] font-bold text-base py-3 px-6 shadow-lg shadow-orange-500/25 transition-colors"
        >
          Go to your dashboard
        </button>
      </div>
    );
  }

  if (stage === 'awaiting-email-confirmation') {
    return (
      <div className="text-center space-y-3">
        <p className="text-slate-800 font-semibold text-lg">Almost there — confirm your email</p>
        <p className="text-stone-500 text-base">
          We sent a confirmation link to <span className="text-slate-700 font-medium">{email}</span>. Click it, then
          come back here.
        </p>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={retryAfterEmailConfirmation}
          className="rounded-xl bg-orange-500 hover:bg-orange-600 text-[#ffffff] font-bold text-base py-3 px-6 shadow-lg shadow-orange-500/25 transition-colors"
        >
          I&apos;ve confirmed my email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-slate-800 font-semibold text-lg">{childFirstName} wants to link you as their parent</p>
        <p className="text-stone-500 text-base mt-1">
          Confirming lets you see their progress and unlocks leaderboards and PvP for their account.
        </p>
      </div>

      <div className="flex rounded-xl bg-stone-100 border border-stone-200 p-1 text-base">
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 rounded-lg py-1.5 font-semibold transition-colors ${mode === 'signup' ? 'bg-orange-500 text-[#ffffff] shadow-sm' : 'text-stone-500'}`}
        >
          I&apos;m new here
        </button>
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`flex-1 rounded-lg py-1.5 font-semibold transition-colors ${mode === 'signin' ? 'bg-orange-500 text-[#ffffff] shadow-sm' : 'text-stone-500'}`}
        >
          I already have an account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <input
            ref={firstFieldRef}
            type="text"
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl bg-[#ffffff] border border-stone-300 px-4 py-3 text-base text-gray-900 placeholder-stone-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            autoComplete="name"
            required
          />
        )}
        <input
          ref={mode === 'signin' ? firstFieldRef : undefined}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl bg-[#ffffff] border border-stone-300 px-4 py-3 text-base text-gray-900 placeholder-stone-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
          autoComplete="email"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl bg-[#ffffff] border border-stone-300 px-4 py-3 text-base text-gray-900 placeholder-stone-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          minLength={6}
          required
        />
        <p className="text-sm text-stone-400">
          Use the same email address this invite was sent to.
        </p>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="text-base text-red-600">{error}</p>
          </div>
        )}
        <button
          type="submit"
          disabled={stage === 'confirming'}
          className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 text-[#ffffff] font-bold text-lg py-3.5 shadow-lg shadow-orange-500/25 transition-all"
        >
          {stage === 'confirming' ? 'Linking…' : `Confirm & Unlock ${childFirstName}'s Progress`}
        </button>
      </form>
    </div>
  );
}
