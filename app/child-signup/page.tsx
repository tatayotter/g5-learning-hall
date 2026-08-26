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
  const source = 'organic';
  // ?ref=XXXX pre-fills the referral code
  const initialReferralCode = ref || undefined;

  return (
    <main className="min-h-screen bg-[#0e1220]">
      {/* Splash hero */}
      <div className="relative w-full" style={{ maxHeight: '380px', overflow: 'hidden' }}>
        <img
          src="/splash1.webp"
          alt="Learning Hall"
          className="w-full object-cover object-top"
          style={{ height: '380px' }}
        />
        {/* bottom fade into page bg */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: '120px', background: 'linear-gradient(to bottom, transparent, #0e1220)' }}
        />
        {/* subtle vignette on sides */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.25) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.25) 100%)' }}
        />
      </div>

      {/* Form card — overlaps the image fade */}
      <div className="max-w-lg mx-auto px-4 pb-12 -mt-10 relative">
        {/* Call-to-action strip above card */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-display font-bold text-amber-300 drop-shadow-lg">
            Create Your Hero
          </h1>
          <p className="text-base text-blue-200/70 mt-1">Join thousands of students on the adventure</p>
        </div>

        <div
          className="rounded-2xl shadow-2xl p-6"
          style={{ background: 'linear-gradient(160deg, #fef9f0 0%, #fffdf7 100%)', border: '1px solid rgba(180,130,60,0.2)' }}
        >
          <ChildSignupForm source={source} initialReferralCode={initialReferralCode} />
        </div>

        <p className="text-center text-sm text-blue-200/30 mt-5">
          Already have an account?{' '}
          <a href="/" className="text-amber-500/60 hover:text-amber-400 underline">Go back to the main page</a>.
        </p>
      </div>
    </main>
  );
}
