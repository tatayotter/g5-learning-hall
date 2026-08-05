'use client';
import { useState, useEffect } from 'react';
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
    return <p className="text-center text-gray-500 text-sm">Checking your invite…</p>;
  }

  if (stage === 'invalid') {
    return (
      <div className="text-center space-y-2">
        <p className="text-red-400 font-semibold">This link is invalid or has expired.</p>
        <p className="text-gray-500 text-sm">
          Invite links only last 30 minutes and can only be used once. Ask your child to send a new one
          from inside the game.
        </p>
      </div>
    );
  }

  if (stage === 'done') {
    return (
      <div className="text-center space-y-3">
        <p className="text-2xl">🎉</p>
        <p className="text-white font-bold">You&apos;re linked to {childFirstName}!</p>
        {goldAwarded && (
          <p className="text-amber-400 text-sm">{childFirstName} just earned a 100 gold bonus.</p>
        )}
        <button
          onClick={() => router.push('/parent-dashboard')}
          className="mt-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6"
        >
          Go to your dashboard
        </button>
      </div>
    );
  }

  if (stage === 'awaiting-email-confirmation') {
    return (
      <div className="text-center space-y-3">
        <p className="text-white font-semibold">Almost there — confirm your email</p>
        <p className="text-gray-500 text-sm">
          We sent a confirmation link to <span className="text-gray-300">{email}</span>. Click it, then
          come back here.
        </p>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          onClick={retryAfterEmailConfirmation}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6"
        >
          I&apos;ve confirmed my email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-white font-semibold">{childFirstName} wants to link you as their parent</p>
        <p className="text-gray-500 text-sm mt-1">
          Confirming lets you see their progress and unlocks leaderboards and PvP for their account.
        </p>
      </div>

      <div className="flex rounded-lg bg-neutral-950 border border-neutral-700 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 rounded-md py-1.5 font-semibold ${mode === 'signup' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
        >
          I&apos;m new here
        </button>
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`flex-1 rounded-md py-1.5 font-semibold ${mode === 'signin' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
        >
          I already have an account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
          minLength={6}
          required
        />
        <p className="text-xs text-gray-600">
          Use the same email address this invite was sent to.
        </p>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={stage === 'confirming'}
          className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5"
        >
          {stage === 'confirming' ? 'Linking…' : 'Confirm Link'}
        </button>
      </form>
    </div>
  );
}
