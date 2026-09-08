'use client';
// Student Enrichment Content (SEC) Shop — one-time, per-child content packs,
// separate from the recurring Premium subscription. See
// docs/sec-shop-design.md for the full design (why this is its own page and
// its own checkout/webhook branch instead of folded into pricing/).
//
// Card layout is deliberately conversion-focused, not a spec sheet: lead
// with the outcome (competition edge, real rewards), back it with real
// numbers (question/topic counts, never invented ones), let a parent expand
// to see exactly what's inside before buying, and put the refund policy
// right next to the CTA instead of buried in a footer link. Built as a
// template for grades 3-6 once their content exists, not a one-off — see
// PACK_DETAILS below for how a future grade plugs in.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { gradeToNumber } from '@/lib/userSession';
import { MTAP_GRADE2_STRANDS, MTAP_GRADE3_STRANDS, MTAP_GRADE4_STRANDS, MTAP_GRADE5_STRANDS, MTAP_GRADE6_STRANDS } from '@/lib/mtapContent';

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

// Marketing/structural detail per pack, keyed by pack id — separate from
// sec_packs' own DB columns since this is presentation content (benefit
// copy, real question/topic counts, the strand preview list), not catalog
// data an admin edits. A future Grade 3-6 pack adds its own entry here once
// its content module (lib/mtapGradeNContent.ts or similar) exists — same
// per-grade-lookup pattern MySecPackReviewer.tsx and BonusQuestsTab.tsx
// already use for strand data, just extended to cover the Shop's own copy.
// Note there's no hero-image/color field here — that's derived straight from
// the pack's own `grade`/`category` columns below, so a future pack gets a
// correctly-branded hero automatically, even before anyone's written its copy.
const PACK_DETAILS: Record<string, {
  eyebrow: string;
  shortName: string; // the punchy headline name, distinct from sec_packs.title's formal one
  hook: string; // the one-line positioning claim — competition-level, optional, not remedial
  subhook: string; // the empowerment/permission line right under it — "they're already studying, see how far that goes"
  benefits: { icon: string; text: string }[];
  strands: { name: string; topics: number }[];
  questionCount: number;
}> = {
  'g2-math-enrichment': {
    eyebrow: 'MTAP Competition-Level',
    shortName: 'Grade 2 Math+',
    hook: 'Not required for school. Just how far your child could go if you let them.',
    subhook: 'They\'re already putting in the work — this is where that effort gets tested against real competition-level math, not just the regular curriculum.',
    benefits: [
      { icon: '🏆', text: 'True MTAP competition level — well beyond standard school-level math' },
      { icon: '📖', text: 'Untimed reviewer — they learn the method before ever facing the timer' },
      { icon: '🪙', text: 'Real Gold & XP, same as their regular quests' },
    ],
    strands: MTAP_GRADE2_STRANDS.map((s) => ({ name: s.name, topics: s.archetypes.length })),
    questionCount: 518,
  },
  'g3-math-enrichment': {
    eyebrow: 'MTAP Competition-Level',
    shortName: 'Grade 3 Math+',
    hook: 'Not required for school. Just how far your child could go if you let them.',
    subhook: 'They\'re already putting in the work — this is where that effort gets tested against real competition-level math, not just the regular curriculum.',
    benefits: [
      { icon: '🏆', text: 'True MTAP competition level — well beyond standard school-level math' },
      { icon: '📖', text: 'Untimed reviewer — they learn the method before ever facing the timer' },
      { icon: '🪙', text: 'Real Gold & XP, same as their regular quests' },
    ],
    strands: MTAP_GRADE3_STRANDS.map((s) => ({ name: s.name, topics: s.archetypes.length })),
    questionCount: 534,
  },
  'g4-math-enrichment': {
    eyebrow: 'MTAP Competition-Level',
    shortName: 'Grade 4 Math+',
    hook: 'Not required for school. Just how far your child could go if you let them.',
    subhook: 'They\'re already putting in the work — this is where that effort gets tested against real competition-level math, not just the regular curriculum.',
    benefits: [
      { icon: '🏆', text: 'True MTAP competition level — well beyond standard school-level math' },
      { icon: '📖', text: 'Untimed reviewer — they learn the method before ever facing the timer' },
      { icon: '🪙', text: 'Real Gold & XP, same as their regular quests' },
    ],
    strands: MTAP_GRADE4_STRANDS.map((s) => ({ name: s.name, topics: s.archetypes.length })),
    questionCount: 528,
  },
  'g5-math-enrichment': {
    eyebrow: 'MTAP Competition-Level',
    shortName: 'Grade 5 Math+',
    hook: 'Not required for school. Just how far your child could go if you let them.',
    subhook: 'They\'re already putting in the work — this is where that effort gets tested against real competition-level math, not just the regular curriculum.',
    benefits: [
      { icon: '🏆', text: 'True MTAP competition level — well beyond standard school-level math' },
      { icon: '📖', text: 'Untimed reviewer — they learn the method before ever facing the timer' },
      { icon: '🪙', text: 'Real Gold & XP, same as their regular quests' },
    ],
    strands: MTAP_GRADE5_STRANDS.map((s) => ({ name: s.name, topics: s.archetypes.length })),
    questionCount: 560,
  },
  'g6-math-enrichment': {
    eyebrow: 'MTAP Competition-Level',
    shortName: 'Grade 6 Math+',
    hook: 'Not required for school. Just how far your child could go if you let them.',
    subhook: 'They\'re already putting in the work — this is where that effort gets tested against real competition-level math, not just the regular curriculum.',
    benefits: [
      { icon: '🏆', text: 'True MTAP competition level — well beyond standard school-level math' },
      { icon: '📖', text: 'Untimed reviewer — they learn the method before ever facing the timer' },
      { icon: '🪙', text: 'Real Gold & XP, same as their regular quests' },
    ],
    strands: MTAP_GRADE6_STRANDS.map((s) => ({ name: s.name, topics: s.archetypes.length })),
    questionCount: 609,
  },
};

