import type { Metadata } from 'next';
import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import { CURRICULUM_GRADES } from '@/lib/curriculum';

export const metadata: Metadata = {
  title: "Learning Hall's DepEd Curriculum Alignment (Grade 2-6)",
  description:
    "How every Learning Hall quest maps back to DepEd's actual MATATAG curriculum, grade by grade — plus the Special Science (SSES) enrichment layer and how quiz content gets verified against real sources.",
  alternates: { canonical: '/curriculum' },
  openGraph: {
    title: "Learning Hall's DepEd Curriculum Alignment (Grade 2-6)",
    description:
      "How every Learning Hall quest maps back to DepEd's actual MATATAG curriculum, grade by grade — plus the Special Science (SSES) enrichment layer and how quiz content gets verified against real sources.",
    url: '/curriculum',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Learning Hall's DepEd Curriculum Alignment (Grade 2-6)",
    description:
      "How every Learning Hall quest maps back to DepEd's actual MATATAG curriculum, grade by grade — plus the Special Science (SSES) enrichment layer and how quiz content gets verified against real sources.",
  },
};

export default function CurriculumHubPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: "Learning Hall's DepEd Curriculum Alignment",
    description:
      "How every Learning Hall quest maps back to DepEd's actual MATATAG curriculum, grade by grade.",
    url: 'https://learninghallph.com/curriculum',
  };

  return (
    <div className="min-h-screen bg-[#0a0807] text-[#ede4d3] font-[Inter,system-ui,sans-serif]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <BlogHeader />

      <div className="px-6 py-10 border-b border-[#241d16] text-center">
        <h1 className="font-display text-3xl sm:text-4xl font-black mb-3">DepEd Curriculum Alignment</h1>
        <p className="text-[#c9bfae] max-w-xl mx-auto leading-relaxed">
          What Learning Hall is actually built on, grade by grade — not a general sense of what a grade covers, but
          DepEd's own MATATAG competencies, subject by subject and term by term.
        </p>
      </div>

      <main className="px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <section className="mb-10">
            <h2 className="font-display text-xl font-black mb-3">Why this page exists</h2>
            <p className="text-[#c9bfae] leading-relaxed mb-3">
              A gamified app claiming to reinforce classroom learning only means something if the content actually
              matches what's being taught. Every quest in Learning Hall — for every subject a grade covers, not just
              the five skills the game turns into playable quests — is cross-checked against DepEd's own MATATAG
              curriculum guides, plus teacher-facing lesson resources like{' '}
              <a href="https://www.teachersclick.com/" target="_blank" rel="noopener noreferrer" className="text-[#f0b429] hover:text-[#f5c542] underline">
                teachersclick.com
              </a>{' '}
              and{' '}
              <a href="https://www.deped-click.com/" target="_blank" rel="noopener noreferrer" className="text-[#f0b429] hover:text-[#f5c542] underline">
                deped-click.com
              </a>
              . The five pages below are the actual reference material, published openly rather than kept behind the
              scenes — read more about how that sourcing process works on{' '}
              <Link href="/blog/resources-behind-learning-halls-quests" className="text-[#f0b429] hover:text-[#f5c542] underline">
                our Resources blog
              </Link>{' '}
              and in our plain-English{' '}
              <Link href="/blog/matatag-curriculum-parent-guide" className="text-[#f0b429] hover:text-[#f5c542] underline">
                MATATAG curriculum guide
              </Link>
              .
            </p>
          </section>

          <section className="mb-10 bg-[#161f13] border border-[#2f4023] rounded-xl p-5">
            <p className="text-[10px] tracking-[0.2em] font-bold text-[#7fae52] uppercase mb-2">
              Special Science (SSES) Enrichment
            </p>
            <p className="text-sm text-[#c9bfae] leading-relaxed">
              English, Mathematics, and Science carry an additional layer of Special Science Elementary School (SSES)
              enrichment at every grade level from 2 to 6 — real, verified in the source material, and marked
              explicitly on each grade page below. It's an applied-reasoning task layered on top of the standard
              MATATAG competencies for those three subjects specifically, not a claim we're making across every
              subject.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-xl font-black mb-4">Choose a grade</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {CURRICULUM_GRADES.map((grade) => (
                <Link
                  key={grade}
                  href={`/curriculum/grade-${grade}`}
                  className="block bg-[#1c1611] border border-[#3d3225] rounded-xl p-6 hover:border-[#c9781a]/60 transition-colors"
                >
                  <h3 className="font-display text-2xl font-black mb-1">Grade {grade}</h3>
                  <p className="text-sm text-[#8a7c66]">Full DepEd budget of work, every subject, term by term →</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="px-6 py-8 text-center border-t border-[#241d16]">
        <p className="text-[11px] tracking-[0.06em] text-white/25 font-medium">
          © {new Date().getFullYear()} Ruelo Learning Hall. All Rights Reserved.
        </p>
        <p className="mt-2 text-[11px] tracking-wide">
          <a href="https://www.facebook.com/learninghallph" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/70 underline">Facebook</a>
          <span className="text-white/20 mx-2">·</span>
          <Link href="/privacy" className="text-white/40 hover:text-white/70 underline">Privacy Policy</Link>
          <span className="text-white/20 mx-2">·</span>
          <Link href="/account-deletion" className="text-white/40 hover:text-white/70 underline">Delete Account</Link>
        </p>
      </footer>
    </div>
  );
}
