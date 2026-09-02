'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isNativeApp } from '@/lib/platform';

interface SubscriptionRow {
  status: 'none' | 'pending' | 'active' | 'expired' | 'cancelled';
  addon_children: number;
}

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [isNative, setIsNative] = useState(false);

  const isPremium = subscription?.status === 'active';

  useEffect(() => { setIsNative(isNativeApp()); }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/parent-login');
        return;
      }
      const { data: subRow } = await supabase
        .from('subscriptions')
        .select('status, addon_children')
        .eq('parent_id', user.id)
        .maybeSingle();
      setSubscription((subRow as SubscriptionRow) ?? null);
      setLoading(false);
    })();
  }, [router]);

  const handleSubscribe = async (addonChildren: number) => {
    setCheckoutError('');
    setCheckingOut(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ addonChildren }),
    });
    const body = await res.json().catch(() => ({}));
    setCheckingOut(false);
    if (!res.ok || !body.success) {
      setCheckoutError(body.error || 'Could not start checkout.');
      return;
    }
    window.location.href = body.checkoutUrl;
  };

  if (loading) {
    return <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 flex items-center justify-center text-stone-500">Loading…</main>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-slate-800">Pricing</h1>
          <a href="/parent-dashboard" className="text-sm text-stone-500 hover:text-slate-700 underline">Back to dashboard</a>
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm text-stone-400 line-through">₱99/month per child (₱1,188/year)</p>
          <p className="text-base text-stone-500 line-through">Regular price: ₱599/year per account</p>
          <p className="text-3xl font-display font-bold text-amber-600">₱249/year <span className="text-base font-normal text-stone-500">per account</span></p>
          <p className="text-sm text-amber-700 font-semibold">🔥 Limited-time sale price — lock it in before it goes back up.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-stone-200 bg-[#ffffff] p-4 space-y-2 shadow-sm">
            <p className="text-base font-bold text-slate-800">Free</p>
            <p className="text-sm text-stone-500">₱0</p>
            <ul className="text-sm text-stone-500 space-y-1.5 pt-2">
              <li>✓ 1 child account</li>
              <li>✓ Full gameplay access</li>
              <li>✓ Progress dashboard & PIN viewing</li>
              <li className="text-stone-400">✕ Journal viewing</li>
              <li className="text-stone-400">✕ Gold coin rewards</li>
              <li className="text-stone-400">✕ Weak-topic reports</li>
              <li className="text-stone-400">✕ Compare children side-by-side</li>
            </ul>
          </div>
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2 shadow-sm">
            <p className="text-base font-bold text-amber-700">⭐ Premium</p>
            <p className="text-sm text-stone-500 line-through">₱599/year</p>
            <p className="text-sm text-amber-700 font-bold">₱249/year</p>
            <ul className="text-sm text-slate-700 space-y-1.5 pt-2">
              <li>✓ 2 child accounts included</li>
              <li>✓ Full gameplay access</li>
              <li>✓ Journal viewing (last 30 days)</li>
              <li>✓ Weak-topic reports — see what to review together</li>
              <li>✓ Compare children side-by-side</li>
              <li>✓ 10,000 gold coins/year to reward your kids</li>
              <li>✓ +₱99/yr per extra child (up to 5 total)</li>
            </ul>
          </div>
        </div>

        {isNative ? (
          <p className="text-sm text-stone-500 text-center">
            {isPremium ? "⭐ You're already on Premium." : 'Premium subscriptions are managed outside this app.'}
          </p>
        ) : isPremium ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-base text-amber-700">⭐ You're already on Premium.</p>
            {subscription!.addon_children < 2 && (
              <button
                onClick={() => handleSubscribe(subscription!.addon_children + 1)}
                disabled={checkingOut}
                className="mt-2 w-full rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-[#ffffff] text-base font-bold py-2.5 transition-colors"
              >
                {checkingOut ? 'Redirecting…' : `+ Add a child slot (₱99/yr, renews at ₱${249 + (subscription!.addon_children + 1) * 99}/yr)`}
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => handleSubscribe(0)}
            disabled={checkingOut}
            className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-[#ffffff] font-bold text-lg py-3.5 shadow-lg shadow-orange-500/25 transition-colors"
          >
            {checkingOut ? 'Redirecting…' : 'Subscribe — ₱249/yr'}
          </button>
        )}
        {checkoutError && <p className="text-red-500 text-base text-center">{checkoutError}</p>}
      </div>
    </main>
  );
}
