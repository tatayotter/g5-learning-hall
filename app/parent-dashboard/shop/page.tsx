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
import { useParentPage } from '@/hooks/useScreenTime';
import { gradeToNumber } from '@/lib/userSession';
import {
  ChildRow, SecPack, EntitlementRow, PACK_DETAILS,
  CATEGORY_GRADIENT_COLOR, DEFAULT_GRADIENT_COLOR,
  humanizeCategory,
} from '@/lib/shopPacks';
import { gradeColor } from '@/lib/gradeColors';
import { IOS, IosBarButton, IosContent, IosGroup, IosNavBar, IosRow, IosScreen } from '@/components/parent/ios';
import PackHero from '@/components/parent/PackHero';

export default function ShopPage() {
  const router = useRouter();
  useParentPage('parent_shop');
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

  const back = <IosBarButton back onClick={() => router.push('/parent-dashboard')}>Family</IosBarButton>;

  if (loading) {
    return (
      <IosScreen>
        <IosNavBar large={false} title="Shop" left={back} />
        <p className="text-center text-[15px] py-16" style={{ color: IOS.secondary }}>Loading…</p>
      </IosScreen>
    );
  }

  return (
    <IosScreen>
      <IosNavBar title="Shop" left={back} />
      <IosContent>
        <p className="px-1 -mt-3 text-[15px] leading-[20px]" style={{ color: IOS.secondary }}>
          Extra quest packs your child plays at their own pace, on top of everything else in their
          account. Real Gold and XP for every question, same as their regular quests.
        </p>

        {checkoutBanner && (
          <IosGroup>
            {checkoutBanner === 'success-confirmed' && (
              <IosRow icon="check" iconColor={IOS.green} title="Purchase confirmed" subtitle="The pack is unlocked and ready to play." wrap />
            )}
            {checkoutBanner === 'success-pending' && (
              <IosRow icon="coins" iconColor={IOS.orange} title="Payment received" subtitle="Confirming your purchase — this can take a few seconds…" wrap />
            )}
            {checkoutBanner === 'cancelled' && (
              <IosRow icon="xmark" iconColor={IOS.gray} title="Checkout cancelled" subtitle="No charge was made. You can buy anytime below." wrap />
            )}
          </IosGroup>
        )}

        {kids.length === 0 && (
          <IosGroup>
            <IosRow icon="person" iconColor={IOS.blue} title="Add a child first" subtitle="Then come back here to buy them a pack." href="/parent-dashboard" />
          </IosGroup>
        )}

        {/* Search + category filter. The filter row only appears once there's
            more than one category, so today's math-only catalog doesn't grow
            a pointless single-pill row. */}
        <div className="space-y-3">
          <label className="lg-chip flex items-center gap-2 h-11 px-4 rounded-full">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={IOS.secondary} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="7.5" />
              <path d="m20.5 20.5-4-4" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search packs"
              aria-label="Search packs by subject or grade"
              className="flex-1 min-w-0 bg-transparent text-[17px] outline-none placeholder:text-[#8A8A8E]"
            />
          </label>

          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
              {[{ key: 'all', label: 'All' }, ...categories.map((c) => ({ key: c, label: humanizeCategory(c) }))].map((c) => {
                const active = categoryFilter === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategoryFilter(c.key)}
                    className={`shrink-0 h-9 px-4 rounded-full text-[15px] font-semibold transition-transform active:scale-95 ${active ? '' : 'lg-chip'}`}
                    style={active ? { background: IOS.label, color: '#FFFFFF' } : { color: IOS.label }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {visiblePacks.length === 0 && (
          <p className="text-center text-[15px] py-8" style={{ color: IOS.secondary }}>No packs match &quot;{searchQuery}&quot;.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visiblePacks.map((pack) => {
            const details = PACK_DETAILS[pack.id];
            const heroGradeColor = gradeColor(pack.grade)[400];
            const categoryColor = CATEGORY_GRADIENT_COLOR[pack.category] ?? DEFAULT_GRADIENT_COLOR;

            // "Owned" here means at least one eligible child on the account
            // already has this pack active — a quick catalog-level signal;
            // the detail page resolves this per-child once one is picked.
            const eligibleKidIds = kids.filter((k) => gradeToNumber(k.grade) === pack.grade).map((k) => k.id);
            const ownedByAny = entitlements.some((e) => e.pack_id === pack.id && e.status === 'active' && eligibleKidIds.includes(e.child_id));

            return (
              <Link
                key={pack.id}
                href={`/parent-dashboard/shop/${pack.id}`}
                className="lg-glass rounded-[28px] overflow-hidden flex flex-col active:scale-[0.98] transition-transform"
              >
                <PackHero
                  grade={pack.grade}
                  category={pack.category}
                  eyebrow={details?.eyebrow || `Grade ${pack.grade} · ${humanizeCategory(pack.category)}`}
                  from={heroGradeColor}
                  to={categoryColor}
                  owned={ownedByAny}
                />
                <div className="px-4 pt-3 pb-4 flex flex-col gap-1 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[20px] leading-[25px] font-bold">{details?.shortName || pack.title}</p>
                    <p className="text-[17px] font-semibold shrink-0" style={{ color: IOS.blue }}>₱{pack.price_php}</p>
                  </div>
                  {details && (
                    <p className="text-[15px] leading-[20px] line-clamp-2" style={{ color: IOS.secondary }}>{details.hook}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <IosGroup footer="Every pack has a full refund within 7 days if unused.">
          <IosRow href="/terms" external icon="doc" iconColor={IOS.gray} title="Terms & Conditions" />
        </IosGroup>
      </IosContent>
    </IosScreen>
  );
}
