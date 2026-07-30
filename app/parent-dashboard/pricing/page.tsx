'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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

  const isPremium = subscription?.status === 'active';

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
    return <main className="min-h-screen bg-black flex items-center justify-center text-gray-500">Loading…</main>;
  }

  return (
    <main className="min-h-screen bg-black py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-white">Pricing</h1>
          <a href="/parent-dashboard" className="text-xs text-gray-500 hover:text-gray-300 underline">Back to dashboard</a>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs text-gray-500 line-through">₱99/month per child (₱1,188/year)</p>
          <p className="text-sm text-gray-400 line-through">Regular price: ₱599/year per account</p>
          <p className="text-2xl font-display font-bold text-amber-300">₱249/year <span className="text-sm font-normal text-gray-400">per account</span></p>
          <p className="text-xs text-amber-400 font-semibold">🔥 Limited-time sale price — lock it in before it goes back up.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-4 space-y-2">
            <p className="text-sm font-bold text-white">Free</p>
            <p className="text-xs text-gray-500">₱0</p>
            <ul className="text-xs text-gray-400 space-y-1.5 pt-2">
              <li>✓ 1 child account</li>
              <li>✓ Full gameplay access</li>
              <li>✓ Progress dashboard & PIN viewing</li>
              <li className="text-gray-600">✕ Journal viewing</li>
              <li className="text-gray-600">✕ Gold coin rewards</li>
            </ul>
          </div>
          <div className="rounded-xl border border-amber-500/50 bg-amber-500/5 p-4 space-y-2">
            <p className="text-sm font-bold text-amber-300">⭐ Premium</p>
            <p className="text-xs text-gray-500 line-through">₱599/year</p>
            <p className="text-xs text-amber-200 font-bold">₱249/year</p>
            <ul className="text-xs text-gray-300 space-y-1.5 pt-2">
              <li>✓ 2 child accounts included</li>
              <li>✓ Full gameplay access</li>
              <li>✓ Journal viewing</li>
              <li>✓ 10,000 gold coins/year to reward your kids</li>
              <li>✓ +₱99/yr per extra child (up to 5 total)</li>
            </ul>
          </div>
        </div>

        {isPremium ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-center">
            <p className="text-sm text-amber-300">⭐ You're already on Premium.</p>
            {subscription!.addon_children < 2 && (
              <button
                onClick={() => handleSubscribe(subscription!.addon_children + 1)}
                disabled={checkingOut}
                className="mt-2 w-full rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold py-2"
              >
                {checkingOut ? 'Redirecting…' : `+ Add a child slot (₱99/yr, renews at ₱${249 + (subscription!.addon_children + 1) * 99}/yr)`}
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => handleSubscribe(0)}
            disabled={checkingOut}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5"
          >
            {checkingOut ? 'Redirecting…' : 'Subscribe — ₱249/yr'}
          </button>
        )}
        {checkoutError && <p className="text-red-400 text-sm text-center">{checkoutError}</p>}
      </div>
    </main>
  );
}
