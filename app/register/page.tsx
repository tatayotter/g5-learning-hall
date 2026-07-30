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
  const { ref } = await searchParams;
  const source = ref === 'demo' ? 'demo_banner' : 'organic';

  return (
    <main className="min-h-screen bg-black py-10 px-4">
      <div className="max-w-lg mx-auto mb-6 text-center">
        <h1 className="text-2xl font-display font-bold text-white">Parent Registration</h1>
        <p className="text-gray-500 text-sm mt-1">
          Register yourself and your children. An admin will review and approve your account before you can log in to the dashboard.
        </p>
      </div>
      <ParentRegisterForm source={source} />
    </main>
  );
}
