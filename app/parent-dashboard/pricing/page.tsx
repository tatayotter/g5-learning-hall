'use client';
// Signed-in pricing page (parent area, Liquid Glass styling). The public,
// logged-out mirror lives at app/welcome/pricing; both read their copy from
// lib/pricingPlans.ts so they can't drift.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isNativeApp } from '@/lib/platform';
import {
  FREE_FEATURES, PREMIUM_FEATURES, PREMIUM_PRICE_PHP, PREMIUM_REGULAR_PRICE_PHP,
  MONTHLY_PER_CHILD_ANCHOR_PHP, CHILD_SLOT_PRICE_PHP, premiumRenewalPrice, type PlanFeature,
} from '@/lib/pricingPlans';
import {
  IOS, Icon, IosBarButton, IosButton, IosContent, IosGroup, IosIconTile, IosNavBar, IosRow, IosScreen,
} from '@/components/parent/ios';

interface SubscriptionRow {
  status: 'none' | 'pending' | 'active' | 'expired' | 'cancelled';
  addon_children: number;
}

function FeatureRows({ features }: { features: PlanFeature[] }) {
  return (
    <>
      {features.map((f) => (
        <IosRow
          key={f.text}
          leading={
            <span className="w-[30px] flex justify-center">
              <Icon name={f.included ? 'check' : 'xmark'} size={18} color={f.included ? IOS.green : IOS.tertiary} strokeWidth={2.6} />
            </span>
          }
          title={<span style={{ color: f.included ? IOS.label : IOS.secondary }}>{f.text}</span>}
          wrap
        />
      ))}
    </>
  );
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

  const back = <IosBarButton back onClick={() => router.push('/parent-dashboard')}>Family</IosBarButton>;

  if (loading) {
    return (
      <IosScreen>
        <IosNavBar large={false} title="Pricing" left={back} />
        <p className="text-center text-[15px] py-16" style={{ color: IOS.secondary }}>Loading…</p>
      </IosScreen>
    );
  }

  return (
    <IosScreen>
      <IosNavBar title="Pricing" left={back} />
      <IosContent>
        {/* Price hero */}
        <div className="lg-glass rounded-[30px] px-5 py-6 text-center">
          <div className="flex justify-center"><IosIconTile icon="star" color={IOS.yellow} size={48} /></div>
          <p className="mt-3 text-[15px] font-semibold" style={{ color: IOS.secondary }}>Premium</p>
          <p className="text-[44px] leading-[50px] font-bold tracking-tight">
            ₱{PREMIUM_PRICE_PHP}<span className="text-[17px] font-medium" style={{ color: IOS.secondary }}> / year</span>
          </p>
          <p className="text-[15px]" style={{ color: IOS.secondary }}>per family account</p>
          <div className="mt-3 inline-flex flex-col gap-0.5 text-[13px]" style={{ color: IOS.secondary }}>
            <span className="line-through">Regular price ₱{PREMIUM_REGULAR_PRICE_PHP}/year</span>
            <span className="line-through">₱{MONTHLY_PER_CHILD_ANCHOR_PHP}/month per child elsewhere</span>
          </div>
          <p className="mt-3 text-[13px] font-semibold" style={{ color: IOS.orange }}>
            Limited-time sale price — lock it in before it goes back up.
          </p>
        </div>

        {/* Action */}
        {isNative ? (
          <IosGroup>
            <IosRow
              icon="star"
              iconColor={IOS.yellow}
              title={isPremium ? "You're on Premium" : 'Premium is managed outside this app'}
            />
          </IosGroup>
        ) : isPremium ? (
          <IosGroup
            footer={
              checkoutError ? <span style={{ color: IOS.red }}>{checkoutError}</span>
              : subscription!.addon_children < 2
                ? `Each extra slot is ₱${CHILD_SLOT_PRICE_PHP}/yr, making your yearly price ₱${premiumRenewalPrice(subscription!.addon_children + 1)}.`
                : undefined
            }
          >
            <IosRow icon="star" iconColor={IOS.yellow} title="You're on Premium" />
            {subscription!.addon_children < 2 && (
              <IosRow
                leading={<span className="w-[30px] flex justify-center"><Icon name="plus" size={22} color={IOS.blue} /></span>}
                title={checkingOut ? 'Redirecting…' : 'Add a Child Slot'}
                tint="blue"
                detail={`₱${CHILD_SLOT_PRICE_PHP}/yr`}
                onClick={checkingOut ? undefined : () => handleSubscribe(subscription!.addon_children + 1)}
              />
            )}
          </IosGroup>
        ) : (
          <div className="space-y-2">
            <IosButton onClick={() => handleSubscribe(0)} disabled={checkingOut}>
              {checkingOut ? 'Redirecting…' : `Get Premium · ₱${PREMIUM_PRICE_PHP}/yr`}
            </IosButton>
            {checkoutError && <p className="text-center text-[13px]" style={{ color: IOS.red }}>{checkoutError}</p>}
          </div>
        )}

        <IosGroup header="Premium includes">
          <FeatureRows features={PREMIUM_FEATURES} />
        </IosGroup>

        <IosGroup header="Free plan" footer="Free stays free — no credit card needed.">
          <FeatureRows features={FREE_FEATURES} />
        </IosGroup>

        <IosGroup footer="Billing, renewals and refunds are covered in our Terms & Conditions.">
          <IosRow href="/terms" external icon="doc" iconColor={IOS.gray} title="Terms & Conditions" />
        </IosGroup>
      </IosContent>
    </IosScreen>
  );
}
