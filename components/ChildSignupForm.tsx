'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, ensureAnonymousSession } from '@/lib/supabase';
import { setActiveUser, recordLastLogin, registerChildUser } from '@/lib/userSession';
import { getOrCreateSessionId } from '@/lib/analytics';
import ChildAccountForm, { ChildFormData, emptyChildForm } from '@/components/ChildAccountForm';
import { validateReferralCode } from '@/lib/referral';

interface ChildSignupFormProps {
  source: 'demo_banner' | 'organic';
}

// Lets a child create their own account with no parent required yet — see
// docs/parent-child-linking-design.md. Mirrors the "Try Demo" flow in
// app/welcome/page.tsx (anonymous session -> server route -> RPC), except
// this creates a real, permanent `children` row instead of an ephemeral
// demo account, and logs the child straight into it afterward.
export default function ChildSignupForm({ source }: ChildSignupFormProps) {
  const router = useRouter();
  const [data, setData] = useState<ChildFormData>(emptyChildForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Referral code state
  const [referralCode, setReferralCode] = useState('');
  const [referralState, setReferralState] = useState<
    'idle' | 'checking' | 'valid' | 'invalid'
  >('idle');
  const [referralReferrerName, setReferralReferrerName] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live-validate referral code with debounce
  useEffect(() => {
    const code = referralCode.trim();
    if (!code) { setReferralState('idle'); return; }
    if (code.length < 4) { setReferralState('idle'); return; }

    setReferralState('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const result = await validateReferralCode(code);
      if (result) {
        setReferralState('valid');
        setReferralReferrerName(result.referrerUsername);
      } else {
        setReferralState('invalid');
        setReferralReferrerName('');
      }
    }, 500);
  }, [referralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!data.fullName.trim() || !data.schoolName.trim() || !data.username.trim() || data.pin.length !== 4) {
      setError('Please fill in every field, including a 4-digit PIN.');
      return;
    }

    setSubmitting(true);
    try {
      const authUid = await ensureAnonymousSession();
      if (!authUid) throw new Error('Could not start a session. Check your connection and try again.');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Could not start a session. Check your connection and try again.');

      const res = await fetch('/api/child-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: session.access_token,
          username: data.username,
          pin: data.pin,
          fullName: data.fullName,
          grade: data.grade,
          gender: data.gender,
          schoolName: data.schoolName,
          avatar: data.avatar,
          source,
          sessionId: getOrCreateSessionId(),
          referralCode: referralCode.trim() || null,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Could not create your account.');
      }

      registerChildUser({
        id: result.id,
        fullName: data.fullName,
        grade: data.grade,
        gender: data.gender,
        avatar: data.avatar,
      });
      setActiveUser(result.id);
      await recordLastLogin(result.id);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
      <ChildAccountForm label="Your details" data={data} onChange={setData} />

      {/* Optional referral code field */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-gray-300">
          Referral Code <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            maxLength={4}
            placeholder="e.g. aB3z"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            className={`w-full rounded-lg px-4 py-2.5 bg-gray-800 border font-mono tracking-widest
                        text-white placeholder-gray-600 outline-none transition-colors
                        ${referralState === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : referralState === 'invalid'
                          ? 'border-amber-500 focus:border-amber-400'
                          : 'border-gray-700 focus:border-indigo-500'}`}
          />
          {referralState === 'checking' && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              Checking…
            </span>
          )}
        </div>

        {referralState === 'valid' && (
          <p className="text-xs text-green-400">
            ✓ Valid code from{' '}
            <span className="font-semibold">{referralReferrerName}</span>!
            You&apos;ll receive 1 Growth Pill + 100 Gold on your first login.
          </p>
        )}
        {referralState === 'invalid' && (
          <p className="text-xs text-amber-400">
            ⚠ That code wasn&apos;t found — double-check and try again, or leave it blank to continue.
          </p>
        )}
        {referralState === 'idle' && referralCode.trim().length === 0 && (
          <p className="text-xs text-gray-600">
            Have a friend&apos;s referral code? Enter it here for a bonus!
          </p>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3"
      >
        {submitting ? 'Creating your account…' : 'Start Playing'}
      </button>

      <p className="text-center text-xs text-gray-500">
        You can play right away. Ask a parent to link their email later from inside the
        game to unlock leaderboards and PvP battles, and earn a 100 gold bonus.
      </p>
    </form>
  );
}
