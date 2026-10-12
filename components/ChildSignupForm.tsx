'use client';
import { checkSignupNames } from '@/lib/nameFilter';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, ensureAnonymousSession } from '@/lib/supabase';
import { setActiveUser, recordLastLogin, registerChildUser, USERS } from '@/lib/userSession';
import { saveOfflineProfile } from '@/lib/offlineSnapshot';
import { rememberHeroOnDevice } from '@/lib/deviceHeroes';
import { getOrCreateSessionId, getStoredAttribution } from '@/lib/analytics';
import { trackPixelEvent } from '@/lib/fbPixel';
import ChildAccountForm, { ChildFormData, emptyChildForm } from '@/components/ChildAccountForm';
import GameButton from '@/components/GameButton';
import { validateReferralCode } from '@/lib/referral';
import TurnstileWidget from '@/components/TurnstileWidget';
import { prefetchOriginStoryStart } from '@/lib/intro/storyPrefetch';

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
  const [turnstileToken, setTurnstileToken] = useState('');
  // Bumped after every submit attempt: Turnstile tokens are single-use, so a
  // retry (e.g. after "username already taken") needs a fresh widget.
  const [turnstileKey, setTurnstileKey] = useState(0);

  // Referral code state — pre-filled from ?ref= URL param if provided
  const [referralCode, setReferralCode] = useState(initialReferralCode ?? '');
  // Result of the last finished check, tagged with the code it was for; the
  // displayed state is derived from it so a newer code reads as "checking".
  const [referralCheck, setReferralCheck] = useState<{ code: string; referrerName: string | null } | null>(null);
  const trimmedReferral = referralCode.trim();
  const referralState: 'idle' | 'checking' | 'valid' | 'invalid' =
    trimmedReferral.length < 4 ? 'idle'
    : referralCheck?.code !== trimmedReferral ? 'checking'
    : referralCheck.referrerName !== null ? 'valid' : 'invalid';
  const referralReferrerName = referralState === 'valid' ? referralCheck?.referrerName ?? '' : '';

  // Live-validate referral code with debounce
  useEffect(() => {
    const code = referralCode.trim();
    if (code.length < 4) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await validateReferralCode(code);
      if (!cancelled) setReferralCheck({ code, referrerName: result ? result.referrerUsername : null });
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [referralCode]);

  const storyPrefetched = useRef(false);
  const prefetchStoryOnce = () => {
    if (storyPrefetched.current) return;
    storyPrefetched.current = true;
    prefetchOriginStoryStart();
  };

  // The server found an active account with this full name at this school
  // (app/api/child-signup). Most repeat accounts were kids who had lost their
  // way back into the first one, so they're offered the login first.
  const [possibleDuplicate, setPossibleDuplicate] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(false);
  };

  const submit = async (confirmNewAccount: boolean) => {
    setError('');

    if (!data.fullName.trim() || !data.schoolName.trim() || !data.username.trim() || data.pin.length !== 4) {
      setError('Please fill in every field, including a 4-digit PIN.');
      return;
    }

    setSubmitting(true);
    try {
      const nameProblem = await checkSignupNames(data.username, data.fullName, data.schoolName);
      if (nameProblem) {
        setError(nameProblem);
        return;
      }

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
          turnstileToken,
          confirmNewAccount,
        }),
      });
      const result = await res.json();
      if (result.possibleDuplicate) {
        // Checked before Turnstile, so the token is still good for "make my new account".
        setPossibleDuplicate(true);
        return;
      }
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
      // Gives them a card under "Played on this device" on the login screen,
      // and lets a reload keep them signed in (Dashboard's hydrate).
      saveOfflineProfile(USERS[result.id]);
      await Promise.all([recordLastLogin(result.id), rememberHeroOnDevice(result.id, data.pin)]);
      router.push('/');
    } catch (err) {
      setError((err instanceof Error && err.message) || 'Something went wrong. Please try again.');
      setTurnstileToken('');
      setTurnstileKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // The origin story is the next screen after signup: start downloading its
    // opening once the kid starts typing (lib/intro/storyPrefetch.ts).
    <form onSubmit={handleSubmit} onFocusCapture={prefetchStoryOnce} className="space-y-5">
      <ChildAccountForm
        label="Your hero details"
        data={data}
        onChange={(next) => { setData(next); setPossibleDuplicate(false); }}
        theme="light"
      />

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

      <TurnstileWidget key={turnstileKey} onToken={setTurnstileToken} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[14px] px-3 py-2">
          <p className="text-base text-red-600">{error}</p>
        </div>
      )}

      {possibleDuplicate ? (
        <div className="rounded-[14px] border border-[#8b5e2a] bg-[#f0ddb8] px-4 py-4 space-y-3">
          <p className="text-lg font-bold text-[#2a1505]">You might already have an account</p>
          <p className="text-base text-[#3a2610]">
            A hero named <span className="font-bold">{data.fullName.trim()}</span> from {data.schoolName.trim()} is
            already playing. If that&apos;s you, log in so you keep your curios and gold.
          </p>
          <GameButton
            type="button"
            variant="quest"
            color="#d97706"
            onClick={() => router.push('/?login=1')}
            className="w-full"
            style={{ fontSize: 17 }}
          >
            Log In Instead
          </GameButton>
          <button
            type="button"
            onClick={() => void submit(true)}
            disabled={submitting}
            className="w-full py-2 text-base font-bold text-[#6b4820] hover:text-[#2a1505] disabled:opacity-50"
          >
            {submitting ? 'Creating your hero…' : "That's not me. Make my new account"}
          </button>
        </div>
      ) : (
        <GameButton
          type="submit"
          variant="quest"
          disabled={submitting}
          className="w-full"
          style={{ fontSize: 17 }}
        >
          {submitting ? 'Creating your hero…' : 'Start Your Adventure!'}
        </GameButton>
      )}

      <p className="text-center text-sm text-stone-400 leading-relaxed">
        You can play right away. Link a parent email later from inside the game to
        unlock leaderboards, PvP battles, and earn a bonus 💰 100 Gold.
      </p>
    </form>
  );
}
