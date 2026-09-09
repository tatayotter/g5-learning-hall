'use client';
// Student Enrichment Content (SEC) Shop — catalog page. One-time, per-child
// content packs, separate from the recurring Premium subscription. See
// docs/sec-shop-design.md for the full design.
//
// This page is deliberately a browsable catalog, not a wall of sales copy —
// each card is a compact product tile (hero, name, price, one-line hook)
// that links to its own detail page (app/parent-dashboard/shop/[packId])
// where the full pitch, benefit list, and strand breakdown live. Buying
// still happens on the detail page; this page's job is just letting a
// parent scan what's available and pick one.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { gradeToNumber } from '@/lib/userSession';
import {
  ChildRow, SecPack, EntitlementRow, PACK_DETAILS,
  CATEGORY_GRADIENT_COLOR, CATEGORY_ICON, DEFAULT_GRADIENT_COLOR, DEFAULT_ICON,
  humanizeCategory,
} from '@/lib/shopPacks';
import { gradeColor } from '@/lib/gradeColors';

export default function ShopPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kids, setKids] = useState<ChildRow[]>([]);
  const [packs, setPacks] = useState<SecPack[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // 'all' or a real sec_packs.category value — pills are built from whatever
  // categories are actually present in `packs` (see the memo below), so a
  // future english/science/history pack gets a working filter pill the
  // moment it exists in the DB, no code change needed here.
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  // Set from ?checkout=success|cancelled on the PayMongo redirect back —
  // 'success' starts out "confirming" rather than a flat success message,
  // since the redirect can land here before the webhook has actually
  // activated the entitlement (browser redirect and server-to-server webhook
  // race independently) — see the poll in the effect below. PayMongo's
  // success/cancel URLs are hardcoded to this page (create-sec-checkout),
  // so the banner logic stays here rather than on the per-product page.
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

      const { entList } = await loadData(user.id);
      if (cancelled) return;
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

  // Distinct categories actually present in the loaded packs, in first-seen
  // order — only 'Math' exists today, but this reads straight off
  // sec_packs.category so an english/science/history pack added later shows
  // up as its own pill automatically.
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const p of packs) {
      if (!seen.has(p.category)) { seen.add(p.category); list.push(p.category); }
    }
    return list;
  }, [packs]);

  const visiblePacks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return packs.filter((pack) => {
      if (categoryFilter !== 'all' && pack.category !== categoryFilter) return false;
      if (!q) return true;
      const details = PACK_DETAILS[pack.id];
      const haystack = `${details?.shortName || ''} ${pack.title} ${humanizeCategory(pack.category)} Grade ${pack.grade}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [packs, searchQuery, categoryFilter]);

  if (loading) {
    return <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 flex items-center justify-center text-stone-500">Loading…</main>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-slate-800">Shop</h1>
          <a href="/parent-dashboard" className="text-sm text-stone-500 hover:text-slate-700 underline">Back to dashboard</a>
        </div>
        <p className="text-sm text-stone-500">
          Extra quest packs your child plays at their own pace — on top of everything else in
          their account. Real Gold and XP for every question, same as their regular quests.
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

        {/* Search + category filter — only shows the filter row once there's
            more than one category to filter, so today's math-only catalog
            doesn't grow a pointless single-pill row; it appears on its own
            the day a second category (English, Science, History, ...) ships. */}
        <div className="space-y-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search packs by subject or grade..."
              className="w-full rounded-xl border border-stone-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
            />
          </div>

          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`text-xs font-semibold rounded-full px-3.5 py-1.5 border transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-white border-stone-300 text-stone-600 hover:border-amber-400'
                }`}
              >
                All Subjects
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-xs font-semibold rounded-full px-3.5 py-1.5 border transition-colors inline-flex items-center gap-1.5 ${
                    categoryFilter === cat
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-white border-stone-300 text-stone-600 hover:border-amber-400'
                  }`}
                >
                  <span>{CATEGORY_ICON[cat] ?? DEFAULT_ICON}</span>
                  {humanizeCategory(cat)}
                </button>
              ))}
            </div>
          )}
        </div>

        {visiblePacks.length === 0 && (
          <p className="text-center text-sm text-stone-400 py-8">No packs match &quot;{searchQuery}&quot;.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visiblePacks.map((pack) => {
            const details = PACK_DETAILS[pack.id];
            const heroGradeColor = gradeColor(pack.grade)[400];
            const categoryColor = CATEGORY_GRADIENT_COLOR[pack.category] ?? DEFAULT_GRADIENT_COLOR;
            const categoryIcon = CATEGORY_ICON[pack.category] ?? DEFAULT_ICON;

            // "Owned" here means at least one eligible child on the account
            // already has this pack active — a quick catalog-level signal;
            // the detail page resolves this per-child once one is picked.
            const eligibleKidIds = kids.filter((k) => gradeToNumber(k.grade) === pack.grade).map((k) => k.id);
            const ownedByAny = entitlements.some((e) => e.pack_id === pack.id && e.status === 'active' && eligibleKidIds.includes(e.child_id));

            return (
              <Link
                key={pack.id}
                href={`/parent-dashboard/shop/${pack.id}`}
                className="group rounded-2xl border border-stone-200 bg-[#ffffff] shadow-sm overflow-hidden hover:shadow-md hover:border-stone-300 transition-shadow flex flex-col"
              >
                <div
                  className="relative h-20 overflow-hidden shrink-0"
                  style={{ background: `linear-gradient(135deg, ${heroGradeColor} 0%, ${categoryColor} 100%)` }}
                >
                  <span className="absolute -right-2 -bottom-4 text-6xl leading-none opacity-25 select-none pointer-events-none" aria-hidden="true">
                    {categoryIcon}
                  </span>
                  <div className="absolute inset-0 flex items-end p-3">
                    <span className="text-[10px] font-bold tracking-wide text-white bg-black/15 backdrop-blur-sm border border-white/30 rounded-full px-2.5 py-1">
                      {details?.eyebrow || `Grade ${pack.grade} · ${pack.category.replace(/_/g, ' ')}`}
                    </span>
                  </div>
                  {ownedByAny && (
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-bold tracking-wide text-green-700 bg-white/90 rounded-full px-2 py-1">
                      ✓ Owned
                    </span>
                  )}
                </div>
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-lg font-display font-bold text-slate-800 leading-tight group-hover:text-amber-700 transition-colors">
                      {details?.shortName || pack.title}
                    </p>
                    <p className="text-lg font-display font-bold text-amber-600 leading-none shrink-0">₱{pack.price_php}</p>
                  </div>
                  {details && (
                    <p className="text-xs text-stone-500 leading-snug line-clamp-2">{details.hook}</p>
                  )}
                  <span className="mt-auto text-xs font-semibold text-amber-700 group-hover:text-amber-800 inline-flex items-center gap-1">
                    View details →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="text-xs text-stone-400 text-center">
          See our <a href="/terms" target="_blank" className="text-amber-600 hover:text-amber-700 underline">Terms & Conditions</a> for the full refund policy.
        </p>
      </div>
    </main>
  );
}
