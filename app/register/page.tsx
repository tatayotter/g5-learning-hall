import type { Metadata } from 'next';
import ParentRegisterForm from '@/components/ParentRegisterForm';

export const metadata: Metadata = {
  title: 'Create Your Family Account — Learning Hall',
  description:
    'Register a free parent account for Learning Hall, the DepEd-aligned gamified learning app for Grade 2-6 students. No credit card required.',
  alternates: { canonical: '/register' },
  openGraph: {
    title: 'Create Your Family Account — Learning Hall',
    description:
      'Register a free parent account for Learning Hall, the DepEd-aligned gamified learning app for Grade 2-6 students. No credit card required.',
    url: '/register',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Create Your Family Account — Learning Hall',
    description:
      'Register a free parent account for Learning Hall, the DepEd-aligned gamified learning app for Grade 2-6 students. No credit card required.',
  },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const source = 'organic';

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 py-10 px-4">
      <div className="max-w-lg mx-auto mb-6 text-center">
        <h1 className="text-3xl font-display font-bold text-slate-800">Parent Registration</h1>
        <p className="text-slate-500 text-base mt-1">
          Register yourself and your children — your dashboard unlocks right away, no waiting.
        </p>
      </div>
      <ParentRegisterForm source={source} />
    </main>
  );
}
