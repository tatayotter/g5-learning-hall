import type { Metadata } from 'next';
import ChildSignupForm from '@/components/ChildSignupForm';

export const metadata: Metadata = {
  title: 'Create Your Own Account — Learning Hall',
  description:
    'Start playing Learning Hall right away — no parent account required. Link a parent later to unlock leaderboards and earn a gold bonus.',
  alternates: { canonical: '/child-signup' },
};

export default async function ChildSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const source = ref === 'demo' ? 'demo_banner' : 'organic';

  return (
    <main className="min-h-screen bg-black py-10 px-4">
      <div className="max-w-lg mx-auto mb-6 text-center">
        <h1 className="text-2xl font-display font-bold text-white">Create Your Own Account</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pick a username and a 4-digit PIN you&apos;ll remember. You can start playing immediately —
          no parent needed to get started.
        </p>
      </div>
      <ChildSignupForm source={source} />
    </main>
  );
}
