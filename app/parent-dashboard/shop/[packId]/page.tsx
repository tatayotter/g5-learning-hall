'use client';
// Student Enrichment Content (SEC) Shop — single-product detail page.
// Split out of the catalog (app/parent-dashboard/shop/page.tsx) so a
// product's full pitch — hook, benefits, strand breakdown, buy button —
// gets its own page instead of every pack's full copy stacking into one
// long scroll. The catalog page links here per pack; PayMongo's checkout
// redirect still lands back on the catalog (see create-sec-checkout), not
// here, so this page's own job ends at "start checkout".
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { gradeToNumber } from '@/lib/userSession';
import {
  ChildRow, SecPack, EntitlementRow, PACK_DETAILS,
  CATEGORY_GRADIENT_COLOR, CATEGORY_ICON, DEFAULT_GRADIENT_COLOR, DEFAULT_ICON,
} from '@/lib/shopPacks';
import { gradeColor } from '@/lib/gradeColors';

export default function ShopProductPage() {
  const router = useRouter();
  const params = useParams<{ packId: string }>();
  const packId = params.packId;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [kids, setKids] = useState<ChildRow[]>([]);
  const [pack, setPack] = useState<SecPack | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/parent-login');
        return;
      }

      const [{ data: children }, { data: packRow }, { data: entRows }] = await Promise.all([
        supabase.from('children').select('id, full_name, grade').eq('parent_id', user.id),
        supabase.from('sec_packs').select('id, grade, category, title, description, price_php').eq('id', packId).eq('active', true).maybeSingle(),
        supabase.from('sec_entitlements').select('child_id, pack_id, status').eq('parent_id', user.id),
      ]);
      if (cancelled) return;

      if (!packRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const kidsList = (children as ChildRow[]) || [];
      setKids(kidsList);
      setPack(packRow as SecPack);
      setEntitlements((entRows as EntitlementRow[]) || []);

      // Default the child picker to the first child in this pack's grade,
      // same as the catalog page used to — saves a step for the common
      // "one child in this grade" case without hiding the picker.
      const match = kidsList.find((k) => gradeToNumber(k.grade) === (packRow as SecPack).grade);
      if (match) setSelectedChildId(match.id);

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [router, packId]);

  const handleBuy = async () => {
    if (!pack) return;
    if (!selectedChildId) {
      setCheckoutError('Pick which child this pack is for first.');
      return;
    }
    setCheckoutError('');
    setCheckingOut(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/create-sec-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ packId: pack.id, childId: selectedChildId }),
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

  if (notFound || !pack) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 flex flex-col items-center justify-center gap-3 text-stone-500 px-4 text-center">
        <p>This pack isn&apos;t available anymore.</p>
        <Link href="/parent-dashboard/shop" className="text-amber-600 hover:text-amber-700 underline text-sm">Back to the shop</Link>
      </main>
    );
  }

  const details = PACK_DETAILS[pack.id];
  const eligibleKids = kids.filter((k) => gradeToNumber(k.grade) === pack.grade);
  const ent = entitlements.find((e) => e.pack_id === pack.id && e.child_id === selectedChildId) || null;
  const owned = ent?.status === 'active';
  const pending = ent?.status === 'pending';
  const selectedChildName = eligibleKids.find((k) => k.id === selectedChildId)?.full_name;
  const perQuestion = details ? (pack.price_php / details.questionCount).toFixed(2) : null;
  const heroGradeColor = gradeColor(pack.grade)[400];
  const categoryColor = CATEGORY_GRADIENT_COLOR[pack.category] ?? DEFAULT_GRADIENT_COLOR;
  const categoryIcon = CATEGORY_ICON[pack.category] ?? DEFAULT_ICON;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link href="/parent-dashboard/shop" className="text-sm text-stone-500 hover:text-slate-700 underline inline-block">← Back to the shop</Link>

        <div className="rounded-2xl border border-stone-200 bg-[#ffffff] shadow-sm overflow-hidden">
          <div
            className="relative h-32 overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${heroGradeColor} 0%, ${categoryColor} 100%)` }}
          >
            <span className="absolute -right-3 -bottom-6 text-9xl leading-none opacity-25 select-none pointer-events-none" aria-hidden="true">
              {categoryIcon}
            </span>
            <div className="absolute inset-0 flex items-end p-4">
              <span className="text-[11px] font-bold tracking-wide text-white bg-black/15 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1">
                {details?.eyebrow || `Grade ${pack.grade} · ${pack.category.replace(/_/g, ' ')}`}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-display font-bold text-slate-800 leading-tight">
                  {details?.shortName || pack.title}
                </h1>
                {details && <p className="text-xs text-stone-400 mt-0.5">{pack.title}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-display font-bold text-amber-600 leading-none">₱{pack.price_php}</p>
                <p className="text-[11px] text-stone-400 mt-1">one-time</p>
              </div>
            </div>

            {details ? (
              <>
                <div>
                  <p className="text-base text-slate-800 font-bold leading-snug">{details.hook}</p>
                  <p className="text-sm text-stone-500 leading-relaxed mt-1">{details.subhook}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {details.benefits.map((b) => (
                    <div key={b.text} className="flex items-start gap-2 rounded-lg bg-amber-50/60 border border-amber-100 px-3 py-2">
                      <span className="text-base leading-none">{b.icon}</span>
                      <span className="text-xs text-slate-600 leading-snug">{b.text}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-semibold text-stone-500 mb-2">
                    What&apos;s inside — {details.strands.length} topic groups, {details.questionCount} questions
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {details.strands.map((s) => (
                      <div key={s.name} className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 border border-stone-200 px-3 py-1.5">
                        <span className="text-xs text-slate-700">{s.name}</span>
                        <span className="text-[10px] text-stone-400 whitespace-nowrap">{s.topics} topic{s.topics === 1 ? '' : 's'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-stone-500">{pack.description}</p>
            )}
          </div>

          <div className="border-t border-stone-100 bg-stone-50/50 p-6 space-y-3">
            {eligibleKids.length === 0 ? (
              <p className="text-sm text-stone-400 italic">No Grade {pack.grade} child on this account yet.</p>
            ) : (
              <>
                {eligibleKids.length > 1 && (
                  <select
                    value={selectedChildId}
                    onChange={(e) => setSelectedChildId(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-slate-700 bg-white"
                  >
                    {eligibleKids.map((k) => (
                      <option key={k.id} value={k.id}>{k.full_name}</option>
                    ))}
                  </select>
                )}

                {owned ? (
                  <div className="rounded-lg bg-green-50 border border-green-300 text-green-700 text-sm font-bold text-center py-2.5">
                    ✓ Owned{selectedChildName ? ` — ${selectedChildName}` : ''}
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
                      <p className="text-xs text-amber-600 text-center">A checkout was started but never completed — tap Unlock to try again.</p>
                    )}
                    <button
                      onClick={handleBuy}
                      disabled={checkingOut}
                      className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-[#ffffff] font-bold text-base py-3 shadow-lg shadow-orange-500/25 transition-colors"
                    >
                      {checkingOut ? 'Redirecting…' : `Unlock${selectedChildName ? ` for ${selectedChildName}` : ''} — ₱${pack.price_php}`}
                    </button>
                    <p className="text-[11px] text-stone-400 text-center flex items-center justify-center gap-1">
                      <span>🛡️</span>
                      <span>
                        Full refund within 7 days if unused
                        {perQuestion && <> · that&apos;s ₱{perQuestion} per question</>}
                      </span>
                    </p>
                  </>
                )}
              </>
            )}
            {checkoutError && <p className="text-red-500 text-sm text-center">{checkoutError}</p>}
          </div>
        </div>

        <p className="text-xs text-stone-400 text-center">
          See our <a href="/terms" target="_blank" className="text-amber-600 hover:text-amber-700 underline">Terms & Conditions</a> for the full refund policy.
        </p>
      </div>
    </main>
  );
}
