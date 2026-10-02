// Public, logged-out pricing page — the marketing-site mirror of
// app/parent-dashboard/pricing (which requires a parent login and so can't
// be linked from the public site). Both read lib/pricingPlans.ts so the
// numbers and feature lists stay identical. No checkout here: buying happens
// inside the parent dashboard after sign-up.
import type { Metadata } from 'next';
import {
  FREE_FEATURES, PREMIUM_FEATURES, PREMIUM_PRICE_PHP, PREMIUM_REGULAR_PRICE_PHP,
  MONTHLY_PER_CHILD_ANCHOR_PHP, type PlanFeature,
} from '@/lib/pricingPlans';

export const metadata: Metadata = {
  title: 'Pricing — Learning Hall PH',
  description: `Free forever for your first child. Premium is ₱${PREMIUM_PRICE_PHP}/year per family — journal viewing, weak-topic reports, coin rewards and more child slots.`,
  alternates: { canonical: '/welcome/pricing' },
};

function FeatureList({ features }: { features: PlanFeature[] }) {
  return (
    <ul className="space-y-2.5">
      {features.map((f) => (
        <li key={f.text} className="flex items-start gap-2.5 text-[15px] leading-snug">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0"
            stroke={f.included ? '#16a34a' : '#cbd5e1'}>
            <path d={f.included ? 'M5 12.5l4.5 4.5L19 7.5' : 'M6.5 6.5l11 11M17.5 6.5l-11 11'} />
          </svg>
          <span className={f.included ? 'text-slate-700' : 'text-slate-400'}>{f.text}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PublicPricingPage() {
  return (
    <div className="min-h-screen bg-[#f0f8ff] text-slate-800 font-[Inter,system-ui,sans-serif] overflow-x-hidden">
      <header className="px-5 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <a href="/welcome" className="font-display font-black text-lg text-slate-800">Learning Hall</a>
        <a href="/parent-login" className="text-sm font-semibold text-slate-500 hover:text-sky-600 transition-colors">Parent login</a>
      </header>

      <section className="px-5 pt-8 pb-10 text-center max-w-2xl mx-auto">
        <p className="text-xs font-bold tracking-[0.18em] uppercase text-amber-600">Pricing</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-black text-slate-800">
          Free for your first child.
        </h1>
        <p className="mt-3 text-slate-500 leading-relaxed">
          Every child gets the full game. Premium adds the parent tools — and room for siblings.
        </p>
      </section>

      <section className="px-5 pb-12 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Premium first on mobile — it's the card people come here to read */}
        <div className="md:order-2 relative rounded-[24px] bg-[#ffffff] border-2 border-amber-300 p-6 sm:p-7 shadow-[0_10px_40px_-12px_rgba(245,158,11,0.35)]">
          <span className="absolute -top-3 left-6 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold tracking-wide text-[#ffffff]">
            SALE PRICE
          </span>
          <p className="font-display text-xl font-black text-slate-800">Premium</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-4xl font-black text-amber-600">₱{PREMIUM_PRICE_PHP}</span>
            <span className="text-slate-500">/ year per family</span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            <span className="line-through">₱{PREMIUM_REGULAR_PRICE_PHP}/year</span>
            <span className="mx-1.5">·</span>
            <span className="line-through">₱{MONTHLY_PER_CHILD_ANCHOR_PHP}/month per child elsewhere</span>
          </p>
          <div className="mt-5"><FeatureList features={PREMIUM_FEATURES} /></div>
        </div>

        <div className="md:order-1 rounded-[24px] bg-[#ffffff] border border-slate-200 p-6 sm:p-7 shadow-sm">
          <p className="font-display text-xl font-black text-slate-800">Free</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-4xl font-black text-slate-800">₱0</span>
            <span className="text-slate-500">forever</span>
          </div>
          <p className="mt-1 text-sm text-slate-400">No credit card needed</p>
          <div className="mt-5"><FeatureList features={FREE_FEATURES} /></div>
        </div>
      </section>

      <section className="px-5 pb-20 text-center max-w-xl mx-auto">
        <a
          href="/register"
          className="inline-block w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-[#ffffff] font-bold px-8 py-3.5 rounded-[14px] transition-colors shadow-[0_4px_20px_rgba(249,115,22,0.35)]"
        >
          Register Your Family — Free
        </a>
        <p className="mt-4 text-sm text-slate-500">
          Start free, then upgrade to Premium anytime from your parent dashboard.
        </p>
        <p className="mt-6 text-xs text-slate-400">
          Billing and refund details are in our{' '}
          <a href="/terms" className="underline hover:text-slate-600">Terms &amp; Conditions</a>.
        </p>
      </section>
    </div>
  );
}
