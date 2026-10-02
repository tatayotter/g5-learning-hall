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
import { supabase } from '@/lib/supabase';
import { gradeToNumber } from '@/lib/userSession';
import {
  ChildRow, SecPack, EntitlementRow, PACK_DETAILS,
  CATEGORY_GRADIENT_COLOR, DEFAULT_GRADIENT_COLOR, humanizeCategory,
} from '@/lib/shopPacks';
import { gradeColor } from '@/lib/gradeColors';
import {
  IOS, Icon, IosBarButton, IosButton, IosContent, IosGroup, IosNavBar, IosRow, IosScreen, type IconName,
} from '@/components/parent/ios';
import PackHero from '@/components/parent/PackHero';

// PACK_DETAILS.benefits carry emoji icons for the old shop; the glass page
// maps them by position to line icons instead (competition level, untimed
// reviewer, Gold & XP).
const BENEFIT_ICONS: { icon: IconName; color: string }[] = [
  { icon: 'star', color: IOS.yellow },
  { icon: 'book', color: IOS.blue },
  { icon: 'coins', color: IOS.orange },
];

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

  const back = <IosBarButton back onClick={() => router.push('/parent-dashboard/shop')}>Shop</IosBarButton>;

  if (loading || notFound || !pack) {
    return (
      <IosScreen>
        <IosNavBar large={false} title="Shop" left={back} />
        <p className="text-center text-[15px] py-16 px-8" style={{ color: IOS.secondary }}>
          {loading ? 'Loading…' : "This pack isn't available anymore."}
        </p>
      </IosScreen>
    );
  }

  const details = PACK_DETAILS[pack.id];
  const eligibleKids = kids.filter((k) => gradeToNumber(k.grade) === pack.grade);
  const ent = entitlements.find((e) => e.pack_id === pack.id && e.child_id === selectedChildId) || null;
  const owned = ent?.status === 'active';
  const pending = ent?.status === 'pending';
  const selectedChildName = eligibleKids.find((k) => k.id === selectedChildId)?.full_name;
  const selectedFirstName = selectedChildName?.split(' ')[0];
  const perQuestion = details ? (pack.price_php / details.questionCount).toFixed(2) : null;
  const name = details?.shortName || pack.title;

  return (
    <IosScreen>
      <IosNavBar large={false} title={name} left={back} />
      <IosContent>
        <div className="lg-glass rounded-[30px] overflow-hidden">
          <PackHero
            tall
            grade={pack.grade}
            category={pack.category}
            eyebrow={details?.eyebrow || `Grade ${pack.grade} · ${humanizeCategory(pack.category)}`}
            from={gradeColor(pack.grade)[400]}
            to={CATEGORY_GRADIENT_COLOR[pack.category] ?? DEFAULT_GRADIENT_COLOR}
          />
          <div className="px-5 pt-4 pb-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-[28px] leading-[34px] font-bold">{name}</h1>
                {details && <p className="text-[13px] mt-0.5" style={{ color: IOS.secondary }}>{pack.title}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[24px] leading-[30px] font-bold" style={{ color: IOS.blue }}>₱{pack.price_php}</p>
                <p className="text-[13px]" style={{ color: IOS.secondary }}>one-time</p>
              </div>
            </div>
            {details ? (
              <div className="space-y-1.5">
                <p className="text-[17px] leading-[22px] font-semibold">{details.hook}</p>
                <p className="text-[15px] leading-[21px]" style={{ color: IOS.secondary }}>{details.subhook}</p>
              </div>
            ) : (
              <p className="text-[15px] leading-[21px]" style={{ color: IOS.secondary }}>{pack.description}</p>
            )}
          </div>
        </div>

        {/* Purchase */}
        {eligibleKids.length === 0 ? (
          <IosGroup footer={`Packs are per child. Add a Grade ${pack.grade} child to your account to unlock this one.`}>
            <IosRow icon="person" iconColor={IOS.gray} title={`No Grade ${pack.grade} child yet`} />
          </IosGroup>
        ) : (
          <>
            {eligibleKids.length > 1 && (
              <IosGroup header="Unlock for">
                {eligibleKids.map((k) => (
                  <IosRow
                    key={k.id}
                    title={k.full_name}
                    onClick={() => setSelectedChildId(k.id)}
                    accessory={k.id === selectedChildId ? <Icon name="check" size={20} color={IOS.blue} strokeWidth={2.6} /> : <span />}
                  />
                ))}
              </IosGroup>
            )}

            {owned ? (
              <IosGroup>
                <IosRow icon="check" iconColor={IOS.green} title={`Owned${selectedChildName ? ` by ${selectedChildName}` : ''}`} subtitle="Your child plays it in their Bonus Quests tab." wrap />
              </IosGroup>
            ) : (
              <div className="space-y-2">
                {/* pending never disables the button — an abandoned PayMongo
                    checkout (closed tab, cancelled payment) must stay
                    retryable. create_sec_checkout_session already reuses the
                    pending row via ON CONFLICT, so retrying is safe. */}
                {pending && (
                  <p className="text-center text-[13px] px-4" style={{ color: IOS.orange }}>
                    A checkout was started but never completed — tap Unlock to try again.
                  </p>
                )}
                <IosButton onClick={handleBuy} disabled={checkingOut}>
                  {checkingOut ? 'Redirecting…' : `Unlock${selectedFirstName ? ` for ${selectedFirstName}` : ''} · ₱${pack.price_php}`}
                </IosButton>
                <p className="text-center text-[13px] px-4" style={{ color: IOS.secondary }}>
                  Full refund within 7 days if unused{perQuestion && <> · that&apos;s ₱{perQuestion} per question</>}
                </p>
              </div>
            )}
            {checkoutError && <p className="text-center text-[13px]" style={{ color: IOS.red }}>{checkoutError}</p>}
          </>
        )}

        {details && (
          <>
            <IosGroup header="Why it's worth it">
              {details.benefits.map((b, i) => {
                const glyph = BENEFIT_ICONS[i] ?? BENEFIT_ICONS[0];
                return <IosRow key={b.text} icon={glyph.icon} iconColor={glyph.color} title={b.text} wrap />;
              })}
            </IosGroup>

            <IosGroup
              header="What's inside"
              footer={`${details.strands.length} topic groups · ${details.questionCount} questions`}
            >
              {details.strands.map((s) => (
                <IosRow key={s.name} title={s.name} detail={`${s.topics} topic${s.topics === 1 ? '' : 's'}`} />
              ))}
            </IosGroup>
          </>
        )}

        <IosGroup footer="Full refund policy is in our Terms & Conditions.">
          <IosRow href="/terms" external icon="doc" iconColor={IOS.gray} title="Terms & Conditions" />
        </IosGroup>
      </IosContent>
    </IosScreen>
  );
}
