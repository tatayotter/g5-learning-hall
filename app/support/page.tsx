import type { Metadata } from 'next';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import SupportDonationForm from '@/components/SupportDonationForm';
import SupportWall from '@/components/SupportWall';
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
    <div className="min-h-screen bg-[#faf7f1] text-[#2b2417] font-[Inter,system-ui,sans-serif]">
      <BlogHeader theme="light" />

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

      <div className="px-6 py-12 border-b border-[#eee3ce] text-center">
        <p className="text-[10px] tracking-[0.2em] font-bold text-emerald-700 uppercase mb-3">Support the mission</p>
        <h1 className="font-display text-3xl sm:text-4xl font-black mb-4 max-w-2xl mx-auto">
          Help keep Learning Hall growing
        </h1>
        <p className="text-[#6b5f4d] max-w-xl mx-auto leading-relaxed">
          This game started as something I built for my own kids — a way to replace screen time
          with something that actually helped them do better in school. Turning it into something
          more kids and parents could use became a mission along the way. If it's helped your
          family too, any contribution helps keep it alive and growing.
        </p>
      </div>

      <main className="px-6 py-12">
        <section className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 mb-16">
          <div>
            <div className="bg-white border border-[#eee3ce] rounded-2xl p-6 mb-6">
              <p className="text-[10px] tracking-[0.2em] font-bold text-[#a3610c] uppercase mb-2">Raised so far</p>
              <p className="font-display text-3xl font-black">₱{totals.totalPhp.toLocaleString()}</p>
              <p className="text-sm text-[#948975] mt-1">
                from {totals.supporterCount} {totals.supporterCount === 1 ? 'supporter' : 'supporters'}
              </p>
            </div>
            <div className="bg-white border border-[#eee3ce] rounded-2xl p-6">
              <h2 className="font-display text-lg font-black mb-2">Where it goes</h2>
              <ul className="text-sm text-[#5c5245] leading-relaxed space-y-1.5 list-disc pl-4">
                <li>Operational costs — hosting, database, and infrastructure</li>
                <li>Keeping the app alive and available for every family using it</li>
                <li>Ongoing improvements and new features</li>
                <li>Art assets — the characters, worlds, and world-building that make it fun</li>
              </ul>
            </div>
          </div>

          <SupportDonationForm />
        </section>

        <section className="max-w-2xl mx-auto">
          <h2 className="font-display text-xl font-black mb-6 text-center">Supporter Wall</h2>
          <SupportWall entries={wall} />
        </section>
      </main>

      <BlogFooter />
    </div>
  );
}