// Hero band is a two-color gradient, not a photo — color 1 keys off grade
// (a light-to-deep progression so higher grades read as "more advanced"),
// color 2 keys off category and reuses WeeklyLessonsPanel.tsx's own
// SUBJECT_COLOR hue for Mathematics (violet) so the same subject reads the
// same color everywhere in the app, not a clashing one-off here. Both are
// real DB columns (sec_packs.grade/category), so this renders correctly for
// any future pack the day it's created — no per-pack art or copy needed.
const GRADE_GRADIENT_COLOR: Record<number, string> = {
  2: '#fbbf24', // amber-400
  3: '#34d399', // emerald-400
  4: '#38bdf8', // sky-400
  5: '#818cf8', // indigo-400
  6: '#fb7185', // rose-400
};
const CATEGORY_GRADIENT_COLOR: Record<string, string> = {
  math_enrichment: '#8b5cf6', // violet-500 — matches SUBJECT_COLOR's Mathematics hue in WeeklyLessonsPanel.tsx
};
const CATEGORY_ICON: Record<string, string> = {
  math_enrichment: '🧮',
};
const DEFAULT_GRADIENT_COLOR = '#94a3b8'; // slate-400 — an unmapped grade/category still renders a real gradient, just a neutral one
const DEFAULT_ICON = '📚';

