'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getOrCreateSessionId } from '@/lib/analytics';
import { trackPixelEvent } from '@/lib/fbPixel';
import ChildAccountForm, { ChildFormData, emptyChildForm } from '@/components/ChildAccountForm';

interface ParentRegisterFormProps {
  source: 'organic';
}

const STEPS = ['Your details', 'Add your child'] as const;

// Split into two short steps rather than one long scroll — a shorter form
// with visible progress consistently completes better than a long one, even
// when the total field count is the same. Step 1 collects the parent's own
// details; step 2 the child(ren). Both live in one <form> so browser
// autofill/validation still works normally within each step.
export default function ParentRegisterForm({ source }: ParentRegisterFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [children, setChildren] = useState<ChildFormData[]>([emptyChildForm()]);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 0) nameInputRef.current?.focus();
  }, [step]);

  const updateChild = (index: number, data: ChildFormData) => {
    setChildren((prev) => prev.map((c, i) => (i === index ? data : c)));
  };

  const addChild = () => setChildren((prev) => [...prev, emptyChildForm()]);
  const removeChild = (index: number) => setChildren((prev) => prev.filter((_, i) => i !== index));

  const handleContinue = () => {
    setError('');
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError('Please fill in your name, email, and a password of at least 6 characters.');
      return;
    }
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 0) {
      handleContinue();
      return;
    }
    setError('');

    for (const child of children) {
      if (!child.fullName.trim() || !child.schoolName.trim() || !child.username.trim() || child.pin.length !== 4) {
        setError('Please fill in every field for each child, including a 4-digit PIN.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, phone, marketing_opt_in: marketingOptIn } },
      });
      if (signUpError || !signUpData.user) {
        setError(signUpError?.message || 'Could not create your account.');
        return;
      }

      // Meta conversion event — separate from the first-party analytics_events
      // insert below (RLS-gated on the authenticated user), this is a pure
      // client-side signal for ad-spend optimization/reporting.
      trackPixelEvent('CompleteRegistration', { content_name: 'parent_registration' });

      // Not routed through trackEvent(): a fresh parent signup has no
      // g5_active_user session yet, so trackEvent's getActiveUser() gate
      // would silently drop this event.
      supabase.from('analytics_events').insert({
        user_id: signUpData.user.id,
        session_id: getOrCreateSessionId(),
        event_name: 'parent_registration_submitted',
        properties: { source },
        is_family: false,
        client_ts: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.error('Failed to write analytics event:', error);
      });

      // Fire-and-forget: opt-in state already lives on the parents row via
      // signup metadata, so a failure here just means SendFox sync is late,
      // not that registration failed.
      if (marketingOptIn) {
        supabase.functions.invoke('sendfox-sync').then(({ error }) => {
          if (error) console.error('Failed to sync SendFox contact:', error);
        });
      }

      let childFailed = false;
      for (const child of children) {
        const { error: childError } = await supabase.rpc('create_child_account', {
          p_username: child.username,
          p_pin: child.pin,
          p_full_name: child.fullName,
          p_grade: child.grade,
          p_gender: child.gender,
          p_school_name: child.schoolName,
          p_avatar: child.avatar,
        });
        if (childError) {
          setError(`Account created, but adding ${child.fullName || 'a child'} failed: ${childError.message}. You can add them again from your dashboard.`);
          childFailed = true;
          break;
        }
      }

      if (!childFailed) router.push('/parent-dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 px-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1 flex items-center gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  i < step
                    ? 'bg-orange-500 text-[#ffffff]'
                    : i === step
                    ? 'bg-orange-500 text-[#ffffff] ring-4 ring-orange-200'
                    : 'bg-stone-200 text-stone-400'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </span>
              <span className={`text-sm font-semibold truncate ${i === step ? 'text-slate-800' : 'text-stone-400'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 ${i < step ? 'bg-orange-400' : 'bg-stone-200'}`} />
            )}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="bg-[#ffffff] border border-stone-200 rounded-2xl p-5 space-y-3 shadow-sm">
          <input
            ref={nameInputRef}
            type="text"
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl bg-[#ffffff] border border-stone-300 px-4 py-3 text-base text-gray-900 placeholder-stone-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            autoComplete="name"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-[#ffffff] border border-stone-300 px-4 py-3 text-base text-gray-900 placeholder-stone-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            autoComplete="email"
            required
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-[#ffffff] border border-stone-300 px-4 py-3 pr-16 text-base text-gray-900 placeholder-stone-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              autoComplete="new-password"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-amber-600 hover:text-amber-700 px-1 py-1"
              tabIndex={-1}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            type="tel"
            placeholder="Phone number (optional, for future notifications)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl bg-[#ffffff] border border-stone-300 px-4 py-3 text-base text-gray-900 placeholder-stone-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            autoComplete="tel"
          />
          <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 cursor-pointer hover:border-amber-300 transition-colors">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-amber-500"
            />
            <span className="text-base text-amber-900">
              <span className="font-semibold text-amber-700">Keep me in the loop</span> — send occasional progress tips and updates by email, and your child gets{' '}
              <span className="font-semibold text-amber-700">250 free gold 🪙</span> as a welcome gift. You can unsubscribe anytime.
            </span>
          </label>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          {children.map((child, i) => (
            <div key={i} className="bg-[#ffffff] border border-stone-200 rounded-2xl p-5 shadow-sm">
              <ChildAccountForm
                theme="light"
                label={`Child ${i + 1}`}
                data={child}
                onChange={(data) => updateChild(i, data)}
                onRemove={children.length > 1 ? () => removeChild(i) : undefined}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addChild}
            className="w-full rounded-xl border border-dashed border-stone-300 py-2.5 text-base text-stone-500 hover:text-amber-600 hover:border-amber-300 transition-colors"
          >
            + Add another child
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <p className="text-base text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        {step === 1 && (
          <button
            type="button"
            onClick={() => { setStep(0); setError(''); }}
            className="rounded-xl border border-stone-300 text-stone-500 hover:text-slate-800 hover:border-stone-400 font-bold text-base py-3.5 px-5 transition-colors"
          >
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 text-[#ffffff] font-bold text-lg py-3.5 shadow-lg shadow-orange-500/25 transition-all"
        >
          {step === 0 ? 'Continue →' : submitting ? 'Creating your account…' : 'Create My Account'}
        </button>
      </div>
    </form>
  );
}
