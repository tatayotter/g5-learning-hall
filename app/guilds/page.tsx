import type { Metadata } from 'next';
import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import GuardianSprite from '@/components/guilds/GuardianSprite';
import { GUILDS } from '@/lib/guilds';

const TITLE = 'The Guild Ledger — Learning Hall’s 5 Side-Quest Guilds Explained';
const DESCRIPTION =
  "What each of Learning Hall's 5 side-quest guilds actually trains, the learning science behind it, how the difficulty ladder works, its DepEd basis, and the Curio companion your child earns.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/guilds' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/guilds' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export default function GuildsHubPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'The Guild Ledger',
    description: DESCRIPTION,
    url: 'https://learninghallph.com/guilds',
  };

  return (
    <div className="min-h-screen bg-[#faf7f1] text-[#2b2417] font-[Inter,system-ui,sans-serif]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <BlogHeader theme="light" />

      <div className="px-6 py-10 border-b border-[#eee3ce] text-center">
        <h1 className="font-display text-3xl sm:text-4xl font-black mb-3">The Guild Ledger</h1>
        <p className="text-[#6b5f4d] max-w-xl mx-auto leading-relaxed">
          Five side-quest guilds live inside Learning Hall, each built around one habit of mind — reading, spelling,
          number sense, reasoning, and vocabulary. This is what each one is actually training, and why.
        </p>
      </div>

      <main className="px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <section className="mb-10">
            <h2 className="font-display text-xl font-black mb-3">How the difficulty ladder works</h2>
            <p className="text-[#5c5245] leading-relaxed mb-3">
              Every guild uses the same ladder, independent of a child's real grade level. A brand-new player —
              whether they're in Grade 2 or Grade 6 — starts at Grade 2-level questions in every guild and climbs one
              grade at a time, in the same sequence covered on our{' '}
              <Link href="/curriculum" className="text-[#a3610c] hover:text-[#c9781a] underline">
                DepEd Curriculum Alignment
              </Link>{' '}
              pages.
            </p>
            <p className="text-[#5c5245] leading-relaxed">
              A child only advances to the next grade's questions once they've answered <strong>every question in
              the current grade's pool correctly at least once</strong>. Getting one wrong doesn't skip it — it just
              comes back around later in that same grade until they get it right. Each round is a timed "Time
              Attack": answer as many as you can before the clock runs out, with a streak bonus for consecutive
              correct answers, earning XP and gold along the way.
            </p>
          </section>

          <section className="mb-10 bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <p className="text-[10px] tracking-[0.2em] font-bold text-emerald-700 uppercase mb-2">Curios &amp; Graduations</p>
            <p className="text-sm text-[#5c5245] leading-relaxed">
              Every guild has its own companion Curio. Reaching <strong>guild level 5</strong> grants it; reaching{' '}
              <strong>guild level 10</strong> and <strong>guild level 20</strong> each trigger a graduation — the
              Curio evolves into a stronger, more distinct form. Each guild page below shows all three stages.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-xl font-black mb-4">Choose a guild</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {GUILDS.map((guild) => (
                <Link
                  key={guild.slug}
                  href={`/guilds/${guild.slug}`}
                  className={`block bg-white border-2 ${guild.accent.washBorder} border-t-4 ${guild.accent.border} rounded-xl p-6 shadow-sm hover:shadow-md transition-all`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`shrink-0 w-12 h-12 rounded-lg ${guild.accent.wash} flex items-center justify-center overflow-hidden`}>
                      <GuardianSprite guild={guild.guardianSlug} pose="idle" animate={false} className="w-9 h-9" />
                    </div>
                    <h3 className="font-display text-2xl font-black">{guild.name}</h3>
                  </div>
                  <p className={`text-sm font-semibold ${guild.accent.text}`}>{guild.subject} →</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
