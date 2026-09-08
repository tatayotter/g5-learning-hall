'use client';
// Student Enrichment Content (SEC) Shop — one-time, per-child content packs,
// separate from the recurring Premium subscription. See
// docs/sec-shop-design.md for the full design (why this is its own page and
// its own checkout/webhook branch instead of folded into pricing/).
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { gradeToNumber } from '@/lib/userSession';

interface ChildRow {
  id: string;
  full_name: string;
  grade: string;
}

interface SecPack {
  id: string;
  grade: number;
  category: string;
  title: string;
  description: string;
  price_php: number;
}

interface EntitlementRow {
  child_id: string;
  pack_id: string;
  status: 'pending' | 'active';
}

export default function ShopPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kids, setKids] = useState<ChildRow[]>([]);
  const [packs, setPacks] = useState<SecPack[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  const [selectedChild, setSelectedChild] = useState<Record<string, string>>({}); // packId -> childId
  const [checkingOut, setCheckingOut] = useState<string | null>(null); // packId in flight
  const [checkoutError, setCheckoutError] = useState('');
  // Set from ?checkout=success|cancelled on the PayMongo redirect back —
  // 'success' starts out "confirming" rather than a flat success message,
  // since the redirect can land here before the webhook has actually
  // activated the entitlement (browser redirect and server-to-server webhook
  // race independently) — see the poll in the effect below.
  const [checkoutBanner, setCheckoutBanner] = useState<'success-pending' | 'success-confirmed' | 'cancelled' | null>(null);

  const loadData = async (userId: string) => {
    const [{ data: children }, { data: packRows }, { data: entRows }] = await Promise.all([
      supabase.from('children').select('id, full_name, grade').eq('parent_id', userId),
      supabase.from('sec_packs').select('id, grade, category, title, description, price_php').eq('active', true).order('grade'),
      supabase.from('sec_entitlements').select('child_id, pack_id, status').eq('parent_id', userId),
    ]);

    const kidsList = (children as ChildRow[]) || [];
    const packList = (packRows as SecPack[]) || [];
    const entList = (entRows as EntitlementRow[]) || [];
    setKids(kidsList);
    setPacks(packList);
    setEntitlements(entList);

    // Default each pack's child picker to the first child in that pack's
    // grade, if there is one — saves a step for the common "one child in
    // this grade" case without hiding the picker. Only set on first load
    // (guarded by callers below) so a background poll refresh never yanks
    // the picker back to the default while a parent has it on purpose set
    // to a different sibling.
    return { kidsList, packList, entList };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/parent-login');
        return;
      }

      const { kidsList, packList, entList } = await loadData(user.id);
      if (cancelled) return;

      const defaults: Record<string, string> = {};
      packList.forEach((pack) => {
        const match = kidsList.find((k) => gradeToNumber(k.grade) === pack.grade);
        if (match) defaults[pack.id] = match.id;
      });
      setSelectedChild(defaults);
      setLoading(false);

      // Read the PayMongo redirect's own query param — window.location
      // rather than useSearchParams so this page doesn't need a Suspense
      // boundary just for a one-shot banner.
      const params = new URLSearchParams(window.location.search);
      const checkoutParam = params.get('checkout');
      if (checkoutParam === 'cancelled') {
        setCheckoutBanner('cancelled');
      } else if (checkoutParam === 'success') {
        const alreadyActive = entList.some((e) => e.status === 'active');
        if (alreadyActive) {
          setCheckoutBanner('success-confirmed');
        } else {
          // The webhook that flips 'pending' -> 'active' can land a beat
          // after PayMongo's own browser redirect — poll briefly rather
          // than showing a stale "Buy" button right after a real payment.
          setCheckoutBanner('success-pending');
          let attempts = 0;
          const poll = setInterval(async () => {
            attempts += 1;
            const { entList: freshEnt } = await loadData(user.id);
            if (cancelled) { clearInterval(poll); return; }
            if (freshEnt.some((e) => e.status === 'active')) {
              setCheckoutBanner('success-confirmed');
              clearInterval(poll);
            } else if (attempts >= 6) {
              clearInterval(poll); // ~30s — stop silently; the pack will still show correctly on a manual refresh once the webhook lands
            }
          }, 5000);
        }
      }
      // Clean the query param out of the URL so a manual refresh later
      // doesn't re-show a stale success/cancelled banner.
      if (checkoutParam) {
        window.history.replaceState({}, '', '/parent-dashboard/shop');
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const entitlementFor = (packId: string, childId: string | undefined) => {
    if (!childId) return null;
    return entitlements.find((e) => e.pack_id === packId && e.child_id === childId) || null;
  };

  const handleBuy = async (pack: SecPack) => {
    const childId = selectedChild[pack.id];
    if (!childId) {
      setCheckoutError('Pick which child this pack is for first.');
      return;
    }
    setCheckoutError('');
    setCheckingOut(pack.id);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/create-sec-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ packId: pack.id, childId }),
    });
    const body = await res.json().catch(() => ({}));
    setCheckingOut(null);
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
          <h1 className="text-2xl font-display font-bold text-slate-800">Shop</h1>
          <a href="/parent-dashboard" className="text-sm text-stone-500 hover:text-slate-700 underline">Back to dashboard</a>
        </div>
        <p className="text-sm text-stone-500">
          Student Enrichment Content (SEC) — extra quest lines your child plays at their own pace,
          on top of everything else in their account. Each pack pays real Gold and XP just like
          their regular quests. One purchase unlocks a pack for one child, forever.
        </p>

        {checkoutBanner === 'success-confirmed' && (
          <div className="rounded-xl border border-green-300 bg-green-50 text-green-700 text-sm font-semibold text-center py-3 px-4">
            🎉 Purchase confirmed — the pack is unlocked and ready to play.
          </div>
        )}
        {checkoutBanner === 'success-pending' && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-700 text-sm font-semibold text-center py-3 px-4">
            Payment received — confirming your purchase, this can take a few seconds…
          </div>
        )}
        {checkoutBanner === 'cancelled' && (
          <div className="rounded-xl border border-stone-300 bg-stone-50 text-stone-600 text-sm text-center py-3 px-4">
            Checkout was cancelled — no charge was made. You can buy anytime below.
          </div>
        )}

        {kids.length === 0 && (
          <div className="rounded-xl border border-stone-200 bg-[#ffffff] p-4 text-sm text-stone-500">
            Add a child to your account first, then come back here to buy them a pack.
          </div>
        )}

        <div className="space-y-4">
          {packs.map((pack) => {
            const childId = selectedChild[pack.id];
            const ent = entitlementFor(pack.id, childId);
            const owned = ent?.status === 'active';
            const pending = ent?.status === 'pending';
            const eligibleKids = kids.filter((k) => gradeToNumber(k.grade) === pack.grade);

            return (
              <div key={pack.id} className="rounded-xl border border-stone-200 bg-[#ffffff] p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-slate-800">{pack.title}</p>
                    <p className="text-sm text-stone-500 mt-1">{pack.description}</p>
                  </div>
                  <p className="text-lg font-display font-bold text-amber-600 whitespace-nowrap">₱{pack.price_php}</p>
                </div>

                {eligibleKids.length === 0 ? (
                  <p className="text-sm text-stone-400 italic">No Grade {pack.grade} child on this account yet.</p>
                ) : (
                  <>
                    {eligibleKids.length > 1 && (
                      <select
                        value={childId || ''}
                        onChange={(e) => setSelectedChild((s) => ({ ...s, [pack.id]: e.target.value }))}
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-slate-700"
                      >
                        {eligibleKids.map((k) => (
                          <option key={k.id} value={k.id}>{k.full_name}</option>
                        ))}
                      </select>
                    )}

                    {owned ? (
                      <div className="rounded-lg bg-green-50 border border-green-300 text-green-700 text-sm font-bold text-center py-2.5">
                        ✓ Owned{eligibleKids.length > 1 && childId ? ` — ${eligibleKids.find((k) => k.id === childId)?.full_name}` : ''}
                      </div>
                    ) : (
                      <>
                        {/* pending never disables the button — an abandoned
                            PayMongo checkout (closed tab, cancelled payment)
                            must stay retryable, same as the subscription
                            flow's own Buy button. create_sec_checkout_session
                            already reuses the pending row via ON CONFLICT, so
                            retrying here is safe and idempotent. */}
                        {pending && (
                          <p className="text-xs text-amber-600 text-center">A checkout was started but never completed — tap Buy to try again.</p>
                        )}
                        <button
                          onClick={() => handleBuy(pack)}
                          disabled={checkingOut === pack.id}
                          className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-[#ffffff] font-bold text-base py-2.5 shadow-lg shadow-orange-500/25 transition-colors"
                        >
                          {checkingOut === pack.id ? 'Redirecting…' : `Buy — ₱${pack.price_php}`}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {checkoutError && <p className="text-red-500 text-sm text-center">{checkoutError}</p>}

        <p className="text-xs text-stone-400 text-center">
          Refundable within 7 days if unused — see our{' '}
          <a href="/terms" target="_blank" className="text-amber-600 hover:text-amber-700 underline">Terms & Conditions</a>.
        </p>
      </div>
    </main>
  );
}
