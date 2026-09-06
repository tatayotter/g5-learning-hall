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

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/parent-login');
        return;
      }

      const [{ data: children }, { data: packRows }, { data: entRows }] = await Promise.all([
        supabase.from('children').select('id, full_name, grade').eq('parent_id', user.id),
        supabase.from('sec_packs').select('id, grade, category, title, description, price_php').eq('active', true).order('grade'),
        supabase.from('sec_entitlements').select('child_id, pack_id, status').eq('parent_id', user.id),
      ]);

      const kidsList = (children as ChildRow[]) || [];
      setKids(kidsList);
      setPacks((packRows as SecPack[]) || []);
      setEntitlements((entRows as EntitlementRow[]) || []);

      // Default each pack's child picker to the first child in that pack's
      // grade, if there is one — saves a step for the common "one child in
      // this grade" case without hiding the picker.
      const defaults: Record<string, string> = {};
      ((packRows as SecPack[]) || []).forEach((pack) => {
        const match = kidsList.find((k) => gradeToNumber(k.grade) === pack.grade);
        if (match) defaults[pack.id] = match.id;
      });
      setSelectedChild(defaults);
      setLoading(false);
    })();
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
                      <button
                        onClick={() => handleBuy(pack)}
                        disabled={checkingOut === pack.id || pending}
                        className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-[#ffffff] font-bold text-base py-2.5 shadow-lg shadow-orange-500/25 transition-colors"
                      >
                        {checkingOut === pack.id ? 'Redirecting…' : pending ? 'Checkout started — try buying again if it didn\'t go through' : `Buy — ₱${pack.price_php}`}
                      </button>
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