export default function ShopPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kids, setKids] = useState<ChildRow[]>([]);
  const [packs, setPacks] = useState<SecPack[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  const [selectedChild, setSelectedChild] = useState<Record<string, string>>({}); // packId -> childId
  const [checkingOut, setCheckingOut] = useState<string | null>(null); // packId in flight
  const [checkoutError, setCheckoutError] = useState('');
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
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

      // Default each pack's child picker to the first child in that pack's
      // grade, if there is one — saves a step for the common "one child in
      // this grade" case without hiding the picker.
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

        <div className="space-y-4">
          {packs.map((pack) => {
            const childId = selectedChild[pack.id];
            const ent = entitlementFor(pack.id, childId);
            const owned = ent?.status === 'active';
            const pending = ent?.status === 'pending';
            const eligibleKids = kids.filter((k) => gradeToNumber(k.grade) === pack.grade);
            const details = PACK_DETAILS[pack.id];
            const selectedChildName = eligibleKids.find((k) => k.id === childId)?.full_name;
            const isExpanded = expandedPack === pack.id;
            const perQuestion = details ? (pack.price_php / details.questionCount).toFixed(2) : null;
            const gradeColor = GRADE_GRADIENT_COLOR[pack.grade] ?? DEFAULT_GRADIENT_COLOR;
            const categoryColor = CATEGORY_GRADIENT_COLOR[pack.category] ?? DEFAULT_GRADIENT_COLOR;
            const categoryIcon = CATEGORY_ICON[pack.category] ?? DEFAULT_ICON;

            return (
              <div key={pack.id} className="rounded-2xl border border-stone-200 bg-[#ffffff] shadow-sm overflow-hidden">
                {/* Grade-color -> category-color gradient hero, not a photo —
                    always renders correctly from real sec_packs.grade/category
                    columns, so a brand-new pack looks right on day one, before
                    anyone's had time to write its copy or source art. */}
                <div
                  className="relative h-24 overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${gradeColor} 0%, ${categoryColor} 100%)` }}
                >
                  <span className="absolute -right-3 -bottom-5 text-8xl leading-none opacity-25 select-none pointer-events-none" aria-hidden="true">
                    {categoryIcon}
                  </span>
                  <div className="absolute inset-0 flex items-end p-3">
                    <span className="text-[10px] font-bold tracking-wide text-white bg-black/15 backdrop-blur-sm border border-white/30 rounded-full px-2.5 py-1">
                      {details?.eyebrow || `Grade ${pack.grade} · ${pack.category.replace(/_/g, ' ')}`}
                    </span>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xl font-display font-bold text-slate-800 leading-tight">
                        {details?.shortName || pack.title}
                      </p>
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
                        <button
                          type="button"
                          onClick={() => setExpandedPack(isExpanded ? null : pack.id)}
                          className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2"
                        >
                          {isExpanded ? 'Hide what\'s inside ▴' : `See all ${details.strands.length} topic groups ▾`}
                        </button>
                        {isExpanded && (
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {details.strands.map((s) => (
                              <div key={s.name} className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 border border-stone-200 px-3 py-1.5">
                                <span className="text-xs text-slate-700">{s.name}</span>
                                <span className="text-[10px] text-stone-400 whitespace-nowrap">{s.topics} topic{s.topics === 1 ? '' : 's'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-stone-500">{pack.description}</p>
                  )}
                </div>

                <div className="border-t border-stone-100 bg-stone-50/50 p-5 space-y-3">
                  {eligibleKids.length === 0 ? (
                    <p className="text-sm text-stone-400 italic">No Grade {pack.grade} child on this account yet.</p>
                  ) : (
                    <>
                      {eligibleKids.length > 1 && (
                        <select
                          value={childId || ''}
                          onChange={(e) => setSelectedChild((s) => ({ ...s, [pack.id]: e.target.value }))}
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
                            onClick={() => handleBuy(pack)}
                            disabled={checkingOut === pack.id}
                            className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-[#ffffff] font-bold text-base py-3 shadow-lg shadow-orange-500/25 transition-colors"
                          >
                            {checkingOut === pack.id ? 'Redirecting…' : `Unlock${selectedChildName ? ` for ${selectedChildName}` : ''} — ₱${pack.price_php}`}
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
                </div>
              </div>
            );
          })}
        </div>

        {checkoutError && <p className="text-red-500 text-sm text-center">{checkoutError}</p>}

        <p className="text-xs text-stone-400 text-center">
          See our <a href="/terms" target="_blank" className="text-amber-600 hover:text-amber-700 underline">Terms & Conditions</a> for the full refund policy.
        </p>
      </div>
    </main>
  );
}
