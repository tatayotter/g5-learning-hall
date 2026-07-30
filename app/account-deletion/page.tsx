import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Delete Your Account — Learning Hall',
  description: 'How to delete your Learning Hall parent account and all associated child data.',
  alternates: { canonical: '/account-deletion' },
};

export default function AccountDeletionPage() {
  return (
    <main className="min-h-screen bg-black py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6 text-gray-300">
        <h1 className="text-2xl font-display font-bold text-white">Delete Your Account</h1>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Option 1: Delete it yourself (in-app)</h2>
          <p className="text-sm">
            Sign in to your{' '}
            <Link href="/parent-login" className="text-indigo-400 underline">
              parent dashboard
            </Link>
            , scroll to the bottom, and select <strong>Delete my account</strong>. This immediately and
            permanently removes your parent account, every child account you created, and all associated
            progress data (quest history, journal entries, scores, inventory, and login records). This
            action cannot be undone.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Option 2: Request deletion by email</h2>
          <p className="text-sm">
            If you can't sign in, email{' '}
            <a href="mailto:rowilruelo@gmail.com?subject=Delete%20my%20Learning%20Hall%20account" className="text-indigo-400 underline">
              rowilruelo@gmail.com
            </a>{' '}
            from the address you registered with, and include the child usernames on the account. We'll
            verify the request and delete the account within 7 days.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">What gets deleted</h2>
          <p className="text-sm">
            Your parent profile, every child profile under it, and all gameplay data tied to those
            profiles: quest and quiz history, XP/gold, inventory, monster collection, battle history,
            journal entries, and login timestamps. See our{' '}
            <Link href="/privacy" className="text-indigo-400 underline">
              Privacy Policy
            </Link>{' '}
            for the full list of data we collect.
          </p>
        </section>
      </div>
    </main>
  );
}
