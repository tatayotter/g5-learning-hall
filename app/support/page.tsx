import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import SupportHero from '@/components/SupportHero';
import SupportLiveNow from '@/components/SupportLiveNow';
import SupportGameplayPreview from '@/components/SupportGameplayPreview';
import SupportOriginStory from '@/components/SupportOriginStory';
import SupportWhereItGoes from '@/components/SupportWhereItGoes';
import SupportMilestones from '@/components/SupportMilestones';
import SupportDonationForm from '@/components/SupportDonationForm';
import SupportWall from '@/components/SupportWall';
import SupportShareButtons from '@/components/SupportShareButtons';
import StickySupportBar from '@/components/StickySupportBar';
import FadeIn from '@/components/FadeIn';
import { getSupportWall, getSupportTotals } from '@/lib/supportContributions';

export const metadata: Metadata = {
  title: 'Support Learning Hall — Learning Hall PH',
  description:
    'Learning Hall started as a way to get my own kids off screens and into learning. Support keeps it running, improving, and reaching more kids and parents.',
  alternates: { canonical: '/support' },
  openGraph: {
    title: 'Support Learning Hall',
    description:
      'Learning Hall started as a way to get my own kids off screens and into learning. Support keeps it running, improving, and reaching more kids and parents.',
    url: '/support',
    // Overrides the root layout's default splash1.webp — this page gets its
    // own purpose-built share preview instead of the generic site-wide one.
    images: [
      {
        url: '/supporters.webp',
        width: 2048,
        height: 1152,
        alt: 'Help Us Improve Learning Hall — two students in a library',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Support Learning Hall',
    description:
      'Learning Hall started as a way to get my own kids off screens and into learning. Support keeps it running, improving, and reaching more kids and parents.',
    images: ['/supporters.webp'],
  },
};

export const revalidate = 60; // wall/total refresh at most once a minute

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ donation?: string }>;
}) {
  const { donation } = await searchParams;
  const [wall, totals] = await Promise.all([getSupportWall(), getSupportTotals()]);

  return (
    <div className="min-h-screen bg-white text-slate-800 font-[Inter,system-ui,sans-serif] overflow-x-hidden scroll-smooth">
      {donation === 'success' && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-sm text-center py-3 px-4">
          Thank you! Your support means a lot — a receipt is on its way to your email.
        </div>
      )}
      {donation === 'cancelled' && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm text-center py-3 px-4">
          Checkout was cancelled — no charge was made.
        </div>
      )}

      {/* ── HERO ── */}
      <div className="relative">
        <Link href="/welcome" className="absolute top-6 left-6 z-20 flex items-center gap-2">
          <Image
            src="/learning_hall_full_logo.webp"
            alt="Learning Hall"
            width={495}
            height={367}
            className="h-9 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
          />
        </Link>
        <SupportHero totalPhp={totals.totalPhp} supporterCount={totals.supporterCount} />
      </div>

      <SupportLiveNow />
      <SupportGameplayPreview />

      {/* ── DONATE ── */}
      <section id="chip-in" className="px-6 py-16 sm:py-20 max-w-5xl mx-auto scroll-mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-14 items-start">
          <FadeIn>
            <p className="text-[11px] tracking-[0.28em] font-bold text-orange-500 uppercase mb-4">
              Chip In
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-black mb-4 text-slate-800">
              Any amount helps keep it going
            </h2>
            <p className="text-slate-500 leading-relaxed mb-6">
              There's no minimum tier, no reward tiers to pick through — just a straightforward way
              to chip in. Pick an amount that feels right, or set your own.
            </p>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              Secure checkout via PayMongo — GCash, Maya, and cards accepted
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <SupportDonationForm />
          </FadeIn>
        </div>
      </section>

      <SupportOriginStory />
      <SupportWhereItGoes />
      <SupportMilestones />

      {/* ── SUPPORTER WALL ── */}
      <section className="px-6 py-20 max-w-2xl mx-auto">
        <FadeIn>
          <p className="text-[11px] tracking-[0.28em] font-bold text-orange-500 uppercase text-center mb-4">
            Hall of Supporters
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-center mb-10 text-slate-800">
            Supporter Wall
          </h2>
        </FadeIn>
        <FadeIn delay={0.05}>
          <SupportWall entries={wall} />
        </FadeIn>
      </section>

      <SupportShareButtons />

      <footer className="px-6 py-8 pb-24 text-center border-t border-slate-200 bg-white">
        <p className="text-[11px] tracking-[0.06em] text-slate-300 font-medium">
          © {new Date().getFullYear()} Ruelo Learning Hall. All Rights Reserved.
        </p>
        <p className="mt-2 text-[11px] tracking-wide">
          <a href="https://www.facebook.com/learninghallph" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600 underline">Facebook</a>
          <span className="text-slate-200 mx-2">·</span>
          <Link href="/welcome" className="text-slate-400 hover:text-slate-600 underline">Learning Hall Home</Link>
          <span className="text-slate-200 mx-2">·</span>
          <Link href="/terms" className="text-slate-400 hover:text-slate-600 underline">Terms & Conditions</Link>
          <span className="text-slate-200 mx-2">·</span>
          <Link href="/privacy" className="text-slate-400 hover:text-slate-600 underline">Privacy Policy</Link>
        </p>
      </footer>

      <StickySupportBar />
    </div>
  );
}
