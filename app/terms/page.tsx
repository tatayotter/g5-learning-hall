import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms & Conditions — Learning Hall',
  description: 'The terms for using Learning Hall, including the Premium subscription, Student Enrichment Content purchases, and our refund policy.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8 text-gray-300 text-sm leading-relaxed">
        <div>
          <h1 className="text-2xl font-display font-bold text-white mb-1">Terms & Conditions</h1>
          <p className="text-gray-500 text-xs">Last updated September 6, 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Who we are</h2>
          <p>
            Learning Hall (learninghallph.com) is a gamified learning app for Grade 2-6 students in the
            Philippines, aligned to DepEd curriculum content. It is operated by an individual developer.
            By creating an account or making a purchase, you agree to these Terms and to our{' '}
            <Link href="/privacy" className="text-indigo-400 underline">Privacy Policy</Link>.
            Contact: <a href="mailto:rowilruelo@gmail.com" className="text-indigo-400 underline">rowilruelo@gmail.com</a>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Accounts</h2>
          <p>
            Only a parent or guardian may register a parent account, and must be 18 or older. Children
            play under profiles the parent creates and controls — there is no independent sign-up for
            minors. You&apos;re responsible for keeping your password and your children&apos;s PINs
            confidential, and for all activity under your account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Free plan and Premium subscription</h2>
          <p>
            The core app is free to use with one child account. Premium (currently ₱249/year per
            account, with optional additional child slots at ₱99/year each, up to 5 children total)
            unlocks journal viewing, gold coin rewards, weak-topic reports, and side-by-side comparison
            between children. Premium is a <strong>one-time annual purchase, not an auto-renewing
            subscription</strong> — no card is stored or automatically charged. Access runs for one year
            from purchase; we&apos;ll remind you before it lapses, and you choose whether to purchase
            another year.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Student Enrichment Content (SEC) purchases</h2>
          <p>
            SEC packs (shown in the parent Shop) are optional, one-time purchases that unlock an extra
            quest line for one specific child you choose at checkout. A SEC purchase is independent of
            Premium — either plan can buy one. Once purchased, a pack stays unlocked for that child for
            as long as your account exists, and its untimed study reviewer is available to you, the
            purchasing parent, at any time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Refund policy</h2>
          <p>
            We want SEC purchases to be a safe, no-regrets decision, balanced against the fact that the
            content is fully unlocked and playable the moment you buy it:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              A SEC pack is eligible for a full refund within <strong>7 days of purchase</strong>,
              provided the child has <strong>not yet answered any question</strong> in that pack.
            </li>
            <li>
              Once a child has started a pack, or more than 7 days have passed, the purchase is final —
              the content has already been delivered and accessed.
            </li>
            <li>
              To request a refund, email{' '}
              <a href="mailto:rowilruelo@gmail.com" className="text-indigo-400 underline">rowilruelo@gmail.com</a>{' '}
              with the child&apos;s username and the pack purchased. We aim to respond within 3 business
              days. Approved refunds revoke the pack immediately; the payment itself is returned via the
              original payment method, which can take a few business days depending on your bank or
              e-wallet.
            </li>
            <li>
              This refund policy applies to SEC packs only. The Premium subscription is a one-time,
              non-renewing annual purchase — if you believe you were charged in error, contact us and
              we&apos;ll review it individually.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Payments</h2>
          <p>
            Payments are processed by PayMongo, a licensed Philippine payment processor, via GCash,
            Maya, or card. We never see or store your full card or e-wallet credentials — PayMongo
            handles that directly. Prices are listed and charged in Philippine Pesos (₱).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Acceptable use</h2>
          <p>
            Learning Hall is built for children to learn and play in a safe, closed environment: there
            is no open chat with strangers, no public profiles, and no third-party advertising. Please
            don&apos;t attempt to bypass account limits, share purchased content outside your own
            account, or use the app in a way that disrupts it for other families.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Changes to these Terms</h2>
          <p>
            We may update these Terms as the app grows. Meaningful changes — like pricing or the refund
            window — will be reflected here with an updated date at the top of this page. Continuing to
            use Learning Hall after a change means you accept the updated Terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Account deletion and data</h2>
          <p>
            You can permanently delete your account and all associated child data at any time — see our{' '}
            <Link href="/account-deletion" className="text-indigo-400 underline">account deletion page</Link>.
            See our <Link href="/privacy" className="text-indigo-400 underline">Privacy Policy</Link>{' '}
            for what we collect and how it&apos;s used.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Contact</h2>
          <p>
            Questions about these Terms, a purchase, or a refund can be sent to{' '}
            <a href="mailto:rowilruelo@gmail.com" className="text-indigo-400 underline">rowilruelo@gmail.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
