'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, ensureAnonymousSession } from '@/lib/supabase';
import { setActiveUser, recordLastLogin, registerChildUser } from '@/lib/userSession';
import { getOrCreateSessionId, getStoredAttribution } from '@/lib/analytics';
import { trackPixelEvent } from '@/lib/fbPixel';
import ChildAccountForm, { ChildFormData, emptyChildForm } from '@/components/ChildAccountForm';
import GameButton from '@/components/GameButton';
import { validateReferralCode } from '@/lib/referral';

interface ChildSignupFormProps {
  source: 'organic';
  initialReferralCode?: string;
}

// Lets a child create their own account with no parent required yet — see
// docs/parent-child-linking-design.md. Creates a real, permanent `children`
// row and logs the child straight into it afterward.
export default function ChildSignupForm({ source, initialReferralCode }: ChildSignupFormProps) {
  const router = useRouter();
  const [data, setData] = useState<ChildFormData>(emptyChildForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Referral code state — pre-filled from ?ref= URL param if provided
  const [referralCode, setReferralCode] = useState(initialReferralCode ?? '');
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
          attribution: getStoredAttribution(),
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Could not create your account.');
      }

      trackPixelEvent('CompleteRegistration', { content_name: 'child_signup' });

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <ChildAccountForm label="Your hero details" data={data} onChange={setData} theme="light" />

      {/* Referral code */}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-[#7a4a0f] uppercase tracking-wider">
          Referral Code <span className="text-[#8b5e2a]/70 font-normal normal-case">— optional</span>
        </label>
        <div className="relative">
          <input
            type="text"
            maxLength={4}
            placeholder="e.g. aB3z"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            className={`w-full rounded-[14px] px-4 py-3 bg-white border font-mono text-base tracking-widest
                        text-[#2a1505] placeholder:text-[#8b5e2a]/60 outline-none transition-colors
                        ${referralState === 'valid'
                          ? 'border-green-500 focus:border-green-600'
                          : referralState === 'invalid'
                          ? 'border-amber-400 focus:border-amber-500'
                          : 'border-[#c9a87a] focus:border-[#c9781a]'}`}
          />
          {referralState === 'checking' && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#8b5e2a]/70">
              Checking…
            </span>
          )}
        </div>

        {referralState === 'valid' && (
          <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-[14px] px-3 py-2">
            <span className="text-green-600 font-bold mt-0.5">✔</span>
            <p className="text-sm text-green-700">
              Code from <span className="font-bold">{referralReferrerName}</span> — you&apos;ll receive{' '}
              <span className="font-bold">1 Growth Pill + 100 Gold</span> on your first login!
            </p>
          </div>
        )}
        {referralState === 'invalid' && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-[14px] px-3 py-2">
            <span className="text-amber-600 font-bold mt-0.5">!</span>
            <p className="text-sm text-amber-700">
              That code wasn&apos;t found — double-check it, or leave it blank to continue.
            </p>
          </div>
        )}
        {referralState === 'idle' && referralCode.trim().length === 0 && (
          <p className="text-sm text-[#8b5e2a]/80">
            Have a friend&apos;s code? Enter it to earn bonus Gold on signup!
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[14px] px-3 py-2">
          <p className="text-base text-red-600">{error}</p>
        </div>
      )}

      <GameButton
        type="submit"
        variant="quest"
        disabled={submitting}
        className="w-full"
        style={{ fontSize: 17 }}
      >
        {submitting ? 'Creating your hero…' : 'Start Your Adventure!'}
      </GameButton>

      <p className="text-center text-sm text-stone-400 leading-relaxed">
        You can play right away. Link a parent email later from inside the game to
        unlock leaderboards, PvP battles, and earn a bonus 💰 100 Gold.
      </p>
    </form>
  );
}
