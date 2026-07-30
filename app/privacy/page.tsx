import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Learning Hall',
  description: 'How Learning Hall collects, uses, and protects data for parents and children.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-black py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8 text-gray-300 text-sm leading-relaxed">
        <div>
          <h1 className="text-2xl font-display font-bold text-white mb-1">Privacy Policy</h1>
          <p className="text-gray-500 text-xs">Last updated July 30, 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Who we are</h2>
          <p>
            Learning Hall (learninghallph.com) is a gamified learning app for Grade 2-6 students in the
            Philippines, aligned to DepEd curriculum content. It is operated by an individual developer.
            Contact: <a href="mailto:rowilruelo@gmail.com" className="text-indigo-400 underline">rowilruelo@gmail.com</a>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Accounts are parent-created only</h2>
          <p>
            Children cannot sign up on their own. A parent registers with their own email address,
            creates a username and PIN for each child, and an admin reviews the parent account before
            it's activated. There is no public sign-up form for minors, no stranger contact, no chat with
            other users outside of pre-set battle/leaderboard interactions with usernames, and no
            third-party advertising.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">What we collect</h2>
          <p className="font-semibold text-gray-200">From parents:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Email address and password (used for account sign-in)</li>
            <li>Full name and phone number</li>
            <li>Email marketing preference (only if you opt in)</li>
          </ul>
          <p className="font-semibold text-gray-200 mt-3">From child profiles (entered by the parent):</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Username and a 4-digit PIN (stored as a one-way hash, never in plain text)</li>
            <li>Full name, grade level, gender, and school name</li>
            <li>An avatar/character selection</li>
          </ul>
          <p className="font-semibold text-gray-200 mt-3">Generated while using the app:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Quiz answers, scores, and quest/mastery progress</li>
            <li>In-app currency, inventory, monster collection, and battle history</li>
            <li>Optional free-text journal entries the child writes (e.g. "what I learned today")</li>
            <li>Login timestamps and basic usage events (which screens/features are used)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">How we use it</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>To operate the app: authenticate accounts, save progress, and run gameplay features</li>
            <li>To let parents review their child's activity and journal entries from their dashboard</li>
            <li>To send account-related notices, and — only if a parent opts in — occasional email updates</li>
            <li>To understand feature usage in aggregate, so we can fix bugs and improve the app</li>
          </ul>
          <p>We do not sell personal data, and we do not run third-party advertising or ad tracking.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Who we share data with</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Supabase</strong> — our database and authentication provider, which stores all account and gameplay data.</li>
            <li><strong>Google Analytics (GA4)</strong> — used only on our public marketing pages (Welcome, Blog, Register) to understand traffic. It is not used inside the logged-in gameplay experience.</li>
            <li><strong>SendFox</strong> — our email service, used only to send updates to parents who explicitly opt in to marketing emails.</li>
          </ul>
          <p>We do not share data with any other third party.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Data retention and deletion</h2>
          <p>
            We keep account and gameplay data for as long as the account is active. Parents can permanently
            delete their account and all associated child data at any time — see our{' '}
            <Link href="/account-deletion" className="text-indigo-400 underline">
              account deletion page
            </Link>{' '}
            for instructions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Security</h2>
          <p>
            Passwords and child PINs are stored using one-way cryptographic hashing — we cannot see or
            recover them. Data is protected with row-level security so that a parent can only ever access
            their own children's data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Children's privacy</h2>
          <p>
            Learning Hall is designed for use by children under parental supervision. All child accounts
            are created and managed by a parent, who can view, edit, or delete their child's data at any
            time from the parent dashboard. We do not knowingly collect information directly from a child
            without a parent first creating and controlling that child's account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Contact</h2>
          <p>
            Questions about this policy or your data can be sent to{' '}
            <a href="mailto:rowilruelo@gmail.com" className="text-indigo-400 underline">rowilruelo@gmail.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
